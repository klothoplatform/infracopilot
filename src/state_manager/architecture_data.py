from sqlite3 import IntegrityError
from sqlalchemy.orm import Mapped, mapped_column, Session
from sqlalchemy import select, JSON
from src.util.entity import Entity
from src.util.orm import Base, engine
from typing import Any, List, Optional
from enum import Enum
from sqlalchemy.orm.attributes import flag_modified


class ExtraFields(Enum):
    CURRENT = "current"


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


async def copilot_set_current_state(id: str, state: int):
    with Session(engine) as session:
        stmt = select(Architecture).where(Architecture.id == id)
        result = session.execute(statement=stmt).fetchall()
        for r in result:
            architecture: Architecture = r[0]
            if architecture.state == state:
                architecture.extraFields = (
                    {} if architecture.extraFields is None else architecture.extraFields
                )
                architecture.extraFields[ExtraFields.CURRENT.value] = True
            else:
                architecture.extraFields = (
                    {} if architecture.extraFields is None else architecture.extraFields
                )
                architecture.extraFields[ExtraFields.CURRENT.value] = False
            flag_modified(architecture, "extraFields")
            session.commit()
        return


async def get_architecture_current(id: str) -> Optional[Architecture]:
    with Session(engine) as session:
        stmt = select(Architecture).where(Architecture.id == id)
        result = session.execute(statement=stmt).fetchall()
        if result is None:
            raise Exception(f"Architecture with id, {id}, does not exist")
        for r in result:
            architecture: Architecture = r[0]
            if (
                architecture.extraFields is not None
                and architecture.extraFields[ExtraFields.CURRENT.value] is True
            ):
                return architecture
        arch = await get_architecture_latest(id)
        if arch is not None:
            await copilot_set_current_state(id, arch.state)
            return arch
        return None


async def delete_future_states(id: str, state: int):
    with Session(engine) as session:
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
    with Session(engine) as session:
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
    with Session(engine) as session:
        stmt = (
            select(Architecture)
            .where(Architecture.id == id)
            .order_by(Architecture.state.desc())
            .limit(1)
        )
        result = session.execute(statement=stmt).fetchone()
        return None if result is None else result[0]


async def get_architecture_at_state(id: str, state: int) -> Architecture:
    with Session(engine) as session:
        stmt = (
            select(Architecture)
            .where(Architecture.id == id)
            .where(Architecture.state == state)
        )
        result = session.execute(statement=stmt).fetchone()
        return None if result is None else result[0]


async def get_previous_state(id: str, state: int) -> Architecture:
    with Session(engine) as session:
        stmt = (
            select(Architecture)
            .where(Architecture.id == id)
            .where(Architecture.state < state)
            .order_by(Architecture.state.desc())
        )
        result = session.execute(statement=stmt).fetchone()
        return None if result is None else result[0]


async def get_next_state(id: str, state: int) -> Architecture:
    with Session(engine) as session:
        stmt = (
            select(Architecture)
            .where(Architecture.id == id)
            .where(Architecture.state > state)
            .order_by(Architecture.state.asc())
        )
        result = session.execute(statement=stmt).fetchone()
        return None if result is None else result[0]


async def get_architecture_history(id: str) -> List[Architecture]:
    with Session(engine) as session:
        stmt = select(Architecture).where(Architecture.id == id)
        results = session.execute(statement=stmt).fetchall()
        return [result[0] for result in results]


async def get_architectures_by_owner(owner: Entity) -> List[Architecture]:
    with Session(engine) as session:
        stmt = (
            select(Architecture).where(Architecture.owner == owner.to_auth_string())
            # distinct only works with postgress, so it breaks the local story. Instead finding distinct entries in code
        )
        results = session.execute(statement=stmt).fetchall()
        return [result[0] for result in results]


class ArchitectureAlreadyExistsError(Exception):
    pass


async def add_architecture(architecture: Architecture):
    with Session(engine) as session:
        with session.begin():
            try:
                session.add(architecture)
                await copilot_set_current_state(architecture.id, architecture.state)
                session.commit()
            except Exception as e:
                if isinstance(e, IntegrityError):
                    session.rollback()
                    raise ArchitectureAlreadyExistsError(
                        f"Architecture with id, {architecture.id}, already exists"
                    )
                raise e


async def get_architecture_changelog_history(id: str) -> List[dict[str, Any]]:
    with Session(engine) as session:
        stmt = select(Architecture).where(Architecture.id == id)
        results = session.execute(statement=stmt).fetchall()
        history: List[Architecture] = [result[0] for result in results]
        decisions: List[dict] = []
        for h in history:
            if h.decisions is not None and len(h.decisions) > 0:
                decisions.append(
                    {"constraints": h.constraints, "decisions": h.decisions}
                )
        return decisions
