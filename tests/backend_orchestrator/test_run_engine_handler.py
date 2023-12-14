from io import BytesIO
from pathlib import Path, PosixPath
import aiounittest
import tempfile
import shutil
import jsons
from unittest import mock

from fastapi.responses import JSONResponse, StreamingResponse
from starlette.concurrency import iterate_in_threadpool


from src.backend_orchestrator.run_engine_handler import copilot_run, CopilotRunRequest
from src.state_manager.architecture_data import Architecture
from src.engine_service.engine_commands.run import RunEngineResult, RunEngineRequest


class TestArchitectureRun(aiounittest.AsyncTestCase):
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
    test_architecture_1 = Architecture(
        id=test_id,
        name="test-new",
        state=1,
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
    test_constraints = [{"scope": "application"}]

    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.write_state_to_fs",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.run_engine",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.get_guardrails",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.add_architecture",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.get_state_from_fs",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.get_architecture_current",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.get_architecture_latest",
        new_callable=mock.AsyncMock,
    )
    async def test_run_engine(
        self,
        mock_get_architecture_latest: mock.Mock,
        mock_get_architecture_current: mock.Mock,
        mock_get_state: mock.Mock,
        mock_add: mock.Mock,
        mock_get_guardrails: mock.Mock,
        mock_run_engine: mock.Mock,
        mock_write_state_to_fs: mock.Mock,
    ):
        mock_get_architecture_current.return_value = self.test_architecture
        mock_get_state.return_value = self.test_result
        mock_get_architecture_latest.return_value = self.test_architecture
        mock_get_guardrails.return_value = None
        mock_run_engine.return_value = self.test_result
        mock_add.return_value = None
        mock_write_state_to_fs.return_value = "test-location"

        requset = CopilotRunRequest(constraints=self.test_constraints)

        result: StreamingResponse = await copilot_run(self.test_id, 0, requset)
        mock_get_architecture_current.assert_called_once_with(self.test_id)
        mock_get_guardrails.assert_called_once_with(self.test_architecture.owner)
        mock_get_state.assert_called_once_with(self.test_architecture)
        mock_run_engine.assert_called_once_with(
            RunEngineRequest(
                id=self.test_id,
                input_graph=self.test_result.resources_yaml,
                templates=[],
                engine_version=1.0,
                constraints=self.test_constraints,
                guardrails=None,
            )
        )
        mock_add.assert_called_once()
        mock_get_architecture_latest.assert_called_once()
        mock_write_state_to_fs.assert_called_once()
        self.assertEqual(mock_write_state_to_fs.call_args.args[0].id, self.test_id)
        self.assertEqual(mock_write_state_to_fs.call_args.args[1], self.test_result)
        self.test_architecture.state = 1
        self.test_architecture.state_location = mock.ANY
        self.assertEqual(mock_add.call_args.args[0].state, 1)
        self.assertEqual(mock_add.call_args.args[0].state_location, "test-location")
        response = jsons.loads(result.body.decode("utf-8"))
        self.assertEqual(result.status_code, 200)
        self.assertEqual(
            response["state"],
            {
                "resources_yaml": self.test_result.resources_yaml,
                "topology_yaml": self.test_result.topology_yaml,
            },
        )

    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.write_state_to_fs",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.run_engine",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.get_guardrails",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.add_architecture",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.get_state_from_fs",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.get_architecture_current",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.get_architecture_latest",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.get_architecture_at_state",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.delete_future_states",
        new_callable=mock.AsyncMock,
    )
    async def test_run_engine_overwrite(
        self,
        mock_delete_future_states: mock.Mock,
        mock_get_architecture_at_state: mock.Mock,
        mock_get_architecture_latest: mock.Mock,
        mock_get_architecture_current: mock.Mock,
        mock_get_state: mock.Mock,
        mock_add: mock.Mock,
        mock_get_guardrails: mock.Mock,
        mock_run_engine: mock.Mock,
        mock_write_state_to_fs: mock.Mock,
    ):
        mock_get_architecture_current.return_value = self.test_architecture_1
        mock_get_architecture_at_state.return_value = self.test_architecture
        mock_get_architecture_latest.return_value = Architecture(
            id=self.test_id,
            name="test-new",
            state=10,
            constraints={},
            owner="test-owner",
            created_at=mock.ANY,
            updated_by="test-owner",
            engine_version=0.0,
        )

        mock_delete_future_states.return_value = None
        mock_get_state.return_value = self.test_result
        mock_get_guardrails.return_value = None
        mock_run_engine.return_value = self.test_result
        mock_add.return_value = None
        mock_write_state_to_fs.return_value = "test-location"

        requset = CopilotRunRequest(constraints=self.test_constraints, overwrite=True)

        result: StreamingResponse = await copilot_run(self.test_id, 0, requset)
        mock_get_architecture_current.assert_called_once_with(self.test_id)
        mock_get_guardrails.assert_called_once_with(self.test_architecture.owner)
        mock_get_state.assert_called_once_with(self.test_architecture)
        mock_run_engine.assert_called_once_with(
            RunEngineRequest(
                id=self.test_id,
                input_graph=self.test_result.resources_yaml,
                templates=[],
                engine_version=1.0,
                constraints=self.test_constraints,
                guardrails=None,
            )
        )
        mock_get_architecture_latest.assert_called_once()
        mock_add.assert_called_once()
        mock_write_state_to_fs.assert_called_once()
        mock_delete_future_states.assert_called_once_with(self.test_id, 0)
        mock_get_architecture_at_state.assert_called_once_with(self.test_id, 0)
        self.assertEqual(mock_write_state_to_fs.call_args.args[0].id, self.test_id)
        self.assertEqual(mock_write_state_to_fs.call_args.args[1], self.test_result)
        self.test_architecture.state = 1
        self.test_architecture.state_location = mock.ANY
        self.assertEqual(mock_add.call_args.args[0].state, 11)
        self.assertEqual(mock_add.call_args.args[0].state_location, "test-location")
        response = jsons.loads(result.body.decode("utf-8"))
        self.assertEqual(result.status_code, 200)
        self.assertEqual(response["version"], 11)
        self.assertEqual(
            response["state"],
            {
                "resources_yaml": self.test_result.resources_yaml,
                "topology_yaml": self.test_result.topology_yaml,
            },
        )
