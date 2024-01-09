import os
import openfga_sdk
from enum import Enum
from openfga_sdk.client.models.tuple import ClientTuple
from openfga_sdk.client import OpenFgaClient, ClientCheckRequest, ClientConfiguration
from openfga_sdk.credentials import Credentials, CredentialConfiguration
from openfga_sdk.client.models.write_request import ClientWriteRequest
import os
from src.auth_service.fga_manager import FGAManager
from src.auth_service.entity import Entity, User
from openfga_sdk.client.models.list_relations_request import ClientListRelationsRequest


class ArchitecturePermissions(Enum):
    CAN_CHANGE_OWNER = "can_change_owner"
    CAN_READ = "can_read"
    CAN_SHARE = "can_share"
    CAN_WRITE = "can_write"


class AuthzService:
    def __init__(self, manager: FGAManager, store_id: str):
        self.manager = manager
        self.store_id = store_id

    async def add_architecture_owner(
        self, entity: Entity, architecture_id: str
    ) -> None:
        return await self.manager.write_tuples(
            [
                ClientTuple(
                    user=entity.to_auth_string(),
                    relation="owner",
                    object=f"architecture:{architecture_id}",
                )
            ]
        )

    async def can_write_to_architecture(
        self, entity: Entity, architecture_id: str
    ) -> bool:
        return await self.manager.check(
            ClientCheckRequest(
                user=entity.to_auth_string(),
                relation=ArchitecturePermissions.CAN_WRITE.value,
                object=f"architecture:{architecture_id}",
            )
        )

    async def can_read_architecture(self, entity: Entity, architecture_id: str) -> bool:
        print(f"Checking if {entity.to_auth_string()} can read {architecture_id}")
        return await self.manager.check(
            ClientCheckRequest(
                user=entity.to_auth_string(),
                relation=ArchitecturePermissions.CAN_READ.value,
                object=f"architecture:{architecture_id}",
            )
        )

    async def can_change_architecture_owner(
        self, entity: Entity, architecture_id: str
    ) -> bool:
        return await self.manager.check(
            ClientCheckRequest(
                user=entity.to_auth_string(),
                relation=ArchitecturePermissions.CAN_CHANGE_OWNER.value,
                object=f"architecture:{architecture_id}",
            )
        )

    async def can_share_architecture(
        self, entity: Entity, architecture_id: str
    ) -> bool:
        return await self.manager.check(
            ClientCheckRequest(
                user=entity.to_auth_string(),
                relation=ArchitecturePermissions.CAN_SHARE.value,
                object=f"architecture:{architecture_id}",
            )
        )
