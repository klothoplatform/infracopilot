from enum import Enum

from openfga_sdk import TupleKey, Configuration
from openfga_sdk.client.models.tuple import ClientTuple

from src.auth_service.fga_manager import FGAManager
from src.util.logging import logger


class Role(Enum):
    VIEWER = "viewer"
    EDITOR = "editor"
    OWNER = "owner"


class Relations(Enum):
    MEMBER = "member"
    ADMIN = "admin"
    PARENT = "parent"
    ORGANIZATION = "organization"


class GeneralAccess(Enum):
    ORGANIZATION = "organization"
    PUBLIC = "public"
    RESTRICTED = "restricted"


class SharingManager:
    def __init__(self, manager: FGAManager):
        self._manager = manager

    ### Architecture Methods
    async def get_architecture_roles(self, architecture_id: str) -> dict[str, Role]:
        """
        Get the roles for a given architecture.

        Args:
            architecture_id (str): The id of the architecture to get roles for.

        Returns:
            dict[str, Role]: A dictionary mapping users, teams, and organizations to their roles.
        """
        logger.debug(f"Getting roles for architecture, {architecture_id}")

        config = Configuration.get_default_copy()
        config.client_side_validation = False
        role_tuples = await self._manager.read_tuples(
            TupleKey(
                local_vars_configuration=config,
                object=f"architecture:{architecture_id}",
            )
        )
        viewers = [
            r.key.user for r in role_tuples if r.key.relation == Role.VIEWER.value
        ]
        editors = [
            r.key.user for r in role_tuples if r.key.relation == Role.EDITOR.value
        ]
        owners = [r.key.user for r in role_tuples if r.key.relation == Role.OWNER.value]

        logger.info(f"Successfully got roles for architecture, {architecture_id}. ")
        return {
            **{o: Role.OWNER for o in owners},
            **{v: Role.VIEWER for v in viewers},
            **{e: Role.EDITOR for e in editors},
        }

    async def update_architecture_roles(
        self, architecture_id: str, roles: dict[str, Role]
    ) -> None:
        """
        Update the roles for a given architecture.

        If an entity has an existing role, it will be overwritten.
        :param architecture_id: The id of the architecture to update roles for.
        :param roles: A dictionary mapping users, teams, and organizations or their members to roles.
            Only the entities in this dictionary will have their roles updated.
            If a role is None, the entity will have its role removed.

        """
        logger.debug(f"Updating roles for architecture, {architecture_id}")
        existing_entity_roles = await self.get_architecture_roles(architecture_id)
        roles_to_add = []
        roles_to_remove = []
        for entity, role in roles.items():
            if entity in existing_entity_roles:
                existing_role = existing_entity_roles.get(entity, None)
                if (
                    existing_role is not None
                    and role is not None
                    and existing_role != role
                ):
                    roles_to_remove.append((entity, existing_role))
                    roles_to_add.append((entity, role))
                if existing_role is not None and role is None:
                    roles_to_remove.append((entity, existing_role))
                else:
                    logger.debug(
                        f"Skipping {entity} as it already has the correct role."
                    )
            elif role is not None:
                roles_to_add.append((entity, role))
            else:
                logger.debug(f"Skipping {entity} as it has no role to add or remove.")
        # TODO: attempt to rollback if this fails

        if len(roles_to_remove) > 0:
            await self._manager.delete_tuples(
                [
                    ClientTuple(
                        user=e,
                        relation=r.value,
                        object=f"architecture:{architecture_id}",
                    )
                    for e, r in roles_to_remove
                ]
            )
        if len(roles_to_add) > 0:
            await self._manager.write_tuples(
                [
                    ClientTuple(
                        user=e,
                        relation=r.value,
                        object=f"architecture:{architecture_id}",
                    )
                    for e, r in roles_to_add
                ]
            )
        logger.info(f"Successfully updated roles for architecture, {architecture_id}")
