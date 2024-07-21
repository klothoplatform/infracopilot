from dataclasses import field
from typing import Dict, List, Optional

import jsons
from pydantic import BaseModel, validator, model_serializer

from src.auth_service.sharing_manager import Role


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


class SendMessageResponse(EnvironmentVersionResponseObject):
    constraints: List[Dict] = field(default_factory=list)
    response: str = ""

    @model_serializer
    def ser_model(self) -> str:
        output = {
            "architecture_id": self.architecture_id,
            "id": self.id,
            "version": self.version,
            "state": self.state.model_dump(mode="json"),
            "env_resource_configuration": self.env_resource_configuration,
            "config_errors": self.config_errors,
            "constraints": self.constraints,
            "response": self.response,
        }
        if self.diff is not None:
            output["diff"] = self.diff
        return jsons.dumps(output)


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
