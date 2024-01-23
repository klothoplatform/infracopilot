import asyncio
import aiounittest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.environment_management.architecture import (
    ArchitectureDAO,
    ArchitectureDoesNotExistError,
)
import datetime
from src.auth_service.entity import User

from src.environment_management.models import (
    ModelsBase,
    Architecture,
    Environment,
    EnvironmentVersion,
)


class TestArchitecture(aiounittest.AsyncTestCase):
    async def test_architecture_str(self):
        arch = Architecture(
            id="test-id",
            name="test-new",
            owner="user:test-owner",
            created_at=datetime.datetime.fromisoformat("2011-11-04"),
        )
        self.assertEqual(arch.__str__(), "architecture:test-id")


class TestArchitectureDAO(aiounittest.AsyncTestCase):
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
        cls.dao = ArchitectureDAO(cls.session)
        cls.session.add(
            Architecture(
                id="test-id",
                name="test-new",
                owner="user:test-owner",
                created_at=datetime.datetime.fromisoformat("2011-11-04"),
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

    async def test_list_architectures(self):
        architectures = await self.dao.list_architectures()
        self.assertEqual(len(architectures), 1)
        self.assertEqual(
            architectures[0],
            Architecture(
                id="test-id",
                name="test-new",
                owner="user:test-owner",
                created_at=datetime.datetime.fromisoformat("2011-11-04"),
            ),
        )

    async def test_get_architecture(self):
        architecture = await self.dao.get_architecture("test-id")
        self.assertEqual(
            architecture,
            Architecture(
                id="test-id",
                name="test-new",
                owner="user:test-owner",
                created_at=datetime.datetime.fromisoformat("2011-11-04"),
            ),
        )

    async def test_get_architecture_none_exist(self):
        with self.assertRaises(ArchitectureDoesNotExistError):
            await self.dao.get_architecture("test-id-2")

    async def test_get_architectures_by_owner(self):
        architectures = await self.dao.get_architectures_by_owner(User("test-owner"))
        self.assertEqual(len(architectures), 1)
        self.assertEqual(
            architectures[0],
            Architecture(
                id="test-id",
                name="test-new",
                owner="user:test-owner",
                created_at=datetime.datetime.fromisoformat("2011-11-04"),
            ),
        )

    async def test_get_architectures_by_owner_none_exist(self):
        architectures = await self.dao.get_architectures_by_owner(User("test-owner-2"))
        self.assertEqual(len(architectures), 0)

    async def test_add_architecture(self):
        self.dao.add_architecture(
            Architecture(
                id="test-id-2",
                name="test-new-2",
                owner="test-owner-2",
                created_at=datetime.datetime.fromisoformat("2011-11-04"),
            )
        )
        stmt = select(Architecture).where(Architecture.id == "test-id-2")
        result = await self.session.execute(statement=stmt)
        result = result.fetchone()
        if result is None:
            raise ArchitectureDoesNotExistError
        architecture = result[0]
        self.assertEqual(
            architecture,
            Architecture(
                id="test-id-2",
                name="test-new-2",
                owner="test-owner-2",
                created_at=datetime.datetime.fromisoformat("2011-11-04"),
            ),
        )

    async def test_add_architecture_duplicate(self):
        with self.assertRaises(Exception):
            self.dao.add_architecture(
                Architecture(
                    id="test-id",
                    name="test-new-2",
                    owner="test-owner-2",
                    created_at=datetime.datetime.fromisoformat("2011-11-04"),
                )
            )
            await self.session.commit()

    async def test_update_architecture(self):
        await self.dao.update_architecture(
            Architecture(
                id="test-id",
                name="test-new-2",
                owner="test-owner-2",
                created_at=datetime.datetime.fromisoformat("2011-11-04"),
            )
        )
        stmt = select(Architecture).where(Architecture.id == "test-id")
        result = await self.session.execute(statement=stmt)
        result = result.fetchone()
        if result is None:
            raise ArchitectureDoesNotExistError
        architecture = result[0]
        self.assertEqual(
            architecture,
            Architecture(
                id="test-id",
                name="test-new-2",
                owner="test-owner-2",
                created_at=datetime.datetime.fromisoformat("2011-11-04"),
            ),
        )

    async def test_delete_architecture(self):
        await self.dao.delete_architecture("test-id")
        stmt = select(Architecture).where(Architecture.id == "test-id")
        result = await self.session.execute(statement=stmt)
        result = result.fetchone()
        self.assertEqual(result, None)

    async def test_delete_architecture_deletes_environments_and_versions(self):
        self.session.add(
            Environment(
                architecture_id="test-id",
                id="test-id",
            )
        )
        self.session.add(
            EnvironmentVersion(
                architecture_id="test-id",
                id="test-id",
                version=1,
                version_hash="test-hash",
                created_by="test-owner",
            )
        )
        await self.session.commit()
        await self.dao.delete_architecture("test-id")
        stmt = (
            select(Architecture, EnvironmentVersion, Environment)
            .select_from(Architecture)
            .outerjoin(
                EnvironmentVersion,
                EnvironmentVersion.architecture_id == Architecture.id,
            )
            .outerjoin(Environment, Environment.architecture_id == Architecture.id)
            .filter(Architecture.id == "test-id")
        )
        result = await self.session.execute(statement=stmt)
        all = result.fetchall()
        self.assertEqual(len(all), 0)

    async def test_delete_architecture_none_exist(self):
        await self.dao.delete_architecture("test-id2")
        stmt = select(Architecture).where(Architecture.id == "test-id2")
        result = await self.session.execute(statement=stmt)
        result = result.fetchone()
        self.assertEqual(result, None)
