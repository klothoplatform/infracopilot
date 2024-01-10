from cgi import test
from datetime import date
import datetime
from venv import create
import aiounittest
from unittest import mock
from fastapi import HTTPException

from fastapi.responses import JSONResponse

from src.backend_orchestrator.architecture_handler import (
    ArchitectureHandler,
    CreateArchitectureRequest,
)

from src.engine_service.engine_commands.run import RunEngineResult
from src.environment_management.architecture import (
    Architecture,
    ArchitectureDoesNotExistError,
)
from src.environment_management.environment import EnvironmentDoesNotExistError
from src.environment_management.environment_version import (
    EnvironmentVersionDoesNotExistError,
)
from src.environment_management.models import Environment, EnvironmentVersion
from src.util.entity import User


class TestArchitectureHandler(aiounittest.AsyncTestCase):
    @classmethod
    def setUpClass(cls):
        test_id = "test-id"
        cls.created_at = datetime.datetime.fromtimestamp(1320382800.0)
        cls.test_architecture = Architecture(
            id=test_id,
            name="test-new",
            owner="test-owner",
            created_at=cls.created_at,
        )
        cls.test_environment = Environment(
            architecture_id=test_id,
            id="default",
            current=0,
            tags=[],
        )
        cls.test_environment_version = EnvironmentVersion(
            architecture_id=test_id,
            id="default",
            version=0,
            version_hash="test-hash",
        )
        cls.test_result = RunEngineResult(
            resources_yaml="test-yaml",
            topology_yaml="test-yaml",
            iac_topology="test-yaml",
        )

        cls.mock_store = mock.MagicMock()
        cls.mock_ev_dao = mock.MagicMock()
        cls.mock_env_dao = mock.MagicMock()
        cls.mock_arch_dao = mock.MagicMock()
        cls.arch_handler = ArchitectureHandler(
            cls.mock_store,
            cls.mock_ev_dao,
            cls.mock_env_dao,
            cls.mock_arch_dao,
        )

    def setUp(self):
        self.mock_store.reset_mock()
        self.mock_ev_dao.reset_mock()
        self.mock_env_dao.reset_mock()
        self.mock_arch_dao.reset_mock()

    @mock.patch(
        "src.backend_orchestrator.architecture_handler.datetime",
        new_callable=mock.Mock,
    )
    @mock.patch(
        "src.backend_orchestrator.architecture_handler.uuid",
        new_callable=mock.Mock,
    )
    async def test_new_architecture(
        self,
        mock_uuid: mock.Mock,
        mock_datetime: mock.Mock,
    ):
        request = CreateArchitectureRequest(
            name="test-new",
            engine_version=0.0,
        )
        user = User("test-user")
        owner = User("test-owner")
        id = "test-id"
        test_hash = "hash"
        mock_datetime.utcnow.return_value = self.created_at
        mock_uuid.uuid4.return_value = test_hash
        result = await self.arch_handler.new_architecture(
            request, user.to_auth_string(), owner, id
        )
        self.assertEqual(result.body, b'{"id":"test-id"}')
        self.assertEqual(result.status_code, 200)
        self.mock_arch_dao.add_architecture.assert_called_once_with(
            Architecture(
                id=id,
                name="test-new",
                owner="user:test-owner",
                created_at=self.created_at,
            )
        )
        self.mock_env_dao.add_environment.assert_called_once_with(
            Environment(
                architecture_id=id,
                id="default",
                current=0,
                tags=[],
            )
        )
        self.mock_ev_dao.add_environment_version.assert_called_once_with(
            EnvironmentVersion(
                architecture_id=id,
                id="default",
                version=0,
                version_hash=test_hash,
                created_by=user.to_auth_string(),
                created_at=self.created_at,
            )
        )

    async def test_get_architecture(self):
        self.mock_arch_dao.get_architecture = mock.AsyncMock(
            return_value=self.test_architecture
        )
        result = await self.arch_handler.get_architecture("test-id")
        self.assertEqual(
            result.body,
            b'{"id":"test-id","name":"test-new","owner":"test-owner","created_at":1320382800.0}',
        )
        self.assertEqual(result.status_code, 200)
        self.mock_arch_dao.get_architecture.assert_called_once_with("test-id")

    async def test_get_architecture_not_found(self):
        self.mock_arch_dao.get_architecture = mock.AsyncMock(return_value=None)
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.get_architecture("test-id")
        self.assertEqual(e.exception.detail, "Architecture not found")
        self.assertEqual(e.exception.status_code, 404)
        self.mock_arch_dao.get_architecture.assert_called_once_with("test-id")

    async def test_get_architecture_causes_error(self):
        self.mock_arch_dao.get_architecture = mock.AsyncMock(side_effect=Exception)
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.get_architecture("test-id")
        self.assertEqual(e.exception.detail, "internal server error")
        self.assertEqual(e.exception.status_code, 500)
        self.mock_arch_dao.get_architecture.assert_called_once_with("test-id")

    async def test_delete_architecture(self):
        self.mock_arch_dao.delete_architecture = mock.AsyncMock(return_value=None)
        result = await self.arch_handler.delete_architecture("test-id")
        self.assertEqual(result.body, b"")
        self.assertEqual(result.status_code, 200)
        self.mock_arch_dao.delete_architecture.assert_called_once_with("test-id")

    async def test_delete_architecture_causes_error(self):
        self.mock_arch_dao.delete_architecture = mock.AsyncMock(side_effect=Exception)
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.delete_architecture("test-id")
        self.assertEqual(e.exception.detail, "internal server error")
        self.assertEqual(e.exception.status_code, 500)
        self.mock_arch_dao.delete_architecture.assert_called_once_with("test-id")

    async def test_get_version(self):
        self.mock_ev_dao.get_current_version = mock.AsyncMock(
            return_value=self.test_environment_version
        )
        self.mock_store.get_state_from_fs = mock.Mock(return_value=self.test_result)
        result = await self.arch_handler.get_version("test-id", "default")
        self.assertEqual(
            result.body,
            b'"{\\"architecture_id\\": \\"test-id\\", \\"id\\": \\"default\\", \\"version\\": 0, \\"state\\": {\\"resources_yaml\\": \\"test-yaml\\", \\"topology_yaml\\": \\"test-yaml\\"}, \\"env_resource_configuration\\": {}, \\"config_errors\\": []}"',
        )
        self.assertEqual(result.status_code, 200)
        self.mock_ev_dao.get_current_version.assert_called_once_with(
            "test-id", "default"
        )
        self.mock_store.get_state_from_fs.assert_called_once_with(
            self.test_environment_version
        )

    async def test_get_version_not_found(self):
        self.mock_ev_dao.get_current_version = mock.AsyncMock(return_value=None)
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.get_version("test-id", "default")
        self.assertEqual(
            e.exception.detail, "No environment default exists for architecture test-id"
        )
        self.assertEqual(e.exception.status_code, 404)
        self.mock_ev_dao.get_current_version.assert_called_once_with(
            "test-id", "default"
        )

    async def test_get_version_causes_error(self):
        self.mock_ev_dao.get_current_version = mock.AsyncMock(side_effect=Exception)
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.get_version("test-id", "default")
        self.assertEqual(e.exception.detail, "internal server error")
        self.assertEqual(e.exception.status_code, 500)
        self.mock_ev_dao.get_current_version.assert_called_once_with(
            "test-id", "default"
        )

    async def test_get_environments_previous_state(self):
        self.mock_ev_dao.get_previous_state = mock.AsyncMock(
            return_value=self.test_environment_version
        )
        self.mock_store.get_state_from_fs = mock.Mock(return_value=self.test_result)
        result = await self.arch_handler.get_environments_previous_state(
            "test-id", "default", 1
        )
        self.assertEqual(
            result.body,
            b'"{\\"architecture_id\\": \\"test-id\\", \\"id\\": \\"default\\", \\"version\\": 0, \\"state\\": {\\"resources_yaml\\": \\"test-yaml\\", \\"topology_yaml\\": \\"test-yaml\\"}, \\"env_resource_configuration\\": {}, \\"config_errors\\": []}"',
        )
        self.assertEqual(result.status_code, 200)
        self.mock_ev_dao.get_previous_state.assert_called_once_with(
            "test-id", "default", 1
        )
        self.mock_store.get_state_from_fs.assert_called_once_with(
            self.test_environment_version
        )

    async def test_get_environments_previous_state_not_found(self):
        self.mock_ev_dao.get_previous_state = mock.AsyncMock(
            side_effect=EnvironmentVersionDoesNotExistError
        )
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.get_environments_previous_state(
                "test-id", "default", 1
            )
        self.assertEqual(
            e.exception.detail,
            "Previous state not found for architecture test-id environment default version 1",
        )
        self.assertEqual(e.exception.status_code, 404)
        self.mock_ev_dao.get_previous_state.assert_called_once_with(
            "test-id", "default", 1
        )

    async def test_get_environments_next_state(self):
        self.mock_ev_dao.get_next_state = mock.AsyncMock(
            return_value=self.test_environment_version
        )
        self.mock_store.get_state_from_fs = mock.Mock(return_value=self.test_result)
        result = await self.arch_handler.get_environments_next_state(
            "test-id", "default", 1
        )
        self.assertEqual(
            result.body,
            b'"{\\"architecture_id\\": \\"test-id\\", \\"id\\": \\"default\\", \\"version\\": 0, \\"state\\": {\\"resources_yaml\\": \\"test-yaml\\", \\"topology_yaml\\": \\"test-yaml\\"}, \\"env_resource_configuration\\": {}, \\"config_errors\\": []}"',
        )
        self.assertEqual(result.status_code, 200)
        self.mock_ev_dao.get_next_state.assert_called_once_with("test-id", "default", 1)
        self.mock_store.get_state_from_fs.assert_called_once_with(
            self.test_environment_version
        )

    async def test_get_environments_next_state_not_found(self):
        self.mock_ev_dao.get_next_state = mock.AsyncMock(
            side_effect=EnvironmentVersionDoesNotExistError
        )
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.get_environments_next_state("test-id", "default", 1)
        self.assertEqual(
            e.exception.detail,
            "Architecture next state not found for architecture test-id environment default version 1",
        )
        self.assertEqual(e.exception.status_code, 404)
        self.mock_ev_dao.get_next_state.assert_called_once_with("test-id", "default", 1)

    async def test_set_current_version(self):
        self.mock_env_dao.set_current_version = mock.AsyncMock(return_value=None)
        result = await self.arch_handler.set_current_version("test-id", "default", 1)
        self.assertEqual(result.body, b"")
        self.assertEqual(result.status_code, 200)
        self.mock_env_dao.set_current_version.assert_called_once_with(
            "test-id", "default", 1
        )

    async def test_set_current_version_not_found(self):
        self.mock_env_dao.set_current_version = mock.AsyncMock(
            side_effect=EnvironmentDoesNotExistError
        )
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.set_current_version("test-id", "default", 1)
        self.assertEqual(
            e.exception.detail,
            "Environment, default, not found for architecture, test-id",
        )
        self.assertEqual(e.exception.status_code, 404)
        self.mock_env_dao.set_current_version.assert_called_once_with(
            "test-id", "default", 1
        )

    async def test_set_current_version_causes_error(self):
        self.mock_env_dao.set_current_version = mock.AsyncMock(side_effect=Exception)
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.set_current_version("test-id", "default", 1)
        self.assertEqual(e.exception.detail, "internal server error")
        self.assertEqual(e.exception.status_code, 500)
        self.mock_env_dao.set_current_version.assert_called_once_with(
            "test-id", "default", 1
        )

    async def test_rename_architecture(self):
        self.mock_arch_dao.get_architecture = mock.AsyncMock(
            return_value=self.test_architecture
        )
        self.mock_arch_dao.update_architecture = mock.AsyncMock(return_value=None)
        result = await self.arch_handler.rename_architecture("test-id", "new-name")
        self.assertEqual(
            result.body,
            b'{"id":"test-id","name":"new-name","owner":"test-owner","created_at":1320382800.0}',
        )
        self.assertEqual(result.status_code, 200)
        self.mock_arch_dao.get_architecture.assert_called_once_with("test-id")
        self.mock_arch_dao.update_architecture.assert_called_once_with(
            Architecture(
                id="test-id",
                name="new-name",
                owner="test-owner",
                created_at=self.created_at,
            )
        )

    async def test_rename_architecture_not_found(self):
        self.mock_arch_dao.get_architecture = mock.AsyncMock(return_value=None)
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.rename_architecture("test-id", "new-name")
        self.assertEqual(e.exception.detail, "Architecture not found")
        self.assertEqual(e.exception.status_code, 404)
        self.mock_arch_dao.get_architecture.assert_called_once_with("test-id")

    async def test_rename_architecture_causes_error(self):
        self.mock_arch_dao.get_architecture = mock.AsyncMock(side_effect=Exception)
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.rename_architecture("test-id", "new-name")
        self.assertEqual(e.exception.detail, "internal server error")
        self.assertEqual(e.exception.status_code, 500)
        self.mock_arch_dao.get_architecture.assert_called_once_with("test-id")

    async def test_list_architectures(self):
        self.mock_arch_dao.get_architectures_by_owner = mock.AsyncMock(
            return_value=[self.test_architecture]
        )
        result = await self.arch_handler.list_architectures("test-owner")
        self.assertEqual(
            result.body,
            b'{"architectures":[{"id":"test-id","name":"test-new","owner":"test-owner","created_at":1320382800.0}]}',
        )
        self.assertEqual(result.status_code, 200)
        self.mock_arch_dao.get_architectures_by_owner.assert_called_once_with(
            User("test-owner")
        )

    async def test_list_architectures_causes_error(self):
        self.mock_arch_dao.get_architectures_by_owner = mock.AsyncMock(
            side_effect=Exception
        )
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.list_architectures("test-owner")
        self.assertEqual(e.exception.detail, "internal server error")
        self.assertEqual(e.exception.status_code, 500)
        self.mock_arch_dao.get_architectures_by_owner.assert_called_once_with(
            User("test-owner")
        )

    @mock.patch(
        "src.backend_orchestrator.architecture_handler.add_architecture_owner",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.architecture_handler.datetime",
        new_callable=mock.Mock,
    )
    @mock.patch(
        "src.backend_orchestrator.architecture_handler.uuid",
        new_callable=mock.Mock,
    )
    async def test_clone_architecture(
        self,
        mock_uuid: mock.Mock,
        mock_datetime: mock.Mock,
        mock_add_architecture_owner: mock.AsyncMock,
    ):
        test_hash = "hash"
        mock_datetime.utcnow.return_value = self.created_at
        mock_uuid.uuid4.return_value = test_hash
        self.mock_arch_dao.get_architecture = mock.AsyncMock(
            return_value=self.test_architecture
        )
        self.mock_arch_dao.add_architecture = mock.Mock(return_value=None)
        self.mock_env_dao.get_environments_for_architecture = mock.AsyncMock(
            return_value=[self.test_environment]
        )
        self.mock_env_dao.add_environment = mock.Mock(return_value=None)
        self.mock_ev_dao.list_environment_versions = mock.AsyncMock(
            return_value=[self.test_environment_version]
        )
        self.mock_ev_dao.add_environment_version = mock.Mock(return_value=None)
        self.mock_store.get_state_from_fs = mock.Mock(return_value=self.test_result)
        self.mock_store.write_state_to_fs = mock.Mock(return_value="location")
        mock_add_architecture_owner.return_value = None
        result = await self.arch_handler.clone_architecture(
            "test-owner", "test-id", "new-name", "test-owner"
        )
        self.assertEqual(result.body, b'{"id":"hash"}')
        self.assertEqual(result.status_code, 200)
        self.mock_arch_dao.get_architecture.assert_called_once_with("test-id")
        self.mock_arch_dao.add_architecture.assert_called_once_with(
            Architecture(
                id=test_hash,
                name="new-name",
                owner="user:test-owner",
                created_at=self.created_at,
            )
        )
        mock_add_architecture_owner.assert_called_once_with(User("test-owner"), "hash")
        self.mock_env_dao.add_environment.assert_called_once_with(
            Environment(
                architecture_id=test_hash,
                id="default",
                current=0,
                tags=[],
            )
        )
        self.mock_env_dao.get_environments_for_architecture.assert_called_once_with(
            "test-id"
        )
        self.mock_store.get_state_from_fs.assert_called_once_with(
            self.test_environment_version
        )
        v = EnvironmentVersion(
            architecture_id=test_hash,
            id="default",
            version=0,
            version_hash="test-hash",
            state_location="location",
        )
        self.mock_store.write_state_to_fs.assert_called_once_with(v, self.test_result)
        self.mock_ev_dao.list_environment_versions.assert_called_once_with(
            "test-id", "default"
        )
        self.mock_ev_dao.add_environment_version.assert_called_once_with(v)

    async def test_clone_architecture_not_found(self):
        self.mock_arch_dao.get_architecture = mock.AsyncMock(
            side_effect=ArchitectureDoesNotExistError
        )
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.clone_architecture(
                "test-owner", "test-id", "new-name", "test-owner"
            )
        self.assertEqual(e.exception.detail, "Architecture not found")
        self.assertEqual(e.exception.status_code, 404)
        self.mock_arch_dao.get_architecture.assert_called_once_with("test-id")

    async def test_clone_architecture_causes_error(self):
        self.mock_arch_dao.get_architecture = mock.AsyncMock(side_effect=Exception)
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.clone_architecture(
                "test-owner", "test-id", "new-name", "test-owner"
            )
        self.assertEqual(e.exception.detail, "internal server error")
        self.assertEqual(e.exception.status_code, 500)
        self.mock_arch_dao.get_architecture.assert_called_once_with("test-id")
