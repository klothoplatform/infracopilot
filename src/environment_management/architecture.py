from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth_service.entity import Entity
from src.environment_management.environment import Environment
from src.environment_management.environment_version import EnvironmentVersion
from src.environment_management.models import Architecture


class ArchitectureAlreadyExistsError(Exception):
    pass


class ArchitectureDoesNotExistError(Exception):
    pass


class ArchitectureDAO:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def list_architectures(self) -> List[Architecture]:
        stmt = select(Architecture)
        results = await self._session.execute(statement=stmt)
        return [result[0] for result in results.fetchall()]

    async def get_architecture(self, id: str) -> Architecture:
        stmt = select(Architecture).where(Architecture.id == id)
        result = await self._session.execute(statement=stmt)
        result = result.fetchone()
        if result is None:
            raise ArchitectureDoesNotExistError
        return result[0]

    async def get_architectures_by_owner(self, owner: Entity) -> List[Architecture]:
        stmt = select(Architecture).where(Architecture.owner == owner.to_auth_string())
        results = await self._session.execute(statement=stmt)
        return [result[0] for result in results.fetchall()]

    def add_architecture(self, architecture: Architecture):
        try:
            self._session.add(architecture)
        except Exception as e:
            raise e

    async def update_architecture(self, architecture: Architecture):
        stmt = select(Architecture).where(Architecture.id == architecture.id)
        result = await self._session.execute(statement=stmt)
        if result.fetchone() is None:
            raise ArchitectureDoesNotExistError
        await self._session.merge(architecture)

    async def delete_architecture(self, id: str):
        stmt = (
            select(Architecture, EnvironmentVersion, Environment)
            .select_from(Architecture)
            .outerjoin(
                EnvironmentVersion,
                EnvironmentVersion.architecture_id == Architecture.id,
            )
            .outerjoin(Environment, Environment.architecture_id == Architecture.id)
            .filter(Architecture.id == id)
        )
        result = await self._session.execute(statement=stmt)
        if result is None:
            return
        all = result.fetchall()
        for r in all:
            await self._session.delete(r[0])
