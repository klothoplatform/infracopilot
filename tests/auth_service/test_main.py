from dataclasses import dataclass
import aiounittest
from unittest import mock
from openfga_sdk.client.models.tuple import ClientTuple
from openfga_sdk.client.models.write_request import ClientWriteRequest
from openfga_sdk.client import ClientCheckRequest

from src.auth_service.main import (
    ArchitecturePermissions,
    add_architecture_owner,
    can_read_architecture,
    can_write_to_architecture,
    can_change_architecture_owner,
    can_share_architecture,
)
from src.util.entity import User


@dataclass
class MockCheckReturnVal:
    allowed: bool


class TestArchitectureFga(aiounittest.AsyncTestCase):
    test_user = User(id="test-user")

    @mock.patch("src.auth_service.main.OpenFgaClient")
    async def test_add_architecture_owner(self, mock_fga: mock.Mock):
        client_instance = mock_fga.return_value
        async_ctx_mock = (
            mock.AsyncMock()
        )  # Create an AsyncMock for the async context manager

        # Configure the async context manager methods
        async_ctx_mock.__aenter__.return_value = async_ctx_mock
        async_ctx_mock.write.return_value = None

        # Set the async context manager for the client instance
        client_instance.__aenter__.return_value = async_ctx_mock

        await add_architecture_owner(self.test_user, "test-id")
        async_ctx_mock.write.assert_called_once()
        args = async_ctx_mock.write.call_args.args[0]
        self.assertEqual(len(args.writes), 1)
        self.assertIsNone(args.deletes)
        self.assertEqual(
            args.writes[0],
            ClientTuple(
                user=self.test_user.to_auth_string(),
                relation="owner",
                object=f"architecture:test-id",
            ),
        )

    @mock.patch("src.auth_service.main.OpenFgaClient")
    async def test_can_write_to_architecture(self, mock_fga: mock.Mock):
        client_instance = mock_fga.return_value
        async_ctx_mock = (
            mock.AsyncMock()
        )  # Create an AsyncMock for the async context manager

        # Configure the async context manager methods
        async_ctx_mock.__aenter__.return_value = async_ctx_mock
        async_ctx_mock.check.return_value = MockCheckReturnVal(allowed=True)

        # Set the async context manager for the client instance
        client_instance.__aenter__.return_value = async_ctx_mock

        response = await can_write_to_architecture(self.test_user, "test-id")
        self.assertTrue(response)
        async_ctx_mock.check.assert_called_once()
        args = async_ctx_mock.check.call_args.args[0]
        self.assertEqual(args.user, self.test_user.to_auth_string())
        self.assertEqual(args.relation, ArchitecturePermissions.CAN_WRITE.value)
        self.assertEqual(args.object, "architecture:test-id")

    @mock.patch("src.auth_service.main.OpenFgaClient")
    async def test_can_read_architecture(self, mock_fga: mock.Mock):
        client_instance = mock_fga.return_value
        async_ctx_mock = (
            mock.AsyncMock()
        )  # Create an AsyncMock for the async context manager

        # Configure the async context manager methods
        async_ctx_mock.__aenter__.return_value = async_ctx_mock
        async_ctx_mock.check.return_value = MockCheckReturnVal(allowed=True)

        # Set the async context manager for the client instance
        client_instance.__aenter__.return_value = async_ctx_mock

        response = await can_read_architecture(self.test_user, "test-id")
        self.assertTrue(response)
        async_ctx_mock.check.assert_called_once()
        args = async_ctx_mock.check.call_args.args[0]
        self.assertEqual(args.user, self.test_user.to_auth_string())
        self.assertEqual(args.relation, ArchitecturePermissions.CAN_READ.value)
        self.assertEqual(args.object, "architecture:test-id")

    @mock.patch("src.auth_service.main.OpenFgaClient")
    async def test_can_change_architecture_owner(self, mock_fga: mock.Mock):
        client_instance = mock_fga.return_value
        async_ctx_mock = (
            mock.AsyncMock()
        )  # Create an AsyncMock for the async context manager

        # Configure the async context manager methods
        async_ctx_mock.__aenter__.return_value = async_ctx_mock
        async_ctx_mock.check.return_value = MockCheckReturnVal(allowed=True)

        # Set the async context manager for the client instance
        client_instance.__aenter__.return_value = async_ctx_mock

        response = await can_change_architecture_owner(self.test_user, "test-id")
        self.assertTrue(response)
        async_ctx_mock.check.assert_called_once()
        args = async_ctx_mock.check.call_args.args[0]
        self.assertEqual(args.user, self.test_user.to_auth_string())
        self.assertEqual(args.relation, ArchitecturePermissions.CAN_CHANGE_OWNER.value)
        self.assertEqual(args.object, "architecture:test-id")

    @mock.patch("src.auth_service.main.OpenFgaClient")
    async def test_can_share_architecture(self, mock_fga: mock.Mock):
        client_instance = mock_fga.return_value
        async_ctx_mock = (
            mock.AsyncMock()
        )  # Create an AsyncMock for the async context manager

        # Configure the async context manager methods
        async_ctx_mock.__aenter__.return_value = async_ctx_mock
        async_ctx_mock.check.return_value = MockCheckReturnVal(allowed=True)

        # Set the async context manager for the client instance
        client_instance.__aenter__.return_value = async_ctx_mock

        response = await can_share_architecture(self.test_user, "test-id")
        self.assertTrue(response)
        async_ctx_mock.check.assert_called_once()
        args = async_ctx_mock.check.call_args.args[0]
        self.assertEqual(args.user, self.test_user.to_auth_string())
        self.assertEqual(args.relation, ArchitecturePermissions.CAN_SHARE.value)
        self.assertEqual(args.object, "architecture:test-id")
