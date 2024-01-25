import logging
import uuid
from datetime import datetime
from typing import Dict, List, Optional

import jsons
from fastapi import HTTPException, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, validator, model_serializer

from src.auth_service.auth0_manager import Auth0Manager
from src.auth_service.entity import (
    Entity,
    User,
    Team,
)
from src.auth_service.main import AuthzService
from src.auth_service.sharing_manager import Role, SharingManager, GeneralAccess
from src.auth_service.teams_manager import TeamsManager
from src.auth_service.token import PUBLIC_USER
from src.engine_service.engine_commands.run import RunEngineResult
from src.environment_management.architecture import (
    Architecture,
    ArchitectureDAO,
    ArchitectureDoesNotExistError,
)
from src.environment_management.environment import (
    Environment,
    EnvironmentDAO,
    EnvironmentDoesNotExistError,
)
from src.environment_management.environment_version import (
    EnvironmentVersionDAO,
    EnvironmentVersion,
    EnvironmentVersionDoesNotExistError,
)
from src.environment_management.models import (
    EnvironmentResourceConfiguration,
    EnvironmentTracker,
)

from src.state_manager.architecture_storage import (
    ArchitectureStorage,
    ArchitectureStateDoesNotExistError,
)
from src.environment_management.environment_manager import BASE_ENV_ID, PROD_ENV_ID

from src.util.logging import logger


class EnvironmentVersionNotLatestError(Exception):
    pass


class CreateArchitectureRequest(BaseModel):
    name: str
    engine_version: float
    owner: str = None


class ModifyArchitectureRequest(BaseModel):
    name: str


class VersionState(BaseModel):
    resources_yaml: str
    topology_yaml: str


class EnvironmentVersionResponseObject(BaseModel):
    architecture_id: str
    id: str
    version: int
    state: VersionState = VersionState(resources_yaml="", topology_yaml="")
    env_resource_configuration: Dict = {}
    config_errors: List[Dict] = []
    diff: Optional[Dict] = None

    @validator("state", pre=True, always=True)
    def set_state(cls, state):
        return state or VersionState(resources_yaml="", topology_yaml="")

    @validator("env_resource_configuration", pre=True, always=True)
    def set_env_resource_configuration(cls, env_resource_configuration):
        return env_resource_configuration or {}

    @validator("config_errors", pre=True, always=True)
    def set_config_errors(cls, config_errors):
        return config_errors or []

    @model_serializer
    def ser_model(self) -> str:
        if self.diff is not None:
            return jsons.dumps(
                {
                    "architecture_id": self.architecture_id,
                    "id": self.id,
                    "version": self.version,
                    "state": self.state.model_dump(mode="json"),
                    "env_resource_configuration": self.env_resource_configuration,
                    "config_errors": self.config_errors,
                    "diff": self.diff,
                }
            )
        return jsons.dumps(
            {
                "architecture_id": self.architecture_id,
                "id": self.id,
                "version": self.version,
                "state": self.state.model_dump(mode="json"),
                "env_resource_configuration": self.env_resource_configuration,
                "config_errors": self.config_errors,
            }
        )


class EnvironmentSummaryObject(BaseModel):
    id: str
    default: bool


class ArchitectureResponseObject(BaseModel):
    id: str
    name: str
    owner: str
    created_at: float


class GetArchitectureResponseObject(BaseModel):
    id: str
    name: str
    owner: str
    created_at: float
    environments: List[EnvironmentSummaryObject] = []


class ArchitectureListResponse(BaseModel):
    architectures: List[ArchitectureResponseObject]


class ResourceTypeResponse(BaseModel):
    resources: List[str]


class CloneArchitectureRequest(BaseModel):
    name: str
    owner: str = None


class ShareArchitectureRequest(BaseModel):
    entity_roles: Optional[dict[str, Role | None]]


class ArchitectureHandler:
    def __init__(
        self,
        architecture_storage: ArchitectureStorage,
        ev_dao: EnvironmentVersionDAO,
        env_dao: EnvironmentDAO,
        arch_dao: ArchitectureDAO,
    ):
        self.architecture_storage = architecture_storage
        self.ev_dao = ev_dao
        self.env_dao = env_dao
        self.arch_dao = arch_dao

    async def new_architecture(
        self, body: CreateArchitectureRequest, user_id: str, owner: Entity, id: str
    ):
        try:
            architecture = Architecture(
                id=id,
                name=body.name,
                owner=owner.to_auth_string(),
                created_at=datetime.utcnow(),
            )
            self.arch_dao.add_architecture(architecture)
            self.env_dao.add_environment(
                Environment(
                    id=BASE_ENV_ID,
                    architecture_id=architecture.id,
                    current=0,
                    tags={
                        "default": True,
                    },
                )
            )
            self.env_dao.add_environment(
                Environment(
                    id=PROD_ENV_ID,
                    architecture_id=architecture.id,
                    current=0,
                )
            )
            base_hash = str(uuid.uuid4())
            version = EnvironmentVersion(
                id=BASE_ENV_ID,
                architecture_id=architecture.id,
                version=0,
                version_hash=base_hash,
                created_at=datetime.utcnow(),
                created_by=user_id,
            )
            prod_config = EnvironmentResourceConfiguration(
                tracks=EnvironmentTracker(
                    environment=BASE_ENV_ID, version_hash=base_hash
                ),
            )
            prod_version = EnvironmentVersion(
                id=PROD_ENV_ID,
                architecture_id=architecture.id,
                version=0,
                version_hash=str(uuid.uuid4()),
                created_at=datetime.utcnow(),
                created_by=user_id,
                env_resource_configuration=prod_config.to_dict(),
            )
            self.ev_dao.add_environment_version(version)
            self.ev_dao.add_environment_version(prod_version)
            return JSONResponse(content={"id": id})
        except Exception:
            logger.error("Error creating new architecture", exc_info=True)
            raise HTTPException(status_code=500, detail="internal server error")

    async def get_architecture(self, id: str, accept: Optional[str] = None):
        try:
            architecture = await self.arch_dao.get_architecture(id)
            if architecture is None:
                raise ArchitectureDoesNotExistError(
                    f"No architecture exists for id {id}"
                )
            environments = await self.env_dao.get_environments_for_architecture(id)
            isdefault = False
            response = GetArchitectureResponseObject(
                id=architecture.id,
                name=architecture.name,
                owner=architecture.owner,
                created_at=architecture.created_at.timestamp(),
                environments=[
                    EnvironmentSummaryObject(
                        id=e.id,
                        default=False
                        if e.tags is None or "default" not in e.tags
                        else e.tags["default"],
                    )
                    for e in environments
                ],
            )
            return (
                Response(
                    headers={"Content-Type": "application/octet-stream"},
                    content=response.model_dump(mode="json"),
                )
                if accept == "application/octet-stream"
                else JSONResponse(content=response.model_dump(mode="json"))
            )
        except ArchitectureDoesNotExistError:
            raise HTTPException(status_code=404, detail="Architecture not found")
        except Exception:
            logger.error("Error getting architecture", exc_info=True)
            raise HTTPException(status_code=500, detail="internal server error")

    async def delete_architecture(self, architecture_id: str):
        try:
            await self.arch_dao.delete_architecture(architecture_id)
            return Response(status_code=200)
        except Exception:
            logger.error("Error deleting architecture", exc_info=True)
            raise HTTPException(status_code=500, detail="internal server error")

    async def get_version(
        self, architecture_id: str, env_id: str, accept: Optional[str] = None
    ):
        logger.info(
            f"Getting version for architecture: {architecture_id}, environment: {env_id}"
        )
        try:
            arch: EnvironmentVersion = await self.ev_dao.get_current_version(
                architecture_id, env_id
            )
            if arch is None:
                raise ArchitectureStateDoesNotExistError()
            state: RunEngineResult = self.architecture_storage.get_state_from_fs(arch)
            payload = EnvironmentVersionResponseObject(
                architecture_id=arch.architecture_id,
                id=arch.id,
                version=arch.version,
                state=VersionState(
                    resources_yaml=state.resources_yaml,
                    topology_yaml=state.topology_yaml,
                )
                if state is not None
                else None,
                env_resource_configuration=arch.env_resource_configuration,
            )
            return (
                Response(
                    headers={"Content-Type": "application/octet-stream"},
                    content=payload.model_dump(mode="json"),
                )
                if accept == "application/octet-stream"
                else JSONResponse(content=payload.model_dump(mode="json"))
            )
        except ArchitectureStateDoesNotExistError as e:
            raise HTTPException(
                status_code=404,
                detail=f"No environment {env_id} exists for architecture {architecture_id}",
            )
        except EnvironmentVersionDoesNotExistError as e:
            raise HTTPException(
                status_code=404,
                detail=f"No environment {env_id} exists for architecture {architecture_id}",
            )
        except Exception:
            logger.error("Error getting state", exc_info=True)
            raise HTTPException(status_code=500, detail="internal server error")

    async def get_environments_previous_state(
        self,
        architecture_id: str,
        env_id: str,
        version: int,
        accept: Optional[str] = None,
    ):
        try:
            arch = await self.ev_dao.get_previous_state(
                architecture_id, env_id, version
            )
            if arch is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Previous state not found for environment, {env_id}, version {version}, architecture {architecture_id}",
                )
            state = self.architecture_storage.get_state_from_fs(arch)
            payload = EnvironmentVersionResponseObject(
                architecture_id=arch.architecture_id,
                id=arch.id,
                version=arch.version,
                state=VersionState(
                    resources_yaml=state.resources_yaml,
                    topology_yaml=state.topology_yaml,
                )
                if state is not None
                else None,
                env_resource_configuration=arch.env_resource_configuration,
            )
            return (
                Response(
                    headers={"Content-Type": "application/octet-stream"},
                    content=payload.model_dump(mode="json"),
                )
                if accept == "application/octet-stream"
                else JSONResponse(content=payload.model_dump(mode="json"))
            )
        except EnvironmentVersionDoesNotExistError:
            raise HTTPException(
                status_code=404,
                detail=f"Previous state not found for architecture {architecture_id} environment {env_id} version {version}",
            )

    async def get_environments_next_state(
        self,
        architecture_id: str,
        env_id: str,
        version: int,
        accept: Optional[str] = None,
    ):
        try:
            arch = await self.ev_dao.get_next_state(architecture_id, env_id, version)
            state = self.architecture_storage.get_state_from_fs(arch)
            payload = EnvironmentVersionResponseObject(
                architecture_id=arch.architecture_id,
                id=arch.id,
                version=arch.version,
                state=VersionState(
                    resources_yaml=state.resources_yaml,
                    topology_yaml=state.topology_yaml,
                )
                if state is not None
                else None,
                env_resource_configuration=arch.env_resource_configuration
                if arch.env_resource_configuration is not None
                else {},
            )
            return (
                Response(
                    headers={"Content-Type": "application/octet-stream"},
                    content=payload.model_dump(mode="json"),
                )
                if accept == "application/octet-stream"
                else JSONResponse(content=payload.model_dump(mode="json"))
            )
        except EnvironmentVersionDoesNotExistError:
            raise HTTPException(
                status_code=404,
                detail=f"Architecture next state not found for architecture {architecture_id} environment {env_id} version {version}",
            )

    async def set_current_version(
        self, architecture_id: str, env_id: str, version: int
    ):
        try:
            await self.env_dao.set_current_version(architecture_id, env_id, version)
            return Response(status_code=200)
        except EnvironmentDoesNotExistError:
            raise HTTPException(
                status_code=404,
                detail=f"Environment, {env_id}, not found for architecture, {architecture_id}",
            )
        except Exception:
            logger.error("Error setting current state", exc_info=True)
            raise HTTPException(status_code=500, detail="internal server error")

    async def rename_architecture(
        self, architecture_id: str, name: str, accept: Optional[str] = None
    ):
        try:
            arch: Architecture = await self.arch_dao.get_architecture(architecture_id)
            if arch is None:
                raise ArchitectureStateDoesNotExistError(
                    f"No architecture exists for id {architecture_id}"
                )
            arch.name = name
            await self.arch_dao.update_architecture(arch)
            response = ArchitectureResponseObject(
                id=arch.id,
                name=arch.name,
                owner=arch.owner,
                created_at=arch.created_at.timestamp(),
            )
            return (
                Response(
                    headers={"Content-Type": "application/octet-stream"},
                    content=response.model_dump(mode="json"),
                )
                if accept == "application/octet-stream"
                else JSONResponse(content=response.model_dump(mode="json"))
            )
        except ArchitectureStateDoesNotExistError:
            raise HTTPException(status_code=404, detail="Architecture not found")
        except Exception:
            logger.error("Error getting state", exc_info=True)
            raise HTTPException(status_code=500, detail="internal server error")

    async def list_architectures(self, user_id: str):
        try:
            architectures = await self.arch_dao.get_architectures_by_owner(
                User(user_id)
            )
            return JSONResponse(
                content=ArchitectureListResponse(
                    architectures=[
                        ArchitectureResponseObject(
                            id=a.id,
                            name=a.name,
                            owner=a.owner,
                            created_at=a.created_at.timestamp(),
                        )
                        for a in architectures
                    ]
                ).model_dump(mode="json")
            )
        except Exception:
            logger.error("Error listing architectures", exc_info=True)
            raise HTTPException(status_code=500, detail="internal server error")

    async def clone_architecture(
        self, user_id: str, id: str, name: str, owner: str, authz: AuthzService
    ):
        if user_id is PUBLIC_USER:
            raise HTTPException(
                status_code=403,
                detail="Cannot clone architecture as public user",
            )
        try:
            if not user_id and not owner:
                raise HTTPException(
                    status_code=400,
                    detail="Either user_id or owner must be specified",
                )
            owner: Entity = User(user_id) if owner is None else User(owner)
            await self.arch_dao.get_architecture(id)
            newArch = Architecture(
                id=str(uuid.uuid4()),
                name=name,
                owner=owner.to_auth_string(),
                created_at=datetime.utcnow(),
            )
            await authz.add_architecture_owner(owner, newArch.id)
            self.arch_dao.add_architecture(newArch)
            environments: List[
                Environment
            ] = await self.env_dao.get_environments_for_architecture(id)
            for env in environments:
                self.env_dao.add_environment(
                    Environment(
                        id=env.id,
                        architecture_id=newArch.id,
                        current=env.current,
                        tags=env.tags,
                    )
                )
                versions: List[
                    EnvironmentVersion
                ] = await self.ev_dao.list_environment_versions(id, env.id)
                for v in versions:
                    new_version = EnvironmentVersion(
                        id=v.id,
                        architecture_id=newArch.id,
                        version=v.version,
                        version_hash=v.version_hash,
                        env_resource_configuration=v.env_resource_configuration,
                        constraints=v.constraints,
                        created_at=v.created_at,
                        created_by=v.created_by,
                        state_location=None,
                    )
                    state_location = None
                    state = self.architecture_storage.get_state_from_fs(v)
                    if state:
                        state_location = self.architecture_storage.write_state_to_fs(
                            new_version, state
                        )
                        new_version.state_location = state_location
                    self.ev_dao.add_environment_version(new_version)
            return JSONResponse(content={"id": newArch.id})
        except ArchitectureDoesNotExistError:
            raise HTTPException(status_code=404, detail="Architecture not found")
        except Exception:
            logger.error("Error cloning architecture", exc_info=True)
            raise HTTPException(status_code=500, detail="internal server error")

    async def update_architecture_access(
        self,
        user_id: str,
        id: str,
        body: ShareArchitectureRequest,
        authz: AuthzService,
        arch_manager: SharingManager,
    ):
        try:
            architecture: Architecture = await self.arch_dao.get_architecture(id)
            if architecture is None:
                raise ArchitectureDoesNotExistError(
                    f"No architecture exists for id {id}"
                )
            owner: Entity = User(user_id)
            await authz.can_share_architecture(owner, architecture.id)
            if body.entity_roles is not None:
                await arch_manager.update_architecture_roles(
                    architecture.id, body.entity_roles
                )
            return Response(status_code=200)
        except ArchitectureDoesNotExistError:
            raise HTTPException(status_code=404, detail="Architecture not found")
        except Exception:
            logger.error("Error sharing architecture", exc_info=True)
            raise HTTPException(status_code=500, detail="internal server error")

    async def get_architecture_access(
        self,
        user_id: str,
        id: str,
        authz: AuthzService,
        arch_manager: SharingManager,
        auth0_manager: Auth0Manager,
        teams_manager: TeamsManager,
        summarized: Optional[bool] = False,
    ):
        try:
            architecture: Architecture = await self.arch_dao.get_architecture(id)
            if architecture is None:
                raise ArchitectureDoesNotExistError(
                    f"No architecture exists for id {id}"
                )
            user: Entity = User(user_id)
            can_share = await authz.can_share_architecture(user, architecture.id)
            if not can_share:
                summarized = True
            can_write = await authz.can_write_to_architecture(user, architecture.id)
            roles = await arch_manager.get_architecture_roles(architecture.id)
            is_public = False
            is_shared_with_org = False
            general_access_entity = None
            general_access_role = None
            for entity, role in roles.items():
                if entity == "user:*":
                    is_public = True
                    general_access_entity = entity
                    general_access_role = role
                elif entity.startswith("organization:"):
                    is_shared_with_org = True
                    general_access_entity = entity
                    general_access_role = role
            general_access = GeneralAccess.RESTRICTED
            if is_shared_with_org:
                general_access = GeneralAccess.ORGANIZATION
            if is_public:
                general_access = GeneralAccess.PUBLIC

            teams = {}
            users = {}

            team_ids = [
                t.removeprefix("team:").split("#")[0]
                for t in roles.keys()
                if t.startswith("team:")
            ]
            if not summarized:
                if len(team_ids) > 0:
                    teams_list = await teams_manager.batch_get_teams(
                        [t for t in team_ids]
                    )
                    teams = {t.id: t for t in teams_list}

                users = (
                    {}
                    if len(roles) == 0
                    else {
                        u["user_id"]: u
                        for u in auth0_manager.get_users(
                            [
                                u.removeprefix("user:")
                                for u in roles.keys()
                                if u.startswith("user:") and u != "user:*"
                            ]
                        )
                        if u.get("user_id") is not None
                    }
                )

            def get_metadata(entity: str) -> dict[str, any]:
                if entity.startswith("user:"):
                    return users.get(entity.removeprefix("user:"), {})
                elif entity.startswith("team:"):
                    team_meta: Team = teams.get(entity.removeprefix("team:"), None)
                    if team_meta is None:
                        return {}
                    org_meta = team_meta.organization
                    return {
                        "name": team_meta.name,
                        "organization": {
                            "id": org_meta.id if org_meta else None,
                            "name": org_meta.name if org_meta else None,
                        },
                    }
                return {}

            return JSONResponse(
                content={
                    "architecture_id": architecture.id,
                    "can_share": can_share,
                    "can_write": can_write,
                    "entities": [
                        {
                            "id": e,
                            **get_metadata(e),
                            "role": r.value,
                            "type": e.split(":")[0],
                        }
                        for e, r in roles.items()
                    ]
                    if not summarized
                    else [],
                    "general_access": {
                        "type": general_access.value,
                        "entity": {
                            "id": general_access_entity,
                            "role": general_access_role.value,
                        }
                        if general_access_role
                        else None,
                    },
                }
            )
        except ArchitectureDoesNotExistError:
            raise HTTPException(status_code=404, detail="Architecture not found")
        except Exception:
            logger.error("Error getting architecture sharing", exc_info=True)
            raise HTTPException(status_code=500, detail="internal server error")
