from sqlite3 import IntegrityError
from typing import List

from src.util.entity import KlothoEntity
from src.util.orm import Base, engine
from sqlalchemy.orm import Mapped, mapped_column, Session
from sqlalchemy import select


class ResourceTemplateData(Base):
    __tablename__ = "template_data"

    resource: Mapped[str] = mapped_column(primary_key=True)
    version: Mapped[float] = mapped_column(primary_key=True)
    owner: Mapped[str] = mapped_column(primary_key=True)
    location: Mapped[str]

    def __eq__(self, other):
        if isinstance(other, ResourceTemplateData):
            return (
                self.resource == other.resource
                and self.version == other.version
                and self.owner == other.owner
                and self.location == other.location
            )
        return False


async def get_klotho_supported_resource_template_data() -> List[ResourceTemplateData]:
    with Session(engine) as session:
        stmt = select(ResourceTemplateData).where(
            ResourceTemplateData.owner == KlothoEntity.id
        )
        results = session.execute(statement=stmt).fetchall()
        return [item[0] for item in results]


async def get_resource_templates_data_for_owner(owner_id) -> List[ResourceTemplateData]:
    with Session(engine) as session:
        stmt = select(ResourceTemplateData).where(
            ResourceTemplateData.owner == owner_id
        )
        results = session.execute(statement=stmt).fetchall()
        return [item[0] for item in results]


async def add_resource_template(template_data: ResourceTemplateData):
    with Session(engine) as session:
        with session.begin():
            session.add(template_data)


class EdgeTemplateData(Base):
    __tablename__ = "edge_template_data"

    source: Mapped[str] = mapped_column(primary_key=True)
    destination: Mapped[str] = mapped_column(primary_key=True)
    version: Mapped[float] = mapped_column(primary_key=True)
    owner: Mapped[str] = mapped_column(primary_key=True)
    location: Mapped[str]

    def __eq__(self, other):
        if isinstance(other, EdgeTemplateData):
            return (
                self.source == other.source
                and self.destination == other.destination
                and self.version == other.version
                and self.owner == other.owner
                and self.location == other.location
            )
        return False


async def get_klotho_supported_edge_template_data() -> List[EdgeTemplateData]:
    with Session(engine) as session:
        stmt = select(EdgeTemplateData).where(EdgeTemplateData.owner == KlothoEntity.id)
        results = session.execute(statement=stmt).fetchall()
        return [item[0] for item in results]


async def get_edge_templates_data_for_owner(owner_id) -> List[EdgeTemplateData]:
    with Session(engine) as session:
        stmt = select(EdgeTemplateData).where(EdgeTemplateData.owner == owner_id)
        results = session.execute(statement=stmt).fetchall()
        return [item[0] for item in results]


async def add_edge_template(template_data: EdgeTemplateData):
    with Session(engine) as session:
        with session.begin():
            session.add(template_data)
