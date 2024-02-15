from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.environment_management.models import Environment


class EnvironmentAlreadyExistsError(Exception):
    pass


class EnvironmentDoesNotExistError(Exception):
    pass


class EnvironmentDAO:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_environments_for_architecture(
        self, architecture_id: str
    ) -> List[Environment]:
        stmt = select(Environment).where(Environment.architecture_id == architecture_id)
        results = await self._session.execute(statement=stmt)
        return [result[0] for result in results.fetchall()]

    async def get_environment(self, architecture_id: str, id: str) -> Environment:
        stmt = (
            select(Environment)
            .where(Environment.architecture_id == architecture_id)
            .where(Environment.id == id)
        )
        result = await self._session.execute(statement=stmt)
        result = result.fetchone()
        if result is None:
            raise EnvironmentDoesNotExistError
        return result[0]

    def add_environment(self, environment: Environment):
        try:
            self._session.add(environment)
        except Exception:
            raise

    async def delete_environment(self, architecture_id: str, id: str):
        stmt = (
            select(Environment)
            .where(Environment.architecture_id == architecture_id)
            .where(Environment.id == id)
        )
        result = await self._session.execute(statement=stmt)
        result = result.fetchone()
        if result is None:
            return
        await self._session.delete(result[0])

    async def delete_environments_for_architecture(self, architecture_id: str):
        stmt = select(Environment).where(Environment.architecture_id == architecture_id)
        results = await self._session.execute(statement=stmt)
        for result in results.fetchall():
            await self._session.delete(result[0])

    async def set_current_version(self, architecture_id: str, id: str, version: int):
        stmt = (
            select(Environment)
            .where(Environment.architecture_id == architecture_id)
            .where(Environment.id == id)
        )
        result = await self._session.execute(statement=stmt)
        result = result.fetchone()
        if result is None:
            raise EnvironmentDoesNotExistError
        result[0].current = version
        await self._session.merge(result[0])
