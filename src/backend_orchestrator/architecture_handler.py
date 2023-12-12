from dataclasses import dataclass
import logging
import jsons
import uuid
import time
from fastapi import HTTPException, Response
from fastapi.responses import JSONResponse
from typing import List, Optional
from pydantic import BaseModel
from src.auth_service.main import add_architecture_owner
from src.engine_service.engine_commands.get_resource_types import (
    GetResourceTypesRequest,
    get_resource_types,
)
from src.guardrails_manager.guardrails_store import get_guardrails
from src.state_manager.architecture_data import (
    get_architecture_changelog_history,
    get_architecture_latest,
    get_previous_state,
    get_next_state,
    add_architecture,
    Architecture,
)
from src.state_manager.architecture_storage import (
    get_state_from_fs,
    write_state_to_fs,
    ArchitectureStateDoesNotExistError,
)
from src.util.entity import User
from src.state_manager.architecture_data import Architecture, get_architectures_by_owner


log = logging.getLogger(__name__)


class ArchitecutreStateNotLatestError(Exception):
    pass


class CreateArchitectureRequest(BaseModel):
    name: str
    engine_version: float
    owner: str = None


class ModifyArchitectureRequest(BaseModel):
    name: str


async def copilot_new_architecture(
    body: CreateArchitectureRequest, user_id: str = None
):
    try:
        owner = User(user_id) if body.owner is None else User(body.owner)
        id = str(uuid.uuid4())
        architecture = Architecture(
            id=id,
            name=body.name,
            state=0,
            constraints=[],
            owner=owner.to_auth_string(),
            created_at=int(time.time()),
            updated_by=owner.to_auth_string(),
            engine_version=body.engine_version,
            decisions=[],
        )
        await add_architecture(architecture)
        await add_architecture_owner(owner, id)
        return JSONResponse(content={"id": id})
    except Exception:
        log.error("Error creating new architecture", exc_info=True)
        raise HTTPException(status_code=500, detail="internal server error")


async def copilot_get_state(id: str, accept: Optional[str] = None):
    try:
        arch = await get_architecture_latest(id)
        if arch is None:
            raise ArchitectureStateDoesNotExistError(
                f"No architecture exists for id {id}"
            )
        state = await get_state_from_fs(arch)
        decisions = await get_architecture_changelog_history(id)
        payload = {
            "id": arch.id,
            "name": arch.name,
            "owner": arch.owner,
            "engineVersion": arch.engine_version,
            "version": arch.state if arch.state is not None else 0,
            "decisions": decisions,
            "state": {
                "resources_yaml": state.resources_yaml,
                "topology_yaml": state.topology_yaml,
            }
            if state is not None
            else None,
        }
        return (
            Response(
                headers={"Content-Type": "application/octet-stream"},
                content=jsons.dumps(payload),
            )
            if accept == "application/octet-stream"
            else JSONResponse(content=jsons.dump(payload))
        )
    except ArchitectureStateDoesNotExistError:
        raise HTTPException(status_code=404, detail="Architecture state not found")
    except Exception:
        log.error("Error getting state", exc_info=True)
        raise HTTPException(status_code=500, detail="internal server error")


async def copilot_get_previous_state(id: str, state: int, accept: Optional[str] = None):
    arch = await get_previous_state(id, state)
    if arch is None:
        raise HTTPException(status_code=404, detail="Architecture state not found")
    state = await get_state_from_fs(arch)
    decisions = await get_architecture_changelog_history(id)
    payload = {
        "id": arch.id,
        "name": arch.name,
        "owner": arch.owner,
        "engineVersion": arch.engine_version,
        "version": arch.state if arch.state is not None else 0,
        "decisions": decisions,
        "state": {
            "resources_yaml": state.resources_yaml,
            "topology_yaml": state.topology_yaml,
        }
        if state is not None
        else None,
    }
    return (
        Response(
            headers={"Content-Type": "application/octet-stream"},
            content=jsons.dumps(payload),
        )
        if accept == "application/octet-stream"
        else JSONResponse(content=jsons.dump(payload))
    )


async def copilot_get_next_state(id: str, state: int, accept: Optional[str] = None):
    arch = await get_next_state(id, state)
    if arch is None:
        raise HTTPException(status_code=404, detail="Architecture state not found")
    state = await get_state_from_fs(arch)
    decisions = await get_architecture_changelog_history(id)
    payload = {
        "id": arch.id,
        "name": arch.name,
        "owner": arch.owner,
        "engineVersion": arch.engine_version,
        "version": arch.state if arch.state is not None else 0,
        "decisions": decisions,
        "state": {
            "resources_yaml": state.resources_yaml,
            "topology_yaml": state.topology_yaml,
        }
        if state is not None
        else None,
    }
    return (
        Response(
            headers={"Content-Type": "application/octet-stream"},
            content=jsons.dumps(payload),
        )
        if accept == "application/octet-stream"
        else JSONResponse(content=jsons.dump(payload))
    )


async def rename_architecture(id: str, name: str, accept: Optional[str] = None):
    try:
        arch = await get_architecture_latest(id)
        if arch is None:
            raise ArchitectureStateDoesNotExistError(
                f"No architecture exists for id {id}"
            )
        arch.name = name
        arch.state += 1
        arch.iac_location = None
        await add_architecture(arch)
        state = await get_state_from_fs(arch)
        decisions = await get_architecture_changelog_history(id)
        payload = {
            "id": arch.id,
            "name": name,
            "owner": arch.owner,
            "engineVersion": arch.engine_version,
            "version": arch.state if arch.state is not None else 0,
            "decisions": decisions,
            "state": {
                "resources_yaml": state.resources_yaml,
                "topology_yaml": state.topology_yaml,
            }
            if state is not None
            else None,
        }
        return (
            Response(
                headers={"Content-Type": "application/octet-stream"},
                content=jsons.dumps(payload),
            )
            if accept == "application/octet-stream"
            else JSONResponse(content=jsons.dump(payload))
        )
    except ArchitectureStateDoesNotExistError:
        raise HTTPException(status_code=404, detail="Architecture state not found")
    except Exception:
        log.error("Error getting state", exc_info=True)
        raise HTTPException(status_code=500, detail="internal server error")


class ResourceTypeResponse(BaseModel):
    resources: List[str]


async def copilot_get_resource_types(id):
    try:
        architecture = await get_architecture_latest(id)
        if architecture is None:
            raise ArchitectureStateDoesNotExistError(
                "Architecture with id, {request.architecture_id}, does not exist"
            )
        guardrails = await get_guardrails(architecture.owner)
        request = GetResourceTypesRequest(guardrails=guardrails)
        response = await get_resource_types(request)
        return Response(content=response, media_type="application/json")
    except ArchitectureStateDoesNotExistError as e:
        raise HTTPException(
            status_code=404, detail=f"No architecture exists for id {id}"
        )
    except Exception:
        log.error("Error getting resource types", exc_info=True)
        raise HTTPException(status_code=500, detail="internal server error")


@dataclass
class CleanedArchitectures:
    id: str
    name: str
    version: int
    owner: str
    created_at: int
    updated_at: int
    updated_by: str


class ListArchitecturesResponse(BaseModel):
    architectures: List[CleanedArchitectures]


async def copilot_list_architectures(user_id: str):
    try:
        architectures = await get_architectures_by_owner(User(user_id))
        cleaned_architectures = []
        for arch in architectures:
            if arch.id in [arch.id for arch in cleaned_architectures]:
                continue
            arch = await get_architecture_latest(arch.id)
            cleaned_architectures.append(
                CleanedArchitectures(
                    id=arch.id,
                    name=arch.name,
                    owner=arch.owner,
                    version=arch.state,
                    created_at=arch.created_at,
                    updated_at=arch.updated_at,
                    updated_by=arch.updated_by,
                )
            )
        return JSONResponse(
            content=jsons.dump({"architectures": cleaned_architectures})
        )
    except Exception:
        log.error("Error listing architectures", exc_info=True)
        raise HTTPException(status_code=500, detail="internal server error")


class CloneArchitectureRequest(BaseModel):
    name: str
    owner: str = None


async def copilot_clone_architecture(user_id: str, id: str, name: str, owner: str):
    try:
        owner = User(user_id) if owner is None else User(owner)
        architecture = await get_architecture_latest(id)
        if architecture is None:
            raise ArchitectureStateDoesNotExistError(
                f"No architecture exists for id {id}"
            )
        newArch = Architecture(
            id=str(uuid.uuid4()),
            name=name,
            state=0,
            constraints=[],
            owner=owner.to_auth_string(),
            created_at=int(time.time()),
            updated_by=User(user_id).to_auth_string(),
            engine_version=architecture.engine_version,
            decisions=[],
        )
        state = await get_state_from_fs(arch=architecture)
        if state:
            state_location = await write_state_to_fs(newArch, state)
            newArch.state_location = state_location
        await add_architecture(newArch)
        await add_architecture_owner(owner, newArch.id)
        return JSONResponse(content={"id": newArch.id})
    except Exception:
        log.error("Error cloning architecture", exc_info=True)
        raise HTTPException(status_code=500, detail="internal server error")
