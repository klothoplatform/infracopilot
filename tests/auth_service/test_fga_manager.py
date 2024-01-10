import aiounittest
from unittest.mock import patch, MagicMock, Mock, AsyncMock
from unittest.mock import call as Call
import json
from typing import List
import openfga_sdk
from openfga_sdk.client import OpenFgaClient
from openfga_sdk.models.create_store_request import CreateStoreRequest
from openfga_sdk.client.models.tuple import ClientTuple
from openfga_sdk.client import OpenFgaClient, ClientCheckRequest, ClientConfiguration
from openfga_sdk.client.models.write_request import ClientWriteRequest
from openfga_sdk.models.list_stores_response import ListStoresResponse
from openfga_sdk.models.store import Store
from openfga_sdk.models.write_authorization_model_request import (
    WriteAuthorizationModelRequest,
)
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
from src.auth_service.fga_manager import AuthModelNotFoundException, FGAManager
from openfga_sdk import ClientConfiguration, ApiException
from openfga_sdk.models.tuple_operation import TupleOperation


class TestFGAManager(aiounittest.AsyncTestCase):
    @patch.object(OpenFgaClient, "create_store")
    async def test_create_store(self, mock_create_store):
        mock_response = CreateStoreResponse(
            id="test_store_id",
            name="test_store",
            created_at="2021-01-01",
            updated_at="2021-01-01",
        )
        mock_create_store.return_value = mock_response

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        store_id = await fga_manager.create_store("test_store")
        self.assertEqual(store_id, "test_store_id")
        mock_create_store.assert_called_once_with(CreateStoreRequest(name="test_store"))

    @patch.object(OpenFgaClient, "create_store")
    async def test_create_store_error(self, mock_create_store):
        mock_create_store.side_effect = ApiException("Error")

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        with self.assertRaises(ApiException):
            await fga_manager.create_store("test_store")

    @patch.object(OpenFgaClient, "list_stores")
    async def test_list_stores(self, mock_list_stores):
        mock_response = ListStoresResponse(
            stores=[
                Store(
                    id="store1",
                    name="test_store1",
                    created_at="2021-01-01",
                    updated_at="2021-01-01",
                ),
                Store(
                    id="store2",
                    name="test_store2",
                    created_at="2021-01-01",
                    updated_at="2021-01-01",
                ),
            ],
            continuation_token="",
        )
        mock_list_stores.return_value = mock_response

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        stores = await fga_manager.list_stores()
        self.assertEqual(len(stores), 2)
        self.assertEqual(stores[0].id, "store1")
        self.assertEqual(stores[1].id, "store2")
        mock_list_stores.assert_called_once_with(
            {"page_size": 25, "continuation_token": None}
        )

    @patch.object(OpenFgaClient, "list_stores")
    async def test_list_stores_error(self, mock_list_stores):
        mock_list_stores.side_effect = ApiException("Error")

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        with self.assertRaises(ApiException):
            await fga_manager.list_stores()

    @patch.object(OpenFgaClient, "list_stores")
    async def test_list_stores_pagination(self, mock_list_stores: AsyncMock):
        mock_response = ListStoresResponse(
            stores=[
                Store(
                    id="store1",
                    name="test_store1",
                    created_at="2021-01-01",
                    updated_at="2021-01-01",
                ),
                Store(
                    id="store2",
                    name="test_store2",
                    created_at="2021-01-01",
                    updated_at="2021-01-01",
                ),
            ],
            continuation_token="test_token",
        )
        mock_response2 = ListStoresResponse(
            stores=[
                Store(
                    id="store3",
                    name="test_store3",
                    created_at="2021-01-01",
                    updated_at="2021-01-01",
                ),
                Store(
                    id="store4",
                    name="test_store4",
                    created_at="2021-01-01",
                    updated_at="2021-01-01",
                ),
            ],
            continuation_token="",
        )
        mock_list_stores.side_effect = [mock_response, mock_response2]

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        stores = await fga_manager.list_stores()
        self.assertEqual(len(stores), 4)
        self.assertEqual(stores[0].id, "store1")
        self.assertEqual(stores[1].id, "store2")

        mock_list_stores.assert_has_calls(
            [
                Call({"page_size": 25, "continuation_token": None}),
                Call({"page_size": 25, "continuation_token": "test_token"}),
            ]
        )

    @patch.object(OpenFgaClient, "get_store")
    async def test_get_store(self, mock_get_store):
        mock_response = Store(
            id="test_store_id",
            name="test_store",
            created_at="2021-01-01",
            updated_at="2021-01-01",
        )
        mock_get_store.return_value = mock_response

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        store = await fga_manager.get_store()
        self.assertEqual(store.id, "test_store_id")
        mock_get_store.assert_called_once_with()

    @patch.object(OpenFgaClient, "get_store")
    async def test_get_store_error(self, mock_get_store):
        mock_get_store.side_effect = ApiException("Error")

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        with self.assertRaises(ApiException):
            await fga_manager.get_store()

    @patch.object(OpenFgaClient, "delete_store")
    async def test_delete_store(self, mock_delete_store):
        mock_delete_store.return_value = None

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        await fga_manager.delete_store()
        mock_delete_store.assert_called_once_with()

    @patch.object(OpenFgaClient, "delete_store")
    async def test_delete_store_error(self, mock_delete_store):
        mock_delete_store.side_effect = ApiException("Error")

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        with self.assertRaises(ApiException):
            await fga_manager.delete_store()

    @patch.object(OpenFgaClient, "read_latest_authorization_model")
    async def test_read_latest_authorization_models(
        self, mock_read_latest_authorization_model
    ):
        mock_response = ReadAuthorizationModelResponse(
            authorization_model=AuthorizationModel(
                id="test_auth_model_id", schema_version="1.0", type_definitions=[]
            )
        )
        mock_read_latest_authorization_model.return_value = mock_response

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        auth_model = await fga_manager.read_latest_authorization_models()
        self.assertEqual(auth_model.id, "test_auth_model_id")
        mock_read_latest_authorization_model.assert_called_once_with()

    @patch.object(OpenFgaClient, "read_latest_authorization_model")
    async def test_read_latest_authorization_models_error(
        self, mock_read_latest_authorization_model
    ):
        mock_read_latest_authorization_model.side_effect = ApiException("Error")

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        with self.assertRaises(ApiException):
            await fga_manager.read_latest_authorization_models()

    @patch.object(OpenFgaClient, "write_authorization_model")
    @patch("builtins.open", new_callable=MagicMock)
    async def test_write_authorization_model(
        self, mock_open, mock_write_authorization_model
    ):
        mock_file = MagicMock()
        mock_file.read.return_value = '{"schema_version": "1.1","type_definitions": []}'
        mock_open.return_value.__enter__.return_value = mock_file

        mock_response = WriteAuthorizationModelResponse(
            authorization_model_id="test_auth_model_id"
        )
        mock_write_authorization_model.return_value = mock_response

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        auth_model_id = await fga_manager.write_authorization_model()
        self.assertEqual(auth_model_id, "test_auth_model_id")
        mock_write_authorization_model.assert_called_once_with(
            json.loads(mock_file.read.return_value)
        )

    @patch.object(OpenFgaClient, "write_authorization_model")
    @patch("builtins.open", new_callable=MagicMock)
    async def test_write_authorization_model_error(
        self, mock_open, mock_write_authorization_model
    ):
        mock_file = MagicMock()
        mock_file.read.return_value = '{"schema_version": "1.1","type_definitions": []}'
        mock_open.return_value.__enter__.return_value = mock_file

        mock_write_authorization_model.side_effect = ApiException("Error")

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        with self.assertRaises(ApiException):
            await fga_manager.write_authorization_model()

    @patch.object(OpenFgaClient, "write_authorization_model")
    @patch("builtins.open", new_callable=MagicMock)
    async def test_write_authorization_model_file_not_found(
        self, mock_open, mock_write_authorization_model
    ):
        mock_open.side_effect = FileNotFoundError()

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        with self.assertRaises(AuthModelNotFoundException):
            await fga_manager.write_authorization_model()

    @patch.object(OpenFgaClient, "read_changes")
    async def test_read_tuple_changes(self, mock_read_changes):
        mock_response = ReadChangesResponse(
            changes=[
                TupleChange(
                    tuple_key=TupleKey(user="test", relation="test", object="1"),
                    operation=TupleOperation.WRITE,
                    timestamp="2021-01-01",
                ),
                TupleChange(
                    tuple_key=TupleKey(user="test", relation="test", object="2"),
                    operation=TupleOperation.WRITE,
                    timestamp="2021-01-01",
                ),
            ],
            continuation_token="",
        )
        mock_read_changes.return_value = mock_response

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        changes = await fga_manager.read_tuple_changes()
        self.assertEqual(len(changes), 2)
        self.assertEqual(
            changes[0],
            TupleChange(
                TupleKey(user="test", relation="test", object="1"),
                operation=TupleOperation.WRITE,
                timestamp="2021-01-01",
            ),
        )
        self.assertEqual(
            changes[1],
            TupleChange(
                TupleKey(user="test", relation="test", object="2"),
                operation=TupleOperation.WRITE,
                timestamp="2021-01-01",
            ),
        )
        mock_read_changes.assert_called_once_with(
            {"page_size": 25, "continuation_token": None}
        )

    @patch.object(OpenFgaClient, "read_changes")
    async def test_read_tuple_changes_error(self, mock_read_changes):
        mock_read_changes.side_effect = ApiException("Error")

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        with self.assertRaises(ApiException):
            await fga_manager.read_tuple_changes()

    @patch.object(OpenFgaClient, "read_changes")
    async def test_read_tuple_changes_pagination(self, mock_read_changes):
        mock_response = ReadChangesResponse(
            changes=[
                TupleChange(
                    tuple_key=TupleKey(user="test", relation="test", object="1"),
                    operation=TupleOperation.WRITE,
                    timestamp="2021-01-01",
                ),
                TupleChange(
                    tuple_key=TupleKey(user="test", relation="test", object="2"),
                    operation=TupleOperation.WRITE,
                    timestamp="2021-01-01",
                ),
            ],
            continuation_token="test_token",
        )
        mock_response2 = ReadChangesResponse(
            changes=[
                TupleChange(
                    tuple_key=TupleKey(user="test", relation="test", object="3"),
                    operation=TupleOperation.WRITE,
                    timestamp="2021-01-01",
                ),
                TupleChange(
                    tuple_key=TupleKey(user="test", relation="test", object="4"),
                    operation=TupleOperation.WRITE,
                    timestamp="2021-01-01",
                ),
            ],
            continuation_token="",
        )
        mock_read_changes.side_effect = [mock_response, mock_response2]

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        changes = await fga_manager.read_tuple_changes()
        self.assertEqual(len(changes), 4)
        self.assertEqual(
            changes[0],
            TupleChange(
                TupleKey(user="test", relation="test", object="1"),
                operation=TupleOperation.WRITE,
                timestamp="2021-01-01",
            ),
        )
        self.assertEqual(
            changes[1],
            TupleChange(
                TupleKey(user="test", relation="test", object="2"),
                operation=TupleOperation.WRITE,
                timestamp="2021-01-01",
            ),
        )
        self.assertEqual(
            changes[2],
            TupleChange(
                TupleKey(user="test", relation="test", object="3"),
                operation=TupleOperation.WRITE,
                timestamp="2021-01-01",
            ),
        )
        self.assertEqual(
            changes[3],
            TupleChange(
                TupleKey(user="test", relation="test", object="4"),
                operation=TupleOperation.WRITE,
                timestamp="2021-01-01",
            ),
        )

        mock_read_changes.assert_has_calls(
            [
                Call({"page_size": 25, "continuation_token": None}),
                Call({"page_size": 25, "continuation_token": "test_token"}),
            ]
        )

    @patch.object(OpenFgaClient, "read")
    async def test_read_tuples(self, mock_read):
        mock_response = ReadResponse(
            tuples=[
                Tuple(
                    key=TupleKey(user="test", relation="test", object="1"),
                    timestamp="2021-01-01",
                ),
                Tuple(
                    key=TupleKey(user="test", relation="test", object="2"),
                    timestamp="2021-01-01",
                ),
            ],
            continuation_token="",
        )
        mock_read.return_value = mock_response

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        tuples = await fga_manager.read_tuples("test_tuple_key")
        self.assertEqual(len(tuples), 2)
        self.assertEqual(
            tuples[0],
            Tuple(
                key=TupleKey(user="test", relation="test", object="1"),
                timestamp="2021-01-01",
            ),
        )
        self.assertEqual(
            tuples[1],
            Tuple(
                key=TupleKey(user="test", relation="test", object="2"),
                timestamp="2021-01-01",
            ),
        )
        mock_read.assert_called_once_with(
            "test_tuple_key", {"page_size": 25, "continuation_token": None}
        )

    @patch.object(OpenFgaClient, "read")
    async def test_read_tuples_error(self, mock_read):
        mock_read.side_effect = ApiException("Error")

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        with self.assertRaises(ApiException):
            await fga_manager.read_tuples("test_tuple_key")

    @patch.object(OpenFgaClient, "read")
    async def test_read_tuples_pagination(self, mock_read):
        mock_response = ReadResponse(
            tuples=[
                Tuple(
                    key=TupleKey(user="test", relation="test", object="1"),
                    timestamp="2021-01-01",
                ),
                Tuple(
                    key=TupleKey(user="test", relation="test", object="2"),
                    timestamp="2021-01-01",
                ),
            ],
            continuation_token="test_token",
        )
        mock_response2 = ReadResponse(
            tuples=[
                Tuple(
                    key=TupleKey(user="test", relation="test", object="3"),
                    timestamp="2021-01-01",
                ),
                Tuple(
                    key=TupleKey(user="test", relation="test", object="4"),
                    timestamp="2021-01-01",
                ),
            ],
            continuation_token="",
        )
        mock_read.side_effect = [mock_response, mock_response2]

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        tuples = await fga_manager.read_tuples("test_tuple_key")
        self.assertEqual(len(tuples), 4)
        self.assertEqual(
            tuples[0],
            Tuple(
                key=TupleKey(user="test", relation="test", object="1"),
                timestamp="2021-01-01",
            ),
        )
        self.assertEqual(
            tuples[1],
            Tuple(
                key=TupleKey(user="test", relation="test", object="2"),
                timestamp="2021-01-01",
            ),
        )
        self.assertEqual(
            tuples[2],
            Tuple(
                key=TupleKey(user="test", relation="test", object="3"),
                timestamp="2021-01-01",
            ),
        )
        self.assertEqual(
            tuples[3],
            Tuple(
                key=TupleKey(user="test", relation="test", object="4"),
                timestamp="2021-01-01",
            ),
        )

        mock_read.assert_has_calls(
            [
                Call("test_tuple_key", {"page_size": 25, "continuation_token": None}),
                Call(
                    "test_tuple_key",
                    {"page_size": 25, "continuation_token": "test_token"},
                ),
            ]
        )

    @patch.object(OpenFgaClient, "write_tuples")
    async def test_write_tuples(self, mock_write_tuples):
        mock_response = ClientWriteResponse(
            writes=[
                ClientTuple(
                    user="test_user",
                    object="test_object",
                    relation="test_relation",
                )
            ],
            deletes=[],
        )
        mock_write_tuples.return_value = mock_response

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        await fga_manager.write_tuples(
            [
                ClientTuple(
                    user="test_user",
                    object="test_object",
                    relation="test_relation",
                )
            ]
        )
        mock_write_tuples.assert_called_once()

    @patch.object(OpenFgaClient, "write_tuples")
    async def test_write_tuples_error(self, mock_write_tuples):
        mock_write_tuples.side_effect = ApiException("Error")

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        with self.assertRaises(ApiException):
            await fga_manager.write_tuples(
                [
                    ClientTuple(
                        user="test_user",
                        object="test_object",
                        relation="test_relation",
                    )
                ]
            )

    @patch.object(OpenFgaClient, "delete_tuples")
    async def test_delete_tuples(self, mock_delete_tuples):
        mock_response = ClientWriteResponse(
            deletes=[
                ClientTuple(
                    user="test_user",
                    object="test_object",
                    relation="test_relation",
                )
            ],
            writes=[],
        )
        mock_delete_tuples.return_value = mock_response

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        await fga_manager.delete_tuples(
            [
                ClientTuple(
                    user="test_user",
                    object="test_object",
                    relation="test_relation",
                )
            ]
        )
        mock_delete_tuples.assert_called_once()

    @patch.object(OpenFgaClient, "delete_tuples")
    async def test_delete_tuples_error(self, mock_delete_tuples):
        mock_delete_tuples.side_effect = ApiException("Error")

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        with self.assertRaises(ApiException):
            await fga_manager.delete_tuples(
                [
                    ClientTuple(
                        user="test_user",
                        object="test_object",
                        relation="test_relation",
                    )
                ]
            )

    @patch.object(OpenFgaClient, "check")
    async def test_check(self, mock_check):
        class MockCheckResponse:
            def __init__(self, allowed: bool):
                self.allowed = allowed

        mock_check.return_value = MockCheckResponse(True)

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        req = ClientCheckRequest(
            user="test_user",
            object="test_object",
            relation="test_relation",
        )
        result = await fga_manager.check(req)
        self.assertTrue(result)

        mock_check.assert_called_once_with(req)

    @patch.object(OpenFgaClient, "check")
    async def test_check_error(self, mock_check):
        mock_check.side_effect = ApiException("Error")

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        req = ClientCheckRequest(
            user="test_user",
            object="test_object",
            relation="test_relation",
        )
        with self.assertRaises(ApiException):
            await fga_manager.check(req)

    @patch.object(OpenFgaClient, "expand")
    async def test_expand(self, mock_expand):
        mock_response = ExpandResponse()
        mock_expand.return_value = mock_response

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        req = ClientExpandRequest(
            relation="test_relation",
            object="test_object",
        )
        response = await fga_manager.expand(req)
        self.assertEqual(response, mock_response)
        mock_expand.assert_called_once_with(req)

    @patch.object(OpenFgaClient, "expand")
    async def test_expand_error(self, mock_expand):
        mock_expand.side_effect = ApiException("Error")

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        req = ClientExpandRequest(
            relation="test_relation",
            object="test_object",
        )
        with self.assertRaises(ApiException):
            await fga_manager.expand(req)

    @patch.object(OpenFgaClient, "list_objects")
    async def test_list_objects(self, mock_list_objects):
        mock_response = ListObjectsResponse(objects=["object1", "object2"])
        mock_list_objects.return_value = mock_response

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        req = ClientListObjectsRequest(
            user="test_user",
            relation="test_relation",
            type="test_type",
        )
        objects = await fga_manager.list_objects(req)
        self.assertEqual(len(objects), 2)
        self.assertEqual(objects[0], "object1")
        self.assertEqual(objects[1], "object2")
        mock_list_objects.assert_called_once_with(req)

    @patch.object(OpenFgaClient, "list_objects")
    async def test_list_objects_error(self, mock_list_objects):
        mock_list_objects.side_effect = ApiException("Error")

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        req = ClientListObjectsRequest(
            user="test_user",
            relation="test_relation",
            type="test_type",
        )
        with self.assertRaises(ApiException):
            await fga_manager.list_objects(req)

    @patch.object(OpenFgaClient, "list_relations")
    async def test_list_relations(self, mock_list_relations):
        class MockListRelationsResponse:
            def __init__(self, relations: List[str]):
                self.relations = relations

        mock_list_relations.return_value = MockListRelationsResponse(
            ["relation1", "relation2"]
        )

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        req = ClientListRelationsRequest(
            user="test_user",
            relations=["relation1", "relation2"],
            object="test_object",
        )
        relations = await fga_manager.list_relations(req)
        self.assertEqual(len(relations), 2)
        self.assertEqual(relations[0], "relation1")
        self.assertEqual(relations[1], "relation2")
        mock_list_relations.assert_called_once_with(req)

    @patch.object(OpenFgaClient, "list_relations")
    async def test_list_relations_error(self, mock_list_relations):
        mock_list_relations.side_effect = ApiException("Error")

        config = ClientConfiguration()
        fga_manager = FGAManager(config)
        req = ClientListRelationsRequest(
            user="test_user",
            relations=["relation1", "relation2"],
            object="test_object",
        )
        with self.assertRaises(ApiException):
            await fga_manager.list_relations(req)
