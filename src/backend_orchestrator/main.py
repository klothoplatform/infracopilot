# @klotho::execution_unit {
#    id = "main"
# }
import logging
from typing import Annotated

from fastapi import FastAPI, Response, Header
from fastapi.middleware.gzip import GZipMiddleware
from src.util.orm import Base, engine
from src.backend_orchestrator.architecture_handler import (
    copilot_get_state,
    copilot_get_resource_types,
    copilot_new_architecture,
    CreateArchitectureRequest,
)
from src.backend_orchestrator.iac_handler import copilot_get_iac
from src.backend_orchestrator.run_engine_handler import copilot_run, CopilotRunRequest

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


@app.get("/architecture/{id}/iac")
async def export_iac(id, state: int, accept: Annotated[str | None, Header()] = None):
    return await copilot_get_iac(id, state, accept)


@app.post("/architecture/{id}/run")
async def run(
    id,
    state: int,
    body: CopilotRunRequest,
    accept: Annotated[str | None, Header()] = None,
):
    return await copilot_run(id, state, body)


@app.post("/architecture")
async def new_architecture(body: CreateArchitectureRequest):
    return await copilot_new_architecture(body)


@app.get("/architecture/{id}")
async def get_state(id: str, accept: Annotated[str | None, Header()] = None):
    return await copilot_get_state(id, accept)


@app.get("/architecture/{id}/resource_types")
async def get_resource_types(id: str):
    return await copilot_get_resource_types(id)
