import os
import uuid
import openfga_sdk
from typing import List
from enum import Enum
from openfga_sdk.client.models.tuple import ClientTuple
from openfga_sdk.client import OpenFgaClient, ClientCheckRequest, ClientConfiguration
from openfga_sdk.credentials import Credentials, CredentialConfiguration
from openfga_sdk.client.models.write_request import ClientWriteRequest
import os
from src.auth_service.fga_manager import FGAManager
from src.auth_service.entity import User, Organization, Team
from openfga_sdk.client.models.list_objects_request import ClientListObjectsRequest
from openfga_sdk.client.models.expand_request import ClientExpandRequest
from openfga_sdk.models.leaf import Leaf
from openfga_sdk.models.userset_tree import UsersetTree
from openfga_sdk.models.node import Node
from openfga_sdk.models.nodes import Nodes
from openfga_sdk.models.users import Users
from openfga_sdk.models.computed import Computed
from openfga_sdk.models.userset import Userset

from sqlalchemy.ext.asyncio import AsyncSession

from src.auth_service.teams_dao import ArchitectureDoesNotExistError, TeamsDAO
from src.util.logging import logger


class TeamNotInOrgException(Exception):
    pass


class TeamWithNameExistsException(Exception):
    team_name: str
    org_id: str

    def __init__(self, team_name: str, org_id: str):
        self.team_name = team_name
        self.org_id = org_id

    def __str__(self):
        return f"Team with name {self.team_name} already exists in organization {self.org_id}"


class Relations(Enum):
    MEMBER = "member"
    ADMIN = "admin"
    PARENT = "parent"
    ORGANIZATION = "organization"


def split_fga_relation_string(relation: str) -> tuple[str, str]:
    """
    Split a relation string into a relation and an object.

    Args:
        relation (str): The relation string to split.

    Returns:
        tuple[str, str]: The relation and object.
    """
    split = relation.split("#")
    if len(split) != 2:
        raise Exception(f"Invalid relation string, {relation}")
    return split[0], split[1]


class TeamsManager:
    def __init__(self, manager: FGAManager, teams_dao: TeamsDAO):
        self._manager = manager
        self._dao = teams_dao

    ### User Methods
    async def get_users_teams(self, user: User) -> List[Team]:
        """
        Get the teams that a user is a member of.

        Args:
            user (User): The user to get the teams for.

        Returns:
            List[Team]: A list of teams that the user is a member of.
        """
        logger.debug(f"Getting teams for user, {user.id}")
        teams = await self._manager.list_objects(
            ClientListObjectsRequest(
                user=user.to_auth_string(), relation="member", type=Team.type()
            )
        )
        team_ids = [Team.fromString(x).id for x in teams]
        t = await self._dao.batch_get_teams(team_ids)
        print(t, team_ids)
        for team in team_ids:
            if team not in [l.id for l in t]:
                logger.error(f"Team, {team}, is not in datastore")
                raise ArchitectureDoesNotExistError(
                    f"Team, {team}, is not in datastore"
                )

        logger.info(f"Successfully got teams for user, {user.id}: {t}")
        return t

    async def get_users_organization(self, user: User) -> Organization | None:
        """
        Get the organization that a user is a member of.

        Args:
            user (User): The user to get the organization for.

        Returns:
            Organization | None: The organization that the user is a member of, or None if the user is not a member of any organization.
        """
        organizations = await self._manager.list_objects(
            ClientListObjectsRequest(
                user=user.to_auth_string(), relation="member", type=Organization.type()
            )
        )
        if len(organizations) == 0:
            return None
        elif len(organizations) > 1:
            raise Exception("User is part of more than one organization")

        return Organization.fromString(organizations[0])

    ### Teams Methods

    async def list_teams_for_org(self, organization_id: str) -> List[Team]:
        """
        List the teams that are part of an organization.

        Args:
            organization_id (str): The id of the organization to get the teams for.

        Returns:
            List[Team]: A list of teams that are part of the organization.
        """
        return await self._dao.list_teams(organization_id)

    async def create_team(self, name: str, user: User, org: Organization) -> Team:
        """
        Creates a new team

        Args:
            name (str): The name of the team
            user (User): The user creating the team

        Returns:
            Team: The newly created team
        """
        id = str(uuid.uuid4())
        new_team = Team(id)
        new_team.organization = org
        new_team.name = name
        await self.set_team_organization(new_team, org)
        await self.add_team_admin(new_team, user)
        return new_team

    async def get_team(self, team_id: str) -> Team:
        """
        Get a team by id.

        Args:
            team_id (str): The id of the team to get.

        Returns:
            Team: The team with the given id.
        """
        return await self._dao.get_team(team_id)

    async def batch_get_teams(self, team_ids: List[str]) -> List[Team]:
        """
        Get a list of teams by id.

        Args:
            team_ids (List[str]): The ids of the teams to get.

        Returns:
            List[Team]: The teams with the given ids.
        """
        return await self._dao.batch_get_teams(team_ids)

    async def get_team_members(self, team: Team) -> List[User]:
        """
        Get the members of a team.

        Args:
            team (Team): The team to get the members for.

        Returns:
            List[User]: A list of users who are members of the team.
        """
        members: List[User] = []
        logger.debug(f"Getting members for team, {team.id}")
        result = await self._manager.expand(
            ClientExpandRequest(
                object=team.to_auth_string(),
                relation="member",
            )
        )
        tree: UsersetTree = result.tree
        root_node: Node = tree.root
        leaf: Leaf = root_node.leaf
        if leaf is not None:
            users: Users = leaf.users
            if users is not None:
                for user in users.users:
                    members.append(User.fromString(user))

        nodes: Nodes = root_node.union
        n: List[Node] = nodes.nodes
        for node in n:
            leaf: Leaf = node.leaf
            if leaf.users is not None:
                users: Users = leaf.users
                for user in users.users:
                    print(user)
                    members.append(User.fromString(user))
            computed: Computed = leaf.computed
            if computed is not None:
                obj, relation = split_fga_relation_string(computed.userset)
                match relation:
                    case Relations.ADMIN.value:
                        obj_team = Team.fromString(obj)
                        admins = await self.get_team_admins(obj_team)
                        [members.append(a) for a in admins]
                    case Relations.MEMBER.value:
                        sub_team = Team.fromString(obj)
                        sub_members = await self.get_team_members(sub_team)
                        [members.append(m) for m in sub_members]
                    case _:
                        raise Exception(
                            f"Unexpected relation, {relation}, for object, {obj}, while fetching members for team, {team.id}"
                        )

        logger.info(f"Successfully got members for team, {team.id}: {members}")
        return members

    async def add_team_member(self, team: Team, user: User) -> None:
        """
        Add a user to a team.

        Args:
            team (Team): The team to add the user to.
            user (User): The user to add to the team.

        Raises:
            Exception: If the team is not part of an organization, or if the team is part of more than one organization.
        """
        user_teams = await self.get_users_teams(user)
        if team.id in [t.id for t in user_teams]:
            logger.debug(f"User, {user.id}, is already a member of team, {team.id}")
            return None

        logger.debug(f"Adding user, {user.id}, as member to team, {team.id}")
        organization = await self.get_team_organization(team)
        if organization is None:
            logger.error(f"Team, {team.id}, is not part of an organization")
            raise Exception(f"Team, {team.id}, is not part of an organization")

        tuples = [
            ClientTuple(
                user=user.to_auth_string(),
                relation="member",
                object=team.to_auth_string(),
            )
        ]

        user_org = await self.get_users_organization(user)
        if user_org.id != organization.id:
            logger.error(
                f"Cannot add user as admin to team {team.id}. User, {user.id}, is not part of an organization {organization.id}"
            )
            raise Exception(
                f"Cannot add user as admin to team {team.id}. User, {user.id}, is not part of an organization {organization.id}"
            )

        await self._manager.write_tuples(tuples)
        logger.info(f"Successfully added user, {user.id}, as member to team, {team.id}")

    async def remove_team_member(self, team: Team, user: User) -> None:
        """
        Remove a user from a team.

        Args:
            team (Team): The team to remove the user from.
            user (User): The user to remove from the team.
        """
        await self._manager.delete_tuples(
            [
                ClientTuple(
                    user=user.to_auth_string(),
                    relation="member",
                    object=team.to_auth_string(),
                )
            ]
        )

    async def get_team_admins(self, team: Team) -> List[User]:
        """
        Get the admins of a team.

        Args:
            team (Team): The team to get the admins for.

        Returns:
            List[User]: A list of users who are admins of the team.
        """
        admins: List[User] = []
        logger.debug(f"Getting admins for team, {team.id}")
        result = await self._manager.expand(
            ClientExpandRequest(object=team.to_auth_string(), relation="admin")
        )
        tree: UsersetTree = result.tree
        root_node: Node = tree.root
        leaf: Leaf = root_node.leaf
        if leaf is not None:
            users: Users = leaf.users
            if users is not None:
                for user in users.users:
                    admins.append(User.fromString(user))
        logger.info(f"Successfully got admins for team, {team.id}: {admins}")
        return admins

    async def add_team_admin(self, team: Team, user: User) -> None:
        """
        Add a user as an admin of a team.

        Args:
            team (Team): The team to add the user as an admin to.
            user (User): The user to add as an admin.

        Raises:
            Exception: If the user is not a member of the team.
        """
        admins = await self.get_team_admins(team)
        if user.id in [a.id for a in admins]:
            logger.debug(f"User, {user.id}, is already an admin of team, {team.id}")
            return None

        logger.debug(f"Adding user, {user.id}, as admin to team, {team.id}")

        org = await self.get_users_organization(user)
        team_org = await self.get_team_organization(team)

        if org.id != team_org.id:
            logger.error(
                f"User, {user.id}, is not part of team's, {team.id}, organization"
            )
            raise Exception(
                f"Cannot add User, {user.id}, as admin. User is not part of team's, {team.id}, organization"
            )

        await self._manager.write_tuples(
            [
                ClientTuple(
                    user=user.to_auth_string(),
                    relation="admin",
                    object=team.to_auth_string(),
                )
            ]
        )
        logger.info(f"Successfully added user, {user.id}, as admin to team, {team.id}")

    async def remove_team_admin(self, team: Team, user: User) -> None:
        """
        Remove a user as an admin of a team.

        Args:
            team (Team): The team to remove the user as an admin from.
            user (User): The user to remove as an admin.
        """
        await self._manager.delete_tuples(
            [
                ClientTuple(
                    user=user.to_auth_string(),
                    relation="admin",
                    object=team.to_auth_string(),
                )
            ]
        )

    async def get_parent(self, team: Team) -> Team:
        """
        Get the parent of a team.

        Args:
            team (Team): The team to get the parent for.

        Returns:
            Team: The parent of the team.

        Raises:
            Exception: If the team has more than one parent.
        """
        result = await self._manager.list_objects(
            ClientListObjectsRequest(
                user=team.to_auth_string(), relation="parent", type=Team.type()
            )
        )
        if len(result) == 0:
            return None
        elif len(result) > 1:
            raise Exception("Team has more than one parent")
        else:
            return await self._dao.get_team(result[0])

    async def set_team_parent(self, team: Team, parent: Team) -> None:
        """
        Set the parent of a team.

        Args:
            team (Team): The team to set the parent for.
            parent (Team): The team to set as the parent.

        Raises:
            Exception: If the team has more than one parent.
        """
        result = await self._manager.list_objects(
            ClientListObjectsRequest(
                user=team.to_auth_string(), relation="parent", type=Team.type()
            )
        )
        to_delete = [
            ClientTuple(
                user=f"team:{x}", relation="parent", object=team.to_auth_string()
            )
            for x in result
        ]
        await self._manager.delete_tuples(to_delete)
        if parent is None:
            return
        await self._manager.write_tuples(
            [
                ClientTuple(
                    user=parent.to_auth_string(),
                    relation="parent",
                    object=team.to_auth_string(),
                )
            ]
        )

    async def get_team_organization(self, team: Team) -> Organization:
        """
        Get the organization that a team is part of.

        Args:
            team (Team): The team to get the organization for.

        Returns:
            Organization: The organization that the team is part of.

        Raises:
            Exception: If the team is part of more than one organization.
        """
        logger.debug(f"Getting organization for team, {team.id}")
        result = await self._manager.expand(
            ClientExpandRequest(
                object=team.to_auth_string(),
                relation="organization",
            )
        )
        tree: UsersetTree = result.tree
        root_node: Node = tree.root
        leafs: Leaf = root_node.leaf
        users: Users = leafs.users
        logger.debug(
            f"Found relationships for team's, {team.id}, organization: {users.users}"
        )
        organizations = [Organization.fromString(x) for x in users.users]
        if len(organizations) == 0:
            logger.error(f"Team, {team.id}, is not part of an organization")
            raise TeamNotInOrgException("Team is not part of an organization")
        elif len(organizations) > 1:
            raise Exception("Team is part of more than one organization")

        team = await self._dao.get_team(team.id)
        if team.organization != organizations[0]:
            raise Exception(
                f"Team is part of more than one organization, or dao ({team.organization}) and fga ({organizations[0]}) are out of sync"
            )

        logger.info(
            f"Successfully got  for team's, {team.id}, organization: {organizations[0]}"
        )
        return organizations[0]

    async def set_team_organization(
        self, team: Team, organization: Organization
    ) -> None:
        """
        Set the organization that a team is part of.

        Args:
            team (Team): The team to set the organization for.
            organization (Organization): The organization to set the team as part of.

        Raises:
            Exception: If the organization is None, or if the team is part of more than one organization.
        """
        logger.debug(f"Setting team, {team.id}, organization to {organization.id}")
        if organization is None:
            raise Exception("Cannot set organization to None")

        logger.debug(
            f"Checking if name, {team.name}, exists in organization, {organization.id}"
        )
        curr_team = await self._dao.get_team_by_name(team.name, organization.id)
        if curr_team is not None:
            logger.error(
                f"Team name, {team.name}, already exists in organization, {organization.id}"
            )
            raise TeamWithNameExistsException(
                team_name=team.name, org_id=organization.id
            )

        logger.debug(f"Checking if team, {team.id}, is already part of an organization")
        try:
            curr_organization = await self.get_team_organization(team)
            if (
                curr_organization is not None
                and curr_organization.id != organization.id
            ):
                logger.error(
                    f"Team, {team.id}, is already part of organization, {curr_organization.id}"
                )
                raise Exception("Team is already part of an organization")
        except TeamNotInOrgException as e:
            pass

        await self._manager.write_tuples(
            [
                ClientTuple(
                    user=organization.to_auth_string(),
                    relation="organization",
                    object=team.to_auth_string(),
                )
            ]
        )
        await self._dao.update_organization(team, organization.id)

        logger.info(
            f"Successfully set team, {team.id}, organization to {organization.id}"
        )

    #### Organization Methods
    async def get_org_members(self, organization: Organization) -> List[User]:
        """
        Get the members of an organization.

        Args:
            organization (Organization): The organization to get the members for.

        Returns:
            List[User]: A list of users who are members of the organization.
        """
        result = await self._manager.expand(
            ClientExpandRequest(relation="member", object=organization.to_auth_string())
        )
        tree: UsersetTree = result.tree
        root_node: Node = tree.root
        leafs: Leaf = root_node.leaf
        return [User(x) for x in leafs.users]

    async def add_org_member(self, organization: Organization, user: User) -> None:
        """
        Add a user to an organization.

        Args:
            organization (Organization): The organization to add the user to.
            user (User): The user to add to the organization.
        """
        await self._manager.write_tuples(
            [
                ClientTuple(
                    user=user.to_auth_string(),
                    relation="member",
                    object=organization.to_auth_string(),
                )
            ]
        )

    async def remove_org_member(self, organization: Organization, user: User) -> None:
        """
        Remove a user from an organization.

        Args:
            organization (Organization): The organization to remove the user from.
            user (User): The user to remove from the organization.
        """
        teams = await self.get_users_teams(user)
        for team in teams:
            org = await self.get_team_organization(team)
            if org is None:
                continue
            if org.id == organization.id:
                await self.remove_team_member(team, user)

        await self._manager.delete_tuples(
            [
                ClientTuple(
                    user=user.to_auth_string(),
                    relation="member",
                    object=organization.to_auth_string(),
                )
            ]
        )

    async def get_org_admins(self, organization: Organization) -> List[User]:
        """
        Get the admins of an organization.

        Args:
            organization (Organization): The organization to get the admins for.

        Returns:
            List[User]: A list of users who are admins of the organization.
        """
        result = await self._manager.expand(
            ClientExpandRequest(object=organization.to_auth_string(), relation="admin")
        )
        tree: UsersetTree = result.tree
        root_node: Node = tree.root
        leafs: Leaf = root_node.leaf
        users: Users = leafs.users
        return [User.fromString(x) for x in users.users]

    async def add_org_admin(self, organization: Organization, user: User) -> None:
        """
        Add a user as an admin of an organization.

        Args:
            organization (Organization): The organization to add the user as an admin to.
            user (User): The user to add as an admin.

        Raises:
            Exception: If the user is not a member of the organization.
        """
        org = await self.get_users_organization(user)
        if org is None:
            raise Exception("User is not a member of any organization")
        if organization.id != org.id:
            raise Exception("User is not a member of this team")
        await self._manager.write_tuples(
            [
                ClientTuple(
                    user=user.to_auth_string(),
                    relation="admin",
                    object=organization.to_auth_string(),
                )
            ]
        )

    async def remove_org_admin(self, organization: Organization, user: User) -> None:
        """
        Remove a user as an admin of an organization.

        Args:
            organization (Organization): The organization to remove the user as an admin from.
            user (User): The user to remove as an admin.
        """
        await self._manager.delete_tuples(
            [
                ClientTuple(
                    user=user.to_auth_string(),
                    relation="admin",
                    object=organization.to_auth_string(),
                )
            ]
        )

    async def get_teams_in_org(self, organization: Organization) -> List[Team]:
        """
        Get the teams that are part of an organization.

        Args:
            organization (Organization): The organization to get the teams for.

        Returns:
            List[Team]: A list of teams that are part of the organization.
        """
        result = await self._manager.list_objects(
            ClientListObjectsRequest(
                user=organization.to_auth_string(),
                relation="organization",
                type=Team.type(),
            )
        )
        return await self._dao.batch_get_teams(result)
