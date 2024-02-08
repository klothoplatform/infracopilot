import logging
from typing import Optional

import jsons
from fastapi import HTTPException, Response
from pydantic import BaseModel

from src.backend_orchestrator.models import EnvironmentVersionNotLatestError
from src.engine_service.binaries.fetcher import BinaryStorage, Binary
from src.engine_service.engine_commands.get_valid_edge_targets import (
    GetValidEdgeTargetsRequest,
    get_valid_edge_targets,
)
from src.environment_management.environment import EnvironmentDoesNotExistError

from src.environment_management.environment_version import (
    EnvironmentVersionDAO,
)

from src.state_manager.architecture_storage import (
    ArchitectureStorage,
    ArchitectureStateDoesNotExistError,
)

log = logging.getLogger(__name__)


class CopilotGetValidEdgeTargetsRequest(BaseModel):
    config: dict


class EdgeTargetHandler:
    def __init__(
        self,
        architecture_storage: ArchitectureStorage,
        ev_dao: EnvironmentVersionDAO,
        binary_storage: BinaryStorage,
    ):
        self.architecture_storage = architecture_storage
        self.ev_dao = ev_dao
        self.binary_storage = binary_storage

    async def get_valid_edge_targets(
        self,
        architecture_id: str,
        env_id: str,
        version: int,
        body: CopilotGetValidEdgeTargetsRequest,
        accept: Optional[str] = None,
    ):
        try:
            environment = await self.ev_dao.get_current_version(architecture_id, env_id)
            if environment is None:
                raise ArchitectureStateDoesNotExistError(
                    "Architecture with id, {request.architecture_id}, does not exist"
                )
            if environment.version != version:
                raise EnvironmentVersionNotLatestError(
                    f"Environment state is not current. Expected {environment.version}, got {version}"
                )
            valid_edge_targets = []
            if environment.state_location is not None:
                input_graph = self.architecture_storage.get_state_from_fs(environment)
                self.binary_storage.ensure_binary(Binary.ENGINE)
                request = GetValidEdgeTargetsRequest(
                    id=architecture_id,
                    input_graph=(
                        input_graph.resources_yaml if input_graph is not None else None
                    ),
                    engine_version=1.0,
                    config=body.config,
                )
                result = await get_valid_edge_targets(request)
                valid_edge_targets = result.valid_edge_targets
            return Response(
                headers={
                    "Content-Type": (
                        "application/octet-stream"
                        if accept == "application/octet-stream"
                        else "application/json"
                    )
                },
                content=jsons.dumps(
                    {
                        "architectureId": environment.architecture_id,
                        "environment": environment.id,
                        "version": environment.version,
                        "validEdgeTargets": valid_edge_targets,
                    }
                ),
            )
        except EnvironmentVersionNotLatestError:
            raise HTTPException(
                status_code=400, detail="Architecture state is not the latest"
            )
        except EnvironmentDoesNotExistError:
            raise HTTPException(
                status_code=404, detail=f"No environment exists for id {env_id}"
            )
        except ArchitectureStateDoesNotExistError:
            raise HTTPException(
                status_code=404,
                detail=f"No architecture exists for id {architecture_id}",
            )
        except Exception:
            log.error("Error getting valid edge targets", exc_info=True)
            raise HTTPException(status_code=500, detail="internal server error")
