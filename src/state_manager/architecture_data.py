from sqlite3 import IntegrityError
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import select, JSON
from src.util.orm import Base, session
from typing import Any, List


class Architecture(Base):
    __tablename__ = "architectures"

    id: Mapped[str] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(nullable=True)
    state: Mapped[int] = mapped_column(primary_key=True)
    constraints: Mapped[dict[str, Any]] = mapped_column(type_=JSON)
    owner: Mapped[str]
    created_at: Mapped[int]
    updated_by: Mapped[str]
    engine_version: Mapped[float]
    decisions: Mapped[List[dict[str, Any]]] = mapped_column(nullable=True, type_=JSON)
    state_location: Mapped[str] = mapped_column(nullable=True)
    iac_location: Mapped[str] = mapped_column(nullable=True)

    def __eq__(self, __value: object) -> bool:
        if not isinstance(__value, Architecture):
            return False
        return (
            self.id == __value.id
            and self.state == __value.state
            and self.constraints == __value.constraints
            and self.owner == __value.owner
            and self.created_at == __value.created_at
            and self.updated_by == __value.updated_by
            and self.engine_version == __value.engine_version
        )


async def get_architecture_latest(id: str) -> Architecture:
    stmt = (
        select(Architecture)
        .where(Architecture.id == id)
        .order_by(Architecture.state.desc())
        .limit(1)
    )
    result = session.execute(statement=stmt).fetchone()
    return None if result is None else result[0]


async def get_architecture_history(id: str) -> List[Architecture]:
    stmt = select(Architecture).where(Architecture.id == id)
    results = session.execute(statement=stmt).fetchall()
    return [result[0] for result in results]


async def get_architectures_by_owner(owner: str) -> List[str]:
    stmt = (
        select(Architecture).where(Architecture.owner == owner)
        # distinct only works with postgress, so it breaks the local story. Instead finding distinct entries in code
    )
    results = session.execute(statement=stmt).fetchall()

    return {result[0].id for result in results}


class ArchitectureAlreadyExistsError(Exception):
    pass


async def add_architecture(architecture: Architecture):
    try:
        session.add(architecture)
        session.commit()
    except Exception as e:
        if isinstance(e, IntegrityError):
            session.rollback()
            raise ArchitectureAlreadyExistsError(
                f"Architecture with id, {architecture.id}, already exists"
            )
        raise e
