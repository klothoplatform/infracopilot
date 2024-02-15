from typing import List

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.environment_management.models import Environment, EnvironmentVersion


class EnvironmentVersionAlreadyExistsError(Exception):
    pass


class EnvironmentVersionDoesNotExistError(Exception):
    pass


class EnvironmentVersionDAO:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def list_environment_versions(
        self, architecture_id: str, env_id: str
    ) -> List[EnvironmentVersion]:
        stmt = (
            select(EnvironmentVersion)
            .where(EnvironmentVersion.architecture_id == architecture_id)
            .where(EnvironmentVersion.id == env_id)
            .order_by(EnvironmentVersion.version.asc())
        )
        results = await self._session.execute(statement=stmt)
        return [result[0] for result in results.fetchall()]

    async def get_environment_version(
        self, architecture_id: str, id: str, version: int
    ) -> EnvironmentVersion:
        stmt = (
            select(EnvironmentVersion)
            .where(EnvironmentVersion.architecture_id == architecture_id)
            .where(EnvironmentVersion.id == id)
            .where(EnvironmentVersion.version == version)
        )
        result = await self._session.execute(statement=stmt)
        result = result.fetchone()
        if result is None:
            raise EnvironmentVersionDoesNotExistError
        return result[0]

    def add_environment_version(self, environment_version: EnvironmentVersion):
        try:
            self._session.add(environment_version)
        except Exception as e:
            raise e

    async def update_environment_version(self, environment_version: EnvironmentVersion):
        stmt = (
            select(EnvironmentVersion)
            .where(
                EnvironmentVersion.architecture_id
                == environment_version.architecture_id
            )
            .where(EnvironmentVersion.id == environment_version.id)
            .where(EnvironmentVersion.version == environment_version.version)
        )
        result = await self._session.execute(statement=stmt)
        if result is None:
            raise EnvironmentVersionDoesNotExistError
        result = result.fetchone()
        if result is None:
            raise EnvironmentVersionDoesNotExistError
        await self._session.delete(result[0])
        self._session.add(environment_version)

    async def delete_environment_version(
        self, architecture_id: str, id: str, version: int
    ):
        stmt = (
            select(EnvironmentVersion)
            .where(EnvironmentVersion.architecture_id == architecture_id)
            .where(EnvironmentVersion.id == id)
            .where(EnvironmentVersion.version == version)
        )
        result = await self._session.execute(statement=stmt)
        result = result.fetchone()
        if result is not None:
            await self._session.delete(result[0])

    async def get_current_version(
        self, architecture_id: str, id: str
    ) -> EnvironmentVersion:
        stmt = (
            select(EnvironmentVersion)
            .filter(Environment.architecture_id == architecture_id)
            .filter(Environment.id == id)
            .filter(EnvironmentVersion.id == Environment.id)
            .filter(EnvironmentVersion.architecture_id == Environment.architecture_id)
            .filter(Environment.current == EnvironmentVersion.version)
        )
        result = await self._session.execute(statement=stmt)
        result = result.fetchone()
        if result is None:
            raise EnvironmentVersionDoesNotExistError
        return result[0]

    async def get_latest_version(
        self, architecture_id: str, id: str
    ) -> EnvironmentVersion:
        stmt = (
            select(EnvironmentVersion)
            .where(EnvironmentVersion.architecture_id == architecture_id)
            .where(EnvironmentVersion.id == id)
            .order_by(EnvironmentVersion.version.desc())
            .limit(1)
        )
        result = await self._session.execute(statement=stmt)
        result = result.fetchone()
        if result is None:
            raise EnvironmentVersionDoesNotExistError
        return result[0]

    async def delete_future_versions(self, architecture_id: str, id: str, version: int):
        stmt = (
            select(EnvironmentVersion)
            .where(EnvironmentVersion.architecture_id == architecture_id)
            .where(EnvironmentVersion.id == id)
            .where(EnvironmentVersion.version > version)
        )
        result = await self._session.execute(statement=stmt)
        for r in result.fetchall():
            await self._session.delete(r[0])

    async def get_previous_state(
        self, architecture_id: str, id: str, version: int
    ) -> EnvironmentVersion:
        stmt = (
            select(EnvironmentVersion)
            .where(EnvironmentVersion.architecture_id == architecture_id)
            .where(EnvironmentVersion.id == id)
            .where(EnvironmentVersion.version < version)
            .order_by(EnvironmentVersion.version.desc())
            .limit(1)
        )
        result = await self._session.execute(statement=stmt)
        result = result.fetchone()
        if result is None:
            raise EnvironmentVersionDoesNotExistError
        return result[0]

    async def get_next_state(
        self, architecture_id: str, id: str, version: int
    ) -> EnvironmentVersion:
        stmt = (
            select(EnvironmentVersion)
            .where(EnvironmentVersion.architecture_id == architecture_id)
            .where(EnvironmentVersion.id == id)
            .where(EnvironmentVersion.version > version)
            .order_by(EnvironmentVersion.version.asc())
            .limit(1)
        )
        result = await self._session.execute(statement=stmt)
        result = result.fetchone()
        if result is None:
            raise EnvironmentVersionDoesNotExistError
        return result[0]

    async def get_all_versions_tracking_hash(
        self,
        architecture_id: str,
        id: str,
        tracking_env: str,
        tracking_version_hash: str,
    ) -> List[EnvironmentVersion]:
        stmt = (
            select(EnvironmentVersion)
            .where(
                and_(
                    EnvironmentVersion.architecture_id == architecture_id,
                    EnvironmentVersion.id == id,
                    EnvironmentVersion.env_resource_configuration[
                        ("tracks", "version_hash")
                    ].as_string()
                    == tracking_version_hash,
                    EnvironmentVersion.env_resource_configuration[
                        ("tracks", "environment")
                    ].as_string()
                    == tracking_env,
                )
            )
            .order_by(EnvironmentVersion.version.asc())
        )
        result = await self._session.execute(stmt)
        result = result.fetchall()
        return [r[0] for r in result]

    async def get_all_versions_after_hash(
        self,
        architecture_id: str,
        id: str,
        version_hash: str,
    ) -> List[EnvironmentVersion]:
        stmt = (
            select(EnvironmentVersion)
            .where(
                and_(
                    EnvironmentVersion.architecture_id == architecture_id,
                    EnvironmentVersion.id == id,
                    EnvironmentVersion.version_hash == version_hash,
                )
            )
            .order_by(EnvironmentVersion.version.desc())
            .limit(1)
        )
        result = await self._session.execute(stmt)
        result = result.fetchone()
        if result is None:
            raise EnvironmentVersionDoesNotExistError
        version = result[0].version

        stmt = (
            select(EnvironmentVersion)
            .where(
                and_(
                    EnvironmentVersion.architecture_id == architecture_id,
                    EnvironmentVersion.id == id,
                    EnvironmentVersion.version > version,
                )
            )
            .order_by(EnvironmentVersion.version.asc())
        )
        result = await self._session.execute(stmt)
        result = result.fetchall()
        return [r[0] for r in result]
