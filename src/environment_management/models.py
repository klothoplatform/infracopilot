from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase, relationship
from sqlalchemy import JSON, ForeignKey
import datetime
from sqlalchemy.sql import func
from sqlalchemy import DateTime


class ModelsBase(DeclarativeBase):
    pass


class Environment(ModelsBase):
    __tablename__ = "environments"

    architecture_id: Mapped[str] = mapped_column(
        ForeignKey("architectures.id"), primary_key=True
    )
    id: Mapped[str] = mapped_column(primary_key=True)
    current: Mapped[int] = mapped_column(nullable=True)
    tags: Mapped[dict] = mapped_column(nullable=True, type_=JSON)
    # Add a relationship to EnvironmentVersion
    versions = relationship(
        "EnvironmentVersion", backref="environment", cascade="all, delete-orphan"
    )

    def __eq__(self, __value: object) -> bool:
        if not isinstance(__value, Environment):
            return False
        return (
            self.id == __value.id
            and self.architecture_id == __value.architecture_id
            and self.current == __value.current
            and self.tags == __value.tags
        )

    def composite_id(self):
        return f"{self.architecture_id}/{self.id}"

    def __str__(self):
        return f"environment:{self.composite_id()}"


class EnvironmentVersion(ModelsBase):
    __tablename__ = "environment_versions"

    architecture_id: Mapped[str] = mapped_column(
        ForeignKey("architectures.id"), primary_key=True
    )
    id: Mapped[str] = mapped_column(ForeignKey("environments.id"), primary_key=True)
    version: Mapped[int] = mapped_column(primary_key=True)
    version_hash: Mapped[str] = mapped_column()
    env_resource_configuration: Mapped[dict] = mapped_column(type_=JSON, nullable=True)
    state_location: Mapped[str] = mapped_column(nullable=True)
    iac_location: Mapped[str] = mapped_column(nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    created_by: Mapped[str]
    constraints: Mapped[dict] = mapped_column(nullable=True, type_=JSON)

    def __eq__(self, __value: object) -> bool:
        if not isinstance(__value, EnvironmentVersion):
            return False
        return (
            self.id == __value.id
            and self.version == __value.version
            and self.version_hash == __value.version_hash
            and self.env_resource_configuration == __value.env_resource_configuration
            and self.state_location == __value.state_location
            and self.iac_location == __value.iac_location
            and self.created_at == __value.created_at
            and self.created_by == __value.created_by
            and self.constraints == __value.constraints
        )

    def composite_id(self):
        return f"{self.architecture_id}/{self.id}/{self.version}"

    def __str__(self):
        return f"environment_version:{self.composite_id()}"


class Architecture(ModelsBase):
    __tablename__ = "architectures"

    id: Mapped[str] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(nullable=True)
    owner: Mapped[str]
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Add a relationship to Environment
    environments = relationship(
        "Environment", backref="architecture", cascade="all, delete-orphan"
    )

    def __eq__(self, __value: object) -> bool:
        if not isinstance(__value, Architecture):
            return False
        return (
            self.id == __value.id
            and self.name == __value.name
            and self.owner == __value.owner
            and self.created_at == __value.created_at
        )

    def __str__(self):
        return f"architecture:{self.id}"
