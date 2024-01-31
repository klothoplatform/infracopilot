from io import BytesIO
from unittest import mock
from unittest.mock import Mock
import jsons
from src.engine_service.engine_commands.run import RunEngineResult
from src.state_manager.architecture_storage import (
    ArchitectureStorage,
    ArchitectureStateDoesNotExistError,
    WriteIacError,
    WriteStateError,
)
from src.environment_management.models import (
    EnvironmentVersion,
)
from src.engine_service.engine_commands.run import (
    RunEngineResult,
)
import aiounittest
import os
import shutil
import datetime


class TestArchitectureStore(aiounittest.AsyncTestCase):
    mock_s3: mock.Mock

    @classmethod
    def setUpClass(self):
        self.test_env = EnvironmentVersion(
            architecture_id="test-architecture-id",
            id="test-id",
            version=0,
            version_hash="test-hash",
            env_resource_configuration={},
            state_location="test-state-location",
            iac_location="test-iac-location",
            created_by="user:test-owner",
            created_at=datetime.datetime.fromisoformat("2011-11-04"),
            constraints={},
        )
        self.test_content = RunEngineResult(
            resources_yaml="resources_yaml",
            topology_yaml="topology_yaml",
            iac_topology="iac_topology",
        )

        self.mock_s3: mock.Mock = Mock()
        self.arch_storage = ArchitectureStorage(self.mock_s3)
        path = (
            f"{ArchitectureStorage.get_path_for_architecture(self.test_env)}/state.json"
        )
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as file:
            file.write(jsons.dumps(self.test_content))
        self.test_env.state_location = path
        iac_path = (
            f"{ArchitectureStorage.get_path_for_architecture(self.test_env)}/iac.zip"
        )
        with open(iac_path, "wb") as file:
            file.write(BytesIO(b"test-content").getbuffer())
        self.test_env.iac_location = iac_path

    @classmethod
    def tearDownClass(self):
        shutil.rmtree(ArchitectureStorage.get_path_for_architecture(self.test_env))

    def setUp(self) -> None:
        self.mock_s3.reset_mock()

    @mock.patch(
        "src.state_manager.architecture_storage.get_object",
        new_callable=mock.Mock,
    )
    async def test_can_get_architecture_state(self, get_object_mock: mock.Mock):
        get_object_mock.return_value = jsons.dumps(self.test_content)
        mock_object = Mock()
        self.mock_s3.Object.return_value = mock_object
        result = self.arch_storage.get_state_from_fs(self.test_env)
        self.assertEqual(result, self.test_content)
        self.mock_s3.Object.assert_called_once_with(self.test_env.state_location)
        get_object_mock.assert_called_once_with(mock_object)

    @mock.patch(
        "src.state_manager.architecture_storage.get_object",
        new_callable=mock.Mock,
    )
    async def test_get_architecture_raises_error_if_architecture_does_not_exist(
        self, get_object_mock: mock.Mock
    ):
        mock_object = Mock()
        self.mock_s3.Object.return_value = mock_object
        get_object_mock.side_effect = ArchitectureStateDoesNotExistError()
        with self.assertRaises(ArchitectureStateDoesNotExistError):
            self.arch_storage.get_state_from_fs(
                EnvironmentVersion(
                    architecture_id="test-architecture-id",
                    id="test-id",
                    version=1,
                    version_hash="test-hash",
                    env_resource_configuration={},
                    state_location="test-state-location",
                    iac_location="test-iac-location",
                    created_by="user:test-owner",
                    created_at=datetime.datetime.fromisoformat("2011-11-04"),
                    constraints={},
                )
            )

    @mock.patch(
        "src.state_manager.architecture_storage.put_object",
        new_callable=mock.Mock,
    )
    async def test_can_write_architecture_state(self, put_object_mock: mock.Mock):
        mock_object = Mock()
        self.mock_s3.Object.return_value = mock_object
        self.arch_storage.write_state_to_fs(self.test_env, self.test_content)
        put_object_mock.assert_called_once_with(
            self.mock_s3.Object.return_value,
            bytes(jsons.dumps(self.test_content), "utf-8"),
        )
        self.mock_s3.Object.assert_called_once_with(
            "state/test-architecture-id/test-id/0/state.json"
        )

    @mock.patch(
        "src.state_manager.architecture_storage.put_object",
        new_callable=mock.Mock,
    )
    async def test_write_architecture_state_raises_error_if_content_is_not_run_engine_result(
        self, put_object_mock: mock.Mock
    ):
        mock_object = Mock()
        self.mock_s3.Object.return_value = mock_object
        with self.assertRaises(WriteStateError):
            self.arch_storage.write_state_to_fs(self.test_env, "test-content")

    @mock.patch(
        "src.state_manager.architecture_storage.get_object",
        new_callable=mock.Mock,
    )
    async def test_can_get_iac(self, get_object_mock: mock.Mock):
        mock_object = Mock()
        self.mock_s3.Object.return_value = mock_object
        get_object_mock.return_value = b"test-content"
        result = self.arch_storage.get_iac_from_fs(self.test_env)
        self.assertEqual(result, b"test-content")
        self.mock_s3.Object.assert_called_once_with(self.test_env.iac_location)
        get_object_mock.assert_called_once_with(mock_object)

    @mock.patch(
        "src.state_manager.architecture_storage.get_object",
        new_callable=mock.Mock,
    )
    async def test_can_get_iac_from_string(self, get_object_mock: mock.Mock):
        mock_object = Mock()
        self.mock_s3.Object.return_value = mock_object
        get_object_mock.return_value = "test-content"
        result = self.arch_storage.get_iac_from_fs(self.test_env)
        self.assertEqual(result, b"test-content")
        self.mock_s3.Object.assert_called_once_with(self.test_env.iac_location)
        get_object_mock.assert_called_once_with(mock_object)

    @mock.patch(
        "src.state_manager.architecture_storage.get_object",
        new_callable=mock.Mock,
    )
    async def test_get_iac_raises_error_if_architecture_does_not_exist(
        self, get_object_mock: mock.Mock
    ):
        mock_object = Mock()
        self.mock_s3.Object.return_value = mock_object
        get_object_mock.side_effect = ArchitectureStateDoesNotExistError()
        with self.assertRaises(ArchitectureStateDoesNotExistError):
            self.arch_storage.get_iac_from_fs(
                EnvironmentVersion(
                    architecture_id="test-architecture-id",
                    id="test-id",
                    version=1,
                    version_hash="test-hash",
                    env_resource_configuration={},
                    state_location="test-state-location",
                    iac_location="test-iac-location",
                    created_by="user:test-owner",
                    created_at=datetime.datetime.fromisoformat("2011-11-04"),
                    constraints={},
                )
            )

    @mock.patch(
        "src.state_manager.architecture_storage.put_object",
        new_callable=mock.Mock,
    )
    async def test_can_write_iac(self, put_object_mock: mock.Mock):
        mock_object = Mock()
        self.mock_s3.Object.return_value = mock_object
        content = b"test-content"
        self.arch_storage.write_iac_to_fs(self.test_env, content)
        put_object_mock.assert_called_once_with(
            self.mock_s3.Object.return_value,
            content,
        )
        self.mock_s3.Object.assert_called_once_with(
            "state/test-architecture-id/test-id/0/iac.zip"
        )

    @mock.patch(
        "src.state_manager.architecture_storage.put_object",
        new_callable=mock.Mock,
    )
    async def test_write_iac_raises_error_if_content_is_not_bytes(
        self, put_object_mock: mock.Mock
    ):
        mock_object = Mock()
        self.mock_s3.Object.return_value = mock_object
        with self.assertRaises(WriteIacError):
            self.arch_storage.write_iac_to_fs(self.test_env, "test-content")

    @mock.patch(
        "src.state_manager.architecture_storage.delete_objects",
        new_callable=mock.Mock,
    )
    async def test_can_delete_architecture_version(
        self, delete_objects_mock: mock.Mock
    ):
        self.arch_storage.delete_state_from_fs(self.test_env)
        delete_objects_mock.assert_called_once_with(
            self.mock_s3,
            [
                "state/test-architecture-id/test-id/0/state.json",
                "state/test-architecture-id/test-id/0/iac.zip",
            ],
        )
