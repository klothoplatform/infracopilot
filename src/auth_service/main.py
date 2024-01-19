import os
import openfga_sdk
from enum import Enum
from openfga_sdk.client.models.tuple import ClientTuple
from openfga_sdk.client import OpenFgaClient, ClientCheckRequest, ClientConfiguration
from openfga_sdk.credentials import Credentials, CredentialConfiguration
from openfga_sdk.client.models.write_request import ClientWriteRequest
import os
from src.util.entity import Entity
from src.util.secrets import (
    get_fga_secret,
    get_fga_client,
    get_fga_model,
    get_fga_store,
)


def get_client_configuration():
    secret = get_fga_secret()
    client_id = get_fga_client()
    store_id = get_fga_store()
    authorization_model_id = get_fga_model()

    # Step 02. Initialize the SDK
    credentials = Credentials(
        method="client_credentials",
        configuration=CredentialConfiguration(
            api_issuer="fga.us.auth0.com",
            api_audience="https://api.us1.fga.dev/",
            client_id=client_id,
            client_secret=secret,  # Secret you got from this page
        ),
    )
    return ClientConfiguration(
        api_scheme="https",
        api_host="api.us1.fga.dev",
        store_id=store_id,
        # TODO: Dont use secrets for this in case it updates
        authorization_model_id=authorization_model_id,  # Optionally, you can specify a model id to target, which can improve latency, this will need to be changed every time we update the model, so in the future lets bootstrap this
        credentials=credentials,
    )


class ArchitecturePermissions(Enum):
    CAN_CHANGE_OWNER = "can_change_owner"
    CAN_READ = "can_read"
    CAN_SHARE = "can_share"
    CAN_WRITE = "can_write"


async def add_architecture_owner(entity: Entity, architecture_id: str) -> None:
    configuration = get_client_configuration()
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
    configuration = get_client_configuration()
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
    configuration = get_client_configuration()
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
    configuration = get_client_configuration()
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
    configuration = get_client_configuration()
    async with OpenFgaClient(configuration) as fga_client:
        body = ClientCheckRequest(
            user=entity.to_auth_string(),
            relation=ArchitecturePermissions.CAN_SHARE.value,
            object=f"architecture:{architecture_id}",
        )
        response = await fga_client.check(body)
        await fga_client.close()  # close when done
        return response.allowed
