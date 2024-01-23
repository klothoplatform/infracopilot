import aiounittest
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi import HTTPException
from src.environment_management.environment_manager import (
    EnvironmentTrackingError,
    EnvironmentNotTrackedError,
)
from src.auth_service.token import AuthError
from src.backend_orchestrator.environments_api import Diff, env_in_sync
from src.auth_service.entity import User


class TestEnvInSync(aiounittest.AsyncTestCase):
    @patch("src.backend_orchestrator.environments_api.get_user_id")
    @patch("src.backend_orchestrator.environments_api.get_environment_manager")
    async def test_env_in_sync_happy_path_true(
        self, get_environment_manager, get_user_id
    ):
        # Arrange
        get_user_id.return_value = "user_id"
        authz_service = MagicMock()
        authz_service.can_read_architecture = AsyncMock(return_value=True)
        manager = MagicMock()
        manager.is_in_sync = AsyncMock(return_value=[True, None, None])
        get_environment_manager.return_value = manager

        request = MagicMock()
        session = MagicMock()

        # Act
        result = await env_in_sync(request, "id", "env_id", session, authz_service)

        # Assert
        self.assertEqual(result.in_sync, True)
        get_user_id.assert_called_once_with(request)
        authz_service.can_read_architecture.assert_called_once_with(
            User(id="user_id"), "id"
        )
        get_environment_manager.assert_called_once_with(session)
        manager.is_in_sync.assert_called_once_with("id", "env_id")

    @patch("src.backend_orchestrator.environments_api.get_user_id")
    @patch("src.backend_orchestrator.environments_api.get_environment_manager")
    async def test_env_in_sync_happy_path_false(
        self, get_environment_manager, get_user_id
    ):
        # Arrange
        get_user_id.return_value = "user_id"
        authz_service = MagicMock()
        authz_service.can_read_architecture = AsyncMock(return_value=True)
        manager = MagicMock()
        manager.is_in_sync = AsyncMock(
            return_value=[False, "expected_version", "actual_version"]
        )
        get_environment_manager.return_value = manager

        request = MagicMock()
        session = MagicMock()

        # Act
        result = await env_in_sync(request, "id", "env_id", session, authz_service)

        # Assert
        self.assertEqual(result.in_sync, False)
        self.assertEqual(
            result.version_diff,
            Diff(expected="expected_version", actual="actual_version"),
        )
        get_user_id.assert_called_once_with(request)
        authz_service.can_read_architecture.assert_called_once_with(
            User(id="user_id"), "id"
        )
        get_environment_manager.assert_called_once_with(session)
        manager.is_in_sync.assert_called_once_with("id", "env_id")

    @patch("src.backend_orchestrator.environments_api.get_user_id")
    @patch("src.backend_orchestrator.environments_api.get_environment_manager")
    async def test_auth_error(self, get_environment_manager, get_user_id):
        # Arrange
        get_user_id.return_value = "user_id"
        authz_service = MagicMock()
        authz_service.can_read_architecture = AsyncMock(return_value=False)
        request = MagicMock()
        session = MagicMock()

        # Act & Assert
        with self.assertRaises(AuthError):
            await env_in_sync(request, "id", "env_id", session, authz_service)

        get_user_id.assert_called_once_with(request)
        authz_service.can_read_architecture.assert_called_once_with(
            User(id="user_id"), "id"
        )
        get_environment_manager.assert_not_called()

    @patch("src.backend_orchestrator.environments_api.get_user_id")
    @patch("src.backend_orchestrator.environments_api.get_environment_manager")
    async def test_environment_tracking_error(
        self, get_environment_manager, get_user_id
    ):
        # Arrange
        get_user_id.return_value = "user_id"
        authz_service = MagicMock()
        authz_service.can_read_architecture = AsyncMock(return_value=True)
        manager = MagicMock()
        manager.is_in_sync = AsyncMock(
            side_effect=EnvironmentTrackingError("expected_id", "actual_id")
        )
        get_environment_manager.return_value = manager
        request = MagicMock()
        session = MagicMock()

        # Act
        result = await env_in_sync(request, "id", "env_id", session, authz_service)

        # Assert
        self.assertEqual(result.in_sync, False)
        self.assertEqual(
            result.env_diff, Diff(expected="expected_id", actual="actual_id")
        )
        get_user_id.assert_called_once_with(request)
        authz_service.can_read_architecture.assert_called_once_with(
            User(id="user_id"), "id"
        )
        get_environment_manager.assert_called_once_with(session)
        manager.is_in_sync.assert_called_once_with("id", "env_id")

    @patch("src.backend_orchestrator.environments_api.get_user_id")
    @patch("src.backend_orchestrator.environments_api.get_environment_manager")
    async def test_environment_not_tracked_error(
        self, get_environment_manager, get_user_id
    ):
        # Arrange
        get_user_id.return_value = "user_id"
        authz_service = MagicMock()
        authz_service.can_read_architecture = AsyncMock(return_value=True)
        manager = MagicMock()
        manager.is_in_sync = AsyncMock(side_effect=EnvironmentNotTrackedError("env_id"))
        get_environment_manager.return_value = manager
        request = MagicMock()
        session = MagicMock()

        # Act
        result = await env_in_sync(request, "id", "env_id", session, authz_service)

        # Assert
        self.assertEqual(result.in_sync, False)
        self.assertEqual(result.env_diff, Diff(expected="env_id", actual=None))
        get_user_id.assert_called_once_with(request)
        authz_service.can_read_architecture.assert_called_once_with(
            User(id="user_id"), "id"
        )
        get_environment_manager.assert_called_once_with(session)
        manager.is_in_sync.assert_called_once_with("id", "env_id")
