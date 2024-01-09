import json
from typing import List
import openfga_sdk
from openfga_sdk.client import OpenFgaClient
from openfga_sdk.models.create_store_request import CreateStoreRequest
from openfga_sdk.client.models.tuple import ClientTuple
from openfga_sdk.client import OpenFgaClient, ClientCheckRequest, ClientConfiguration
from openfga_sdk.models.list_stores_response import ListStoresResponse
from openfga_sdk.models.store import Store
from openfga_sdk.models.tuple_change import TupleChange
from openfga_sdk.models.read_changes_response import ReadChangesResponse
from openfga_sdk.models.read_response import ReadResponse
from openfga_sdk.models.tuple_key import TupleKey
from openfga_sdk.models.tuple import Tuple
from openfga_sdk.client.models.write_response import ClientWriteResponse
from openfga_sdk.models.read_authorization_model_response import (
    ReadAuthorizationModelResponse,
)
from openfga_sdk.models.authorization_model import AuthorizationModel
from openfga_sdk.client.models.expand_request import ClientExpandRequest
from openfga_sdk.models.expand_response import ExpandResponse
from openfga_sdk.client.models.list_objects_request import ClientListObjectsRequest
from openfga_sdk.models.list_objects_response import ListObjectsResponse
from openfga_sdk.client.models.list_relations_request import ClientListRelationsRequest
from openfga_sdk.models.create_store_response import CreateStoreResponse
from openfga_sdk.models.write_authorization_model_response import (
    WriteAuthorizationModelResponse,
)
import os
import openfga_sdk
from openfga_sdk.client import OpenFgaClient
from openfga_sdk.models.create_store_request import CreateStoreRequest
from openfga_sdk.client.models.tuple import ClientTuple
from openfga_sdk.client import OpenFgaClient, ClientCheckRequest, ClientConfiguration
from openfga_sdk.models.list_stores_response import ListStoresResponse
from openfga_sdk.models.store import Store

from typing import List


class AuthModelNotFoundException(Exception):
    pass


class FGAManager:
    def __init__(self, configuration: ClientConfiguration) -> str:
        self.configuration = configuration

    async def create_store(self, name: str):
        try:
            async with OpenFgaClient(self.configuration) as fga_client:
                body = CreateStoreRequest(
                    name=name,
                )
                response: CreateStoreResponse = await fga_client.create_store(body)
                await fga_client.close()
                return response.id
        except openfga_sdk.ApiException as e:
            print("Exception when calling OpenFgaClient->create_store: %s\n" % e)
            raise e

    async def list_stores(self, max_results=100) -> List[Store]:
        try:
            async with OpenFgaClient(self.configuration) as fga_client:
                continuation_token = None
                stores: List[Store] = []

                while True and len(stores) < max_results:
                    options = {
                        "page_size": 25,
                        "continuation_token": continuation_token,
                    }
                    response: ListStoresResponse = await fga_client.list_stores(options)
                    stores += response.stores
                    if (
                        response.continuation_token is None
                        or response.continuation_token == ""
                    ):
                        break
                    continuation_token = response.continuation_token

                await fga_client.close()
                return stores
        except openfga_sdk.ApiException as e:
            print("Exception when calling OpenFgaClient->list_stores: %s\n" % e)
            raise e

    async def get_store(self) -> Store:
        try:
            async with OpenFgaClient(self.configuration) as fga_client:
                response: Store = await fga_client.get_store()
                await fga_client.close()
                return response
        except openfga_sdk.ApiException as e:
            print("Exception when calling OpenFgaClient->get_store: %s\n" % e)
            raise e

    async def delete_store(self):
        try:
            print(f"Deleting store {self.configuration.store_id}")
            async with OpenFgaClient(self.configuration) as fga_client:
                await fga_client.delete_store()
                await fga_client.close()
        except openfga_sdk.ApiException as e:
            print("Exception when calling OpenFgaClient->delete_store: %s\n" % e)
            raise e

    async def read_latest_authorization_models(self) -> AuthorizationModel:
        try:
            async with OpenFgaClient(self.configuration) as fga_client:
                response: ReadAuthorizationModelResponse = (
                    await fga_client.read_latest_authorization_model()
                )
                await fga_client.close()
                return response.authorization_model
        except openfga_sdk.ApiException as e:
            print(
                "Exception when calling OpenFgaClient->read_latest_authorization_models: %s\n"
                % e
            )
            raise e

    async def write_authorization_model(self) -> str:
        try:
            async with OpenFgaClient(self.configuration) as fga_client:
                # open model.json file and read it into variable
                body_string = None
                with open(
                    os.path.join(os.path.dirname(__file__), "model.json"), "r"
                ) as f:
                    body_string = f.read()

                response: WriteAuthorizationModelResponse = (
                    await fga_client.write_authorization_model(json.loads(body_string))
                )
                await fga_client.close()
                return response.authorization_model_id
        except openfga_sdk.ApiException as e:
            print(
                "Exception when calling OpenFgaClient->write_authorization_model: %s\n"
                % e
            )
            raise e
        except OSError as e:
            raise AuthModelNotFoundException("model.json file not found")

    async def read_tuple_changes(self, max_results=100) -> List[TupleChange]:
        try:
            async with OpenFgaClient(self.configuration) as fga_client:
                continuation_token = None
                changes: List[TupleChange] = []

                while True and len(changes) < max_results:
                    options = {
                        "page_size": 25,
                        "continuation_token": continuation_token,
                    }
                    response: ReadChangesResponse = await fga_client.read_changes(
                        options
                    )
                    changes += response.changes
                    if (
                        response.continuation_token is None
                        or response.continuation_token == ""
                    ):
                        break
                    continuation_token = response.continuation_token
                await fga_client.close()
                return changes
        except openfga_sdk.ApiException as e:
            print("Exception when calling OpenFgaClient->read_tuple_changes: %s\n" % e)
            raise e

    async def read_tuples(self, key: TupleKey, max_results=100) -> List[Tuple]:
        try:
            async with OpenFgaClient(self.configuration) as fga_client:
                continuation_token = None
                tuples: List[Tuple] = []

                while True and len(tuples) < max_results:
                    options = {
                        "page_size": 25,
                        "continuation_token": continuation_token,
                    }
                    response: ReadResponse = await fga_client.read(key, options)
                    tuples += response.tuples
                    if (
                        response.continuation_token is None
                        or response.continuation_token == ""
                    ):
                        break
                    continuation_token = response.continuation_token

                await fga_client.close()
                return tuples

        except openfga_sdk.ApiException as e:
            print("Exception when calling OpenFgaClient->read_tuple: %s\n" % e)
            raise e

    async def write_tuples(self, tuples: List[ClientTuple]):
        try:
            async with OpenFgaClient(self.configuration) as fga_client:
                response: ClientWriteResponse = await fga_client.write_tuples(tuples)
                await fga_client.close()
        except openfga_sdk.ApiException as e:
            print("Exception when calling OpenFgaClient->write: %s\n" % e)
            raise e

    async def delete_tuples(self, tuples: List[ClientTuple]):
        try:
            async with OpenFgaClient(self.configuration) as fga_client:
                response: ClientWriteResponse = await fga_client.delete_tuples(tuples)
                await fga_client.close()
        except openfga_sdk.ApiException as e:
            print("Exception when calling OpenFgaClient->delete: %s\n" % e)
            raise e

    async def check(self, body: ClientCheckRequest) -> bool:
        try:
            async with OpenFgaClient(self.configuration) as fga_client:
                response = await fga_client.check(body)
                await fga_client.close()
                return response.allowed
        except openfga_sdk.ApiException as e:
            print("Exception when calling OpenFgaClient->check: %s\n" % e)
            raise e

    async def expand(self, body: ClientExpandRequest) -> ExpandResponse:
        try:
            async with OpenFgaClient(self.configuration) as fga_client:
                response: ExpandResponse = await fga_client.expand(body)
                await fga_client.close()
                return response
        except openfga_sdk.ApiException as e:
            print("Exception when calling OpenFgaClient->expand: %s\n" % e)
            raise e

    async def list_objects(self, body: ClientListObjectsRequest) -> List[str]:
        try:
            async with OpenFgaClient(self.configuration) as fga_client:
                response: ListObjectsResponse = await fga_client.list_objects(body)
                await fga_client.close()
                return response.objects
        except openfga_sdk.ApiException as e:
            print("Exception when calling OpenFgaClient->list_objects: %s\n" % e)
            raise e

    async def list_relations(self, body: ClientListRelationsRequest) -> List[str]:
        try:
            async with OpenFgaClient(self.configuration) as fga_client:
                response = await fga_client.list_relations(body)
                await fga_client.close()
                return response.relations
        except openfga_sdk.ApiException as e:
            print("Exception when calling OpenFgaClient->list_relations: %s\n" % e)
            raise e
