import aiounittest
from unittest import mock

import datetime
from src.backend_orchestrator.get_valid_edge_targets_handler import (
    CopilotGetValidEdgeTargetsRequest,
    EdgeTargetHandler,
)

from src.backend_orchestrator.run_engine_handler import (
    CopilotRunRequest,
    EngineOrchestrator,
)
from src.engine_service.binaries.fetcher import Binary
from src.engine_service.engine_commands.get_valid_edge_targets import (
    GetValidEdgeTargetsRequest,
    GetValidEdgeTargetsResult,
)
from src.environment_management.environment_version import (
    EnvironmentVersionDoesNotExistError,
)
from src.environment_management.models import (
    Architecture,
    EnvironmentVersion,
    Environment,
)
from src.engine_service.engine_commands.run import (
    FailedRunException,
    RunEngineRequest,
    RunEngineResult,
)

from fastapi import HTTPException


class TestValidEdgeTargetsHandler(aiounittest.AsyncTestCase):
    created_at = datetime.datetime.fromisoformat("2011-11-04")

    @classmethod
    def setUpClass(self):
        self.test_architecture = Architecture(
            id="test-architecture-id",
            name="test-new",
            owner="test-owner",
        )
        self.test_env = Environment(
            architecture_id="test-architecture-id",
            id="test-id",
            current=1,
            tags={},
        )
        self.test_ev = EnvironmentVersion(
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
        self.test_result = GetValidEdgeTargetsResult(valid_edge_targets=["a", "b"])
        self.input_graph = RunEngineResult(
            resources_yaml="test-yaml",
            topology_yaml="test-yaml",
            iac_topology="test-yaml",
        )
        self.mock_store: mock.Mock = mock.Mock()
        self.mock_ev_dao: mock.Mock = mock.Mock()
        self.mock_binary_store: mock.Mock = mock.Mock()
        self.edge_handler = EdgeTargetHandler(
            self.mock_store,
            self.mock_ev_dao,
            self.mock_binary_store,
        )

    def setUp(self) -> None:
        self.mock_store.reset_mock()
        self.mock_ev_dao.reset_mock()
        self.mock_binary_store.reset_mock()

    @mock.patch(
        "src.backend_orchestrator.get_valid_edge_targets_handler.get_valid_edge_targets",
        new_callable=mock.Mock,
    )
    async def test_run_engine(
        self,
        mock_get_valid_edge_targets: mock.Mock,
    ):
        self.mock_ev_dao.get_current_version = mock.AsyncMock(return_value=self.test_ev)
        self.mock_store.get_state_from_fs = mock.Mock(return_value=self.input_graph)
        mock_get_valid_edge_targets.return_value = self.test_result
        result = await self.edge_handler.get_valid_edge_targets(
            "test-architecture-id",
            "test-id",
            1,
            CopilotGetValidEdgeTargetsRequest(config={"a": "b"}),
        )
        self.assertEqual(result.status_code, 200)
        self.assertEqual(
            result.body,
            b'{"id": "test-id", "version": 1, "validEdgeTargets": ["a", "b"]}',
        )
        self.mock_ev_dao.get_current_version.assert_called_once_with(
            "test-architecture-id", "test-id"
        )
        self.mock_store.get_state_from_fs.assert_called_once_with(self.test_ev)
        mock_get_valid_edge_targets.assert_called_once_with(
            GetValidEdgeTargetsRequest(
                id="test-architecture-id",
                input_graph=self.input_graph.resources_yaml,
                config={"a": "b"},
                engine_version=1.0,
            )
        )
        self.mock_binary_store.ensure_binary.assert_called_once_with(Binary.ENGINE)
