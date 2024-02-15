import asyncio
import os
import uuid
from contextlib import asynccontextmanager
from typing import Annotated, Optional, Callable

import jsons
from fastapi import FastAPI, Response, Header, HTTPException
from fastapi import Request
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from pyinstrument import Profiler
from pyinstrument.renderers import HTMLRenderer, SpeedscopeRenderer

from src.auth_service.auth0_manager import Auth0Manager
from src.auth_service.entity import User
from src.auth_service.main import (
    AuthzService,
)
from src.auth_service.token import PUBLIC_USER, AuthError, get_user_id
from src.backend_orchestrator.environments_api import router as environments_router
from src.backend_orchestrator.get_valid_edge_targets_handler import (
    CopilotGetValidEdgeTargetsRequest,
)
from src.backend_orchestrator.models import (
    EnvironmentVersionNotLatestError,
    CreateArchitectureRequest,
    ModifyArchitectureRequest,
    CloneArchitectureRequest,
    ShareArchitectureRequest,
)
from src.backend_orchestrator.run_engine_handler import (
    CopilotRunRequest,
)
from src.backend_orchestrator.teams_api import router as teams_router
from src.dependency_injection.injection import (
    SessionLocal,
    get_architecture_handler,
    get_db,
    get_edge_target_handler,
    get_fga_manager,
    get_iac_orchestrator,
    get_engine_orchestrator,
    get_authz_service,
    get_architecture_manager,
    get_auth0_manager,
    get_teams_manager,
    deps,
)
from src.environment_management.environment_version import (
    EnvironmentVersionDoesNotExistError,
)
from src.state_manager.architecture_storage import ArchitectureStateDoesNotExistError
from src.topology.topology import TopologicalChangesNotAllowed
from src.util.logging import logger


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

logger.debug("Starting API")

app.include_router(teams_router)
app.include_router(environments_router)


@app.get("/api/ping")
async def ping():
    return Response(status_code=204)


@app.post("/api/architecture")
async def new_architecture(
    request: Request,
    body: CreateArchitectureRequest,
):
    async with SessionLocal.begin() as db:
        authz = deps.authz_service
        user_id = await get_user_id(request)
        if user_id == PUBLIC_USER:
            raise AuthError(
                detail=f"User {user_id} is not authorized to create architectures",
                error={
                    "code": "unauthorized",
                    "description": f"User is not authorized to write to architecture {id}",
                },
            )
        arch_handler = get_architecture_handler(db)
        id = str(uuid.uuid4())
        owner = User(user_id) if body.owner is None else User(body.owner)
        await authz.add_architecture_owner(owner, id)
        return await arch_handler.new_architecture(body, user_id, owner, id)


@app.get("/api/architectures")
async def list_architectures(
    request: Request,
):
    async with SessionLocal.begin() as db:
        user_id = await get_user_id(request)
        arch_handler = get_architecture_handler(db)
        return await arch_handler.list_architectures(user_id)


@app.get("/api/architecture/{id}")
async def get_architecture(
    request: Request,
    id: str,
):
    async with SessionLocal.begin() as db:
        authz = deps.authz_service
        user_id = await get_user_id(request)
        authorized = await authz.can_read_architecture(User(id=user_id), id)
        if not authorized:
            raise AuthError(
                detail=f"User {user_id} is not authorized to modify architecture {id}",
                error={
                    "code": "unauthorized",
                    "description": f"User is not authorized to modify architecture {id}",
                },
            )
        arch_handler = get_architecture_handler(db)
        return await arch_handler.get_architecture(id)


@app.post("/api/architecture/{id}")
async def modify_architecture(
    request: Request,
    id: str,
    body: ModifyArchitectureRequest,
):
    async with SessionLocal.begin() as db:
        authz = deps.authz_service
        user_id = await get_user_id(request)
        authorized = await authz.can_write_to_architecture(User(id=user_id), id)
        if not authorized:
            raise AuthError(
                detail=f"User {user_id} is not authorized to modify architecture {id}",
                error={
                    "code": "unauthorized",
                    "description": f"User is not authorized to modify architecture {id}",
                },
            )
        arch_handler = get_architecture_handler(db)
        return await arch_handler.rename_architecture(id, body.name)


@app.delete("/api/architecture/{id}")
async def delete_architecture(
    request: Request,
    id: str,
):
    async with SessionLocal.begin() as db:
        authz = deps.authz_service
        user_id = await get_user_id(request)
        authorized = await authz.can_write_to_architecture(User(id=user_id), id)
        if not authorized:
            raise AuthError(
                detail=f"User {user_id} is not authorized to delete architecture {id}",
                error={
                    "code": "unauthorized",
                    "description": f"User is not authorized to delete architecture {id}",
                },
            )
        arch_handler = get_architecture_handler(db)
        return await arch_handler.delete_architecture(id)


@app.post("/api/architecture/{id}/clone")
async def clone_architecture(
    request: Request,
    id: str,
    body: CloneArchitectureRequest,
):
    async with SessionLocal.begin() as db:
        authz = deps.authz_service
        user_id = await get_user_id(request)
        authorized = await authz.can_read_architecture(User(id=user_id), id)
        if not authorized:
            raise AuthError(
                detail=f"User {user_id} is not authorized to modify architecture {id}",
                error={
                    "code": "unauthorized",
                    "description": f"User is not authorized to modify architecture {id}",
                },
            )
        arch_handler = get_architecture_handler(db)
        return await arch_handler.clone_architecture(
            user_id, id, body.name, body.owner, authz
        )


@app.put("/api/architecture/{id}/access")
async def update_architecture_access(
    request: Request,
    id: str,
    body: ShareArchitectureRequest,
):
    async with SessionLocal.begin() as db:
        authz = deps.authz_service
        arch_manager = deps.architecture_manager
        user_id: str = await get_user_id(request)
        authorized = await authz.can_share_architecture(User(id=user_id), id)
        if not authorized:
            raise AuthError(
                detail=f"User {user_id} is not authorized to share architecture {id}",
                error={
                    "code": "unauthorized",
                    "description": f"User is not authorized to share architecture {id}",
                },
            )
        arch_handler = get_architecture_handler(db)
        return await arch_handler.update_architecture_access(
            user_id, id, body, authz, arch_manager
        )


@app.get("/api/architecture/{id}/access")
async def get_architecture_access(
    request: Request,
    id: str,
):
    async with SessionLocal.begin() as db:
        authz: AuthzService = deps.authz_service
        arch_manager = deps.architecture_manager
        auth0_manager = deps.auth0_manager
        user_id: str = await get_user_id(request)
        authorized = await authz.can_read_architecture(User(id=user_id), id)
        if not authorized:
            raise AuthError(
                detail=f"User {user_id} is not authorized to share architecture {id}",
                error={
                    "code": "unauthorized",
                    "description": f"User is not authorized to share architecture {id}",
                },
            )
        arch_handler = get_architecture_handler(db)
        teams_manager = await get_teams_manager(db, deps.fga_manager)

        should_summarize = (
            request.query_params.get("summarized", "false").lower() == "true"
        )

        return await arch_handler.get_architecture_access(
            user_id,
            id,
            authz,
            arch_manager,
            auth0_manager,
            teams_manager,
            should_summarize,
        )


@app.get("/api/architecture/{id}/environment/{env_id}/iac")
async def export_iac(
    request: Request,
    id,
    env_id,
    state: Optional[int] = None,
    accept: Annotated[Optional[str], Header()] = None,
):
    async with SessionLocal.begin() as db:
        authz: AuthzService = deps.authz_service
        user_id = await get_user_id(request)
        authorized = await authz.can_read_architecture(User(id=user_id), id)
        if not authorized:
            raise AuthError(
                detail=f"User {user_id} is not authorized to read architecture {id}",
                error={
                    "code": "unauthorized",
                    "description": f"User is not authorized to write to architecture {id}",
                },
            )
        iac_handler = get_iac_orchestrator(db)
        return await iac_handler.get_iac(id, env_id, state, accept)


@app.post("/api/architecture/{id}/environment/{env_id}/run")
async def run(
    request: Request,
    id,
    env_id,
    state: int,
    body: CopilotRunRequest,
):
    async with SessionLocal.begin() as db:
        authz: AuthzService = deps.authz_service
        user_id = await get_user_id(request)
        authorized = await authz.can_write_to_architecture(User(id=user_id), id)
        if not authorized:
            raise AuthError(
                detail=f"User {user_id} is not authorized to write to architecture {id}",
                error={
                    "code": "unauthorized",
                    "description": f"User is not authorized to write to architecture {id}",
                },
            )
        accept = request.headers.get("accept")
        engine = get_engine_orchestrator(db)
        return await engine.run(id, env_id, state, body, accept)


@app.post("/api/architecture/{id}/environment/{env_id}/valid-edge-targets")
async def get_valid_edge_targets(
    request: Request,
    id,
    env_id,
    state: int,
    body: CopilotGetValidEdgeTargetsRequest,
):
    async with SessionLocal.begin() as db:
        authz: AuthzService = deps.authz_service
        user_id = await get_user_id(request)
        authorized = await authz.can_read_architecture(User(id=user_id), id)
        if not authorized:
            raise AuthError(
                detail=f"User {user_id} is not authorized to write to architecture {id}",
                error={
                    "code": "unauthorized",
                    "description": f"User is not authorized to write to architecture {id}",
                },
            )
        accept = request.headers.get("accept")
        edge_targets = get_edge_target_handler(db)
        return await edge_targets.get_valid_edge_targets(
            id, env_id, state, body, accept
        )


@app.get("/api/architecture/{id}/environment/{env_id}")
async def get_current_version(
    request: Request,
    id: str,
    env_id: str,
):
    async with SessionLocal.begin() as db:
        authz: AuthzService = deps.authz_service
        user_id = await get_user_id(request)
        authorized = await authz.can_read_architecture(User(id=user_id), id)
        if not authorized:
            raise AuthError(
                detail=f"User {user_id} is not authorized to read architecture {id}",
                error={
                    "code": "unauthorized",
                    "description": f"User is not authorized to write to architecture {id}",
                },
            )
        accept = request.headers.get("accept")
        arch_handler = get_architecture_handler(db)
        return await arch_handler.get_version(id, env_id, accept)


class SetCurrentVersionRequest(BaseModel):
    version: int


@app.post("/api/architecture/{id}/environment/{env_id}")
async def set_current_version(
    request: Request,
    id: str,
    env_id: str,
    body: SetCurrentVersionRequest,
):
    async with SessionLocal.begin() as db:
        authz: AuthzService = deps.authz_service
        user_id = await get_user_id(request)
        authorized = await authz.can_write_to_architecture(User(id=user_id), id)
        if not authorized:
            raise AuthError(
                detail=f"User {user_id} is not authorized to read architecture {id}",
                error={
                    "code": "unauthorized",
                    "description": f"User is not authorized to write to architecture {id}",
                },
            )
        arch_handler = get_architecture_handler(db)
        return await arch_handler.set_current_version(id, env_id, body.version)


@app.get("/api/architecture/{id}/environment/{env_id}/prev")
async def get_previous_state(
    request: Request,
    id: str,
    env_id: str,
    version: int,
):
    async with SessionLocal.begin() as db:
        authz: AuthzService = deps.authz_service
        user_id = await get_user_id(request)
        authorized = await authz.can_read_architecture(User(id=user_id), id)
        if not authorized:
            raise AuthError(
                detail=f"User {user_id} is not authorized to read architecture {id}",
                error={
                    "code": "unauthorized",
                    "description": f"User is not authorized to write to architecture {id}",
                },
            )
        accept = request.headers.get("accept")
        arch_handler = get_architecture_handler(db)
        return await arch_handler.get_environments_previous_state(
            id, env_id, version, accept
        )


@app.get("/api/architecture/{id}/environment/{env_id}/next")
async def get_next_state(
    request: Request,
    id: str,
    env_id: str,
    version: int,
):
    async with SessionLocal.begin() as db:
        authz: AuthzService = deps.authz_service
        user_id = await get_user_id(request)
        authorized = await authz.can_read_architecture(User(id=user_id), id)
        if not authorized:
            raise AuthError(
                detail=f"User {user_id} is not authorized to read architecture {id}",
                error={
                    "code": "unauthorized",
                    "description": f"User is not authorized to write to architecture {id}",
                },
            )
        accept = request.headers.get("accept")
        arch_handler = get_architecture_handler(db)
        return await arch_handler.get_environments_next_state(
            id, env_id, version, accept
        )


@app.get("/api/architecture/{id}/environment/{env_id}/resource_types")
async def get_resource_types(
    request: Request,
    id: str,
    env_id: str,
):
    async with SessionLocal.begin() as db:
        authz: AuthzService = deps.authz_service
        user_id = await get_user_id(request)
        authorized = await authz.can_read_architecture(User(id=user_id), id)
        if not authorized:
            raise AuthError(
                detail=f"User {user_id} is not authorized to read architecture {id}",
                error={
                    "code": "unauthorized",
                    "description": f"User is not authorized to write to architecture {id}",
                },
            )
        engine = get_engine_orchestrator(db)
        return await engine.get_resource_types(id, env_id)


@app.exception_handler
def handle_auth_error(ex: AuthError):
    response = JSONResponse(content=ex.error, status_code=ex.status_code)
    return response


if os.getenv("PROFILING", "false").lower() == "true":

    @app.on_event("startup")
    async def startup_event():
        loop = asyncio.get_event_loop()
        loop.set_debug(True)
        loop.slow_callback_duration = 0.001

    @app.middleware("http")
    async def profile_request(request: Request, call_next: Callable):
        """Profile the current request"""
        # we map a profile type to a file extension, as well as a pyinstrument profile renderer
        profile_type_to_ext = {"html": "html", "speedscope": "speedscope.json"}
        profile_type_to_renderer = {
            "html": HTMLRenderer,
            "speedscope": SpeedscopeRenderer,
        }

        # if the `profile=true` HTTP query argument is passed, we profile the request
        if request.query_params.get("profile", False):
            # The default profile format is speedscope
            profile_type = request.query_params.get(
                "profile_format", "speedscope"
            ).lower()

            # we profile the request along with all additional middlewares, by interrupting
            # the program every 1ms1 and records the entire stack at that point
            with Profiler(interval=0.001, async_mode="enabled") as profiler:
                response = await call_next(request)

            # we dump the profiling into a file
            extension = profile_type_to_ext[profile_type]
            renderer = profile_type_to_renderer[profile_type]()
            path = request.url.path.replace("/", "_")
            with open(
                f"profile_{request.query_params.get('profile_name', 'request')}_{path}.{extension}",
                "w",
            ) as out:
                out.write(profiler.output(renderer=renderer))

            # we dump the profiling into a file
            extension = "html"
            renderer = profile_type_to_renderer["html"]()
            path = request.url.path.replace("/", "_")
            with open(
                f"profile_{request.query_params.get('profile_name', 'request')}_{path}.{extension}",
                "w",
            ) as out:
                out.write(profiler.output(renderer=renderer))
            return response

        # Proceed without profiling
        return await call_next(request)


@app.post("/api/chat-signup")
async def chat_signup(request: Request):
    auth0: Auth0Manager = deps.auth0_manager
    user_id = await get_user_id(request)
    auth0.update_user(user_id, {"app_metadata": {"chat_signup": True}})


class ChatRequest(BaseModel):
    version: int
    message: str


@app.post("/api/architecture/{id}/environment/{env_id}/message")
async def message_conversation(
    body: ChatRequest,
    request: Request,
    id: str,
    env_id: str,
):
    authz: AuthzService = deps.authz_service
    user_id = await get_user_id(request)
    authorized = await authz.can_read_architecture(User(id=user_id), id)
    if not authorized:
        raise AuthError(
            detail=f"User {user_id} is not authorized to read architecture {id}",
            error={
                "code": "unauthorized",
                "description": f"User is not authorized to write to architecture {id}",
            },
        )
    accept = request.headers.get("accept")
    logger.info(
        f"Got request for POST /api/architecture/{id}/environment/{env_id}/message"
    )
    # If the request doesnt have a body.id, it is a new thread so generate a random uuid for the body.id
    # if body.id is None or body.id == "":
    #     body.id = str(uuid.uuid4())
    # if body.message_id is None or body.message_id == "":
    #     body.message_id = str(uuid.uuid4())

    async with SessionLocal.begin() as db:
        try:
            engine = get_engine_orchestrator(db)
            payload, engine_failure = await engine.handle_message(
                architecture_id=id,
                env_id=env_id,
                message=body.message,
                version=body.version,
            )

            if engine_failure:
                return Response(
                    status_code=400,
                    content=jsons.dumps(engine_failure),
                )

            return Response(
                headers={
                    "Content-Type": (
                        "application/octet-stream"
                        if accept == "application/octet-stream"
                        else "application/json"
                    )
                },
                content=payload.model_dump(mode="json"),
            )
        except EnvironmentVersionNotLatestError:
            raise HTTPException(
                status_code=400, detail="Environment version is not the latest"
            )
        except TopologicalChangesNotAllowed as e:
            content = {
                "error_type": e.error_type,
                "environment": e.env_id,
            }
            if e.constraints is not None:
                content["constraints"] = e.constraints
            if e.diff is not None:
                content["diff"] = e.diff.__dict__()
            return Response(status_code=400, content=jsons.dumps(content))
        except ArchitectureStateDoesNotExistError:
            raise HTTPException(
                status_code=404,
                detail=f"No architecture exists for id {id}",
            )
        except EnvironmentVersionDoesNotExistError:
            raise HTTPException(
                status_code=404,
                detail=f"No environment version exists for id {id} environment {env_id} and version {body.version}",
            )
        except Exception:
            logger.error("Error running engine", exc_info=True)
            raise HTTPException(status_code=500, detail="internal server error")
