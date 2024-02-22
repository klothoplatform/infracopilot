import asyncio
from contextlib import asynccontextmanager
import datetime
import os
import uuid
from typing import Annotated, Dict, Optional, Callable

from fastapi import FastAPI, Response, Header
from fastapi import Request
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import jsons
from pydantic import BaseModel
from src.auth_service.entity import User
from src.auth_service.main import (
    AuthzService,
)
from src.dependency_injection.injection import (
    SessionLocal,
    get_db,
    get_fga_manager,
    get_iac_orchestrator,
    get_authz_service,
    get_architecture_manager,
    get_auth0_manager,
    get_stack_manager,
    get_stack_state_bucket,
    deps,
)
from src.deployer.aws.logs_puller import AwsLogsPuller
from src.deployer.aws.metrics_puller import AwsMetricsPuller
from src.deployer.data.deployment_dao import DeploymentDAO
from src.deployer.data.models import (
    Deployment,
    DeploymentAction,
    DeploymentStatus,
    Stack,
)
from src.deployer.data.stack_dao import StackDAO, StackNotFoundError
from src.deployer.pulumi.builder import AppBuilder
from src.deployer.pulumi.deployer import AppDeployer
from src.deployer.pulumi.state_manager import StateManager
from src.environment_management.models import (
    EnvironmentResourceConfiguration,
    EnvironmentVersion,
)
from src.util.logging import logger
from multiprocessing import Process, Queue
from queue import Empty
from src.auth_service.token import AuthError, get_user_id
import boto3


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_db()
    deps.fga_manager = await get_fga_manager()
    deps.auth0_manager = get_auth0_manager()
    deps.authz_service = await get_authz_service()
    deps.architecture_manager = await get_architecture_manager()
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# This would be a dictionary, database, or some other form of storage in a real application
deployments: Dict[str, Queue] = {}


class DeployRequest(BaseModel):
    region: str
    access_key: str
    secret_key: str
    pulumi_access_token: str


async def build_and_deploy(
    q: Queue,
    stack: Stack.ReturnObject,
    version: int,
    diff: dict,
    body: DeployRequest,
    user: User,
    iac: bytes,
):
    async with SessionLocal.begin() as db:
        os.environ["PULUMI_ACCESS_TOKEN"] = body.pulumi_access_token
        builder = AppBuilder(stack, get_stack_state_bucket())
        pulumi_stack = builder.prepare_stack(iac)
        builder.configure_aws(
            pulumi_stack, body.access_key, body.secret_key, body.region
        )
        deployer = AppDeployer(
            pulumi_stack,
            StackDAO(db),
            DeploymentDAO(db),
        )
        deployment = Deployment(
            id=str(uuid.uuid4()),
            stack_name=stack.name,
            architecture_id=stack.architecture_id,
            environment_id=stack.environment_id,
            version=version,
            action=DeploymentAction.DEPLOY.value,
            diff=diff,
            status=DeploymentStatus.IN_PROGRESS.value,
            initiated_by=user.to_auth_string(),
            initiated_at=datetime.datetime.now(),
        )
        await deployer.run_deploy_worker(q, deployment)
        q.put("Done")
        state_manager = StateManager(get_stack_state_bucket())
        state_manager.save_resources_state_from_stack(stack, pulumi_stack)


def run_build_and_deploy(
    q: Queue,
    stack: Stack.ReturnObject,
    version: int,
    diff: dict,
    body: DeployRequest,
    user: User,
    iac: bytes,
):
    new_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(new_loop)
    new_loop.run_until_complete(
        build_and_deploy(q, stack, version, diff, body, user, iac)
    )
    new_loop.close()


async def run_destroy(
    q: Queue,
    stack: Stack.ReturnObject,
    body: DeployRequest,
    user: User,
    iac: bytes,
):
    async with SessionLocal.begin() as db:
        os.environ["PULUMI_ACCESS_TOKEN"] = body.pulumi_access_token
        builder = AppBuilder(stack, get_stack_state_bucket())
        pulumi_stack = builder.prepare_stack(iac)
        builder.configure_aws(
            pulumi_stack, body.access_key, body.secret_key, body.region
        )
        deployer = AppDeployer(
            pulumi_stack,
            StackDAO(db),
            DeploymentDAO(db),
        )
        deployment = Deployment(
            id=str(uuid.uuid4()),
            stack_name=stack.name,
            architecture_id=stack.architecture_id,
            environment_id=stack.environment_id,
            action=DeploymentAction.DESTROY.value,
            status=DeploymentStatus.IN_PROGRESS.value,
            initiated_by=user.to_auth_string(),
            initiated_at=datetime.datetime.now(),
        )
        await deployer.run_destroy_worker(q, deployment)
        q.put("Done")
        state_manager = StateManager(get_stack_state_bucket())
        state_manager.save_resources_state_from_stack(stack, None)


def run_destroy_loop(
    q: Queue,
    stack: Stack.ReturnObject,
    body: DeployRequest,
    user: User,
    iac: bytes,
):
    new_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(new_loop)
    new_loop.run_until_complete(run_destroy(q, stack, body, user, iac))
    new_loop.close()


@app.post("/api/deploy/{id}/{env_id}/{name}")
async def deploy(
    request: Request,
    id: str,
    env_id: str,
    name: str,
    body: DeployRequest,
):
    iac = None
    stack = None
    version = None
    diff = None
    env_version: EnvironmentVersion = None
    async with SessionLocal.begin() as db:
        authz = deps.authz_service
        user_id = await get_user_id(request)
        can_write = await authz.can_write_to_architecture(User(id=user_id), id)
        if not can_write:
            raise AuthError(
                detail=f"User {user_id} is not authorized to create architectures",
                error={
                    "code": "unauthorized",
                    "description": f"User is not authorized to write to architecture {id}",
                },
            )

        stack_manager = get_stack_manager(db)
        try:
            curr_stack = await stack_manager.get_stack(name, id, env_id)
            stack = curr_stack.to_return_object()
            logger.info(f"Found stack {stack.name} for deployment")
        except StackNotFoundError as e:
            return Response(content="Stack not found", status_code=404)

        iac_handler = get_iac_orchestrator(db)
        logger.info(f"Generating IaC for {id}, env {env_id}. getting current version")
        env_version, arch = await iac_handler.get_enviroment_version_and_architecture(
            id, env_id
        )
        iac = await iac_handler.get_iac_output(env_version, arch)
        version = env_version.version
        diff = EnvironmentResourceConfiguration.from_dict(
            env_version.env_resource_configuration
        ).diff
    if iac is None:
        return Response(content="I failed to generate IaC", status_code=500)
    if stack is None:
        return Response(content="Stack not found", status_code=404)

    # Create a new queue for this deployment
    deployment_id = f"{id}-{env_id}-{name}"
    q = Queue()
    deployments[deployment_id] = q
    q.put("Starting deployment")
    q.put("Building and deploying")
    q.put("=======================")

    p = Process(
        target=run_build_and_deploy,
        args=(q, stack, version, diff, body, User(id=user_id), iac),
    )
    p.start()
    # Start the deployment in the background

    return {"message": "Deployment started"}


@app.post("/api/destroy/{id}/{env_id}/{name}")
async def destroy(
    request: Request,
    id: str,
    env_id: str,
    name: str,
    body: DeployRequest,
):
    logger.info(f"Destroying {id}, env {env_id}")
    iac = None
    stack = None
    async with SessionLocal.begin() as db:
        authz = deps.authz_service
        user_id = await get_user_id(request)
        can_write = await authz.can_write_to_architecture(User(id=user_id), id)
        if not can_write:
            raise AuthError(
                detail=f"User {user_id} is not authorized to create architectures",
                error={
                    "code": "unauthorized",
                    "description": f"User is not authorized to write to architecture {id}",
                },
            )

        stack_manager = get_stack_manager(db)
        try:
            curr_stack = await stack_manager.get_stack(name, id, env_id)
            stack = curr_stack.to_return_object()
        except StackNotFoundError as e:
            return Response(content="Stack not found", status_code=404)

        iac_handler = get_iac_orchestrator(db)
        logger.info(f"Generating IaC for {id}, env {env_id}. getting current version")
        env_version, arch = await iac_handler.get_enviroment_version_and_architecture(
            id, env_id
        )
        iac = await iac_handler.get_iac_output(env_version, arch)
    if iac is None:
        return Response(content="I failed to generate IaC", status_code=500)
    if stack is None:
        return Response(content="Stack not found", status_code=404)
    logger.info(f"Retrieved IaC for {id}, env {env_id}")

    # Create a new queue for this deployment
    deployment_id = f"{id}-{env_id}-{name}"
    q = Queue()
    deployments[deployment_id] = q
    q.put("Starting destroy")
    q.put("=======================")

    logger.info(f"Starting destroy for {id}, env {env_id}")
    p = Process(target=run_destroy_loop, args=(q, stack, body, User(id=user_id), iac))
    p.start()
    # start destroy in the background

    return {"message": "Destroy started"}


@app.get("/api/deploy/{id}/{env_id}/{name}")
async def stream(request: Request, id: str, env_id: str, name: str):
    async def event_stream():
        deployment_id = f"{id}-{env_id}-{name}"
        q = None
        while True:
            if q is None:
                if deployment_id not in deployments:
                    logger.info(f"Deployment {deployment_id} not found")
                    await asyncio.sleep(1)
                    continue
                q = deployments[deployment_id]
            if await request.is_disconnected():
                logger.debug("Request disconnected")
                break
            try:
                result = q.get_nowait()
                if result == "Done":
                    logger.info(f"Deployment {deployment_id} is done")
                    return
            except Empty:
                await asyncio.sleep(0.25)  # Wait a bit before trying again
                continue
            yield f"data: {result}\n\n"
            return

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-buffer"},
    )


@app.get("/api/stacks/{id}/{env_id}")
async def list_stacks(request: Request, id: str, env_id: str):
    logger.info(f"Listing stacks for {id}, env {env_id}")
    async with SessionLocal.begin() as db:
        authz = deps.authz_service
        user_id = await get_user_id(request)
        can_read = await authz.can_read_architecture(User(id=user_id), id)
        if not can_read:
            raise AuthError(
                detail=f"User {user_id} is not authorized to read architectures",
                error={
                    "code": "unauthorized",
                    "description": f"User is not authorized to read architecture {id}",
                },
            )
        stack_manager = get_stack_manager(db)
        stacks = await stack_manager.list_stacks(id, env_id)
        logger.info(f"Found {len(stacks)} stacks")
        return [stack.to_return_object() for stack in stacks]


class CreateStackRequest(BaseModel):
    name: str
    provider: str
    provider_details: Dict[str, str]


@app.post("/api/stacks/{id}/{env_id}")
async def create_stack(
    request: Request, body: CreateStackRequest, id: str, env_id: str
):
    logger.info(f"Creating stack for {id}, env {env_id}")
    try:
        async with SessionLocal.begin() as db:
            authz = deps.authz_service
            user_id = await get_user_id(request)
            user = User(id=user_id)
            can_write = await authz.can_write_to_architecture(user, id)
            if not can_write:
                raise AuthError(
                    detail=f"User {user_id} is not authorized to create architectures",
                    error={
                        "code": "unauthorized",
                        "description": f"User is not authorized to write to architecture {id}",
                    },
                )
            stack_manager = get_stack_manager(db)
            stack = await stack_manager.create_stack(
                user, body.name, id, env_id, body.provider, body.provider_details
            )
            logger.info(f"Created stack {stack}")
            return stack.to_return_object()
    except Exception as e:
        logger.error(f"Failed to create stack", exc_info=True)
        return Response(content="Failed to create stack", status_code=500)


@app.delete("/api/stacks/{id}/{env_id}/{name}")
async def delete_stack(request: Request, id: str, env_id: str, name: str):
    async with SessionLocal.begin() as db:
        authz = deps.authz_service
        user_id = await get_user_id(request)
        can_write = await authz.can_write_to_architecture(User(id=user_id), id)
        if not can_write:
            raise AuthError(
                detail=f"User {user_id} is not authorized to create architectures",
                error={
                    "code": "unauthorized",
                    "description": f"User is not authorized to write to architecture {id}",
                },
            )
        stack_manager = get_stack_manager(db)
        await stack_manager.delete_stack(id, env_id, name)
        return {"message": "Stack deleted"}


@app.get("/api/stacks/{id}/{env_id}/{name}/events")
async def list_stack_events(request: Request, id: str, env_id: str, name: str):
    logger.info(f"Listing stack events for {id}, env {env_id}, stack {name}")
    async with SessionLocal.begin() as db:
        authz = deps.authz_service
        user_id = await get_user_id(request)
        can_read = await authz.can_read_architecture(User(id=user_id), id)
        if not can_read:
            raise AuthError(
                detail=f"User {user_id} is not authorized to create architectures",
                error={
                    "code": "unauthorized",
                    "description": f"User is not authorized to write to architecture {id}",
                },
            )
        stack_manager = get_stack_manager(db)
        try:
            stack = await stack_manager.get_stack(name, id, env_id)
            deployments = await stack_manager.get_stack_events(stack)
            return [deployment.to_return_object() for deployment in deployments]
        except StackNotFoundError as e:
            return Response(content="Stack not found", status_code=404)


@app.get("/api/stacks/{id}/{env_id}/{name}/resources")
async def list_stack_resources(request: Request, id: str, env_id: str, name: str):
    logger.info(f"Listing stack resources for {id}, env {env_id}, stack {name}")
    async with SessionLocal.begin() as db:
        authz = deps.authz_service
        user_id = await get_user_id(request)
        can_read = await authz.can_read_architecture(User(id=user_id), id)
        if not can_read:
            raise AuthError(
                detail=f"User {user_id} is not authorized to create architectures",
                error={
                    "code": "unauthorized",
                    "description": f"User is not authorized to write to architecture {id}",
                },
            )
        stack_manager = get_stack_manager(db)
        state_manager = StateManager(get_stack_state_bucket())
        try:
            stack = await stack_manager.get_stack(name, id, env_id)
            current_state = state_manager.get_state_from_storage(
                stack.to_return_object()
            )
            return state_manager.convert_output_to_objects(current_state)
        except StackNotFoundError as e:
            return Response(content="Stack not found", status_code=404)


@app.get("/api/stacks/{id}/{env_id}/{name}/resource/{resource_id}/logs")
async def get_resource_logs(
    request: Request, id: str, env_id: str, name: str, resource_id: str
):
    logger.info(f"Listing stack resources for {id}, env {env_id}, stack {name}")
    async with SessionLocal.begin() as db:
        authz = deps.authz_service
        user_id = await get_user_id(request)
        can_read = await authz.can_read_architecture(User(id=user_id), id)
        if not can_read:
            raise AuthError(
                detail=f"User {user_id} is not authorized to read resource logs",
                error={
                    "code": "unauthorized",
                    "description": f"User is not authorized to read resource logs",
                },
            )
        stack_manager = get_stack_manager(db)
        state_manager = StateManager(get_stack_state_bucket())
        try:
            stack = await stack_manager.get_stack(name, id, env_id)
            current_state = state_manager.get_state_from_storage(
                stack.to_return_object()
            )
            resources = state_manager.convert_output_to_objects(current_state)
            logs_client = boto3.client(
                "logs",
                region_name="us-east-1",
                aws_access_key_id="test_access",
                aws_secret_access_key="test_secret",
            )
            logs_puller = AwsLogsPuller(logs_client)
            matching_resources = [
                resource for resource in resources if resource.id == resource_id
            ]
            if len(matching_resources) == 0:
                return Response(content="Resource not found", status_code=404)
            streams = logs_puller.download_logs(matching_resources[0])
            if streams is None:
                return Response(content="No logs found", status_code=404)
            events = [log.events for log in streams]
            return [event for sublist in events for event in sublist]
        except StackNotFoundError as e:
            return Response(content="Stack not found", status_code=404)


@app.get("/api/stacks/{id}/{env_id}/{name}/resource/{resource_id}/metrics")
async def get_resource_metrics(
    request: Request, id: str, env_id: str, name: str, resource_id: str
):
    logger.info(f"Listing stack resources for {id}, env {env_id}, stack {name}")
    async with SessionLocal.begin() as db:
        authz = deps.authz_service
        user_id = await get_user_id(request)
        can_read = await authz.can_read_architecture(User(id=user_id), id)
        if not can_read:
            raise AuthError(
                detail=f"User {user_id} is not authorized to read resource metrics",
                error={
                    "code": "unauthorized",
                    "description": f"User is not authorized to read resource metrics",
                },
            )
        stack_manager = get_stack_manager(db)
        state_manager = StateManager(get_stack_state_bucket())
        try:
            stack = await stack_manager.get_stack(name, id, env_id)
            current_state = state_manager.get_state_from_storage(
                stack.to_return_object()
            )
            resources = state_manager.convert_output_to_objects(current_state)
            cw_client = boto3.client(
                "cloudwatch",
                region_name="us-east-1",
                aws_access_key_id="test_access",
                aws_secret_access_key="test_secret",
            )
            metrics_puller = AwsMetricsPuller(cw_client)
            matching_resources = [
                resource for resource in resources if resource.id == resource_id
            ]
            if len(matching_resources) == 0:
                return Response(content="Resource not found", status_code=404)
            metrics = metrics_puller.pull_metrics(matching_resources[0])
            if metrics is None:
                return Response(content="No metrics found", status_code=404)
            return metrics
        except StackNotFoundError as e:
            return Response(content="Stack not found", status_code=404)


@app.exception_handler
def handle_auth_error(ex: AuthError):
    response = JSONResponse(content=ex.error, status_code=ex.status_code)
    return response
