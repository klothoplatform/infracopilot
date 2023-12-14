import logging
from typing import List, Optional

import jsons
from fastapi import HTTPException, Response
from pydantic import BaseModel

from src.backend_orchestrator.architecture_handler import (
    ArchitecutreStateNotLatestError,
)
from src.engine_service.binaries.fetcher import write_binary_to_disk, Binary
from src.engine_service.engine_commands.run import (
    FailedRunException,
    run_engine,
    RunEngineRequest,
)
from src.guardrails_manager.guardrails_store import get_guardrails
from src.state_manager.architecture_data import (
    delete_future_states,
    get_architecture_at_state,
    get_architecture_latest,
    get_architecture_current,
    add_architecture,
    Architecture,
)
from src.state_manager.architecture_storage import (
    get_state_from_fs,
    write_state_to_fs,
    ArchitectureStateDoesNotExistError,
)

log = logging.getLogger(__name__)


class CopilotRunRequest(BaseModel):
    constraints: List[dict]
    overwrite: bool = False


async def copilot_run(
    id: str, state: int, body: CopilotRunRequest, accept: Optional[str] = None
):
    try:
        current_architecture = await get_architecture_current(id)
        if current_architecture is None:
            raise ArchitectureStateDoesNotExistError(
                "Architecture with id, {id}, does not exist"
            )
        if not body.overwrite:
            architecture = current_architecture
            if architecture.state != state:
                raise ArchitecutreStateNotLatestError(
                    f"Architecture state is not the latest. Expected {architecture.state}, got {state}"
                )
        else:
            architecture = await get_architecture_at_state(id, state)
            if architecture is None:
                raise ArchitectureStateDoesNotExistError(
                    "Architecture with id, {id}, and state, {state} does not exist"
                )

        guardrails = await get_guardrails(architecture.owner)
        input_graph = await get_state_from_fs(architecture)
        await write_binary_to_disk(Binary.ENGINE)
        request = RunEngineRequest(
            id=id,
            input_graph=input_graph.resources_yaml if input_graph is not None else None,
            templates=[],
            engine_version=1.0,
            constraints=body.constraints,
            guardrails=guardrails,
        )
        result = await run_engine(request)
        latest_architecture = await get_architecture_latest(id)
        arch = Architecture(
            id=id,
            name=architecture.name,
            state=latest_architecture.state + 1,
            constraints=body.constraints,
            owner=architecture.owner,
            created_at=architecture.created_at,
            updated_by=architecture.owner,
            engine_version=1.0,
            state_location=None,
        )
        if body.overwrite:
            print(f"deleting any architecture for id {id} greater than state {state}")
            await delete_future_states(id, state)
        state_location = await write_state_to_fs(arch, result)
        arch.state_location = state_location
        await add_architecture(arch)
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
                    "version": arch.state,
                    "state": {
                        "resources_yaml": result.resources_yaml,
                        "topology_yaml": result.topology_yaml,
                    },
                    "config_errors": result.config_errors_json,
                }
            ),
        )
    except FailedRunException as e:
        print(
            jsons.dumps(
                {
                    "error_type": e.error_type,
                    "config_errors": e.config_errors_json,
                }
            )
        )
        return Response(
            status_code=400,
            content=jsons.dumps(
                {
                    "error_type": e.error_type,
                    "config_errors": e.config_errors_json,
                }
            ),
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
