import logging
import jsons
import uuid
import time
from fastapi import HTTPException, Response
from fastapi.responses import JSONResponse
from typing import List, Optional
from pydantic import BaseModel
from src.engine_service.engine_commands.get_resource_types import (
    GetResourceTypesRequest,
    get_resource_types,
)
from src.guardrails_manager.guardrails_store import get_guardrails
from src.state_manager.architecture_data import (
    get_architecture_latest,
    add_architecture,
    Architecture,
)
from src.state_manager.architecture_storage import (
    get_state_from_fs,
    ArchitectureStateDoesNotExistError,
)


log = logging.getLogger(__name__)


class ArchitecutreStateNotLatestError(Exception):
    pass


class CreateArchitectureRequest(BaseModel):
    name: str
    owner: str
    engine_version: float


async def copilot_new_architecture(body: CreateArchitectureRequest):
    try:
        id = str(uuid.uuid4())
        architecture = Architecture(
            id=id,
            name=body.name,
            state=0,
            constraints={},
            owner=body.owner,
            created_at=int(time.time()),
            updated_by=body.owner,
            engine_version=body.engine_version,
        )
        await add_architecture(architecture)
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
        return Response(
            headers={
                "Content-Type": "application/octet-stream"
                if accept == "application/octet-stream"
                else "application/json"
            },
            content=jsons.dumps(
                {
                    "id": arch.id,
                    "name": arch.name,
                    "owner": arch.owner,
                    "engineVersion": arch.engine_version,
                    "version": arch.state if arch.state is not None else 0,
                    "state": {
                        "resources_yaml": state.resources_yaml,
                        "topology_yaml": state.topology_yaml,
                    }
                    if state is not None
                    else None,
                }
            ),
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
        return JSONResponse(content=response, status_code=200)
    except ArchitectureStateDoesNotExistError as e:
        raise HTTPException(
            status_code=404, detail=f"No architecture exists for id {id}"
        )
    except Exception:
        log.error("Error getting resource types", exc_info=True)
        raise HTTPException(status_code=500, detail="internal server error")
