from unittest import mock
import aiounittest
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi import HTTPException
from src.environment_management.environment_manager import (
    EnvironmentTrackingError,
    EnvironmentNotTrackedError,
)
from src.auth_service.token import AuthError
from src.backend_orchestrator.environments_api import (
    ExpectedDiff,
    env_in_sync,
    env_diff,
    BASE_ENV_ID,
    promote,
)
from src.auth_service.entity import User
from src.environment_management.environment_version import (
    EnvironmentVersionDoesNotExistError,
)
from src.state_manager.architecture_storage import ArchitectureStateDoesNotExistError

from src.topology.topology import Topology, TopologyDiff, DiffStatus, Diff


class TestEnvInSync(aiounittest.AsyncTestCase):
    @mock.patch(
        "src.backend_orchestrator.environments_api.get_user_id",
        new_callable=AsyncMock,
    )
    @patch("src.backend_orchestrator.environments_api.get_environment_manager")
    @patch("src.backend_orchestrator.environments_api.SessionLocal")
    @patch(
        "src.backend_orchestrator.environments_api.deps.authz_service",
        new_callable=MagicMock,
    )
    async def test_env_in_sync_happy_path_true(
        self, authz_service, session_local, get_environment_manager, get_user_id
    ):
        # Arrange
        get_user_id.return_value = "user_id"
        authz_service.can_read_architecture = AsyncMock(return_value=True)
        manager = MagicMock()
        manager.is_in_sync = AsyncMock(return_value=[True, None, None])
        get_environment_manager.return_value = manager

        request = MagicMock()
        session = MagicMock()
        session_local.begin.return_value.__aenter__.return_value = session

        # Act
        result = await env_in_sync(request, "id", "env_id")

        # Assert
        self.assertEqual(result.in_sync, True)
        get_user_id.assert_called_once_with(request)
        authz_service.can_read_architecture.assert_called_once_with(
            User(id="user_id"), "id"
        )
        get_environment_manager.assert_called_once_with(session)
        manager.is_in_sync.assert_called_once_with("id", BASE_ENV_ID, "env_id")

    @mock.patch(
        "src.backend_orchestrator.environments_api.get_user_id",
        new_callable=AsyncMock,
    )
    @patch("src.backend_orchestrator.environments_api.get_environment_manager")
    @patch("src.backend_orchestrator.environments_api.SessionLocal")
    @patch(
        "src.backend_orchestrator.environments_api.deps.authz_service",
        new_callable=MagicMock,
    )
    async def test_env_in_sync_happy_path_false(
        self, authz_service, session_local, get_environment_manager, get_user_id
    ):
        # Arrange
        get_user_id.return_value = "user_id"
        authz_service.can_read_architecture = AsyncMock(return_value=True)
        manager = MagicMock()
        manager.is_in_sync = AsyncMock(
            return_value=[False, "expected_version", "actual_version"]
        )
        get_environment_manager.return_value = manager

        request = MagicMock()
        session = MagicMock()
        session_local.begin.return_value.__aenter__.return_value = session
        # Act
        result = await env_in_sync(request, "id", "env_id")

        # Assert
        self.assertEqual(result.in_sync, False)
        self.assertEqual(
            result.version_diff,
            ExpectedDiff(expected="expected_version", actual="actual_version"),
        )
        get_user_id.assert_called_once_with(request)
        authz_service.can_read_architecture.assert_called_once_with(
            User(id="user_id"), "id"
        )
        get_environment_manager.assert_called_once_with(session)
        manager.is_in_sync.assert_called_once_with("id", BASE_ENV_ID, "env_id")

    @mock.patch(
        "src.backend_orchestrator.environments_api.get_user_id",
        new_callable=AsyncMock,
    )
    @patch("src.backend_orchestrator.environments_api.get_environment_manager")
    @patch("src.backend_orchestrator.environments_api.SessionLocal")
    @patch(
        "src.backend_orchestrator.environments_api.deps.authz_service",
        new_callable=MagicMock,
    )
    async def test_auth_error(
        self, authz_service, session_local, get_environment_manager, get_user_id
    ):
        # Arrange
        get_user_id.return_value = "user_id"
        authz_service.can_read_architecture = AsyncMock(return_value=False)
        request = MagicMock()
        session = MagicMock()

        # Act & Assert
        with self.assertRaises(AuthError):
            await env_in_sync(request, "id", "env_id")

        get_user_id.assert_called_once_with(request)
        authz_service.can_read_architecture.assert_called_once_with(
            User(id="user_id"), "id"
        )
        get_environment_manager.assert_not_called()

    @mock.patch(
        "src.backend_orchestrator.environments_api.get_user_id",
        new_callable=AsyncMock,
    )
    @patch("src.backend_orchestrator.environments_api.get_environment_manager")
    @patch("src.backend_orchestrator.environments_api.SessionLocal")
    @patch(
        "src.backend_orchestrator.environments_api.deps.authz_service",
        new_callable=MagicMock,
    )
    async def test_environment_tracking_error(
        self, authz_service, session_local, get_environment_manager, get_user_id
    ):
        # Arrange
        get_user_id.return_value = "user_id"
        authz_service.can_read_architecture = AsyncMock(return_value=True)
        manager = MagicMock()
        manager.is_in_sync = AsyncMock(
            side_effect=EnvironmentTrackingError("expected_id", "actual_id")
        )
        get_environment_manager.return_value = manager
        request = MagicMock()
        session = MagicMock()
        session_local.begin.return_value.__aenter__.return_value = session

        # Act
        result = await env_in_sync(request, "id", "env_id")

        # Assert
        self.assertEqual(result.in_sync, False)
        self.assertEqual(
            result.env_diff, ExpectedDiff(expected="expected_id", actual="actual_id")
        )
        get_user_id.assert_called_once_with(request)
        authz_service.can_read_architecture.assert_called_once_with(
            User(id="user_id"), "id"
        )
        get_environment_manager.assert_called_once_with(session)
        manager.is_in_sync.assert_called_once_with("id", BASE_ENV_ID, "env_id")

    @mock.patch(
        "src.backend_orchestrator.environments_api.get_user_id",
        new_callable=AsyncMock,
    )
    @patch("src.backend_orchestrator.environments_api.get_environment_manager")
    @patch("src.backend_orchestrator.environments_api.SessionLocal")
    @patch(
        "src.backend_orchestrator.environments_api.deps.authz_service",
        new_callable=MagicMock,
    )
    async def test_environment_not_tracked_error(
        self, authz_service, session_local, get_environment_manager, get_user_id
    ):
        # Arrange
        get_user_id.return_value = "user_id"
        authz_service.can_read_architecture = AsyncMock(return_value=True)
        manager = MagicMock()
        manager.is_in_sync = AsyncMock(side_effect=EnvironmentNotTrackedError("env_id"))
        get_environment_manager.return_value = manager
        request = MagicMock()
        session = MagicMock()
        session_local.begin.return_value.__aenter__.return_value = session

        # Act
        result = await env_in_sync(request, "id", "env_id")

        # Assert
        self.assertEqual(result.in_sync, False)
        self.assertEqual(result.env_diff, ExpectedDiff(expected="env_id", actual=None))
        get_user_id.assert_called_once_with(request)
        authz_service.can_read_architecture.assert_called_once_with(
            User(id="user_id"), "id"
        )
        get_environment_manager.assert_called_once_with(session)
        manager.is_in_sync.assert_called_once_with("id", BASE_ENV_ID, "env_id")


class TestEnvDiff(aiounittest.AsyncTestCase):
    @mock.patch(
        "src.backend_orchestrator.environments_api.get_user_id",
        new_callable=AsyncMock,
    )
    @patch("src.backend_orchestrator.environments_api.get_environment_manager")
    @patch("src.backend_orchestrator.environments_api.SessionLocal")
    @patch(
        "src.backend_orchestrator.environments_api.deps.authz_service",
        new_callable=MagicMock,
    )
    async def test_env_diff_happy_path(
        self, authz_service, session_local, get_environment_manager, get_user_id
    ):
        # Arrange
        get_user_id.return_value = "user_id"
        authz_service.can_read_architecture = AsyncMock(return_value=True)
        manager = MagicMock()
        diff = TopologyDiff(
            resources={
                "aws:api_stage:rest_api_0:api_stage-0": Diff(
                    DiffStatus.CHANGED,
                    properties={
                        "Deployment": (
                            "aws:api_deployment:rest_api_0:api_deployment-0",
                            "aws:api_deployment:rest_api_0:api_deployment-1",
                        )
                    },
                )
            }
        )
        manager.diff_environments = AsyncMock(return_value=diff)
        get_environment_manager.return_value = manager

        request = MagicMock()
        session = MagicMock()
        session_local.begin.return_value.__aenter__.return_value = session

        # Act
        result = await env_diff(request, "id", "env_id")

        # Assert
        self.assertEqual(result, diff.__dict__())
        get_user_id.assert_called_once_with(request)
        authz_service.can_read_architecture.assert_called_once_with(
            User(id="user_id"), "id"
        )
        get_environment_manager.assert_called_once_with(session)
        manager.diff_environments.assert_called_once_with("id", BASE_ENV_ID, "env_id")

    @mock.patch(
        "src.backend_orchestrator.environments_api.get_user_id",
        new_callable=AsyncMock,
    )
    @patch("src.backend_orchestrator.environments_api.get_environment_manager")
    @patch(
        "src.backend_orchestrator.environments_api.deps.authz_service",
        new_callable=MagicMock,
    )
    async def test_auth_error(
        self, authz_service, get_environment_manager, get_user_id
    ):
        # Arrange
        get_user_id.return_value = "user_id"
        authz_service.can_read_architecture = AsyncMock(return_value=False)
        request = MagicMock()

        # Act & Assert
        with self.assertRaises(AuthError):
            await env_diff(request, "id", "env_id")

        get_user_id.assert_called_once_with(request)
        authz_service.can_read_architecture.assert_called_once_with(
            User(id="user_id"), "id"
        )
        get_environment_manager.assert_not_called()

    @mock.patch(
        "src.backend_orchestrator.environments_api.get_user_id",
        new_callable=AsyncMock,
    )
    @patch("src.backend_orchestrator.environments_api.get_environment_manager")
    @patch("src.backend_orchestrator.environments_api.SessionLocal")
    @patch(
        "src.backend_orchestrator.environments_api.deps.authz_service",
        new_callable=MagicMock,
    )
    async def test_environment_version_does_not_exist_error(
        self, authz_service, session_local, get_environment_manager, get_user_id
    ):
        # Arrange
        get_user_id.return_value = "user_id"
        authz_service.can_read_architecture = AsyncMock(return_value=True)
        manager = MagicMock()
        manager.diff_environments = AsyncMock(
            side_effect=EnvironmentVersionDoesNotExistError("env_id")
        )

        get_environment_manager.return_value = manager
        request = MagicMock()
        session = MagicMock()
        session_local.begin.return_value.__aenter__.return_value = session

        # Act & Assert
        with self.assertRaises(HTTPException) as context:
            await env_diff(request, "id", "env_id")
        self.assertEqual(context.exception.status_code, 404)
        self.assertEqual(context.exception.detail, "Environment env_id not found")

        get_user_id.assert_called_once_with(request)
        authz_service.can_read_architecture.assert_called_once_with(
            User(id="user_id"), "id"
        )
        get_environment_manager.assert_called_once_with(session)
        manager.diff_environments.assert_called_once_with("id", BASE_ENV_ID, "env_id")

    @mock.patch(
        "src.backend_orchestrator.environments_api.get_user_id",
        new_callable=AsyncMock,
    )
    @patch("src.backend_orchestrator.environments_api.get_environment_manager")
    @patch("src.backend_orchestrator.environments_api.SessionLocal")
    @patch(
        "src.backend_orchestrator.environments_api.deps.authz_service",
        new_callable=MagicMock,
    )
    async def test_architecture_state_does_not_exist_error(
        self, authz_service, SessionLocal, get_environment_manager, get_user_id
    ):
        # Arrange
        get_user_id.return_value = "user_id"
        authz_service.can_read_architecture = AsyncMock(return_value=True)
        manager = MagicMock()
        manager.diff_environments = AsyncMock(
            side_effect=ArchitectureStateDoesNotExistError("env_id")
        )
        get_environment_manager.return_value = manager
        request = MagicMock()
        session = MagicMock()
        SessionLocal.begin.return_value.__aenter__.return_value = session

        # Act & Assert
        with self.assertRaises(HTTPException) as context:
            await env_diff(request, "id", "env_id")
        self.assertEqual(context.exception.status_code, 404)
        self.assertEqual(context.exception.detail, "Environment env_id state not found")

        get_user_id.assert_called_once_with(request)
        authz_service.can_read_architecture.assert_called_once_with(
            User(id="user_id"), "id"
        )
        get_environment_manager.assert_called_once_with(session)
        manager.diff_environments.assert_called_once_with("id", BASE_ENV_ID, "env_id")


class TestPromote(aiounittest.AsyncTestCase):
    @patch("src.backend_orchestrator.environments_api.get_user_id")
    @patch("src.backend_orchestrator.environments_api.get_environment_manager")
    async def test_promote_happy_path(
        self,
        get_environment_manager,
        get_user_id,
    ):
        # Arrange
        get_user_id.return_value = "user_id"
        manager = MagicMock()
        manager.promote = AsyncMock(
            return_value=(
                MagicMock(
                    architecture_id="architecture_id",
                    id="id",
                    version=1,
                    env_resource_configuration={},
                ),
                MagicMock(
                    resources_yaml="resources_yaml",
                    topology_yaml="topology_yaml",
                    config_errors_json=[{"config_errors_json": True}],
                ),
            )
        )
        get_environment_manager.return_value = manager
        request = MagicMock()
        session = MagicMock()
        authz_service = MagicMock()
        authz_service.can_write_to_architecture = AsyncMock(return_value=True)

        # Act
        result = await promote(request, "id", "env_id", session, authz_service)

        # Assert
        self.assertEqual(result.status_code, 200)
        self.assertEqual(
            result.body,
            b'{"architecture_id": "architecture_id", "id": "id", "version": 1, "state": {"resources_yaml": "resources_yaml", "topology_yaml": "topology_yaml"}, "env_resource_configuration": {}, "config_errors": [{"config_errors_json": true}]}',
        )
        get_environment_manager.assert_called_once_with(session)
        manager.promote.assert_called_once_with(
            "id", "default", "env_id", User(id="user_id")
        )
        get_user_id.assert_called_once_with(request)
        authz_service.can_write_to_architecture.assert_called_once_with(
            User(id="user_id"), "id"
        )
