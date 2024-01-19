import asyncio
import aiounittest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from src.environment_management.environment import (
    Environment,
    EnvironmentDAO,
    EnvironmentDoesNotExistError,
)
import datetime
from src.util.entity import User

from unittest import mock

from src.environment_management.models import (
    ModelsBase,
    Environment,
)


class TestEnvironment(aiounittest.AsyncTestCase):
    async def test_environment_composite_id(self):
        env = Environment(
            architecture_id="test-architecture-id",
            id="test-id",
            current=1,
            tags={},
        )
        self.assertEqual(env.composite_id(), "test-architecture-id/test-id")

    async def test_architecture_str(self):
        env = Environment(
            architecture_id="test-architecture-id",
            id="test-id",
            current=1,
            tags={},
        )
        self.assertEqual(env.__str__(), "environment:test-architecture-id/test-id")


class TestEnvironmentDAO(aiounittest.AsyncTestCase):
    ###### Setup ######

    @classmethod
    def setUpClass(self) -> None:
        loop = asyncio.get_event_loop()
        loop.run_until_complete(self.asyncSetUpClass())

    @classmethod
    async def asyncSetUpClass(self):
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        Session = async_sessionmaker(bind=self.engine)
        self.session = Session()
        async with self.engine.begin() as conn:
            await conn.run_sync(ModelsBase.metadata.create_all)
        self.dao = EnvironmentDAO(self.session)
        self.session.add(
            Environment(
                architecture_id="test-architecture-id",
                id="test-id",
                current=1,
                tags={},
            )
        )
        await self.session.commit()

    @classmethod
    async def asyncTearDownClass(self):
        await self.session.close()
        async with self.engine.begin() as conn:
            await conn.run_sync(ModelsBase.metadata.drop_all)

    @classmethod
    def tearDownClass(self):
        loop = asyncio.get_event_loop()
        loop.run_until_complete(self.asyncTearDownClass())

    def setUp(self) -> None:
        loop = asyncio.get_event_loop()
        loop.run_until_complete(self.asyncSetUp())

    async def asyncSetUp(self):
        await self.session.rollback()

    async def test_get_environments_for_architecture(self):
        environments = await self.dao.get_environments_for_architecture(
            "test-architecture-id"
        )
        self.assertEqual(len(environments), 1)
        self.assertEqual(
            environments[0],
            Environment(
                architecture_id="test-architecture-id",
                id="test-id",
                current=1,
                tags={},
            ),
        )

    async def test_get_environment(self):
        environment = await self.dao.get_environment("test-architecture-id", "test-id")
        self.assertEqual(
            environment,
            Environment(
                architecture_id="test-architecture-id",
                id="test-id",
                current=1,
                tags={},
            ),
        )

    async def test_get_environment_none_exist(self):
        with self.assertRaises(EnvironmentDoesNotExistError):
            await self.dao.get_environment("test-architecture-id", "test-id-2")

    async def test_add_environment(self):
        self.dao.add_environment(
            Environment(
                architecture_id="test-architecture-id",
                id="test-id-2",
                current=1,
                tags={},
            )
        )
        stmt = (
            select(Environment)
            .where(Environment.architecture_id == "test-architecture-id")
            .where(Environment.id == "test-id-2")
        )
        result = await self.session.execute(statement=stmt)
        result = result.fetchone()
        environment = result[0]
        self.assertEqual(
            environment,
            Environment(
                architecture_id="test-architecture-id",
                id="test-id-2",
                current=1,
                tags={},
            ),
        )

    async def test_add_environment_already_exists(self):
        with self.assertRaises(Exception):
            self.dao.add_environment(
                Environment(
                    architecture_id="test-architecture-id",
                    id="test-id",
                    current=1,
                    tags={},
                )
            )
            await self.session.commit()

    async def test_delete_environment(self):
        await self.dao.delete_environment("test-architecture-id", "test-id")
        stmt = (
            select(Environment)
            .where(Environment.architecture_id == "test-architecture-id")
            .where(Environment.id == "test-id")
        )
        result = await self.session.execute(statement=stmt)
        result = result.fetchone()
        self.assertEqual(result, None)

    async def test_delete_environment_none_exist(self):
        await self.dao.delete_environment("test-architecture-id", "test-id-2")
        stmt = (
            select(Environment)
            .where(Environment.architecture_id == "test-architecture-id")
            .where(Environment.id == "test-id-2")
        )
        result = await self.session.execute(statement=stmt)
        result = result.fetchone()
        self.assertEqual(result, None)

    async def test_delete_environments_for_architecture(self):
        await self.dao.delete_environments_for_architecture("test-architecture-id")
        stmt = select(Environment).where(
            Environment.architecture_id == "test-architecture-id"
        )
        result = await self.session.execute(statement=stmt)
        result = result.fetchone()
        self.assertEqual(result, None)

    async def test_delete_environments_for_architecture_none_exist(self):
        await self.dao.delete_environments_for_architecture("test-architecture-id-2")
        stmt = select(Environment).where(
            Environment.architecture_id == "test-architecture-id-2"
        )
        result = await self.session.execute(statement=stmt)
        result = result.fetchone()
        self.assertEqual(result, None)

    async def test_set_current_version(self):
        await self.dao.set_current_version("test-architecture-id", "test-id", 2)
        stmt = (
            select(Environment)
            .where(Environment.architecture_id == "test-architecture-id")
            .where(Environment.id == "test-id")
        )
        result = await self.session.execute(statement=stmt)
        result = result.fetchone()
        self.assertEqual(result[0].current, 2)
