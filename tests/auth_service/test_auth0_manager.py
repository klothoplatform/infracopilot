import aiounittest
from unittest.mock import patch, MagicMock, Mock, AsyncMock
from unittest.mock import call as Call
import json
from typing import List
import openfga_sdk
from auth0.management import Auth0
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

from src.auth_service.auth0_manager import (
    Auth0Manager,
    Configuration,
    default_user_fields,
)
from src.auth_service.fga_manager import AuthModelNotFoundException, FGAManager
from openfga_sdk import ClientConfiguration, ApiException


class TestAuth0Manager(aiounittest.AsyncTestCase):
    @patch.object(Auth0Manager, "get_client")
    def test_get_users(self, mock_get_client):
        mock_get_client.return_value = mock_client = MagicMock()
        mock_client.users.list.return_value = mock_response = {
            "total": 2,
            "users": [
                {
                    "user_id": "test1",
                    "name": "test1",
                },
                {
                    "user_id": "test2",
                    "name": "test2",
                },
            ],
        }

        config = Configuration("test", "test", "test")
        auth0_mgr = Auth0Manager(config)
        users = auth0_mgr.get_users(
            ["test1", "test2"],
        )
        self.assertEqual(2, len(users), "Should have 2 users")
        self.assertEqual("test1", users[0]["user_id"])
        self.assertEqual("test2", users[1]["user_id"])
        mock_get_client.assert_called_once()
        mock_client.users.list.assert_called_once_with(
            q='user_id:("test1"\ OR\ "test2")',
            fields=default_user_fields,
            page=0,
            per_page=100,
            include_totals=True,
        )

    @patch.object(Auth0Manager, "get_client")
    def test_get_single_user(self, mock_get_client):
        mock_get_client.return_value = mock_client = MagicMock()
        mock_client.users.get.return_value = mock_response = {
            "user_id": "test1",
            "name": "test1",
        }

        config = Configuration("test", "test", "test")
        auth0_mgr = Auth0Manager(config)
        users = auth0_mgr.get_users(
            ["test1"],
        )
        self.assertEqual(1, len(users), "Should have 1 user")
        self.assertEqual("test1", users[0]["user_id"])
        mock_get_client.assert_called_once()
        mock_client.users.get.assert_called_once_with(
            "test1",
            fields=default_user_fields,
        )

    @patch.object(Auth0Manager, "get_client")
    def test_get_users_empty(self, mock_get_client):
        mock_get_client.return_value = mock_client = MagicMock()

        config = Configuration("test", "test", "test")
        auth0_mgr = Auth0Manager(config)
        users = auth0_mgr.get_users(
            [],
        )
        self.assertEqual(0, len(users), "Should have 0 users")
        mock_get_client.assert_not_called()
        mock_client.users.list.assert_not_called()
        mock_client.users.get.assert_not_called()
