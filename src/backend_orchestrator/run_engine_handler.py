import logging
import uuid
from datetime import datetime
from typing import List, Optional

import jsons
from fastapi import HTTPException, Response
from pydantic import BaseModel

from src.backend_orchestrator.models import (
    EnvironmentVersionResponseObject,
    EnvironmentVersionNotLatestError,
    VersionState,
    SendMessageResponse,
)
from src.chat.conversation import Conversation, Message
from src.chat.message_execution import MessageExecutionException
from src.constraints.util import find_mutating_constraints
from src.engine_service.binaries.fetcher import BinaryStorage, Binary
from src.engine_service.engine_commands.get_resource_types import (
    get_resource_types,
)
from src.engine_service.engine_commands.run import (
    EngineException,
    run_engine,
    RunEngineRequest,
)
from src.environment_management.environment import (
    EnvironmentDAO,
)
from src.environment_management.environment_version import (
    EnvironmentVersionDAO,
    EnvironmentVersion,
    EnvironmentVersionDoesNotExistError,
)
from src.environment_management.models import (
    Environment,
    EnvironmentResourceConfiguration,
)
from src.state_manager.architecture_storage import (
    ArchitectureStorage,
    ArchitectureStateDoesNotExistError,
)
from src.topology.resource import ResourceID
from src.topology.topology import TopologicalChangesNotAllowed
from src.topology.topology import TopologyDiff
from src.topology.util import diff_engine_results
from src.util.logging import logger

log = logging.getLogger(__name__)


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
            payload = await self.do_run(architecture_id, env_id, version, body)
            return Response(
                headers={
                    "Content-Type": (
                        "application/octet-stream"
                        if accept == "application/octet-stream"
                        else "application/json"
                    )
                },
                content=payload.model_dump(mode="json"),
            )
        except EngineException as e:
            try:
                error_details = jsons.loads(e.stdout)
            except:
                error_details = []
            title, details = format_error_message(body, e)
            return Response(
                status_code=400,
                content=jsons.dumps(
                    {
                        "title": title,
                        "details": details,
                        "full_details": error_details,
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

    async def do_run(
        self,
        architecture_id: str,
        env_id: str,
        version: int,
        request: CopilotRunRequest,
    ) -> EnvironmentVersionResponseObject:
        current_architecture: EnvironmentVersion = (
            await self.ev_dao.get_current_version(architecture_id, env_id)
        )
        if current_architecture is None:
            raise ArchitectureStateDoesNotExistError(
                "Architecture with id, {id}, does not exist"
            )
        if not request.overwrite:
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
        env: Environment = await self.env_dao.get_environment(architecture_id, env_id)
        if not env.allows_topological_changes():
            if len(find_mutating_constraints(request.constraints)) > 0:
                raise TopologicalChangesNotAllowed(env_id, request.constraints)

        input_graph = self.architecture_storage.get_state_from_fs(architecture)
        self.binary_storage.ensure_binary(Binary.ENGINE)
        request = RunEngineRequest(
            id=architecture_id,
            input_graph=(
                input_graph.resources_yaml if input_graph is not None else None
            ),
            templates=[],
            engine_version=1.0,
            constraints=request.constraints,
            overwrite=request.overwrite,
        )
        result = await run_engine(request)

        diff: TopologyDiff = diff_engine_results(result, input_graph)
        if not env.allows_topological_changes():
            if diff.contains_differences():
                raise TopologicalChangesNotAllowed(
                    env_id, constraints=request.constraints, diff=diff
                )

        latest_architecture: EnvironmentVersion = await self.ev_dao.get_latest_version(
            architecture_id, env_id
        )
        current_version = latest_architecture.version + 1
        new_env_config = EnvironmentResourceConfiguration.from_dict(
            architecture.env_resource_configuration
        )
        new_env_config.config_errors = result.config_errors
        # new_env_config.diff = diff.__dict__()
        arch = EnvironmentVersion(
            architecture_id=architecture.architecture_id,
            id=architecture.id,
            version=current_version,
            version_hash=str(uuid.uuid4()),
            constraints=request.constraints,
            created_at=datetime.utcnow(),
            created_by=architecture.created_by,
            state_location=None,
            env_resource_configuration=new_env_config.to_dict(),
        )
        if request.overwrite:
            print(
                f"deleting any architecture for id {architecture_id} and envirnomnet {env_id} greater than state {version}"
            )
            await self.ev_dao.delete_future_versions(architecture_id, env_id, version)

        state_location = self.architecture_storage.write_state_to_fs(arch, result)
        arch.state_location = state_location
        self.ev_dao.add_environment_version(arch)
        await self.env_dao.set_current_version(architecture_id, env_id, current_version)
        payload = EnvironmentVersionResponseObject(
            architecture_id=arch.architecture_id,
            id=arch.id,
            version=arch.version,
            state=VersionState(
                resources_yaml=result.resources_yaml,
                topology_yaml=result.topology_yaml,
            ),
            env_resource_configuration=new_env_config.to_dict(),
            config_errors=result.config_errors,
            diff=diff.__dict__(),
        )
        return payload

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

    async def handle_message(
        self,
        architecture_id: str,
        env_id: str,
        previous_messages: list[Message],
        message: str,
        version: Optional[int] = None,
        overwrite: Optional[bool] = False,
    ):
        request = CopilotRunRequest(constraints=[], overwrite=False)
        try:
            ev = await self.ev_dao.get_current_version(architecture_id, env_id)

            state = None
            if ev is not None and version > 0:
                state = self.architecture_storage.get_state_from_fs(ev)
            conversation = Conversation(
                environment_version=ev, initial_state=state, messages=previous_messages
            )
            parsed_constraints = await conversation.do_query(
                query_id=str(uuid.uuid4()), query=message, timeout_sec=120
            )
            request = CopilotRunRequest(
                constraints=[
                    pc.constraint.to_dict()
                    for pc in parsed_constraints
                    if pc.constraint is not None
                ],
                overwrite=overwrite,
            )

            result = await self.do_run(
                architecture_id=ev.architecture_id,
                env_id=ev.id,
                version=ev.version,
                request=request,
            )
            result = SendMessageResponse(
                architecture_id=result.architecture_id,
                id=result.id,
                version=result.version,
                state=result.state,
                env_resource_configuration=result.env_resource_configuration,
                config_errors=result.config_errors,
                diff=result.diff,
                constraints=[pc.constraint.to_dict() for pc in parsed_constraints],
            )

            return result, None
        except EngineException as e:
            try:
                error_details = jsons.loads(e.stdout)
            except:
                error_details = []
            title, details = format_error_message(request, e)
            return None, {
                "title": title,
                "details": details,
                "full_details": error_details,
            }
        except ArchitectureStateDoesNotExistError:
            raise HTTPException(
                status_code=404,
                detail=f"No environment {env_id} exists for architecture {architecture_id}",
            )
        except MessageExecutionException:
            raise HTTPException(
                status_code=500,
                detail="I'm sorry, I don't understand what you mean by that.",
            )
        except Exception:
            logger.error("Error getting state", exc_info=True)
            raise HTTPException(status_code=500, detail="internal server error")


def format_error_message(body: CopilotRunRequest, e: EngineException):
    details = jsons.loads(e.stdout)
    action = body.constraints[0]
    reason = []

    # Unsupported edges need to be deduped because they can result in multiple errors for each classification that could not be expanded
    unsupported_edges = set()
    for detail in details:
        match detail["error_code"]:
            case "config_invalid":
                reason.append(
                    f"{detail['resource']}#{detail['property']} invalid value '{detail['value']}': {detail['validation_error']}"
                )
            case "edge_unsupported" | "edge_invalid":
                edge = (
                    detail["satisfaction_edge"]["Source"],
                    detail["satisfaction_edge"]["Target"],
                )
                if edge not in unsupported_edges:
                    reason.append(
                        "We could not find a way to complete this architecture, for immediate support, please reach out to us on discord"
                    )
                    unsupported_edges.add(edge)
            case "internal" | _:
                reason.append(
                    "The Klotho engine ran into an unexpected issue, the team was notified and is investigating, please try again. If this keeps occurring please join us on discord"
                )

    match (action["scope"], action["operator"]):
        case ("application", "add"):
            title = f"I was unable to add {action['node']}."
        case ("application", "remove"):
            title = f"I was unable to remove {action['node']}."
        case ("application", "replace"):
            original = ResourceID.from_string(action["node"])
            replacement = ResourceID.from_string(action["replacement_node"])
            if original.name == replacement.name:
                title = f"I was unable to change the type of {original.name} from {original.provider}:{original.type} to {replacement.provider}:{replacement.type}."
            elif (original.provider, original.type, original.namespace) == (
                replacement.provider,
                replacement.type,
                replacement.namespace,
            ):
                title = (
                    f"I was unable to rename {action['node']} to {replacement.name}."
                )
            else:
                title = f"I was unable to replace {action['node']} with {action['replacement_node']}."
        case ("resource", _):
            title = f"I was unable to configure {action['target']}."
        case ("edge", "must_exist"):
            title = f"I was unable to connect {action['target']['source']} ➔ {action['target']['target']}."
        case ("edge", "must_not_exist"):
            title = f"I was unable to disconnect {action['target']['source']} ➔ {action['target']['target']}."
        case _:
            title = f"I was unable to apply the following constraint: {action}"

    if len(reason) == 0:
        return title, ""
    if len(reason) == 1:
        return title, reason[0]
    else:
        reason_str = ("• " if len(reason) > 1 else "") + "\n• ".join(reason)
        return title, reason_str
