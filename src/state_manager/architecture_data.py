from sqlite3 import IntegrityError
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import select, JSON
from src.util.entity import Entity
from src.util.orm import Base, session
from typing import Any, List
import re
from enum import Enum


class ExtraFieldKeys(Enum):
    STACK_NAME = "stack_name"


class Architecture(Base):
    __tablename__ = "architectures"

    id: Mapped[str] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(nullable=True)
    state: Mapped[int] = mapped_column(primary_key=True)
    constraints: Mapped[List[dict[str, Any]]] = mapped_column(type_=JSON)
    owner: Mapped[str]
    created_at: Mapped[int]
    updated_at: Mapped[int] = mapped_column(nullable=True)
    updated_by: Mapped[str]
    engine_version: Mapped[float]
    decisions: Mapped[List[dict[str, Any]]] = mapped_column(nullable=True, type_=JSON)
    state_location: Mapped[str] = mapped_column(nullable=True)
    iac_location: Mapped[str] = mapped_column(nullable=True)
    extraFields: Mapped[dict] = mapped_column(nullable=True, type_=JSON)

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

    def __str__(self):
        return f"architecture:{self.id}"


async def delete_future_states(id: str, state: int):
    stmt = (
        select(Architecture)
        .where(Architecture.id == id)
        .where(Architecture.state > state)
    )
    result = session.execute(statement=stmt).fetchall()
    for r in result:
        session.delete(r[0])
    session.commit()


async def delete_architecture(id: str):
    stmt = (
        select(Architecture)
        .where(Architecture.id == id)
        .order_by(Architecture.state.desc())
    )
    result = session.execute(statement=stmt).fetchall()
    if result is None:
        raise Exception(f"Architecture with id, {id}, does not exist")
    for r in result:
        session.delete(r[0])
    session.commit()


async def get_architecture_latest(id: str) -> Architecture:
    stmt = (
        select(Architecture)
        .where(Architecture.id == id)
        .order_by(Architecture.state.desc())
        .limit(1)
    )
    result = session.execute(statement=stmt).fetchone()
    return None if result is None else result[0]


async def get_architecture_at_state(id: str, state: int) -> Architecture:
    stmt = (
        select(Architecture)
        .where(Architecture.id == id)
        .where(Architecture.state == state)
    )
    result = session.execute(statement=stmt).fetchone()
    return None if result is None else result[0]


async def get_previous_state(id: str, state: int) -> Architecture:
    stmt = (
        select(Architecture)
        .where(Architecture.id == id)
        .where(Architecture.state < state)
        .order_by(Architecture.state.desc())
    )
    result = session.execute(statement=stmt).fetchone()
    return None if result is None else result[0]


async def get_next_state(id: str, state: int) -> Architecture:
    stmt = (
        select(Architecture)
        .where(Architecture.id == id)
        .where(Architecture.state > state)
        .order_by(Architecture.state.asc())
    )
    result = session.execute(statement=stmt).fetchone()
    return None if result is None else result[0]


async def get_architecture_history(id: str) -> List[Architecture]:
    stmt = select(Architecture).where(Architecture.id == id)
    results = session.execute(statement=stmt).fetchall()
    return [result[0] for result in results]


async def get_architectures_by_owner(owner: Entity) -> List[Architecture]:
    stmt = (
        select(Architecture).where(Architecture.owner == owner.to_auth_string())
        # distinct only works with postgress, so it breaks the local story. Instead finding distinct entries in code
    )
    results = session.execute(statement=stmt).fetchall()
    return [result[0] for result in results]


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


async def get_architecture_changelog_history(id: str) -> List[dict[str, Any]]:
    stmt = select(Architecture).where(Architecture.id == id)
    results = session.execute(statement=stmt).fetchall()
    history: List[Architecture] = [result[0] for result in results]
    decisions: List[dict] = []
    for h in history:
        if h.decisions is not None and len(h.decisions) > 0:
            decisions.append({"constraints": h.constraints, "decisions": h.decisions})
    return decisions
