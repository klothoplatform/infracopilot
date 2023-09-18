import os
import openfga_sdk
from enum import Enum
from openfga_sdk.client.models.tuple import ClientTuple
from openfga_sdk.client import OpenFgaClient, ClientCheckRequest, ClientConfiguration
from openfga_sdk.credentials import Credentials, CredentialConfiguration
from openfga_sdk.client.models.write_request import ClientWriteRequest

from src.util.entity import Entity


# Step 02. Initialize the SDK
credentials = Credentials(
    method="client_credentials",
    configuration=CredentialConfiguration(
        api_issuer="fga.us.auth0.com",
        api_audience="https://api.us1.fga.dev/",
        client_id="sVMtx5cMzyMHGNTovKK1mBALYxrMb4h6",
        client_secret="lCyWmq2Q9Nvg02uo9AtoNivpS3dz_qZpT8Qyp-hZHiVJFZDwW3S3cN3fB9D9rryw",  # Secret you got from this page
    ),
)
configuration = ClientConfiguration(
    api_scheme="https",
    api_host="api.us1.fga.dev",
    store_id="01HA2PX1KANG03C3FG4V20QZ4J",
    authorization_model_id="01HA2W026NZDHB69AJ3B472EN7",  # Optionally, you can specify a model id to target, which can improve latency, this will need to be changed every time we update the model, so in the future lets bootstrap this
    credentials=credentials,
)


class ArchitecturePermissions(Enum):
    CAN_CHANGE_OWNER = "can_change_owner"
    CAN_READ = "can_read"
    CAN_SHARE = "can_share"
    CAN_WRITE = "can_write"


async def add_architecture_owner(entity: Entity, architecture_id: str) -> None:
    async with OpenFgaClient(configuration) as fga_client:
        request = ClientWriteRequest(
            writes=[
                ClientTuple(
                    user=entity.to_auth_string(),
                    relation="owner",
                    object=f"architecture:{architecture_id}",
                )
            ]
        )
        await fga_client.write(request)
        await fga_client.close()  # close when done
        return


async def can_write_to_architecture(entity: Entity, architecture_id: str) -> bool:
    async with OpenFgaClient(configuration) as fga_client:
        body = ClientCheckRequest(
            user=entity.to_auth_string(),
            relation=ArchitecturePermissions.CAN_WRITE.value,
            object=f"architecture:{architecture_id}",
        )
        response = await fga_client.check(body)
        await fga_client.close()  # close when done
        return response.allowed


async def can_read_architecture(entity: Entity, architecture_id: str) -> bool:
    async with OpenFgaClient(configuration) as fga_client:
        body = ClientCheckRequest(
            user=entity.to_auth_string(),
            relation=ArchitecturePermissions.CAN_READ.value,
            object=f"architecture:{architecture_id}",
        )
        response = await fga_client.check(body)
        await fga_client.close()  # close when done
        return response.allowed


async def can_change_architecture_owner(entity: Entity, architecture_id: str) -> bool:
    async with OpenFgaClient(configuration) as fga_client:
        body = ClientCheckRequest(
            user=entity.to_auth_string(),
            relation=ArchitecturePermissions.CAN_CHANGE_OWNER.value,
            object=f"architecture:{architecture_id}",
        )
        response = await fga_client.check(body)
        await fga_client.close()  # close when done
        return response.allowed


async def can_share_architecture(entity: Entity, architecture_id: str) -> bool:
    async with OpenFgaClient(configuration) as fga_client:
        body = ClientCheckRequest(
            user=entity.to_auth_string(),
            relation=ArchitecturePermissions.CAN_SHARE.value,
            object=f"architecture:{architecture_id}",
        )
        response = await fga_client.check(body)
        await fga_client.close()  # close when done
        return response.allowed
