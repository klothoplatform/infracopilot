from datetime import datetime
import logging
from logging import config
from typing import List, Optional
import uuid

import jsons
from fastapi import HTTPException, Response
from pydantic import BaseModel

from src.backend_orchestrator.architecture_handler import (
    EnvironmentVersionNotLatestError,
    EnvironmentVersionResponseObject,
    VersionState,
)
from src.constraints.util import find_mutating_constraints, parse_constraints
from src.engine_service.binaries.fetcher import BinaryStorage, Binary
from src.engine_service.engine_commands.run import (
    FailedRunException,
    run_engine,
    RunEngineRequest,
)

from src.environment_management.environment_version import (
    EnvironmentVersionDAO,
    EnvironmentVersion,
    EnvironmentVersionDoesNotExistError,
)
from src.environment_management.models import Environment

from src.environment_management.environment import (
    EnvironmentDAO,
    EnvironmentDoesNotExistError,
)

from src.state_manager.architecture_storage import (
    ArchitectureStorage,
    ArchitectureStateDoesNotExistError,
)

from src.engine_service.engine_commands.get_resource_types import (
    get_resource_types,
)

from src.constraints.constraint import ConstraintScope
from src.topology.topology import Topology, TopologyDiff
from src.topology.util import diff_engine_results

log = logging.getLogger(__name__)


class TopologicalChangesNotAllowed(Exception):
    """
    Exception to be raised when topological changes are not allowed.
    """

    def __init__(
        self, env_id: str, constraints: List[dict] = None, diff: TopologyDiff = None
    ):
        super().__init__(
            f"Topological changes are not allowed for environment {env_id}"
        )
        self.constraints = constraints
        self.diff = diff
        self.env_id = env_id
        self.error_type = "topological_changes_not_allowed"


class CopilotRunRequest(BaseModel):
    constraints: List[dict]
    overwrite: bool = False


class EngineOrchestrator:
    def __init__(
        self,
        architecture_storage: ArchitectureStorage,
        ev_dao: EnvironmentVersionDAO,
        env_dao: EnvironmentDAO,
        binary_storage: BinaryStorage,
    ):
        self.architecture_storage = architecture_storage
        self.ev_dao = ev_dao
        self.env_dao = env_dao
        self.binary_storage = binary_storage

    async def run(
        self,
        architecture_id: str,
        env_id: str,
        version: int,
        body: CopilotRunRequest,
        accept: Optional[str] = None,
    ):
        try:
            current_architecture: EnvironmentVersion = (
                await self.ev_dao.get_current_version(architecture_id, env_id)
            )
            if current_architecture is None:
                raise ArchitectureStateDoesNotExistError(
                    "Architecture with id, {id}, does not exist"
                )
            if not body.overwrite:
                architecture = current_architecture
                if architecture.version != version:
                    raise EnvironmentVersionNotLatestError(
                        f"Architecture state is not the latest. Expected {architecture.version}, got {version}"
                    )
            else:
                architecture = await self.ev_dao.get_environment_version(
                    architecture_id, env_id, version
                )
                if architecture is None:
                    raise ArchitectureStateDoesNotExistError(
                        "Architecture with id, {id}, and state, {state} does not exist"
                    )

            ## validate constraints to ensure theres only resource constraints if the environment only allows topological changes
            env: Environment = await self.env_dao.get_environment(
                architecture_id, env_id
            )
            if not env.allows_topological_changes():
                if len(find_mutating_constraints(body.constraints)) > 0:
                    raise TopologicalChangesNotAllowed(env_id, body.constraints)

            input_graph = self.architecture_storage.get_state_from_fs(architecture)
            self.binary_storage.ensure_binary(Binary.ENGINE)
            request = RunEngineRequest(
                id=architecture_id,
                input_graph=input_graph.resources_yaml
                if input_graph is not None
                else None,
                templates=[],
                engine_version=1.0,
                constraints=body.constraints,
            )
            result = await run_engine(request)

            diff: TopologyDiff = diff_engine_results(result, input_graph)
            if not env.allows_topological_changes():
                if diff.contains_differences():
                    raise TopologicalChangesNotAllowed(
                        env_id, constraints=body.constraints, diff=diff
                    )

            latest_architecture: EnvironmentVersion = (
                await self.ev_dao.get_latest_version(architecture_id, env_id)
            )
            current_version = latest_architecture.version + 1
            arch = EnvironmentVersion(
                architecture_id=architecture.architecture_id,
                id=architecture.id,
                version=current_version,
                version_hash=str(uuid.uuid4()),
                constraints=body.constraints,
                created_at=datetime.utcnow(),
                created_by=architecture.created_by,
                state_location=None,
                env_resource_configuration=architecture.env_resource_configuration,
            )
            if body.overwrite:
                print(
                    f"deleting any architecture for id {architecture_id} and envirnomnet {env_id} greater than state {version}"
                )
                await self.ev_dao.delete_future_versions(
                    architecture_id, env_id, version
                )

            state_location = self.architecture_storage.write_state_to_fs(arch, result)
            arch.state_location = state_location
            self.ev_dao.add_environment_version(arch)
            await self.env_dao.set_current_version(
                architecture_id, env_id, current_version
            )
            payload = EnvironmentVersionResponseObject(
                architecture_id=arch.architecture_id,
                id=arch.id,
                version=arch.version,
                state=VersionState(
                    resources_yaml=result.resources_yaml,
                    topology_yaml=result.topology_yaml,
                ),
                env_resource_configuration=arch.env_resource_configuration,
                config_errors=result.config_errors_json,
                diff=diff.__dict__(),
            )

            return Response(
                headers={
                    "Content-Type": "application/octet-stream"
                    if accept == "application/octet-stream"
                    else "application/json"
                },
                content=payload.model_dump(mode="json"),
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
        except EnvironmentVersionNotLatestError:
            raise HTTPException(
                status_code=400, detail="Environment version is not the latest"
            )
        except TopologicalChangesNotAllowed as e:
            content = {
                "error_type": e.error_type,
                "environment": e.env_id,
            }
            if e.constraints is not None:
                content["constraints"] = e.constraints
            if e.diff is not None:
                content["diff"] = e.diff.__dict__()
            return Response(status_code=400, content=jsons.dumps(content))
        except ArchitectureStateDoesNotExistError:
            raise HTTPException(
                status_code=404,
                detail=f"No architecture exists for id {architecture_id}",
            )
        except EnvironmentVersionDoesNotExistError:
            raise HTTPException(
                status_code=404,
                detail=f"No environment version exists for id {architecture_id} environment {env_id} and version {version}",
            )
        except Exception:
            log.error("Error running engine", exc_info=True)
            raise HTTPException(status_code=500, detail="internal server error")

    async def get_resource_types(self, architecture_id: str, env_id: str):
        try:
            await self.ev_dao.get_latest_version(architecture_id, env_id)
            response = await get_resource_types(self.binary_storage)
            return Response(content=response, media_type="application/json")
        except EnvironmentVersionDoesNotExistError as e:
            raise HTTPException(
                status_code=404,
                detail=f"No architecture exists for id {architecture_id}",
            )
        except Exception:
            log.error("Error getting resource types", exc_info=True)
            raise HTTPException(status_code=500, detail="internal server error")
