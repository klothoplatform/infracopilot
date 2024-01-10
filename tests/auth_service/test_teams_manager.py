from unittest import mock
import aiounittest
from unittest.mock import Mock, patch, MagicMock
from src.auth_service.fga_manager import FGAManager
from src.auth_service.entity import User, Organization, Team
from src.auth_service.teams_dao import TeamsDAO
from src.auth_service.teams_manager import (
    TeamNotInOrgException,
    TeamWithNameExistsException,
    TeamsManager,
)
from openfga_sdk.client.models.list_objects_request import ClientListObjectsRequest
from openfga_sdk.client.models.tuple import ClientTuple
from openfga_sdk.client.models.expand_request import ClientExpandRequest
from openfga_sdk.models.leaf import Leaf
from openfga_sdk.models.userset_tree import UsersetTree
from openfga_sdk.models.node import Node
from openfga_sdk.models.nodes import Nodes
from openfga_sdk import ClientConfiguration
from openfga_sdk.models.expand_response import ExpandResponse
from openfga_sdk.models.computed import Computed
from openfga_sdk.models.users import Users


class TestTeamsManager(aiounittest.AsyncTestCase):
    @classmethod
    def setUpClass(cls):
        cls.manager = FGAManager(ClientConfiguration())
        cls.teams_dao = TeamsDAO(MagicMock())
        cls.teams_manager = TeamsManager(cls.manager, cls.teams_dao)

    @patch.object(FGAManager, "list_objects")
    @patch.object(TeamsDAO, "batch_get_teams")
    async def test_get_users_teams(
        self, mock_batch_get: MagicMock, mock_list_objects: MagicMock
    ):
        mock_list_objects.return_value = ["team:team1", "team:team2"]
        mock_batch_get.return_value = [Team("team1"), Team("team2")]

        user = User("user1")

        teams = await self.teams_manager.get_users_teams(user)

        print(mock_list_objects.call_args[0][0].type, Team.type())

        self.assertEqual(mock_list_objects.call_args[0][0].user, user.to_auth_string())
        self.assertEqual(mock_list_objects.call_args[0][0].relation, "member")
        self.assertEqual(mock_list_objects.call_args[0][0].type, Team.type())
        mock_list_objects.assert_called_once()

        mock_batch_get.assert_called_once_with(["team1", "team2"])

        self.assertEqual(len(teams), 2)
        self.assertEqual(teams[0].id, "team1")
        self.assertEqual(teams[1].id, "team2")

    @patch.object(FGAManager, "list_objects")
    async def test_get_users_organization(self, mock_list_objects: MagicMock):
        mock_list_objects.return_value = ["organization:org1"]

        user = User("user1")

        organization = await self.teams_manager.get_users_organization(user)

        self.assertEqual(mock_list_objects.call_args[0][0].user, user.to_auth_string())
        self.assertEqual(mock_list_objects.call_args[0][0].relation, "member")
        self.assertEqual(mock_list_objects.call_args[0][0].type, Organization.type())

        mock_list_objects.assert_called_once()
        self.assertEqual(organization.id, "org1")

    @patch.object(FGAManager, "list_objects")
    async def test_get_users_organization_error(self, mock_list_objects):
        mock_list_objects.return_value = ["organization:org1", "organization:org2"]

        user = User("user1")

        with self.assertRaises(Exception) as context:
            await self.teams_manager.get_users_organization(user)

        self.assertTrue(
            "User is part of more than one organization" in str(context.exception)
        )

    @patch.object(TeamsManager, "add_team_admin")
    @patch.object(TeamsManager, "add_team_member")
    @patch.object(TeamsManager, "set_team_organization")
    @mock.patch(
        "src.auth_service.teams_manager.uuid",
        new_callable=Mock,
    )
    async def test_create_team(
        self,
        mock_uuid,
        mock_set_team_organization,
        mock_add_team_member,
        mock_add_team_admin,
    ):
        mock_add_team_member.return_value = None
        mock_add_team_admin.return_value = None
        mock_set_team_organization.return_value = None
        test_id = "7cf1dc58-6669-4296-aa4e-ca9a23d92ac0"
        mock_uuid.uuid4.return_value = test_id

        team = Team(test_id)
        user = User("user1")
        org = Organization("org1")
        team.organization = org
        team.name = "team1"

        await self.teams_manager.create_team("team1", user, org)

        mock_add_team_admin.assert_called_once_with(team, user)
        mock_set_team_organization.assert_called_once_with(team, org)

    @patch.object(FGAManager, "expand")
    async def test_get_team_members(self, mock_expand):
        mock_expand.return_value = ExpandResponse(
            tree=UsersetTree(
                root=Node(
                    name="test",
                    leaf=Leaf(users=Users(users=["user:user1", "user:user2"])),
                    union=Nodes(
                        nodes=[
                            Node(
                                name="test",
                                leaf=Leaf(users=Users(users=["user:user3"])),
                            ),
                        ]
                    ),
                )
            )
        )

        manager = FGAManager(ClientConfiguration())
        teams_manager = TeamsManager(manager, TeamsDAO(MagicMock()))
        team = Team("team1")

        members = await teams_manager.get_team_members(team)

        self.assertEqual(mock_expand.call_args[0][0].object, team.to_auth_string())
        self.assertEqual(mock_expand.call_args[0][0].relation, "member")

        mock_expand.assert_called_once()
        self.assertEqual(len(members), 3)
        self.assertEqual(members[0].id, "user1")
        self.assertEqual(members[1].id, "user2")
        self.assertEqual(members[2].id, "user3")

    @patch.object(FGAManager, "expand")
    async def test_get_team_members_gets_subteam_members(self, mock_expand: Mock):
        mock_expand.side_effect = [
            ExpandResponse(
                tree=UsersetTree(
                    root=Node(
                        name="test",
                        union=Nodes(
                            nodes=[
                                Node(
                                    name="test",
                                    leaf=Leaf(
                                        computed=Computed(userset="team:team2#member")
                                    ),
                                )
                            ]
                        ),
                    )
                )
            ),
            ExpandResponse(
                tree=UsersetTree(
                    root=Node(
                        name="test",
                        union=Nodes(
                            nodes=[
                                Node(
                                    name="test",
                                    leaf=Leaf(users=Users(users=["user:user1"])),
                                ),
                            ]
                        ),
                    )
                )
            ),
        ]

        team = Team("team1")

        members = await self.teams_manager.get_team_members(team)

        self.assertEqual(
            mock_expand.call_args_list[0][0][0].object, team.to_auth_string()
        )
        self.assertEqual(mock_expand.call_args_list[0][0][0].relation, "member")
        self.assertEqual(mock_expand.call_args_list[1][0][0].object, "team:team2")
        self.assertEqual(mock_expand.call_args_list[1][0][0].relation, "member")
        self.assertEqual(mock_expand.call_count, 2)
        self.assertEqual(len(members), 1)
        self.assertEqual(members[0].id, "user1")

    @patch.object(FGAManager, "expand")
    @patch.object(TeamsManager, "get_team_admins")
    async def test_get_team_members_gets_subteam_admins(
        self, mock_get_team_admins, mock_expand
    ):
        mock_get_team_admins.return_value = [User("user1")]
        mock_expand.return_value = ExpandResponse(
            tree=UsersetTree(
                root=Node(
                    name="test",
                    union=Nodes(
                        nodes=[
                            Node(
                                name="test",
                                leaf=Leaf(
                                    computed=Computed(userset="team:team1#admin")
                                ),
                            )
                        ]
                    ),
                )
            )
        )

        team = Team("team1")

        members = await self.teams_manager.get_team_members(team)

        self.assertEqual(mock_expand.call_args[0][0].object, team.to_auth_string())
        self.assertEqual(mock_expand.call_args[0][0].relation, "member")
        mock_expand.assert_called_once()
        mock_get_team_admins.assert_called_once_with(team)
        self.assertEqual(len(members), 1)
        self.assertEqual(members[0].id, "user1")

    @patch.object(FGAManager, "write_tuples")
    @patch.object(TeamsManager, "get_team_organization")
    @patch.object(TeamsManager, "get_users_organization")
    @patch.object(TeamsManager, "get_users_teams")
    async def test_add_team_member(
        self,
        mock_get_users_teams,
        mock_get_users_organization,
        mock_get_team_organization,
        mock_write_tuples,
    ):
        org = Organization("org1")

        mock_get_users_teams.return_value = []
        mock_get_team_organization.return_value = org
        mock_get_users_organization.return_value = org
        mock_write_tuples.return_value = None

        team = Team("team1")
        user = User("user1")

        await self.teams_manager.add_team_member(team, user)

        mock_get_users_teams.assert_called_once_with(user)
        mock_get_team_organization.assert_called_once_with(team)
        mock_get_users_organization.assert_called_once_with(user)

        self.assertEqual(
            mock_write_tuples.call_args[0][0][0].user, user.to_auth_string()
        )
        self.assertEqual(mock_write_tuples.call_args[0][0][0].relation, "member")
        self.assertEqual(
            mock_write_tuples.call_args[0][0][0].object, team.to_auth_string()
        )
        mock_write_tuples.assert_called_once()

    @patch.object(FGAManager, "write_tuples")
    @patch.object(TeamsManager, "get_team_organization")
    @patch.object(TeamsManager, "get_users_organization")
    @patch.object(TeamsManager, "get_users_teams")
    async def test_add_team_member_user_already_member(
        self,
        mock_get_users_teams,
        mock_get_users_organization,
        mock_get_team_organization,
        mock_write_tuples,
    ):
        org = Organization("org1")
        team = Team("team1")
        user = User("user1")

        mock_get_users_teams.return_value = [team]

        await self.teams_manager.add_team_member(team, user)

        mock_get_users_teams.assert_called_once_with(user)
        mock_get_team_organization.assert_not_called()
        mock_get_users_organization.assert_not_called()
        mock_write_tuples.assert_not_called()

    @patch.object(FGAManager, "write_tuples")
    @patch.object(TeamsManager, "get_team_organization")
    @patch.object(TeamsManager, "get_users_organization")
    @patch.object(TeamsManager, "get_users_teams")
    async def test_add_team_member_team_not_in_org(
        self,
        mock_get_users_teams,
        mock_get_users_organization,
        mock_get_team_organization,
        mock_write_tuples,
    ):
        org = Organization("org1")
        team = Team("team1")
        user = User("user1")

        mock_get_users_teams.return_value = []
        mock_get_team_organization.return_value = None

        with self.assertRaises(Exception) as context:
            await self.teams_manager.add_team_member(team, user)

        mock_get_users_teams.assert_called_once_with(user)
        mock_get_team_organization.assert_called_once_with(team)
        mock_get_users_organization.assert_not_called()
        mock_write_tuples.assert_not_called()

    @patch.object(FGAManager, "write_tuples")
    @patch.object(TeamsManager, "get_team_organization")
    @patch.object(TeamsManager, "get_users_organization")
    @patch.object(TeamsManager, "get_users_teams")
    async def test_add_team_member_user_not_in__same_org(
        self,
        mock_get_users_teams,
        mock_get_users_organization,
        mock_get_team_organization,
        mock_write_tuples,
    ):
        org = Organization("org1")
        team = Team("team1")
        user = User("user1")

        mock_get_users_teams.return_value = []
        mock_get_team_organization.return_value = org
        mock_get_users_organization.return_value = Organization("org2")

        with self.assertRaises(Exception) as context:
            await self.teams_manager.add_team_member(team, user)

        mock_get_users_teams.assert_called_once_with(user)
        mock_get_team_organization.assert_called_once_with(team)
        mock_get_users_organization.assert_called_once_with(user)
        mock_write_tuples.assert_not_called()

    @patch.object(FGAManager, "delete_tuples")
    async def test_remove_team_member(self, mock_delete_tuples):
        mock_delete_tuples.return_value = None

        team = Team("team1")
        user = User("user1")

        await self.teams_manager.remove_team_member(team, user)

        self.assertEqual(
            mock_delete_tuples.call_args[0][0][0].user, user.to_auth_string()
        )
        self.assertEqual(mock_delete_tuples.call_args[0][0][0].relation, "member")
        self.assertEqual(
            mock_delete_tuples.call_args[0][0][0].object, team.to_auth_string()
        )
        mock_delete_tuples.assert_called_once()

    @patch.object(FGAManager, "expand")
    async def test_get_team_admins(self, mock_expand: Mock):
        mock_expand.return_value = ExpandResponse(
            tree=UsersetTree(
                root=Node(
                    name="test",
                    leaf=Leaf(users=Users(users=["user:user1", "user:user2"])),
                )
            )
        )

        team = Team("team1")

        admins = await self.teams_manager.get_team_admins(team)

        self.assertEqual(mock_expand.call_args[0][0].object, team.to_auth_string())
        self.assertEqual(mock_expand.call_args[0][0].relation, "admin")
        mock_expand.assert_called_once()
        self.assertEqual(len(admins), 2)
        self.assertEqual(admins[0].id, "user1")
        self.assertEqual(admins[1].id, "user2")

    @patch.object(TeamsManager, "get_team_organization")
    @patch.object(TeamsManager, "get_users_organization")
    @patch.object(TeamsManager, "get_team_admins")
    @patch.object(FGAManager, "write_tuples")
    async def test_add_team_admin(
        self,
        mock_write_tuples,
        mock_get_team_admins,
        mock_get_users_organization,
        mock_get_team_organization,
    ):
        org = Organization("org1")
        team = Team("team1")
        user = User("user1")

        mock_get_team_admins.return_value = []
        mock_get_users_organization.return_value = org
        mock_get_team_organization.return_value = org
        mock_write_tuples.return_value = None

        await self.teams_manager.add_team_admin(team, user)

        mock_get_team_admins.assert_called_once_with(team)
        mock_get_users_organization.assert_called_once_with(user)
        mock_get_team_organization.assert_called_once_with(team)

        self.assertEqual(
            mock_write_tuples.call_args[0][0][0].user, user.to_auth_string()
        )
        self.assertEqual(mock_write_tuples.call_args[0][0][0].relation, "admin")
        self.assertEqual(
            mock_write_tuples.call_args[0][0][0].object, team.to_auth_string()
        )
        mock_write_tuples.assert_called_once()

    @patch.object(TeamsManager, "get_team_organization")
    @patch.object(TeamsManager, "get_users_organization")
    @patch.object(TeamsManager, "get_team_admins")
    @patch.object(FGAManager, "write_tuples")
    async def test_add_team_admin_user_already_admin(
        self,
        mock_write_tuples,
        mock_get_team_admins,
        mock_get_users_organization,
        mock_get_team_organization,
    ):
        org = Organization("org1")
        team = Team("team1")
        user = User("user1")

        mock_get_team_admins.return_value = [user]

        await self.teams_manager.add_team_admin(team, user)

        mock_get_team_admins.assert_called_once_with(team)
        mock_get_users_organization.assert_not_called()
        mock_get_team_organization.assert_not_called()
        mock_write_tuples.assert_not_called()

    @patch.object(TeamsManager, "get_team_organization")
    @patch.object(TeamsManager, "get_users_organization")
    @patch.object(TeamsManager, "get_team_admins")
    @patch.object(FGAManager, "write_tuples")
    async def test_add_team_admin_user_not_in_org(
        self,
        mock_write_tuples,
        mock_get_team_admins,
        mock_get_users_organization,
        mock_get_team_organization,
    ):
        org = Organization("org1")
        team = Team("team1")
        user = User("user1")

        mock_get_team_admins.return_value = []
        mock_get_users_organization.return_value = org
        mock_get_team_organization.return_value = Organization("org2")

        with self.assertRaises(Exception) as context:
            await self.teams_manager.add_team_admin(team, user)

        mock_get_team_admins.assert_called_once_with(team)
        mock_get_users_organization.assert_called_once_with(user)
        mock_get_team_organization.assert_called_once_with(team)
        mock_write_tuples.assert_not_called()

    @patch.object(FGAManager, "delete_tuples")
    async def test_remove_team_admin(self, mock_delete_tuples):
        mock_delete_tuples.return_value = None

        team = Team("team1")
        user = User("user1")

        await self.teams_manager.remove_team_admin(team, user)

        self.assertEqual(
            mock_delete_tuples.call_args[0][0][0].user, user.to_auth_string()
        )
        self.assertEqual(mock_delete_tuples.call_args[0][0][0].relation, "admin")
        self.assertEqual(
            mock_delete_tuples.call_args[0][0][0].object, team.to_auth_string()
        )
        mock_delete_tuples.assert_called_once()

    @patch.object(TeamsDAO, "get_team")
    @patch.object(FGAManager, "list_objects")
    async def test_get_parent(self, mock_list_objects, mock_get_team):
        mock_list_objects.return_value = ["team2"]
        mock_get_team.return_value = Team("team2")

        team = Team("team1")

        parent = await self.teams_manager.get_parent(team)

        self.assertEqual(mock_list_objects.call_args[0][0].user, team.to_auth_string())
        self.assertEqual(mock_list_objects.call_args[0][0].relation, "parent")
        self.assertEqual(mock_list_objects.call_args[0][0].type, Team.type())
        mock_list_objects.assert_called_once()
        mock_get_team.assert_called_once_with("team2")
        self.assertEqual(parent.id, "team2")

    @patch.object(TeamsDAO, "get_team")
    @patch.object(FGAManager, "list_objects")
    async def test_get_parent_multiple_parents_error(
        self, mock_list_objects, mock_get_team
    ):
        mock_list_objects.return_value = ["team2", "team3"]

        team = Team("team1")

        with self.assertRaises(Exception):
            await self.teams_manager.get_parent(team)

        mock_list_objects.assert_called_once()
        mock_get_team.assert_not_called()

    @patch.object(FGAManager, "list_objects")
    @patch.object(FGAManager, "delete_tuples")
    @patch.object(FGAManager, "write_tuples")
    async def test_set_team_parent(
        self, mock_write_tuples, mock_delete_tuples, mock_list_objects
    ):
        mock_list_objects.return_value = ["team2"]
        mock_delete_tuples.return_value = None
        mock_write_tuples.return_value = None

        team = Team("team1")
        parent = Team("team2")

        await self.teams_manager.set_team_parent(team, parent)

        self.assertEqual(mock_list_objects.call_args[0][0].user, team.to_auth_string())
        self.assertEqual(mock_list_objects.call_args[0][0].relation, "parent")
        self.assertEqual(mock_list_objects.call_args[0][0].type, Team.type())
        mock_list_objects.assert_called_once()

        self.assertEqual(
            mock_delete_tuples.call_args[0][0][0].user, Team("team2").to_auth_string()
        )
        self.assertEqual(mock_delete_tuples.call_args[0][0][0].relation, "parent")
        self.assertEqual(
            mock_delete_tuples.call_args[0][0][0].object, team.to_auth_string()
        )
        mock_delete_tuples.assert_called_once()

        self.assertEqual(
            mock_write_tuples.call_args[0][0][0].user, parent.to_auth_string()
        )
        self.assertEqual(mock_write_tuples.call_args[0][0][0].relation, "parent")
        self.assertEqual(
            mock_write_tuples.call_args[0][0][0].object, team.to_auth_string()
        )
        mock_write_tuples.assert_called_once()

    @patch.object(FGAManager, "expand")
    @patch.object(TeamsDAO, "get_team")
    async def test_get_team_organization(self, mock_get_team, mock_expand):
        team = Team("team1")
        team.organization = Organization("org1")
        mock_expand.return_value = ExpandResponse(
            tree=UsersetTree(
                root=Node(
                    name="test",
                    leaf=Leaf(users=Users(users=[team.organization.to_auth_string()])),
                )
            )
        )
        mock_get_team.return_value = team

        organization = await self.teams_manager.get_team_organization(team)

        mock_get_team.assert_called_once_with(team.id)

        self.assertEqual(mock_expand.call_args[0][0].object, team.to_auth_string())
        self.assertEqual(mock_expand.call_args[0][0].relation, "organization")
        mock_expand.assert_called_once()
        self.assertEqual(organization.id, "org1")

    @patch.object(FGAManager, "expand")
    @patch.object(TeamsDAO, "get_team")
    async def test_get_team_organization_no_org_error(self, mock_get_team, mock_expand):
        team = Team("team1")
        team.organization = Organization("org1")
        mock_expand.return_value = ExpandResponse(
            tree=UsersetTree(root=Node(name="test"))
        )
        with self.assertRaises(Exception):
            await self.teams_manager.get_team_organization(team)

        mock_get_team.assert_not_called()

        self.assertEqual(mock_expand.call_args[0][0].object, team.to_auth_string())
        self.assertEqual(mock_expand.call_args[0][0].relation, "organization")
        mock_expand.assert_called_once()

    @patch.object(FGAManager, "expand")
    @patch.object(TeamsDAO, "get_team")
    async def test_get_team_organization_multiple_org_error(
        self, mock_get_team, mock_expand
    ):
        team = Team("team1")
        team.organization = Organization("org1")
        mock_expand.return_value = ExpandResponse(
            tree=UsersetTree(
                root=Node(
                    name="test",
                    leaf=Leaf(users=Users(users=["organization:1", "organization:2"])),
                )
            )
        )
        with self.assertRaises(Exception):
            await self.teams_manager.get_team_organization(team)

        mock_get_team.assert_not_called()

        self.assertEqual(mock_expand.call_args[0][0].object, team.to_auth_string())
        self.assertEqual(mock_expand.call_args[0][0].relation, "organization")
        mock_expand.assert_called_once()

    @patch.object(FGAManager, "expand")
    @patch.object(TeamsDAO, "get_team")
    async def test_get_team_organization_fga_dao_sync_error(
        self, mock_get_team, mock_expand
    ):
        team = Team("team1")
        team.organization = Organization("org1")
        mock_expand.return_value = ExpandResponse(
            tree=UsersetTree(
                root=Node(name="test", leaf=Leaf(users=Users(users=["organization:1"])))
            )
        )
        mock_get_team.return_value = team

        with self.assertRaises(Exception):
            await self.teams_manager.get_team_organization(team)

        mock_get_team.assert_called_once_with(team.id)

        self.assertEqual(mock_expand.call_args[0][0].object, team.to_auth_string())
        self.assertEqual(mock_expand.call_args[0][0].relation, "organization")
        mock_expand.assert_called_once()

    @patch.object(FGAManager, "write_tuples")
    @patch.object(TeamsDAO, "get_team_by_name")
    @patch.object(TeamsManager, "get_team_organization")
    @patch.object(TeamsDAO, "update_organization")
    async def test_set_team_organization(
        self,
        mock_update_organization,
        mock_get_team_organization,
        mock_get_team_by_name,
        mock_write_tuples,
    ):
        mock_get_team_by_name.return_value = None
        mock_get_team_organization.side_effect = TeamNotInOrgException()
        mock_write_tuples.return_value = None
        mock_update_organization.return_value = None

        team = Team("team1")
        team.organization = Organization("org1")
        organization = Organization("org1")

        await self.teams_manager.set_team_organization(team, organization)

        mock_get_team_by_name.assert_called_once_with(team.name, organization.id)
        mock_get_team_organization.assert_called_once_with(team)

        self.assertEqual(
            mock_write_tuples.call_args[0][0][0].object, team.to_auth_string()
        )
        self.assertEqual(mock_write_tuples.call_args[0][0][0].relation, "organization")
        self.assertEqual(
            mock_write_tuples.call_args[0][0][0].user, organization.to_auth_string()
        )
        mock_write_tuples.assert_called_once()

        mock_update_organization.assert_called_once_with(team, organization.id)

    @patch.object(FGAManager, "write_tuples")
    @patch.object(TeamsDAO, "get_team_by_name")
    @patch.object(TeamsManager, "get_team_organization")
    @patch.object(TeamsDAO, "update_organization")
    async def test_set_team_organization_team_name_exists_error(
        self,
        mock_update_organization,
        mock_get_team_organization,
        mock_get_team_by_name,
        mock_write_tuples,
    ):
        mock_get_team_by_name.return_value = Team("team1")

        team = Team("team1")
        team.organization = Organization("org1")
        organization = Organization("org1")

        with self.assertRaises(TeamWithNameExistsException) as e:
            await self.teams_manager.set_team_organization(team, organization)

        self.assertEqual(e.exception.team_name, team.name)
        self.assertEqual(e.exception.org_id, organization.id)

        mock_get_team_by_name.assert_called_once_with(team.name, organization.id)
        mock_get_team_organization.assert_not_called()
        mock_write_tuples.assert_not_called()
        mock_update_organization.assert_not_called()

    @patch.object(FGAManager, "write_tuples")
    @patch.object(TeamsDAO, "get_team_by_name")
    @patch.object(TeamsManager, "get_team_organization")
    @patch.object(TeamsDAO, "update_organization")
    async def test_set_team_organization_team_in_other_org_error(
        self,
        mock_update_organization,
        mock_get_team_organization,
        mock_get_team_by_name,
        mock_write_tuples,
    ):
        mock_get_team_by_name.return_value = None
        mock_get_team_organization.return_value = Organization("org2")

        team = Team("team1")
        team.organization = Organization("org1")
        organization = Organization("org1")

        with self.assertRaises(Exception) as e:
            await self.teams_manager.set_team_organization(team, organization)

        mock_get_team_by_name.assert_called_once_with(team.name, organization.id)
        mock_get_team_organization.assert_called_once_with(team)
        mock_write_tuples.assert_not_called()
        mock_update_organization.assert_not_called()

    @patch.object(FGAManager, "expand")
    async def test_get_org_members(self, mock_expand):
        mock_expand.return_value = ExpandResponse(
            tree=UsersetTree(
                root=Node(name="test", leaf=Leaf(users=["user1", "user2"]))
            )
        )

        organization = Organization("org1")

        members = await self.teams_manager.get_org_members(organization)

        self.assertEqual(mock_expand.call_args[0][0].relation, "member")
        self.assertEqual(
            mock_expand.call_args[0][0].object, organization.to_auth_string()
        )
        mock_expand.assert_called_once()
        self.assertEqual(len(members), 2)
        self.assertEqual(members[0].id, "user1")
        self.assertEqual(members[1].id, "user2")

    @patch.object(FGAManager, "write_tuples")
    async def test_add_org_member(self, mock_write_tuples):
        mock_write_tuples.return_value = None

        organization = Organization("org1")
        user = User("user1")

        await self.teams_manager.add_org_member(organization, user)

        self.assertEqual(
            mock_write_tuples.call_args[0][0][0].user, user.to_auth_string()
        )
        self.assertEqual(mock_write_tuples.call_args[0][0][0].relation, "member")
        self.assertEqual(
            mock_write_tuples.call_args[0][0][0].object, organization.to_auth_string()
        )
        mock_write_tuples.assert_called_once()

    @patch.object(TeamsManager, "get_users_teams")
    @patch.object(TeamsManager, "remove_team_member")
    @patch.object(TeamsManager, "get_team_organization")
    @patch.object(FGAManager, "delete_tuples")
    async def test_remove_org_member(
        self,
        mock_delete_tuples,
        mock_get_team_organization,
        mock_remove_team_member,
        mock_get_users_teams,
    ):
        mock_get_users_teams.return_value = [Team("team1")]
        mock_remove_team_member.return_value = None
        mock_get_team_organization.return_value = Organization("org1")
        mock_delete_tuples.return_value = None

        organization = Organization("org1")
        user = User("user1")

        await self.teams_manager.remove_org_member(organization, user)

        mock_get_users_teams.assert_called_once_with(user)
        mock_remove_team_member.assert_called_once_with(Team("team1"), user)
        mock_get_team_organization.assert_called_once_with(Team("team1"))

        self.assertEqual(
            mock_delete_tuples.call_args[0][0][0].user, user.to_auth_string()
        )
        self.assertEqual(mock_delete_tuples.call_args[0][0][0].relation, "member")
        self.assertEqual(
            mock_delete_tuples.call_args[0][0][0].object, organization.to_auth_string()
        )
        mock_delete_tuples.assert_called_once()

    @patch.object(FGAManager, "expand")
    async def test_get_org_admins(self, mock_Expand):
        mock_Expand.return_value = ExpandResponse(
            tree=UsersetTree(
                root=Node(
                    name="test",
                    leaf=Leaf(users=Users(users=["user:user1", "user:user2"])),
                )
            )
        )

        organization = Organization("org1")

        admins = await self.teams_manager.get_org_admins(organization)

        self.assertEqual(
            mock_Expand.call_args[0][0].object, organization.to_auth_string()
        )
        self.assertEqual(mock_Expand.call_args[0][0].relation, "admin")
        mock_Expand.assert_called_once()
        self.assertEqual(len(admins), 2)
        self.assertEqual(admins[0].id, "user1")
        self.assertEqual(admins[1].id, "user2")

    @patch.object(TeamsManager, "get_users_organization")
    @patch.object(FGAManager, "write_tuples")
    async def test_add_org_admin(self, mock_write_tuples, mock_get_users_organization):
        mock_get_users_organization.return_value = Organization("org1")
        mock_write_tuples.return_value = None

        organization = Organization("org1")
        user = User("user1")

        await self.teams_manager.add_org_admin(organization, user)

        mock_get_users_organization.assert_called_once_with(user)

        self.assertEqual(
            mock_write_tuples.call_args[0][0][0].user, user.to_auth_string()
        )
        self.assertEqual(mock_write_tuples.call_args[0][0][0].relation, "admin")
        self.assertEqual(
            mock_write_tuples.call_args[0][0][0].object, organization.to_auth_string()
        )
        mock_write_tuples.assert_called_once()

    @patch.object(FGAManager, "delete_tuples")
    async def test_remove_admin(self, mock_delete_tuples):
        mock_delete_tuples.return_value = None

        organization = Organization("org1")
        user = User("user1")

        await self.teams_manager.remove_org_admin(organization, user)

        self.assertEqual(
            mock_delete_tuples.call_args[0][0][0].user, user.to_auth_string()
        )
        self.assertEqual(mock_delete_tuples.call_args[0][0][0].relation, "admin")
        self.assertEqual(
            mock_delete_tuples.call_args[0][0][0].object, organization.to_auth_string()
        )
        mock_delete_tuples.assert_called_once()

    @patch.object(FGAManager, "list_objects")
    @patch.object(TeamsDAO, "batch_get_teams")
    async def test_get_teams_in_org(self, mock_batch_get_teams, mock_list_objects):
        mock_list_objects.return_value = ["team1", "team2"]
        mock_batch_get_teams.return_value = [Team("team1"), Team("team2")]

        organization = Organization("org1")

        teams = await self.teams_manager.get_teams_in_org(organization)

        self.assertEqual(
            mock_list_objects.call_args[0][0].user, organization.to_auth_string()
        )
        self.assertEqual(mock_list_objects.call_args[0][0].relation, "organization")
        self.assertEqual(mock_list_objects.call_args[0][0].type, Team.type())
        mock_list_objects.assert_called_once()
        mock_batch_get_teams.assert_called_once_with(["team1", "team2"])
        self.assertEqual(len(teams), 2)
        self.assertEqual(teams[0].id, "team1")
        self.assertEqual(teams[1].id, "team2")
