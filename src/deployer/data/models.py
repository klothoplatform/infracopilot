from typing import List
from pydantic import BaseModel
from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase, relationship
from sqlalchemy import JSON, ForeignKey, ForeignKeyConstraint
import datetime
from sqlalchemy.sql import func
from sqlalchemy import DateTime

from src.environment_management.models import ModelsBase

from enum import Enum


class DeploymentStatus(Enum):
    IN_PROGRESS = "IN_PROGRESS"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"


class DeploymentAction(Enum):
    DEPLOY = "DEPLOY"
    REFRESH = "REFRESH"
    DESTROY = "DESTROY"


class Deployment(ModelsBase):
    __tablename__ = "deployments"

    id: Mapped[str] = mapped_column(primary_key=True)
    architecture_id: Mapped[str] = mapped_column(
        ForeignKey("architectures.id"),
    )
    environment_id: Mapped[str] = mapped_column(
        ForeignKey("environments.id"),
    )
    stack_name: Mapped[str] = mapped_column(
        ForeignKey("stacks.name"),
    )
    version: Mapped[str] = mapped_column(
        ForeignKey("environment_versions.version"), nullable=True
    )
    action: Mapped[str] = mapped_column()
    status: Mapped[str] = mapped_column()
    status_reason: Mapped[str] = mapped_column(nullable=True)
    diff: Mapped[dict] = mapped_column(JSON, nullable=True)
    initiated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now()
    )
    initiated_by: Mapped[str] = mapped_column()

    def __eq__(self, __value: object) -> bool:
        if not isinstance(__value, Deployment):
            return False
        return (
            self.id == __value.id
            and self.architecture_id == __value.architecture_id
            and self.environment_id == __value.environment_id
            and self.version == __value.version
            and self.diff == __value.diff
            and self.initiated_at == __value.initiated_at
            and self.initiated_by == __value.initiated_by
        )

    class ReturnObject(BaseModel):
        id: str
        architecture_id: str
        environment_id: str
        stack_name: str
        version: int | None = None
        action: str
        status: str
        status_reason: str | None = None
        diff: dict | None = None
        initiated_at: float
        initiated_by: str

    def to_return_object(self) -> ReturnObject:
        return Deployment.ReturnObject(
            id=self.id,
            architecture_id=self.architecture_id,
            environment_id=self.environment_id,
            stack_name=self.stack_name,
            version=self.version,
            action=self.action,
            status=self.status,
            status_reason=self.status_reason,
            diff=self.diff,
            initiated_at=self.initiated_at.timestamp(),
            initiated_by=self.initiated_by,
        )


class Stack(ModelsBase):
    __tablename__ = "stacks"

    name: Mapped[str] = mapped_column(primary_key=True)
    architecture_id: Mapped[str] = mapped_column(
        ForeignKey("architectures.id"), primary_key=True
    )
    environment_id: Mapped[str] = mapped_column(
        ForeignKey("environments.id"), primary_key=True
    )
    latest_deployment_id: Mapped[str] = mapped_column(
        ForeignKey("deployments.id"), nullable=True
    )
    provider: Mapped[str] = mapped_column()
    provider_details: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(nullable=True)
    status_reason: Mapped[str] = mapped_column(nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now())
    created_by: Mapped[str] = mapped_column()

    class ReturnObject(BaseModel):
        name: str
        architecture_id: str
        environment_id: str
        latest_deployment_id: str | None = None
        provider: str
        provider_details: dict
        status: str | None = None
        status_reason: str | None = None
        created_at: float
        created_by: str

    def __eq__(self, __value: object) -> bool:
        if not isinstance(__value, Stack):
            return False
        return (
            self.name == __value.name
            and self.architecture_id == __value.architecture_id
            and self.latest_deployment_id == __value.latest_deployment_id
            and self.environment_id == __value.environment_id
            and self.status == __value.status
            and self.status_reason == __value.status_reason
            and self.created_at == __value.created_at
            and self.created_by == __value.created_by
            and self.provider == __value.provider
            and self.provider_details == __value.provider_details
        )

    def to_return_object(self) -> ReturnObject:
        return Stack.ReturnObject(
            name=self.name,
            architecture_id=self.architecture_id,
            environment_id=self.environment_id,
            latest_deployment_id=self.latest_deployment_id,
            provider=self.provider,
            provider_details=self.provider_details,
            status=self.status,
            status_reason=self.status_reason,
            created_at=self.created_at.timestamp(),
            created_by=self.created_by,
        )


class Resource(BaseModel):
    id: str
    provider_id: str
    type: str
    properties: dict
