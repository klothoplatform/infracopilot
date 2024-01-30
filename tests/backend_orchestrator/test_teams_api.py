from unittest import mock
import aiounittest
from fastapi import Request
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from src.auth_service.entity import Organization, User, Team
from src.auth_service.teams_manager import TeamsManager
from src.auth_service.token import PUBLIC_USER, AuthError
from src.backend_orchestrator.teams_api import (
    create_team,
    CreateTeamRequest,
    list_teams,
    ListTeamsResponse,
    list_teams_for_org,
)


class TestCreateTeam(aiounittest.AsyncTestCase):
    @patch("src.backend_orchestrator.teams_api.SessionLocal")
    @patch.object(TeamsManager, "create_team")
    @patch.object(TeamsManager, "get_users_organization")
    @patch("src.backend_orchestrator.teams_api.get_teams_manager")
    @mock.patch(
        "src.backend_orchestrator.teams_api.get_user_id",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.teams_api.deps.fga_manager",
        new_callable=mock.AsyncMock,
    )
    async def test_create_team(
        self,
        mock_fga_manager,
        mock_get_user_id,
        mock_get_teams_manager,
        mock_get_users_organization,
        mock_create_team,
        session_local,
    ):
        mock_get_user_id.return_value = "user1"
        mock_get_users_organization.return_value = "org1"
        mock_create_team.return_value = "team1"

        req = Request(scope={"type": "http", "headers": []})
        body = CreateTeamRequest(name="test_team")
        session = MagicMock()
        mock_get_teams_manager.return_value = TeamsManager(session, mock_fga_manager)
        session_local.begin.return_value.__aenter__.return_value = session
        response = await create_team(req, body)
        self.assertEqual(response.name, "test_team")
        mock_get_teams_manager.assert_called_once_with(session, mock_fga_manager)
        mock_create_team.assert_called_once_with("test_team", User("user1"), "org1")
        mock_get_user_id.assert_called_once_with(req)
        mock_get_users_organization.assert_called_once_with(User("user1"))

    @patch.object(TeamsManager, "get_users_teams")
    @patch.object(TeamsManager, "get_team_admins")
    @patch.object(TeamsManager, "get_parent")
    @patch.object(TeamsManager, "get_team_members")
    @mock.patch(
        "src.backend_orchestrator.teams_api.get_teams_manager",
        new_callable=mock.AsyncMock,
    )
    @patch("src.backend_orchestrator.teams_api.SessionLocal")
    @mock.patch(
        "src.backend_orchestrator.teams_api.get_user_id",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.teams_api.deps.fga_manager",
        new_callable=mock.AsyncMock,
    )
    async def test_list_teams(
        self,
        mock_fga_manager,
        mock_get_user_id,
        session_local,
        mock_get_teams_manager,
        mock_get_team_members,
        mock_get_parent,
        mock_get_team_admins,
        mock_get_users_teams,
    ):
        # setup
        mock_get_user_id.return_value = "member1"
        mock_get_users_teams.return_value = [Team(id="team1")]
        mock_get_team_members.return_value = [User("member1"), User("member2")]
        mock_get_parent.side_effect = [Team(id="team2"), None]
        mock_get_team_admins.return_value = [User("member1")]
        session = MagicMock()
        session_local.begin.return_value.__aenter__.return_value = session
        req = Request(scope={"type": "http", "headers": []})
        mock_get_teams_manager.return_value = TeamsManager(session, mock_fga_manager)

        # run
        response: ListTeamsResponse = await list_teams(req)

        # assert
        expected_result = Team(id="team1")
        expected_result.members = [User("member1"), User("member2")]
        expected_result.admins = [User("member1")]
        expected_result.parent = Team(id="team2")
        self.maxDiff = None
        self.assertEqual(response.teams, [expected_result])
        mock_get_teams_manager.assert_called_once_with(session, mock_fga_manager)
        mock_get_users_teams.assert_called_once_with(User("member1"))
        mock_get_team_members.assert_called_once_with(Team(id="team1"))
        mock_get_parent.assert_called_once_with(Team(id="team1"))
        mock_get_team_admins.assert_called_once_with(Team(id="team1"))

    @patch.object(TeamsManager, "get_users_organization")
    @patch.object(TeamsManager, "get_org_admins")
    @patch.object(TeamsManager, "list_teams_for_org")
    @mock.patch(
        "src.backend_orchestrator.teams_api.get_teams_manager",
        new_callable=mock.AsyncMock,
    )
    @patch("src.backend_orchestrator.teams_api.SessionLocal")
    @mock.patch(
        "src.backend_orchestrator.teams_api.get_user_id",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.teams_api.deps.fga_manager",
        new_callable=mock.AsyncMock,
    )
    async def test_list_teams_for_org(
        self,
        mock_fga_manager,
        mock_get_user_id,
        session_local,
        mock_get_teams_manager,
        mock_list_teams_for_org,
        mock_get_org_admins,
        mock_get_users_organization,
    ):
        mock_get_user_id.return_value = "member1"
        mock_get_users_organization.return_value = Organization(id="org1")
        mock_list_teams_for_org.return_value = [Team(id="team1")]
        mock_get_org_admins.return_value = [User("member1")]

        session = MagicMock()
        session_local.begin.return_value.__aenter__.return_value = session
        req = Request(scope={"type": "http", "headers": []})
        mock_get_teams_manager.return_value = TeamsManager(session, mock_fga_manager)

        response: ListTeamsResponse = await list_teams_for_org(req)

        expected_result = Team(id="team1")
        self.assertEqual(response.teams, [expected_result])
        mock_get_teams_manager.assert_called_once_with(session, mock_fga_manager)
        mock_get_users_organization.assert_called_once_with(User("member1"))
        mock_list_teams_for_org.assert_called_once_with("org1")
        mock_get_org_admins.assert_called_once_with(Organization(id="org1"))
