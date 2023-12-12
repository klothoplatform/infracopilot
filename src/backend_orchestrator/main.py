# @klotho::execution_unit {
#    id = "main"
# }
import logging
from typing import Annotated, Optional

from fastapi import FastAPI, Response, Header
from fastapi import Request
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from src.auth_service.main import can_read_architecture, can_write_to_architecture
from src.auth_service.token import PUBLIC_USER, AuthError, get_user_id
from src.backend_orchestrator.architecture_handler import (
    CloneArchitectureRequest,
    ModifyArchitectureRequest,
    copilot_clone_architecture,
    copilot_get_state,
    copilot_get_resource_types,
    copilot_list_architectures,
    copilot_new_architecture,
    copilot_get_next_state,
    copilot_get_previous_state,
    rename_architecture,
    CreateArchitectureRequest,
    rename_architecture,
)
from src.backend_orchestrator.get_valid_edge_targets_handler import (
    CopilotGetValidEdgeTargetsRequest,
    copilot_get_valid_edge_targets,
)
from src.backend_orchestrator.iac_handler import copilot_get_iac
from src.backend_orchestrator.run_engine_handler import copilot_run, CopilotRunRequest
from src.state_manager.architecture_data import (
    delete_architecture as copilot_delete_architecture,
)
from src.util.entity import User
from src.util.orm import Base, engine

# @klotho::expose {
#   id = "myapi"
#   target = "public"
# }
app = FastAPI()
app.add_middleware(GZipMiddleware, minimum_size=1000)

log = logging.getLogger(__name__)

Base.metadata.create_all(engine)


@app.get("/api/ping")
async def ping():
    return Response(status_code=204)


@app.get("/api/architecture/{id}/iac")
async def export_iac(
    request: Request, id, state: int, accept: Annotated[Optional[str], Header()] = None
):
    user_id = get_user_id(request)
    authorized = await can_read_architecture(User(id=user_id), id)
    if not authorized:
        raise AuthError(
            detail=f"User {user_id} is not authorized to read architecture {id}",
            error={
                "code": "unauthorized",
                "description": f"User is not authorized to write to architecture {id}",
            },
        )
    return await copilot_get_iac(id, state, accept)


@app.post("/api/architecture/{id}/run")
async def run(
    request: Request,
    id,
    state: int,
    body: CopilotRunRequest,
):
    user_id = get_user_id(request)
    authorized = await can_write_to_architecture(User(id=user_id), id)
    if not authorized:
        raise AuthError(
            detail=f"User {user_id} is not authorized to write to architecture {id}",
            error={
                "code": "unauthorized",
                "description": f"User is not authorized to write to architecture {id}",
            },
        )
    accept = request.headers.get("accept")
    print(body)
    return await copilot_run(id, state, body, accept)


@app.post("/api/architecture/{id}/valid-edge-targets")
async def get_valid_edge_targets(
    request: Request, id, state: int, body: CopilotGetValidEdgeTargetsRequest
):
    user_id = get_user_id(request)
    authorized = await can_read_architecture(User(id=user_id), id)
    if not authorized:
        raise AuthError(
            detail=f"User {user_id} is not authorized to write to architecture {id}",
            error={
                "code": "unauthorized",
                "description": f"User is not authorized to write to architecture {id}",
            },
        )
    accept = request.headers.get("accept")
    return await copilot_get_valid_edge_targets(id, state, body, accept)


@app.post("/api/architecture")
async def new_architecture(request: Request, body: CreateArchitectureRequest):
    user_id = get_user_id(request)
    if user_id == PUBLIC_USER:
        raise AuthError(
            detail=f"User {user_id} is not authorized to create architectures",
            error={
                "code": "unauthorized",
                "description": f"User is not authorized to write to architecture {id}",
            },
        )
    return await copilot_new_architecture(body, user_id)


@app.get("/api/architecture/{id}")
async def get_state(request: Request, id: str):
    user_id = get_user_id(request)
    authorized = await can_read_architecture(User(id=user_id), id)
    if not authorized:
        raise AuthError(
            detail=f"User {user_id} is not authorized to read architecture {id}",
            error={
                "code": "unauthorized",
                "description": f"User is not authorized to write to architecture {id}",
            },
        )
    accept = request.headers.get("accept")
    return await copilot_get_state(id, accept)


@app.get("/api/architecture/{id}/{state}/prev")
async def get_previous_state(request: Request, id: str, state: int):
    user_id = get_user_id(request)
    authorized = await can_read_architecture(User(id=user_id), id)
    if not authorized:
        raise AuthError(
            detail=f"User {user_id} is not authorized to read architecture {id}",
            error={
                "code": "unauthorized",
                "description": f"User is not authorized to write to architecture {id}",
            },
        )
    accept = request.headers.get("accept")
    return await copilot_get_previous_state(id, state, accept)


@app.get("/api/architecture/{id}/{state}/next")
async def get_previous_state(request: Request, id: str, state: int):
    user_id = get_user_id(request)
    authorized = await can_read_architecture(User(id=user_id), id)
    if not authorized:
        raise AuthError(
            detail=f"User {user_id} is not authorized to read architecture {id}",
            error={
                "code": "unauthorized",
                "description": f"User is not authorized to write to architecture {id}",
            },
        )
    accept = request.headers.get("accept")
    return await copilot_get_next_state(id, state, accept)


@app.get("/api/architecture/{id}/resource_types")
async def get_resource_types(request: Request, id: str):
    user_id = get_user_id(request)
    authorized = await can_read_architecture(User(id=user_id), id)
    if not authorized:
        raise AuthError(
            detail=f"User {user_id} is not authorized to read architecture {id}",
            error={
                "code": "unauthorized",
                "description": f"User is not authorized to write to architecture {id}",
            },
        )
    return await copilot_get_resource_types(id)


@app.post("/api/architecture/{id}")
async def modify_architecture(
    request: Request, id: str, body: ModifyArchitectureRequest
):
    user_id = get_user_id(request)
    authorized = await can_write_to_architecture(User(id=user_id), id)
    if not authorized:
        raise AuthError(
            detail=f"User {user_id} is not authorized to modify architecture {id}",
            error={
                "code": "unauthorized",
                "description": f"User is not authorized to modify architecture {id}",
            },
        )
    return await rename_architecture(id, body.name)


@app.post("/api/architecture/{id}/clone")
async def clone_architecture(request: Request, id: str, body: CloneArchitectureRequest):
    user_id = get_user_id(request)
    authorized = await can_read_architecture(User(id=user_id), id)
    if not authorized:
        raise AuthError(
            detail=f"User {user_id} is not authorized to modify architecture {id}",
            error={
                "code": "unauthorized",
                "description": f"User is not authorized to modify architecture {id}",
            },
        )
    return await copilot_clone_architecture(user_id, id, body.name, body.owner)


@app.delete("/api/architecture/{id}")
async def delete_architecture(request: Request, id: str):
    user_id = get_user_id(request)
    authorized = await can_write_to_architecture(User(id=user_id), id)
    if not authorized:
        raise AuthError(
            detail=f"User {user_id} is not authorized to delete architecture {id}",
            error={
                "code": "unauthorized",
                "description": f"User is not authorized to delete architecture {id}",
            },
        )
    return await copilot_delete_architecture(id)


@app.get("/api/architectures")
async def list_architectures(request: Request):
    user_id = get_user_id(request)
    return await copilot_list_architectures(user_id)


@app.exception_handler
def handle_auth_error(ex: AuthError):
    response = JSONResponse(content=ex.error, status_code=ex.status_code)
    return response
