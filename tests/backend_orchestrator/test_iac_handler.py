from io import BytesIO
from unittest import mock

import aiounittest
from fastapi.responses import StreamingResponse
from starlette.concurrency import iterate_in_threadpool

from src.backend_orchestrator.iac_handler import copilot_get_iac
from src.engine_service.engine_commands.export_iac import (
    ExportIacResult,
    ExportIacRequest,
)
from src.engine_service.engine_commands.run import RunEngineResult
from src.state_manager.architecture_data import Architecture


class TestGetIac(aiounittest.AsyncTestCase):
    test_id = "test-id"
    test_architecture = Architecture(
        id=test_id,
        name="test-new",
        state=0,
        constraints={},
        owner="test-owner",
        created_at=mock.ANY,
        updated_by="test-owner",
        engine_version=0.0,
    )
    test_result = RunEngineResult(
        resources_yaml="test-yaml",
        topology_yaml="test-yaml",
        iac_topology="test-yaml",
    )
    iobytes = BytesIO(b"test-bytes")
    export_iac_result = ExportIacResult(iobytes)

    @mock.patch(
        "src.backend_orchestrator.iac_handler.add_architecture",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.iac_handler.write_iac_to_fs",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.iac_handler.export_iac", new_callable=mock.AsyncMock
    )
    @mock.patch(
        "src.backend_orchestrator.iac_handler.get_state_from_fs",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.iac_handler.get_iac_from_fs",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.iac_handler.get_architecture_current",
        new_callable=mock.AsyncMock,
    )
    async def test_get_iac_no_iac(
        self,
        mock_get_architecture_current: mock.Mock,
        mock_get_iac: mock.Mock,
        mock_get_state: mock.Mock,
        mock_export_iac: mock.Mock,
        mock_write_iac: mock.Mock,
        mock_add: mock.Mock,
    ):
        mock_get_architecture_current.return_value = self.test_architecture
        mock_get_iac.return_value = None
        mock_get_state.return_value = self.test_result
        mock_export_iac.return_value = self.export_iac_result
        mock_write_iac.return_value = "test-location"

        result: StreamingResponse = await copilot_get_iac(self.test_id, 0)
        mock_get_iac.assert_called_once_with(self.test_architecture)
        mock_get_state.assert_called_once_with(self.test_architecture)
        mock_export_iac.assert_called_once_with(
            ExportIacRequest(
                input_graph=self.test_result.resources_yaml,
                name=self.test_architecture.name,
            )
        )
        mock_write_iac.assert_called_once_with(self.test_architecture, self.iobytes)
        mock_add.assert_called_once()
        self.test_architecture.iac_location = "test-location"
        self.assertEqual(mock_add.call_args.args[0], self.test_architecture)
        response_body = [section async for section in result.body_iterator]
        result.body_iterator = iterate_in_threadpool(iter(response_body))
        self.assertEqual(result.media_type, "application/x-zip-compressed")
        self.assertEqual(result.status_code, 200)
        self.assertEqual(response_body, [b"test-bytes"])
