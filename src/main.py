import asyncio
import os
import uuid
from typing import Annotated, Optional, Callable

from fastapi import FastAPI, Response, Header
from fastapi import Request
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.params import Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from pyinstrument import Profiler
from pyinstrument.renderers import HTMLRenderer, SpeedscopeRenderer
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth_service.sharing_manager import SharingManager
from src.auth_service.auth0_manager import Auth0Manager
from src.auth_service.entity import User
from src.auth_service.main import (
    AuthzService,
)
from src.auth_service.token import PUBLIC_USER, AuthError, get_user_id
from src.backend_orchestrator.architecture_handler import (
    CloneArchitectureRequest,
    ModifyArchitectureRequest,
    CreateArchitectureRequest,
    ShareArchitectureRequest,
)
from src.backend_orchestrator.get_valid_edge_targets_handler import (
    CopilotGetValidEdgeTargetsRequest,
)
from src.backend_orchestrator.run_engine_handler import CopilotRunRequest
from src.backend_orchestrator.teams_api import router as teams_router
from src.dependency_injection.injection import (
    get_architecture_handler,
    get_db,
    get_edge_target_handler,
    get_iac_orchestrator,
    get_engine_orchestrator,
    get_authz_service,
    get_architecture_manager,
    get_auth0_manager,
    get_teams_manager,
)
from src.util.logging import logger

app = FastAPI()
app.add_middleware(GZipMiddleware, minimum_size=1000)

logger.debug("Starting API")

app.include_router(teams_router)


@app.get("/api/ping")
async def ping():
    return Response(status_code=204)


@app.post("/api/architecture")
async def new_architecture(
    request: Request,
    body: CreateArchitectureRequest,
    db: AsyncSession = Depends(get_db),
    authz: AuthzService = Depends(get_authz_service),
):
    user_id = get_user_id(request)
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
    db: AsyncSession = Depends(get_db),
):
    user_id = get_user_id(request)
    arch_handler = get_architecture_handler(db)
    return await arch_handler.list_architectures(user_id)


@app.get("/api/architecture/{id}")
async def get_architecture(
    request: Request,
    id: str,
    db: AsyncSession = Depends(get_db),
    authz: AuthzService = Depends(get_authz_service),
):
    user_id = get_user_id(request)
    authorized = await authz.can_read_architecture(User(id=user_id), id)
    print(authorized)
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
    db: AsyncSession = Depends(get_db),
    authz: AuthzService = Depends(get_authz_service),
):
    user_id = get_user_id(request)
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
    db: AsyncSession = Depends(get_db),
    authz: AuthzService = Depends(get_authz_service),
):
    user_id = get_user_id(request)
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
    db: AsyncSession = Depends(get_db),
    authz: AuthzService = Depends(get_authz_service),
):
    user_id = get_user_id(request)
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
    db: AsyncSession = Depends(get_db),
    authz: AuthzService = Depends(get_authz_service),
    arch_manager: SharingManager = Depends(get_architecture_manager),
):
    user_id: str = get_user_id(request)
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
    db: AsyncSession = Depends(get_db),
    authz: AuthzService = Depends(get_authz_service),
    arch_manager: SharingManager = Depends(get_architecture_manager),
    auth0_manager: Auth0Manager = Depends(get_auth0_manager),
):
    user_id: str = get_user_id(request)
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
    teams_manager = await get_teams_manager(db)

    should_summarize = request.query_params.get("summarized", "false").lower() == "true"

    return await arch_handler.get_architecture_access(
        user_id, id, authz, arch_manager, auth0_manager, teams_manager, should_summarize
    )


@app.get("/api/architecture/{id}/environment/{env_id}/iac")
async def export_iac(
    request: Request,
    id,
    env_id,
    state: int,
    accept: Annotated[Optional[str], Header()] = None,
    db: AsyncSession = Depends(get_db),
    authz: AuthzService = Depends(get_authz_service),
):
    user_id = get_user_id(request)
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
    db: AsyncSession = Depends(get_db),
    authz: AuthzService = Depends(get_authz_service),
):
    user_id = get_user_id(request)
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
    db: AsyncSession = Depends(get_db),
    authz: AuthzService = Depends(get_authz_service),
):
    user_id = get_user_id(request)
    print(user_id, id)
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
    return await edge_targets.get_valid_edge_targets(id, env_id, state, body, accept)


@app.get("/api/architecture/{id}/environment/{env_id}")
async def get_current_version(
    request: Request,
    id: str,
    env_id: str,
    db: AsyncSession = Depends(get_db),
    authz: AuthzService = Depends(get_authz_service),
):
    user_id = get_user_id(request)
    authorized = await authz.can_read_architecture(User(id=user_id), id)
    print(authorized)
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
    db: AsyncSession = Depends(get_db),
    authz: AuthzService = Depends(get_authz_service),
):
    user_id = get_user_id(request)
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
    db: AsyncSession = Depends(get_db),
    authz: AuthzService = Depends(get_authz_service),
):
    user_id = get_user_id(request)
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
    db: AsyncSession = Depends(get_db),
    authz: AuthzService = Depends(get_authz_service),
):
    user_id = get_user_id(request)
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
    return await arch_handler.get_environments_next_state(id, env_id, version, accept)


@app.get("/api/architecture/{id}/environment/{env_id}/resource_types")
async def get_resource_types(
    request: Request,
    id: str,
    env_id: str,
    db: AsyncSession = Depends(get_db),
    authz: AuthzService = Depends(get_authz_service),
):
    user_id = get_user_id(request)
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
            with open(
                f"profile_{request.query_params.get('profile_name', 'request')}.{extension}",
                "w",
            ) as out:
                out.write(profiler.output(renderer=renderer))
            return response

        # Proceed without profiling
        return await call_next(request)
