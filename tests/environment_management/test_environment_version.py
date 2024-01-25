import asyncio
import aiounittest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.environment_management.environment_version import (
    EnvironmentVersionDAO,
    EnvironmentVersionDoesNotExistError,
)
import datetime

from src.environment_management.models import (
    ModelsBase,
    Environment,
    EnvironmentVersion,
)


class TestEnvironmentVersion(aiounittest.AsyncTestCase):
    async def test_environment_composite_id(self):
        env = EnvironmentVersion(
            architecture_id="test-architecture-id",
            id="test-id",
            version=1,
            version_hash="test-hash",
            env_resource_configuration={},
            state_location="test-state-location",
            iac_location="test-iac-location",
            created_by="user:test-owner",
            created_at=datetime.datetime.fromisoformat("2011-11-04"),
            constraints={},
        )
        self.assertEqual(env.composite_id(), "test-architecture-id/test-id/1")

    async def test_architecture_str(self):
        env = EnvironmentVersion(
            architecture_id="test-architecture-id",
            id="test-id",
            version=1,
            version_hash="test-hash",
            env_resource_configuration={},
            state_location="test-state-location",
            iac_location="test-iac-location",
            created_by="user:test-owner",
            created_at=datetime.datetime.fromisoformat("2011-11-04"),
            constraints={},
        )
        self.assertEqual(
            env.__str__(), "environment_version:test-architecture-id/test-id/1"
        )


class TestEnvironmentVersionDAO(aiounittest.AsyncTestCase):
    ###### Setup ######

    @classmethod
    def setUpClass(cls):
        loop = asyncio.get_event_loop()
        loop.run_until_complete(cls.asyncSetUpClass())

    @classmethod
    def tearDownClass(cls):
        loop = asyncio.get_event_loop()
        loop.run_until_complete(cls.asyncTearDownClass())

    @classmethod
    async def asyncSetUpClass(cls):
        cls.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        Session = async_sessionmaker(bind=cls.engine)
        cls.session = Session()
        async with cls.engine.begin() as conn:
            await conn.run_sync(ModelsBase.metadata.create_all)
        cls.dao = EnvironmentVersionDAO(cls.session)
        cls.env = Environment(
            architecture_id="test-architecture-id",
            id="test-id",
            current=1,
            tags={},
        )
        cls.session.add(cls.env)
        cls.session.add(
            EnvironmentVersion(
                architecture_id="test-architecture-id",
                id="test-id",
                version=1,
                version_hash="test-hash",
                env_resource_configuration={},
                state_location="test-state-location",
                iac_location="test-iac-location",
                created_by="user:test-owner",
                created_at=datetime.datetime.fromisoformat("2011-11-04"),
                constraints={},
            )
        )
        await cls.session.commit()

    @classmethod
    async def asyncTearDownClass(cls):
        await cls.session.close()
        async with cls.engine.begin() as conn:
            await conn.run_sync(ModelsBase.metadata.drop_all)

    def setUp(self) -> None:
        loop = asyncio.get_event_loop()
        loop.run_until_complete(self.asyncSetUp())

    async def asyncSetUp(self):
        await self.session.rollback()

    ###### Tests ######

    async def test_list_environment_versions(self):
        environment_versions = await self.dao.list_environment_versions(
            "test-architecture-id", "test-id"
        )
        self.assertEqual(len(environment_versions), 1)
        self.assertEqual(
            environment_versions[0],
            EnvironmentVersion(
                architecture_id="test-architecture-id",
                id="test-id",
                version=1,
                version_hash="test-hash",
                env_resource_configuration={},
                state_location="test-state-location",
                iac_location="test-iac-location",
                created_by="user:test-owner",
                created_at=datetime.datetime.fromisoformat("2011-11-04"),
                constraints={},
            ),
        )

    async def test_list_environment_versions_nonexistant_environment(self):
        environment_versions = await self.dao.list_environment_versions(
            "test-architecture-id", "nonexistant-id"
        )
        self.assertEqual(len(environment_versions), 0)

    async def test_get_environment_version(self):
        environment_version = await self.dao.get_environment_version(
            "test-architecture-id", "test-id", 1
        )
        self.assertEqual(
            environment_version,
            EnvironmentVersion(
                architecture_id="test-architecture-id",
                id="test-id",
                version=1,
                version_hash="test-hash",
                env_resource_configuration={},
                state_location="test-state-location",
                iac_location="test-iac-location",
                created_by="user:test-owner",
                created_at=datetime.datetime.fromisoformat("2011-11-04"),
                constraints={},
            ),
        )

    async def test_get_environment_version_nonexistant_environment(self):
        with self.assertRaises(EnvironmentVersionDoesNotExistError):
            await self.dao.get_environment_version(
                "test-architecture-id", "nonexistant-id", 1
            )

    async def test_get_environment_version_nonexistant_version(self):
        with self.assertRaises(EnvironmentVersionDoesNotExistError):
            await self.dao.get_environment_version("test-architecture-id", "test-id", 2)

    async def test_add_environment_version(self):
        self.dao.add_environment_version(
            EnvironmentVersion(
                architecture_id="test-architecture-id",
                id="test-id-2",
                version=1,
                version_hash="test-hash",
                env_resource_configuration={},
                state_location="test-state-location",
                iac_location="test-iac-location",
                created_by="user:test-owner",
                constraints={},
            )
        )
        stmt = (
            select(EnvironmentVersion)
            .where(EnvironmentVersion.id == "test-id-2")
            .where(EnvironmentVersion.version == 1)
        )
        result = await self.session.execute(statement=stmt)
        result = result.fetchone()
        if result is None:
            self.fail("Environment version not added to database")
        environment_version = result[0]
        self.assertEqual(
            environment_version,
            EnvironmentVersion(
                architecture_id="test-architecture-id",
                id="test-id-2",
                version=1,
                version_hash="test-hash",
                env_resource_configuration={},
                state_location="test-state-location",
                iac_location="test-iac-location",
                created_by="user:test-owner",
                created_at=environment_version.created_at,
                constraints={},
            ),
        )

    async def test_add_environment_version_already_exists(self):
        with self.assertRaises(Exception):
            self.dao.add_environment_version(
                EnvironmentVersion(
                    architecture_id="test-architecture-id",
                    id="test-id",
                    version=1,
                    version_hash="test-hash",
                    env_resource_configuration={},
                    state_location="test-state-location",
                    iac_location="test-iac-location",
                    created_by="user:test-owner",
                    created_at=datetime.datetime.fromisoformat("2011-11-04"),
                    constraints={},
                )
            )
            await self.session.commit()

    async def test_delete_environment_version(self):
        await self.dao.delete_environment_version("test-architecture-id", "test-id", 1)
        stmt = (
            select(EnvironmentVersion)
            .where(EnvironmentVersion.id == "test-id")
            .where(EnvironmentVersion.version == 1)
        )
        result = await self.session.execute(statement=stmt)
        result = result.fetchone()
        self.assertEqual(result, None)

    async def test_delete_environment_version_nonexistant_environment(self):
        await self.dao.delete_environment_version(
            "test-architecture-id", "nonexistant-id", 1
        )
        stmt = (
            select(EnvironmentVersion)
            .where(EnvironmentVersion.id == "nonexistant-id")
            .where(EnvironmentVersion.version == 1)
        )
        result = await self.session.execute(statement=stmt)
        result = result.fetchone()
        self.assertEqual(result, None)

    async def test_delete_environment_version_nonexistant_version(self):
        await self.dao.delete_environment_version("test-architecture-id", "test-id", 2)
        stmt = (
            select(EnvironmentVersion)
            .where(EnvironmentVersion.id == "test-id")
            .where(EnvironmentVersion.version == 2)
        )
        result = await self.session.execute(statement=stmt)
        result = result.fetchone()
        self.assertEqual(result, None)

    async def test_get_current_version(self):
        environment_version = await self.dao.get_current_version(
            "test-architecture-id", "test-id"
        )
        self.assertEqual(
            environment_version,
            EnvironmentVersion(
                architecture_id="test-architecture-id",
                id="test-id",
                version=1,
                version_hash="test-hash",
                env_resource_configuration={},
                state_location="test-state-location",
                iac_location="test-iac-location",
                created_by="user:test-owner",
                created_at=datetime.datetime.fromisoformat("2011-11-04"),
                constraints={},
            ),
        )

    async def test_get_current_version_nonexistant_environment(self):
        with self.assertRaises(EnvironmentVersionDoesNotExistError):
            await self.dao.get_current_version("test-architecture-id", "nonexistant-id")

    async def test_get_latest_version(self):
        environment_version = await self.dao.get_latest_version(
            "test-architecture-id", "test-id"
        )
        self.assertEqual(
            environment_version,
            EnvironmentVersion(
                architecture_id="test-architecture-id",
                id="test-id",
                version=1,
                version_hash="test-hash",
                env_resource_configuration={},
                state_location="test-state-location",
                iac_location="test-iac-location",
                created_by="user:test-owner",
                created_at=datetime.datetime.fromisoformat("2011-11-04"),
                constraints={},
            ),
        )

    async def test_get_latest_version_nonexistant_environment(self):
        with self.assertRaises(EnvironmentVersionDoesNotExistError):
            await self.dao.get_latest_version("test-architecture-id", "nonexistant-id")

    async def test_delete_future_versions(self):
        self.dao.add_environment_version(
            EnvironmentVersion(
                architecture_id="test-architecture-id",
                id="test-id",
                version=2,
                version_hash="test-hash",
                env_resource_configuration={},
                state_location="test-state-location",
                iac_location="test-iac-location",
                created_by="user:test-owner",
                created_at=datetime.datetime.fromisoformat("2011-11-04"),
                constraints={},
            )
        )
        await self.dao.delete_future_versions("test-architecture-id", "test-id", 1)
        stmt = (
            select(EnvironmentVersion)
            .where(EnvironmentVersion.id == "test-id")
            .where(EnvironmentVersion.version == 2)
        )
        result = await self.session.execute(statement=stmt)
        result = result.fetchone()
        self.assertEqual(result, None)

    async def test_delete_future_versions_nonexistant_environment(self):
        await self.dao.delete_future_versions(
            "test-architecture-id", "nonexistant-id", 1
        )
        stmt = select(EnvironmentVersion).where(
            EnvironmentVersion.id == "nonexistant-id"
        )
        result = await self.session.execute(statement=stmt)
        result = result.fetchone()
        self.assertEqual(result, None)

    async def test_get_previous_state(self):
        self.dao.add_environment_version(
            EnvironmentVersion(
                architecture_id="test-architecture-id",
                id="test-id",
                version=0,
                version_hash="test-hash",
                env_resource_configuration={},
                state_location="test-state-location",
                iac_location="test-iac-location",
                created_by="user:test-owner",
                created_at=datetime.datetime.fromisoformat("2011-11-04"),
                constraints={},
            )
        )
        environment_version = await self.dao.get_previous_state(
            "test-architecture-id", "test-id", 1
        )
        self.assertEqual(
            environment_version,
            EnvironmentVersion(
                architecture_id="test-architecture-id",
                id="test-id",
                version=0,
                version_hash="test-hash",
                env_resource_configuration={},
                state_location="test-state-location",
                iac_location="test-iac-location",
                created_by="user:test-owner",
                created_at=datetime.datetime.fromisoformat("2011-11-04"),
                constraints={},
            ),
        )

    async def test_get_next_state(self):
        self.dao.add_environment_version(
            EnvironmentVersion(
                architecture_id="test-architecture-id",
                id="test-id",
                version=2,
                version_hash="test-hash",
                env_resource_configuration={},
                state_location="test-state-location",
                iac_location="test-iac-location",
                created_by="user:test-owner",
                created_at=datetime.datetime.fromisoformat("2011-11-04"),
                constraints={},
            )
        )
        environment_version = await self.dao.get_next_state(
            "test-architecture-id", "test-id", 1
        )
        self.assertEqual(
            environment_version,
            EnvironmentVersion(
                architecture_id="test-architecture-id",
                id="test-id",
                version=2,
                version_hash="test-hash",
                env_resource_configuration={},
                state_location="test-state-location",
                iac_location="test-iac-location",
                created_by="user:test-owner",
                created_at=datetime.datetime.fromisoformat("2011-11-04"),
                constraints={},
            ),
        )

    async def test_get_all_versions_tracking_hash(self):
        self.dao.add_environment_version(
            EnvironmentVersion(
                architecture_id="test-architecture-id",
                id="test-id",
                version=2,
                version_hash="test-hash-2",
                env_resource_configuration={
                    "tracks": {
                        "environment": "test-id",
                        "version_hash": "test-hash",
                    }
                },
                state_location="test-state-location",
                iac_location="test-iac-location",
                created_by="user:test-owner",
                constraints={},
            )
        )
        environment_versions = await self.dao.get_all_versions_tracking_hash(
            "test-architecture-id", "test-id", "test-id", "test-hash"
        )
        self.assertEqual(len(environment_versions), 1)
        self.assertEqual(
            environment_versions[0],
            EnvironmentVersion(
                architecture_id="test-architecture-id",
                id="test-id",
                version=2,
                version_hash="test-hash-2",
                env_resource_configuration={
                    "tracks": {
                        "environment": "test-id",
                        "version_hash": "test-hash",
                    }
                },
                state_location="test-state-location",
                iac_location="test-iac-location",
                created_by="user:test-owner",
                created_at=environment_versions[0].created_at,
                constraints={},
            ),
        )
