from io import BytesIO
from unittest import mock


import aiounittest
from fastapi import HTTPException
from src.backend_orchestrator.iac_handler import IaCOrchestrator

from src.engine_service.engine_commands.export_iac import (
    ExportIacRequest,
    ExportIacResult,
)

from src.environment_management.models import (
    EnvironmentVersion,
    Architecture,
)

from src.engine_service.binaries.fetcher import Binary

from src.engine_service.engine_commands.run import RunEngineResult


async def read_streaming_response(response):
    content = b""
    async for chunk in response.body_iterator:
        content += chunk
    return content


class TestGetIac(aiounittest.AsyncTestCase):
    test_id = "test-id"
    test_architecture = Architecture(
        id=test_id,
        name="test-new",
        owner="test-owner",
    )
    test_env_version = EnvironmentVersion(
        architecture_id=test_id,
        id="default",
        version=0,
        version_hash="test-hash",
    )
    test_result = RunEngineResult(
        resources_yaml="test-yaml",
        topology_yaml="test-yaml",
        iac_topology="test-yaml",
    )
    iobytes = b"test-bytes"
    export_iac_result = ExportIacResult(iobytes)

    @classmethod
    def setUpClass(cls):
        cls.mock_architecture_storage = mock.Mock()
        cls.mock_ev_dao = mock.Mock()
        cls.mock_arch_dao = mock.Mock()
        cls.mock_binary_store: mock.Mock = mock.Mock()
        cls.iac_orchestrator = IaCOrchestrator(
            cls.mock_architecture_storage,
            cls.mock_arch_dao,
            cls.mock_ev_dao,
            cls.mock_binary_store,
        )

    def setUp(self):
        self.mock_architecture_storage.reset_mock()
        self.mock_ev_dao.reset_mock()
        self.mock_arch_dao.reset_mock()
        self.mock_binary_store.reset_mock()

    @mock.patch(
        "src.backend_orchestrator.iac_handler.export_iac", new_callable=mock.Mock
    )
    async def test_get_iac_no_cache(self, mock_export_iac: mock.Mock):
        self.mock_ev_dao.get_current_version = mock.AsyncMock(
            return_value=self.test_env_version
        )
        self.mock_arch_dao.get_architecture = mock.AsyncMock(
            return_value=self.test_architecture
        )
        self.mock_architecture_storage.get_iac_from_fs = mock.Mock(return_value=None)
        self.mock_architecture_storage.get_state_from_fs = mock.Mock(
            return_value=self.test_result
        )
        self.mock_architecture_storage.write_iac_to_fs = mock.Mock(
            return_value="test-location"
        )
        mock_export_iac.return_value = self.export_iac_result
        self.mock_ev_dao.update_environment_version = mock.AsyncMock()
        result = await self.iac_orchestrator.get_iac(self.test_id, self.test_id, 0)
        content = await read_streaming_response(result)
        self.assertEqual(content.decode(), self.export_iac_result.iac_bytes.decode())
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.media_type, "application/x-zip-compressed")
        self.mock_ev_dao.get_current_version.assert_called_once_with(
            self.test_id, self.test_id
        )
        self.mock_arch_dao.get_architecture.assert_called_once_with(self.test_id)
        self.mock_architecture_storage.get_iac_from_fs.assert_called_once_with(
            self.test_env_version
        )
        self.mock_architecture_storage.get_state_from_fs.assert_called_once_with(
            self.test_env_version
        )
        self.mock_architecture_storage.write_iac_to_fs.assert_called_once_with(
            self.test_env_version, self.iobytes
        )
        mock_export_iac.assert_called_once_with(
            ExportIacRequest(
                input_graph=self.test_result.resources_yaml,
                name=self.test_architecture.name,
            )
        )
        self.mock_ev_dao.update_environment_version.assert_called_once_with(
            self.test_env_version
        )
        self.mock_binary_store.ensure_binary.assert_called_once_with(Binary.IAC)

    @mock.patch(
        "src.backend_orchestrator.iac_handler.export_iac", new_callable=mock.AsyncMock
    )
    async def test_get_iac_iac_cache(
        self,
        mock_export_iac: mock.Mock,
    ):
        self.mock_ev_dao.get_current_version = mock.AsyncMock(
            return_value=self.test_env_version
        )
        self.mock_arch_dao.get_architecture = mock.AsyncMock(
            return_value=self.test_architecture
        )
        self.mock_architecture_storage.get_iac_from_fs = mock.Mock(
            return_value=self.iobytes
        )
        result = await self.iac_orchestrator.get_iac(self.test_id, self.test_id, 0)
        content = await read_streaming_response(result)
        self.assertEqual(content.decode(), self.export_iac_result.iac_bytes.decode())
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.media_type, "application/x-zip-compressed")
        self.mock_ev_dao.get_current_version.assert_called_once_with(
            self.test_id, self.test_id
        )
        self.mock_arch_dao.get_architecture.assert_called_once_with(self.test_id)
        self.mock_architecture_storage.get_iac_from_fs.assert_called_once_with(
            self.test_env_version
        )
        self.mock_architecture_storage.get_state_from_fs.assert_not_called()
        self.mock_architecture_storage.write_iac_to_fs.assert_not_called()
        mock_export_iac.assert_not_called()
        self.mock_ev_dao.update_environment_version.assert_not_called()
        self.mock_binary_store.ensure_binary.assert_not_called()

    async def test_get_iac_version_not_found(self):
        self.mock_ev_dao.get_current_version = mock.AsyncMock(return_value=None)
        self.mock_arch_dao.get_architecture = mock.AsyncMock(
            return_value=self.test_architecture
        )
        with self.assertRaises(HTTPException) as e:
            await self.iac_orchestrator.get_iac(self.test_id, self.test_id, 0)
        self.assertEqual(
            e.exception.detail,
            "No architecture exists for id test-id, environment test-id",
        )
        self.assertEqual(e.exception.status_code, 404)
        self.mock_ev_dao.get_current_version.assert_called_once_with(
            self.test_id, self.test_id
        )
        self.mock_arch_dao.get_architecture.assert_called_once_with(self.test_id)
        self.mock_architecture_storage.get_iac_from_fs.assert_not_called()
        self.mock_architecture_storage.get_state_from_fs.assert_not_called()
        self.mock_architecture_storage.write_iac_to_fs.assert_not_called()
        self.mock_ev_dao.update_environment_version.assert_not_called()
        self.mock_binary_store.ensure_binary.assert_not_called()

    async def test_get_iac_architecture_not_found(self):
        self.mock_ev_dao.get_current_version = mock.AsyncMock(
            return_value=self.test_env_version
        )
        self.mock_arch_dao.get_architecture = mock.AsyncMock(return_value=None)

        with self.assertRaises(HTTPException) as e:
            await self.iac_orchestrator.get_iac(self.test_id, self.test_id, 0)
        self.assertEqual(e.exception.status_code, 404)
        self.assertEqual(
            e.exception.detail,
            "No architecture exists for id test-id, environment test-id",
        )
        self.mock_ev_dao.get_current_version.assert_called_once_with(
            self.test_id, self.test_id
        )
        self.mock_arch_dao.get_architecture.assert_called_once_with(self.test_id)
        self.mock_architecture_storage.get_iac_from_fs.assert_not_called()
        self.mock_architecture_storage.get_state_from_fs.assert_not_called()
        self.mock_architecture_storage.write_iac_to_fs.assert_not_called()
        self.mock_ev_dao.update_environment_version.assert_not_called()
        self.mock_binary_store.ensure_binary.assert_not_called()

    async def test_get_iac_version_not_current(self):
        self.mock_ev_dao.get_current_version = mock.AsyncMock(
            return_value=self.test_env_version
        )
        self.mock_arch_dao.get_architecture = mock.AsyncMock(
            return_value=self.test_architecture
        )
        self.mock_architecture_storage.get_iac_from_fs = mock.Mock(return_value=None)
        self.mock_ev_dao.update_environment_version = mock.AsyncMock()
        with self.assertRaises(HTTPException) as e:
            await self.iac_orchestrator.get_iac(self.test_id, self.test_id, 1)
        self.assertEqual(e.exception.detail, "Environment version is not current")
        self.assertEqual(e.exception.status_code, 400)
        self.mock_ev_dao.get_current_version.assert_called_once_with(
            self.test_id, self.test_id
        )
        self.mock_arch_dao.get_architecture.assert_called_once_with(self.test_id)
        self.mock_architecture_storage.get_iac_from_fs.assert_not_called()
        self.mock_architecture_storage.get_state_from_fs.assert_not_called()
        self.mock_architecture_storage.write_iac_to_fs.assert_not_called()
        self.mock_ev_dao.update_environment_version.assert_not_called()
        self.mock_binary_store.ensure_binary.assert_not_called()

    async def test_get_iac_throw_error(self):
        self.mock_ev_dao.get_current_version = mock.AsyncMock(
            return_value=self.test_env_version
        )
        self.mock_arch_dao.get_architecture = mock.AsyncMock(
            return_value=self.test_architecture
        )
        self.mock_architecture_storage.get_iac_from_fs = mock.Mock(return_value=None)
        self.mock_architecture_storage.get_state_from_fs = mock.Mock(
            side_effect=Exception("test-error")
        )
        self.mock_ev_dao.update_environment_version = mock.AsyncMock()
        with self.assertRaises(HTTPException) as e:
            await self.iac_orchestrator.get_iac(self.test_id, self.test_id, 0)
        self.assertEqual(e.exception.detail, "internal server error")
        self.assertEqual(e.exception.status_code, 500)
        self.mock_ev_dao.get_current_version.assert_called_once_with(
            self.test_id, self.test_id
        )
        self.mock_arch_dao.get_architecture.assert_called_once_with(self.test_id)
        self.mock_architecture_storage.get_iac_from_fs.assert_called_once_with(
            self.test_env_version
        )
        self.mock_architecture_storage.get_state_from_fs.assert_called_once_with(
            self.test_env_version
        )
        self.mock_architecture_storage.write_iac_to_fs.assert_not_called()
        self.mock_ev_dao.update_environment_version.assert_not_called()
        self.mock_binary_store.ensure_binary.assert_not_called()
