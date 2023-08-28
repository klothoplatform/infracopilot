# @klotho::execution_unit {
#    id = "Backend-Api"
# }

import base64
import time
import uuid
from contextlib import asynccontextmanager
from typing import Optional, Annotated, List, Dict

import jsons
import yaml
from fastapi import FastAPI, Response, BackgroundTasks, Header, HTTPException
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from src.engine_service.engine_commands.util import EngineRunner
from src.guardrails_manager.guardrails_store import get_guardrails

from src.state_manager.architecture_storage import ArchitectureStateDoesNotExistError, get_state_from_fs, write_state_to_fs
from src.state_manager.architecture_data import get_architecture_latest, Architecture, add_architecture, get_architecture_history
from src.template_manager.template_data import ResourceTemplateData, EdgeTemplateData
from src.engine_service.engine_commands.run import run_engine, RunEngineRequest, RunEngineResult
from src.engine_service.engine_commands.get_resource_types import get_resource_types, GetResourceTypesRequest
from src.util.orm import Base, engine
import logging

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
    id = str(uuid.uuid4())
    architecture = Architecture(
        id=id,
        name=body.name,
        state=0,
        constraints={},
        owner= body.owner,
        created_at=int(time.time()),
        updated_by=body.owner,
        engine_version=body.engine_version,
    )
    await add_architecture(architecture)
    return JSONResponse(content={"id": id})

@app.get("/architecture/{id}")
async def copilot_get_state(id):
    try:
        arch = await get_architecture_latest(id)
        if arch is None:
            raise ArchitectureStateDoesNotExistError(f'No architecture exists for id {id}')
        state = await get_state_from_fs(arch)
        return Response(content=jsons.dumps(
            {
                "id": arch.id,
                "name": arch.name,
                "owner": arch.owner,
                "engineVersion": arch.engine_version,
                "version": arch.state if arch.state is not None else 0,
                "state": yaml.dump(state)
                if state is not None
                else None,
            }
        ))
    except ArchitectureStateDoesNotExistError as e:
        raise HTTPException(status_code=404, detail="Architecture state not found")
    except Exception as e:
        log.error("Error getting state", exc_info=True)
        raise HTTPException(status_code=500, detail="internal server error")


class ArchitecutreStateNotLatestError(Exception):
    pass

class CopilotRunRequest(BaseModel):
    constraints: List[dict]

@app.post("/architecture/{id}/run")
async def copilot_run(id: str, state: int, body: CopilotRunRequest):
    try:
        architecture = await get_architecture_latest(id)
        if architecture is None:
            raise ArchitectureStateDoesNotExistError("Architecture with id, {request.architecture_id}, does not exist")
        elif architecture.state != state:
            raise ArchitecutreStateNotLatestError(f'Architecture state is not the latest. Expected {architecture.state}, got {state}')

        guardrails = await get_guardrails(architecture.owner)
        input_graph = await get_state_from_fs(architecture)
        request = RunEngineRequest(
            id=id,
            input_graph=input_graph,
            templates=[],
            engine_version=1.0,
            constraints=body.constraints,
            guardrails=guardrails,
        )
        result = await run_engine(request, EngineRunner())
        arch = Architecture(
            id=id,
            name=architecture.name,
            state=state + 1,
            constraints=body.constraints,
            owner=architecture.owner,
            created_at=architecture.created_at,
            updated_by=architecture.owner,
            engine_version=1.0,
        )
        await add_architecture(arch)
        await write_state_to_fs(arch, result.resources_yaml)
        return Response(jsons.dumps(
            {
                "id": arch.id,
                "name": arch.name,
                "owner": arch.owner,
                "engineVersion": arch.engine_version,
                "version": arch.state if arch.state is not None else 0,
                "state": {
                    "resources_yaml": result.resources_yaml,
                    "topology_yaml": result.topology_yaml
                }
            }
        ))
    except ArchitecutreStateNotLatestError as e:
        raise HTTPException(status_code=400, detail="Architecture state is not the latest")
    except ArchitectureStateDoesNotExistError as e:
        raise HTTPException(status_code=404, detail=f'No architecture exists for id {id}')
    except Exception as e:
        log.error("Error running engine", exc_info=True)
        raise HTTPException(status_code=500, detail="internal server error")

class ResourceTypeResponse(BaseModel):
    resources: List[str]


@app.get("/architecture/{id}/resource_types")
async def copilot_get_resource_types(id):
    try:
        architecture = await get_architecture_latest(request.architecture_id)
        if architecture is None:
            raise ArchitectureStateDoesNotExistError("Architecture with id, {request.architecture_id}, does not exist")
        guardrails = await get_guardrails(architecture.owner)
        request = GetResourceTypesRequest(guardrails=guardrails)
        response = await get_resource_types(request, EngineRunner())
        return JSONResponse(content=response, status_code=200)
    except ArchitectureStateDoesNotExistError as e:
        raise HTTPException(status_code=404, detail=f'No architecture exists for id {id}')
    except Exception as e:
        log.error("Error getting resource types", exc_info=True)
        raise HTTPException(status_code=500, detail="internal server error")

