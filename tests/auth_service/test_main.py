from dataclasses import dataclass
import aiounittest
from unittest import mock
from openfga_sdk.client.models.tuple import ClientTuple
from openfga_sdk.client.models.write_request import ClientWriteRequest
from openfga_sdk.client import ClientCheckRequest

from src.auth_service.main import (
    ArchitecturePermissions,
    AuthzService,
)
from src.auth_service.entity import User


@dataclass
class MockCheckReturnVal:
    allowed: bool


class TestAuthzService(aiounittest.AsyncTestCase):
    @classmethod
    def setUpClass(self):
        self.test_user = User(id="test-user")
        self.test_arch_id = "test-arch-id"
        self.mock_manager = mock.Mock()
        self.store_id = "test-store-id"
        self.service = AuthzService(
            manager=self.mock_manager,
            store_id=self.store_id,
        )

    def setUp(self):
        self.mock_manager.reset_mock()

    async def test_add_architecture_owner(self):
        self.mock_manager.write_tuples = mock.AsyncMock(return_value=None)
        await self.service.add_architecture_owner(self.test_user, self.test_arch_id)
        self.mock_manager.write_tuples.assert_called_once_with(
            [
                ClientTuple(
                    user=self.test_user.to_auth_string(),
                    relation="owner",
                    object=f"architecture:{self.test_arch_id}",
                )
            ]
        )

    async def test_can_write_to_architecture(self):
        self.mock_manager.check = mock.AsyncMock(
            return_value=MockCheckReturnVal(allowed=True)
        )
        response = await self.service.can_write_to_architecture(
            self.test_user, self.test_arch_id
        )
        self.assertTrue(response)
        args = self.mock_manager.check.call_args.args[0]
        self.assertEqual(args.user, self.test_user.to_auth_string())
        self.assertEqual(args.relation, ArchitecturePermissions.CAN_WRITE.value)
        self.assertEqual(args.object, f"architecture:{self.test_arch_id}")

    async def test_can_read_architecture(self):
        self.mock_manager.check = mock.AsyncMock(
            return_value=MockCheckReturnVal(allowed=True)
        )
        response = await self.service.can_read_architecture(
            self.test_user, self.test_arch_id
        )
        self.assertTrue(response)
        args = self.mock_manager.check.call_args.args[0]
        self.assertEqual(args.user, self.test_user.to_auth_string())
        self.assertEqual(args.relation, ArchitecturePermissions.CAN_READ.value)
        self.assertEqual(args.object, f"architecture:{self.test_arch_id}")

    async def test_can_change_architecture_owner(self):
        self.mock_manager.check = mock.AsyncMock(
            return_value=MockCheckReturnVal(allowed=True)
        )
        response = await self.service.can_change_architecture_owner(
            self.test_user, self.test_arch_id
        )
        self.assertTrue(response)
        args = self.mock_manager.check.call_args.args[0]
        self.assertEqual(args.user, self.test_user.to_auth_string())
        self.assertEqual(args.relation, ArchitecturePermissions.CAN_CHANGE_OWNER.value)
        self.assertEqual(args.object, f"architecture:{self.test_arch_id}")

    async def test_can_share_architecture(self):
        self.mock_manager.check = mock.AsyncMock(
            return_value=MockCheckReturnVal(allowed=True)
        )
        response = await self.service.can_share_architecture(
            self.test_user, self.test_arch_id
        )
        self.assertTrue(response)
        args = self.mock_manager.check.call_args.args[0]
        self.assertEqual(args.user, self.test_user.to_auth_string())
        self.assertEqual(args.relation, ArchitecturePermissions.CAN_SHARE.value)
        self.assertEqual(args.object, f"architecture:{self.test_arch_id}")
