import logging
from typing import Optional

import jsons
from fastapi import HTTPException, Response
from pydantic import BaseModel

from src.backend_orchestrator.architecture_handler import (
    ArchitecutreStateNotLatestError,
)
from src.engine_service.binaries.fetcher import write_binary_to_disk, Binary
from src.engine_service.engine_commands.get_valid_edge_targets import (
    GetValidEdgeTargetsRequest,
    get_valid_edge_targets,
)
from src.guardrails_manager.guardrails_store import get_guardrails
from src.state_manager.architecture_data import (
    get_architecture_latest,
    get_architecture_current,
)
from src.state_manager.architecture_storage import (
    get_state_from_fs,
    ArchitectureStateDoesNotExistError,
)

log = logging.getLogger(__name__)


class CopilotGetValidEdgeTargetsRequest(BaseModel):
    config: dict


async def copilot_get_valid_edge_targets(
    id: str,
    state: int,
    body: CopilotGetValidEdgeTargetsRequest,
    accept: Optional[str] = None,
):
    try:
        architecture = await get_architecture_current(id)
        if architecture is None:
            raise ArchitectureStateDoesNotExistError(
                "Architecture with id, {request.architecture_id}, does not exist"
            )
        if architecture.state != state:
            raise ArchitecutreStateNotLatestError(
                f"Architecture state is not current. Expected {architecture.state}, got {state}"
            )
        valid_edge_targets = []
        if architecture.state_location is not None:
            guardrails = await get_guardrails(architecture.owner)
            input_graph = await get_state_from_fs(architecture)
            await write_binary_to_disk(Binary.ENGINE)
            request = GetValidEdgeTargetsRequest(
                id=id,
                input_graph=input_graph.resources_yaml
                if input_graph is not None
                else None,
                engine_version=1.0,
                config=body.config,
                # guardrails=guardrails,
            )
            result = await get_valid_edge_targets(request)
            valid_edge_targets = result.valid_edge_targets
        return Response(
            headers={
                "Content-Type": "application/octet-stream"
                if accept == "application/octet-stream"
                else "application/json"
            },
            content=jsons.dumps(
                {
                    "id": architecture.id,
                    "version": architecture.state
                    if architecture.state is not None
                    else 0,
                    "validEdgeTargets": valid_edge_targets,
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
        log.error("Error getting valid edge targets", exc_info=True)
        raise HTTPException(status_code=500, detail="internal server error")
