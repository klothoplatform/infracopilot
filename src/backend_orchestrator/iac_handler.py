import logging
from typing import Optional

from fastapi import HTTPException, Response
from fastapi.responses import StreamingResponse

from src.backend_orchestrator.architecture_handler import (
    EnvironmentVersionNotLatestError,
)
from src.engine_service.binaries.fetcher import write_binary_to_disk, Binary
from src.engine_service.engine_commands.export_iac import export_iac, ExportIacRequest
from src.engine_service.engine_commands.run import RunEngineResult
from src.environment_management.architecture import ArchitectureDAO
from src.environment_management.environment_version import EnvironmentVersionDAO
from src.environment_management.models import Architecture, EnvironmentVersion
from src.state_manager.architecture_storage import (
    ArchitectureStorage,
    ArchitectureStateDoesNotExistError,
)

log = logging.getLogger(__name__)


class IaCOrchestrator:
    def __init__(
        self,
        architecture_storage: ArchitectureStorage,
        arch_dao: ArchitectureDAO,
        session: EnvironmentVersionDAO,
    ):
        self.architecture_storage = architecture_storage
        self.arch_dao = arch_dao
        self.ev_dao = session


class IaCOrchestrator:
    def __init__(
        self,
        architecture_storage: ArchitectureStorage,
        arch_dao: ArchitectureDAO,
        session: EnvironmentVersionDAO,
    ):
        self.architecture_storage = architecture_storage
        self.arch_dao = arch_dao
        self.ev_dao = session

    async def get_iac(
        self,
        architecture_id: str,
        env_id: str,
        version: int,
        accept: Optional[str] = None,
    ):
        try:
            env_version: EnvironmentVersion = await self.ev_dao.get_current_version(
                architecture_id, env_id
            )
            arch: Architecture = await self.arch_dao.get_architecture(architecture_id)
            if env_version is None or arch is None:
                raise ArchitectureStateDoesNotExistError(
                    "Architecture with id, {request.architecture_id}, does not exist"
                )
            elif env_version.version != version:
                raise EnvironmentVersionNotLatestError(
                    f"Architecture state is not current. Expected {env_version.version}, got {version}"
                )

            iac = self.architecture_storage.get_iac_from_fs(env_version)
            if iac is None:
                arch_state: RunEngineResult = (
                    self.architecture_storage.get_state_from_fs(env_version)
                )
                if arch_state is None:
                    raise ArchitectureStateDoesNotExistError(
                        f"No architecture exists for id {architecture_id}"
                    )
                write_binary_to_disk(Binary.IAC)
                request = ExportIacRequest(
                    input_graph=arch_state.resources_yaml,
                    name=arch.name if arch.name is not None else arch.id,
                )
                result = export_iac(request)
                iac = result.iac_bytes
                if iac is None:
                    return Response(content="I failed to generate IaC", status_code=500)
                iac_location = self.architecture_storage.write_iac_to_fs(
                    env_version, iac
                )
                env_version.iac_location = iac_location
                await self.ev_dao.update_environment_version(env_version)
            return StreamingResponse(
                iter([iac]),
                media_type="application/x-zip-compressed",
                headers={
                    "Content-Type": "application/octet-stream"
                    if accept == "application/octet-stream"
                    else "application/x-zip-compressed",
                    "Content-Disposition": f"attachment; filename=images.zip",
                },
            )
        except EnvironmentVersionNotLatestError as e:
            raise HTTPException(
                status_code=400, detail="Environment version is not current"
            )
        except ArchitectureStateDoesNotExistError as e:
            raise HTTPException(
                status_code=404,
                detail=f"No architecture exists for id {architecture_id}, environment {env_id}",
            )
        except Exception:
            log.error("Error getting iac", exc_info=True)
            raise HTTPException(status_code=500, detail="internal server error")
