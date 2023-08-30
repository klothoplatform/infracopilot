# @klotho::execution_unit {
#    id = "Backend-Api"
# }

import logging
import time
import uuid
from typing import List

import jsons
from fastapi import FastAPI, Response, HTTPException
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

from src.engine_service.engine_commands.export_iac import (
    export_iac,
    ExportIacRequest,
)
from src.engine_service.engine_commands.get_resource_types import (
    get_resource_types,
    GetResourceTypesRequest,
)
from src.engine_service.engine_commands.run import (
    run_engine,
    RunEngineRequest,
)
from src.guardrails_manager.guardrails_store import get_guardrails
from src.state_manager.architecture_data import (
    get_architecture_latest,
    Architecture,
    add_architecture,
)
from src.state_manager.architecture_storage import (
    ArchitectureStateDoesNotExistError,
    get_iac_from_fs,
    get_state_from_fs,
    write_iac_to_fs,
    write_state_to_fs,
)
from src.util.orm import Base, engine

# @klotho::expose {
#   id = "myapi"
#   target = "public"
# }
app = FastAPI()
app.add_middleware(GZipMiddleware, minimum_size=1000)

log = logging.getLogger(__name__)

Base.metadata.create_all(engine)


@app.get("/ping")
async def ping():
    return Response(status_code=204)


class CreateArchitectureRequest(BaseModel):
    name: str
    owner: str
    engine_version: float | None


@app.post("/architecture")
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


@app.get("/architecture/{id}")
async def copilot_get_state(id):
    try:
        arch = await get_architecture_latest(id)
        if arch is None:
            raise ArchitectureStateDoesNotExistError(
                f"No architecture exists for id {id}"
            )
        state = await get_state_from_fs(arch)
        return Response(
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
            )
        )
    except ArchitectureStateDoesNotExistError:
        raise HTTPException(status_code=404, detail="Architecture state not found")
    except Exception:
        log.error("Error getting state", exc_info=True)
        raise HTTPException(status_code=500, detail="internal server error")


class ArchitecutreStateNotLatestError(Exception):
    pass


class CopilotRunRequest(BaseModel):
    constraints: List[dict]


@app.post("/architecture/{id}/run")
async def copilot_run(id: str, state: int, body: CopilotRunRequest):
    try:
        print(body)
        architecture = await get_architecture_latest(id)
        if architecture is None:
            raise ArchitectureStateDoesNotExistError(
                "Architecture with id, {request.architecture_id}, does not exist"
            )
        elif architecture.state != state:
            raise ArchitecutreStateNotLatestError(
                f"Architecture state is not the latest. Expected {architecture.state}, got {state}"
            )

        guardrails = await get_guardrails(architecture.owner)
        input_graph = await get_state_from_fs(architecture)
        request = RunEngineRequest(
            id=id,
            input_graph=input_graph.resources_yaml if input_graph is not None else None,
            templates=[],
            engine_version=1.0,
            constraints=body.constraints,
            guardrails=guardrails,
        )
        result = await run_engine(request)
        arch = Architecture(
            id=id,
            name=architecture.name,
            state=state + 1,
            constraints=body.constraints,
            owner=architecture.owner,
            created_at=architecture.created_at,
            updated_by=architecture.owner,
            engine_version=1.0,
            state_location=None,
        )
        state_location = await write_state_to_fs(arch, result)
        arch.state_location = state_location
        await add_architecture(arch)
        return Response(
            jsons.dumps(
                {
                    "id": arch.id,
                    "name": arch.name,
                    "owner": arch.owner,
                    "engineVersion": arch.engine_version,
                    "version": arch.state if arch.state is not None else 0,
                    "state": {
                        "resources_yaml": result.resources_yaml,
                        "topology_yaml": result.topology_yaml,
                    },
                }
            )
        )
    except ArchitecutreStateNotLatestError:
        raise HTTPException(
            status_code=400, detail="Architecture state is not the latest"
        )
    except ArchitectureStateDoesNotExistError:
        raise HTTPException(
            status_code=404, detail=f"No architecture exists for id {id}"
        )
    except Exception:
        log.error("Error running engine", exc_info=True)
        raise HTTPException(status_code=500, detail="internal server error")


class ResourceTypeResponse(BaseModel):
    resources: List[str]


@app.get("/architecture/{id}/resource_types")
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


@app.get("/architecture/{id}/iac")
async def copilot_get_iac(id, state: int):
    try:
        arch = await get_architecture_latest(id)

        if arch is None:
            raise ArchitectureStateDoesNotExistError(
                "Architecture with id, {request.architecture_id}, does not exist"
            )
        elif arch.state != state:
            raise ArchitecutreStateNotLatestError(
                f"Architecture state is not the latest. Expected {arch.state}, got {state}"
            )

        iac = await get_iac_from_fs(arch)
        if iac is None:
            arch_state = await get_state_from_fs(arch)
            if arch_state is None:
                raise ArchitectureStateDoesNotExistError(
                    f"No architecture exists for id {id}"
                )
            request = ExportIacRequest(
                input_graph=arch_state.resources_yaml,
                name=arch.name if arch.name is not None else arch.id,
            )
            result = await export_iac(request)
            iac = result.iac_bytes
            if iac is None:
                return Response(content="I failed to generate IaC", status_code=500)
            iac_location = await write_iac_to_fs(arch, str(iac.getvalue()))
            arch.iac_location = iac_location
            await add_architecture(arch)
            return StreamingResponse(
                iter([iac.getvalue()]),
                media_type="application/x-zip-compressed",
                headers={"Content-Disposition": f"attachment; filename=images.zip"},
            )
        return Response(content=iac)
    except ArchitecutreStateNotLatestError as e:
        raise HTTPException(
            status_code=400, detail="Architecture state is not the latest"
        )
    except ArchitectureStateDoesNotExistError as e:
        raise HTTPException(
            status_code=404, detail=f"No architecture exists for id {id}"
        )
    except Exception:
        log.error("Error getting iac", exc_info=True)
        raise HTTPException(status_code=500, detail="internal server error")
