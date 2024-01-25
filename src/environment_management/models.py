from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase, relationship
from sqlalchemy import JSON, ForeignKey, ForeignKeyConstraint
import datetime
from sqlalchemy.sql import func
from sqlalchemy import DateTime


class EnvironmentResourceConfiguration:
    class EnvironmentTracker:
        environment: str
        version_hash: str

        def __init__(self, environment: str, version_hash: str):
            self.environment = environment
            self.version_hash = version_hash

        def to_dict(self):
            return {"environment": self.environment, "version_hash": self.version_hash}

        def from_dict(self, json: dict):
            self.environment = json["environment"]
            self.version_hash = json["version_hash"]

    tracks: EnvironmentTracker
    overrides: dict
    diff: dict

    def __init__(self, tracks: EnvironmentTracker, overrides: dict, diff: dict):
        self.tracks = tracks
        self.overrides = overrides
        self.diff = diff

    def to_dict(self):
        return {"tracks": self.tracks, "overrides": self.overrides, "diff": self.diff}

    @staticmethod
    def from_dict(json: dict) -> "EnvironmentResourceConfiguration":
        result: EnvironmentResourceConfiguration = EnvironmentResourceConfiguration(
            EnvironmentResourceConfiguration.EnvironmentTracker(
                None
                if "tracks" not in json or "environment" not in json["tracks"]
                else json["tracks"]["environment"],
                None
                if "tracks" not in json or "version_hash" not in json["tracks"]
                else json["tracks"]["version_hash"],
            ),
            None if "overrides" not in json else json["overrides"],
            None if "diff" not in json else json["diff"],
        )
        return result


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

    def allows_topological_changes(self):
        if self.tags is None:
            return False
        if "default" in self.tags and self.tags["default"] == True:
            return True
        return False

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

    architecture_id: Mapped[str] = mapped_column(primary_key=True)
    id: Mapped[str] = mapped_column(primary_key=True)
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

    __table_args__ = (
        ForeignKeyConstraint(
            ["architecture_id", "id"],
            [Environment.architecture_id, Environment.id],
        ),
        {},
    )

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
