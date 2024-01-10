import asyncio
import aiounittest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.auth_service.entity import Team, Organization
from src.auth_service.teams_dao import TeamsDAO, TeamModel
from src.environment_management.models import ModelsBase


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
        cls.dao = TeamsDAO(cls.session)
        cls.session.add(
            TeamModel(
                id="test-id",
                name="test-new",
                organization_id="test-org-id",
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

    async def test_list_teams(self):
        teams = await self.dao.list_teams("test-org-id")
        self.assertEqual(len(teams), 1)
        self.assertEqual(
            teams[0],
            Team.with_org(
                id="test-id", organization=Organization("test-org-id"), name="test-new"
            ),
        )

    async def test_get_team(self):
        team = await self.dao.get_team("test-id")
        self.assertEqual(
            team,
            Team.with_org(
                id="test-id", organization=Organization("test-org-id"), name="test-new"
            ),
        )

    async def test_batch_get_teams(self):
        teams = await self.dao.batch_get_teams(["test-id"])
        self.assertEqual(len(teams), 1)
        self.assertEqual(
            teams[0],
            Team.with_org(
                id="test-id", organization=Organization("test-org-id"), name="test-new"
            ),
        )

    async def test_get_team_by_name(self):
        team = await self.dao.get_team_by_name("test-new", "test-org-id")
        self.assertEqual(
            team,
            Team.with_org(
                id="test-id", organization=Organization("test-org-id"), name="test-new"
            ),
        )

    async def test_create_team(self):
        team = Team.with_org(
            id="test-id-2", organization=Organization("test-org-id"), name="test-new-2"
        )
        self.dao.create_team(team)
        team = await self.dao.get_team("test-id-2")
        self.assertEqual(
            team,
            Team.with_org(
                id="test-id-2",
                organization=Organization("test-org-id"),
                name="test-new-2",
            ),
        )

    async def test_update_team(self):
        team = await self.dao.get_team("test-id")
        team.name = "test-updated"
        await self.dao.update_organization(team, "test-org-id-2")
        team = await self.dao.get_team("test-id")
        self.assertEqual(
            team,
            Team.with_org(
                id="test-id",
                organization=Organization("test-org-id-2"),
                name="test-updated",
            ),
        )

    async def test_delete_team(self):
        await self.dao.delete_team("test-id")
        team = await self.dao.get_team("test-id")
        self.assertIsNone(team)
