import aiounittest
from unittest import mock

import datetime

from src.backend_orchestrator.run_engine_handler import (
    CopilotRunRequest,
    EngineOrchestrator,
)
from src.constraints.application_constraint import ApplicationConstraint
from src.engine_service.binaries.fetcher import Binary
from src.environment_management.environment_version import (
    EnvironmentVersionDoesNotExistError,
)
from src.environment_management.models import (
    Architecture,
    EnvironmentVersion,
    Environment,
)
from src.engine_service.engine_commands.run import (
    RunEngineRequest,
    RunEngineResult,
    EngineException,
)

from fastapi import HTTPException
from src.topology.resource import ResourceID

from src.topology.topology import Diff, DiffStatus, TopologyDiff


class TestArchitectureRun(aiounittest.AsyncTestCase):
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
            tags={"default": True},
        )
        self.test_ev = EnvironmentVersion(
            architecture_id="test-architecture-id",
            id="test-id",
            version=1,
            version_hash="test-hash",
            env_resource_configuration={
                "tracks": {"environment": "test-id", "version_hash": "test-hash"}
            },
            state_location="test-state-location",
            iac_location="test-iac-location",
            created_by="user:test-owner",
            created_at=datetime.datetime.fromisoformat("2011-11-04"),
            constraints={},
        )
        self.test_architecture_1 = Architecture(
            id="test-id",
            name="test-new",
            owner="test-owner",
        )
        self.test_result = RunEngineResult(
            resources_yaml="test-yaml",
            topology_yaml="test-yaml",
            iac_topology="test-yaml",
            config_errors=[{"title": "config_error"}],
        )
        self.test_constraints = [
            {"scope": "application", "operator": "add", "node": "aws:lambda_function:a"}
        ]
        self.mock_store: mock.Mock = mock.Mock()
        self.mock_ev_dao: mock.Mock = mock.Mock()
        self.mock_env_dao: mock.Mock = mock.Mock()
        self.mock_binary_store: mock.Mock = mock.Mock()

        self.arch_handler = EngineOrchestrator(
            self.mock_store,
            self.mock_ev_dao,
            self.mock_env_dao,
            self.mock_binary_store,
        )

    def setUp(self) -> None:
        self.mock_store.reset_mock()
        self.mock_ev_dao.reset_mock()
        self.mock_env_dao.reset_mock()
        self.mock_binary_store.reset_mock()

    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.run_engine",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.datetime",
        new_callable=mock.Mock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.uuid",
        new_callable=mock.Mock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.find_mutating_constraints",
        new_callable=mock.Mock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.diff_engine_results",
        new_callable=mock.Mock,
    )
    async def test_run_engine(
        self,
        mock_diff_engine_results: mock.Mock,
        mock_find_mutating_constraints: mock.Mock,
        mock_uuid: mock.Mock,
        mock_datetime: mock.Mock,
        mock_run_engine: mock.AsyncMock,
    ):
        test_hash = "hash"
        mock_datetime.utcnow.return_value = self.created_at
        mock_uuid.uuid4.return_value = test_hash
        self.mock_ev_dao.get_current_version = mock.AsyncMock(return_value=self.test_ev)
        self.mock_env_dao.get_environment = mock.AsyncMock(return_value=self.test_env)
        self.mock_store.get_state_from_fs = mock.Mock(return_value=self.test_result)
        mock_run_engine.return_value = self.test_result
        self.mock_ev_dao.get_latest_version = mock.AsyncMock(return_value=self.test_ev)
        self.mock_store.write_state_to_fs = mock.Mock(return_value="test-location")
        self.mock_ev_dao.add_environment_version = mock.Mock(return_value=None)
        self.mock_env_dao.set_current_version = mock.AsyncMock(return_value=None)
        mock_diff_engine_results.return_value = TopologyDiff(
            resources={
                ResourceID(provider="test", type="test"): Diff(
                    status=DiffStatus.CHANGED
                ),
            },
            edges={
                ResourceID(provider="test", type="test"): Diff(
                    status=DiffStatus.ADDED,
                    target=ResourceID(provider="test", type="test2"),
                ),
            },
        )
        result = await self.arch_handler.run(
            "test-architecture-id",
            "test-id",
            1,
            CopilotRunRequest(
                constraints=self.test_constraints,
            ),
            False,
        )
        self.assertEqual(result.status_code, 200)
        self.assertEqual(
            result.body,
            b'{"architecture_id": "test-architecture-id", "id": "test-id", "version": 2, "state": {"resources_yaml": "test-yaml", "topology_yaml": "test-yaml"}, "env_resource_configuration": {"tracks": {"environment": "test-id", "version_hash": "test-hash"}, "overrides": null, "diff": null, "config_errors": [{"title": "config_error"}]}, "config_errors": [{"title": "config_error"}], "diff": {"resources": {"test:test:None": {"status": "CHANGED"}}, "edges": {"test:test:None": {"status": "ADDED", "target": "test:test2:None"}}}}',
        )
        self.mock_ev_dao.get_current_version.assert_called_once_with(
            "test-architecture-id", "test-id"
        )
        self.mock_store.get_state_from_fs.assert_called_once_with(self.test_ev)
        mock_run_engine.assert_called_once_with(
            RunEngineRequest(
                id="test-architecture-id",
                input_graph=self.test_result.resources_yaml,
                templates=[],
                engine_version=1.0,
                constraints=self.test_constraints,
            )
        )
        self.mock_ev_dao.get_latest_version.assert_called_once_with(
            "test-architecture-id",
            "test-id",
        )
        version_with_state = EnvironmentVersion(
            architecture_id="test-architecture-id",
            id="test-id",
            version=2,
            version_hash=test_hash,
            constraints=self.test_constraints,
            state_location="test-location",
            created_by="user:test-owner",
            created_at=self.created_at,
            env_resource_configuration={
                "tracks": {"environment": "test-id", "version_hash": "test-hash"},
                "overrides": None,
                "diff": None,
                "config_errors": [{"title": "config_error"}],
            },
        )
        self.mock_store.write_state_to_fs.assert_called_once_with(
            version_with_state,
            self.test_result,
        )
        self.mock_ev_dao.add_environment_version.assert_called_once_with(
            version_with_state,
        )

        self.mock_env_dao.set_current_version.assert_called_once_with(
            "test-architecture-id", "test-id", 2
        )
        self.mock_env_dao.get_environment.assert_called_once_with(
            "test-architecture-id", "test-id"
        )
        self.mock_binary_store.ensure_binary.assert_called_once_with(Binary.ENGINE)
        mock_diff_engine_results.assert_called_once_with(
            self.test_result,
            self.test_result,
        )
        mock_find_mutating_constraints.assert_not_called()

    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.run_engine",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.datetime",
        new_callable=mock.Mock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.uuid",
        new_callable=mock.Mock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.find_mutating_constraints",
        new_callable=mock.Mock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.diff_engine_results",
        new_callable=mock.Mock,
    )
    async def test_run_engine_overwrite(
        self,
        mock_diff_engine_results: mock.Mock,
        mock_find_mutating_constraints: mock.Mock,
        mock_uuid: mock.Mock,
        mock_datetime: mock.Mock,
        mock_run_engine: mock.AsyncMock,
    ):
        test_hash = "hash"
        mock_datetime.utcnow.return_value = self.created_at
        mock_uuid.uuid4.return_value = test_hash
        self.mock_ev_dao.get_current_version = mock.AsyncMock(return_value=self.test_ev)
        self.mock_ev_dao.get_environment_version = mock.AsyncMock(
            return_value=self.test_ev
        )
        self.mock_env_dao.get_environment = mock.AsyncMock(return_value=self.test_env)
        self.mock_store.get_state_from_fs = mock.Mock(return_value=self.test_result)
        mock_run_engine.return_value = self.test_result
        self.mock_ev_dao.get_latest_version = mock.AsyncMock(return_value=self.test_ev)
        self.mock_store.write_state_to_fs = mock.Mock(return_value="test-location")
        self.mock_ev_dao.add_environment_version = mock.Mock(return_value=None)
        self.mock_ev_dao.delete_future_versions = mock.AsyncMock(return_value=None)
        self.mock_env_dao.set_current_version = mock.AsyncMock(return_value=None)
        mock_diff_engine_results.return_value = TopologyDiff()
        result = await self.arch_handler.run(
            "test-architecture-id",
            "test-id",
            0,
            CopilotRunRequest(
                constraints=self.test_constraints,
                overwrite=True,
            ),
            True,
        )
        self.assertEqual(result.status_code, 200)
        self.assertEqual(
            result.body,
            b'{"architecture_id": "test-architecture-id", "id": "test-id", "version": 2, "state": {"resources_yaml": "test-yaml", "topology_yaml": "test-yaml"}, "env_resource_configuration": {"tracks": {"environment": "test-id", "version_hash": "test-hash"}, "overrides": null, "diff": null, "config_errors": [{"title": "config_error"}]}, "config_errors": [{"title": "config_error"}], "diff": {"resources": {}, "edges": {}}}',
        )
        self.mock_ev_dao.get_current_version.assert_called_once_with(
            "test-architecture-id", "test-id"
        )
        self.mock_store.get_state_from_fs.assert_called_once_with(self.test_ev)
        mock_run_engine.assert_called_once_with(
            RunEngineRequest(
                id="test-architecture-id",
                input_graph=self.test_result.resources_yaml,
                templates=[],
                engine_version=1.0,
                constraints=self.test_constraints,
            )
        )
        self.mock_ev_dao.get_latest_version.assert_called_once_with(
            "test-architecture-id",
            "test-id",
        )
        self.mock_ev_dao.get_environment_version.assert_called_once_with(
            "test-architecture-id", "test-id", 0
        )
        version_with_state = EnvironmentVersion(
            architecture_id="test-architecture-id",
            id="test-id",
            version=2,
            version_hash=test_hash,
            constraints=self.test_constraints,
            state_location="test-location",
            created_by="user:test-owner",
            created_at=self.created_at,
            env_resource_configuration={
                "tracks": {"environment": "test-id", "version_hash": "test-hash"},
                "overrides": None,
                "diff": None,
                "config_errors": [{"title": "config_error"}],
            },
        )
        self.mock_store.write_state_to_fs.assert_called_once_with(
            version_with_state,
            self.test_result,
        )
        self.mock_ev_dao.add_environment_version.assert_called_once_with(
            version_with_state,
        )
        self.mock_ev_dao.delete_future_versions.assert_called_once_with(
            "test-architecture-id",
            "test-id",
            0,
        )
        self.mock_env_dao.set_current_version.assert_called_once_with(
            "test-architecture-id", "test-id", 2
        )
        self.mock_binary_store.ensure_binary.assert_called_once_with(Binary.ENGINE)
        mock_diff_engine_results.assert_called_once_with(
            self.test_result,
            self.test_result,
        )
        mock_find_mutating_constraints.assert_not_called()

    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.run_engine",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.datetime",
        new_callable=mock.Mock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.uuid",
        new_callable=mock.Mock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.find_mutating_constraints",
        new_callable=mock.Mock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.diff_engine_results",
        new_callable=mock.Mock,
    )
    async def test_run_engine_failure(
        self,
        mock_diff_engine_results: mock.Mock,
        mock_find_mutating_constraints: mock.Mock,
        mock_uuid: mock.Mock,
        mock_datetime: mock.Mock,
        mock_run_engine: mock.AsyncMock,
    ):
        test_hash = "hash"
        mock_datetime.utcnow.return_value = self.created_at
        mock_uuid.uuid4.return_value = test_hash
        self.mock_ev_dao.get_current_version = mock.AsyncMock(return_value=self.test_ev)
        self.mock_ev_dao.get_environment_version = mock.AsyncMock(
            return_value=self.test_ev
        )
        self.mock_env_dao.get_environment = mock.AsyncMock(return_value=self.test_env)
        self.mock_store.get_state_from_fs = mock.Mock(return_value=self.test_result)
        test_result = EngineException([], 1, '[{"error_code": "internal"}]', "")
        mock_run_engine.side_effect = test_result
        self.mock_ev_dao.get_latest_version = mock.AsyncMock(return_value=self.test_ev)
        self.mock_store.write_state_to_fs = mock.Mock(return_value="test-location")
        self.mock_ev_dao.add_environment_version = mock.Mock(return_value=None)
        self.mock_ev_dao.delete_future_versions = mock.AsyncMock(return_value=None)
        self.mock_env_dao.set_current_version = mock.AsyncMock(return_value=None)
        mock_diff_engine_results.return_value = TopologyDiff()
        result = await self.arch_handler.run(
            "test-architecture-id",
            "test-id",
            0,
            CopilotRunRequest(
                constraints=self.test_constraints,
                overwrite=True,
            ),
            True,
        )
        self.assertEqual(result.status_code, 400)
        self.assertEqual(
            result.body,
            b'{"title": "Could not add aws:lambda_function:a", "details": "An internal error occurred", "full_details": [{"error_code": "internal"}]}',
        )

    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.run_engine",
        new_callable=mock.Mock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.datetime",
        new_callable=mock.Mock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.uuid",
        new_callable=mock.Mock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.find_mutating_constraints",
        new_callable=mock.Mock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.diff_engine_results",
        new_callable=mock.Mock,
    )
    async def test_run_engine_constraints_have_disallowed_mutations(
        self,
        mock_diff_engine_results: mock.Mock,
        mock_find_mutating_constraints: mock.Mock,
        mock_uuid: mock.Mock,
        mock_datetime: mock.Mock,
        mock_run_engine: mock.Mock,
    ):
        test_hash = "hash"
        mock_datetime.utcnow.return_value = self.created_at
        mock_uuid.uuid4.return_value = test_hash
        self.mock_ev_dao.get_current_version = mock.AsyncMock(return_value=self.test_ev)
        self.mock_env_dao.get_environment = mock.AsyncMock(
            return_value=Environment(
                architecture_id="test-architecture-id",
                id="test-id",
            )
        )
        mock_find_mutating_constraints.return_value = [
            ApplicationConstraint(operator="add", node=ResourceID())
        ]

        result = await self.arch_handler.run(
            "test-architecture-id",
            "test-id",
            1,
            CopilotRunRequest(
                constraints=self.test_constraints,
            ),
            False,
        )

        self.assertEqual(result.status_code, 400)
        self.assertEqual(
            result.body,
            b'{"error_type": "topological_changes_not_allowed", "environment": "test-id", "constraints": [{"scope": "application", "operator": "add", "node": "aws:lambda_function:a"}]}',
        )
        self.mock_ev_dao.get_current_version.assert_called_once_with(
            "test-architecture-id", "test-id"
        )
        self.mock_env_dao.get_environment.assert_called_once_with(
            "test-architecture-id", "test-id"
        )
        mock_find_mutating_constraints.assert_called_once_with(self.test_constraints)

        self.mock_store.get_state_from_fs.assert_not_called()
        mock_run_engine.assert_not_called()
        self.mock_ev_dao.get_latest_version.assert_not_called()
        self.mock_store.write_state_to_fs.assert_not_called()
        self.mock_ev_dao.add_environment_version.assert_not_called()

        self.mock_env_dao.set_current_version.assert_not_called()

        self.mock_binary_store.ensure_binary.assert_not_called()
        mock_diff_engine_results.assert_not_called()

    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.run_engine",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.datetime",
        new_callable=mock.Mock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.uuid",
        new_callable=mock.Mock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.find_mutating_constraints",
        new_callable=mock.Mock,
    )
    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.diff_engine_results",
        new_callable=mock.Mock,
    )
    async def test_run_engine_diff_has_disallowed_mutations(
        self,
        mock_diff_engine_results: mock.Mock,
        mock_find_mutating_constraints: mock.Mock,
        mock_uuid: mock.Mock,
        mock_datetime: mock.Mock,
        mock_run_engine: mock.AsyncMock,
    ):
        test_hash = "hash"
        mock_datetime.utcnow.return_value = self.created_at
        mock_uuid.uuid4.return_value = test_hash
        self.mock_ev_dao.get_current_version = mock.AsyncMock(return_value=self.test_ev)
        self.mock_env_dao.get_environment = mock.AsyncMock(
            return_value=Environment(
                architecture_id="test-architecture-id",
                id="test-id",
            )
        )
        mock_find_mutating_constraints.return_value = []
        self.mock_store.get_state_from_fs = mock.Mock(return_value=self.test_result)
        mock_run_engine.return_value = self.test_result
        mock_diff_engine_results.return_value = TopologyDiff(
            resources={
                ResourceID(provider="test", type="test"): Diff(
                    status=DiffStatus.CHANGED
                ),
            },
        )

        result = await self.arch_handler.run(
            "test-architecture-id",
            "test-id",
            1,
            CopilotRunRequest(
                constraints=self.test_constraints,
            ),
            False,
        )

        self.assertEqual(result.status_code, 400)
        self.assertEqual(
            result.body,
            b'{"error_type": "topological_changes_not_allowed", "environment": "test-id", "constraints": [{"scope": "application", "operator": "add", "node": "aws:lambda_function:a"}], "diff": {"resources": {"test:test:None": {"status": "CHANGED"}}, "edges": {}}}',
        )
        self.mock_ev_dao.get_current_version.assert_called_once_with(
            "test-architecture-id", "test-id"
        )
        self.mock_env_dao.get_environment.assert_called_once_with(
            "test-architecture-id", "test-id"
        )
        mock_find_mutating_constraints.assert_called_once_with(self.test_constraints)
        self.mock_binary_store.ensure_binary.assert_called_once_with(Binary.ENGINE)
        mock_run_engine.assert_called_once_with(
            RunEngineRequest(
                id="test-architecture-id",
                input_graph=self.test_result.resources_yaml,
                templates=[],
                engine_version=1.0,
                constraints=self.test_constraints,
            )
        )
        mock_diff_engine_results.assert_called_once_with(
            self.test_result,
            self.test_result,
        )

        self.mock_store.get_state_from_fs.assert_called_once_with(self.test_ev)
        self.mock_ev_dao.get_latest_version.assert_not_called()
        self.mock_store.write_state_to_fs.assert_not_called()
        self.mock_ev_dao.add_environment_version.assert_not_called()

        self.mock_env_dao.set_current_version.assert_not_called()

    async def test_run_engine_architecture_not_found(
        self,
    ):
        self.mock_ev_dao.get_current_version = mock.AsyncMock(return_value=None)
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.run(
                "test-architecture-id",
                "test-id",
                1,
                CopilotRunRequest(
                    constraints=self.test_constraints,
                ),
                False,
            )
        self.assertEqual(
            e.exception.detail, "No architecture exists for id test-architecture-id"
        )
        self.assertEqual(e.exception.status_code, 404)
        self.mock_store.get_state_from_fs.assert_not_called()
        self.mock_binary_store.ensure_binary.assert_not_called()

    async def test_run_engine_environment_not_found(
        self,
    ):
        self.mock_ev_dao.get_current_version = mock.AsyncMock(
            side_effect=EnvironmentVersionDoesNotExistError
        )
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.run(
                "test-architecture-id",
                "test-id",
                1,
                CopilotRunRequest(
                    constraints=self.test_constraints,
                ),
                False,
            )
        self.assertEqual(
            e.exception.detail,
            "No environment version exists for id test-architecture-id environment test-id and version 1",
        )
        self.assertEqual(e.exception.status_code, 404)
        self.mock_store.get_state_from_fs.assert_not_called()
        self.mock_binary_store.ensure_binary.assert_not_called()

    async def test_run_engine_environment_version_not_latest(self):
        self.mock_ev_dao.get_current_version = mock.AsyncMock(return_value=self.test_ev)
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.run(
                "test-architecture-id",
                "test-id",
                0,
                CopilotRunRequest(
                    constraints=self.test_constraints,
                ),
                False,
            )
        self.assertEqual(e.exception.detail, "Environment version is not the latest")
        self.assertEqual(e.exception.status_code, 400)
        self.mock_store.get_state_from_fs.assert_not_called()
        self.mock_binary_store.ensure_binary.assert_not_called()

    async def test_run_engine_throw_error(self):
        self.mock_ev_dao.get_current_version = mock.AsyncMock(side_effect=Exception)
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.run(
                "test-architecture-id",
                "test-id",
                1,
                CopilotRunRequest(
                    constraints=self.test_constraints,
                ),
                False,
            )
        self.assertEqual(e.exception.detail, "internal server error")
        self.assertEqual(e.exception.status_code, 500)
        self.mock_store.get_state_from_fs.assert_not_called()
        self.mock_binary_store.ensure_binary.assert_not_called()

    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.run_engine",
        new_callable=mock.Mock,
    )
    async def test_run_engine_failed_run_Exception(self, mock_run_engine: mock.Mock):
        self.mock_ev_dao.get_current_version = mock.AsyncMock(return_value=self.test_ev)
        self.mock_ev_dao.get_environment_version = mock.AsyncMock(
            return_value=self.test_ev
        )
        self.mock_env_dao.get_environment = mock.AsyncMock(return_value=self.test_env)
        self.mock_store.get_state_from_fs = mock.Mock(return_value=self.test_result)
        mock_run_engine.side_effect = EngineException(
            "test", returncode=1, stdout="[]", stderr=""
        )
        result = await self.arch_handler.run(
            "test-architecture-id",
            "test-id",
            1,
            CopilotRunRequest(
                constraints=self.test_constraints,
            ),
            False,
        )
        self.assertEqual(
            result.body,
            b'{"title": "Could not add aws:lambda_function:a", "details": "", "full_details": []}',
        )
        self.assertEqual(result.status_code, 400)
        self.mock_binary_store.ensure_binary.assert_called_once_with(Binary.ENGINE)
        self.mock_env_dao.get_environment.assert_called_once_with(
            "test-architecture-id", "test-id"
        )

    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.get_resource_types",
        new_callable=mock.AsyncMock,
    )
    async def test_get_resource_types(self, mock_get_resource_types: mock.Mock):
        mock_get_resource_types.return_value = "test-resource-type"
        self.mock_ev_dao.get_latest_version = mock.AsyncMock(return_value=self.test_ev)
        result = await self.arch_handler.get_resource_types(
            "test-architecture-id", "test-id"
        )
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.body, b"test-resource-type")
        mock_get_resource_types.assert_called_once_with(self.mock_binary_store)
        self.mock_ev_dao.get_latest_version.assert_called_once_with(
            "test-architecture-id", "test-id"
        )
        self.mock_binary_store.ensure_binary.assert_not_called()

    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.get_resource_types",
        new_callable=mock.AsyncMock,
    )
    async def test_get_resource_types_arch_not_found(
        self, mock_get_resource_types: mock.Mock
    ):
        self.mock_ev_dao.get_latest_version = mock.AsyncMock(
            side_effect=EnvironmentVersionDoesNotExistError
        )
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.get_resource_types(
                "test-architecture-id", "test-id"
            )
        self.assertEqual(e.exception.status_code, 404)
        self.assertEqual(
            e.exception.detail, "No architecture exists for id test-architecture-id"
        )
        self.mock_ev_dao.get_latest_version.assert_called_once_with(
            "test-architecture-id", "test-id"
        )
        mock_get_resource_types.assert_not_called()
        self.mock_binary_store.ensure_binary.assert_not_called()

    @mock.patch(
        "src.backend_orchestrator.run_engine_handler.get_resource_types",
        new_callable=mock.AsyncMock,
    )
    async def test_get_resource_types_throw_error(
        self, mock_get_resource_types: mock.Mock
    ):
        self.mock_ev_dao.get_latest_version = mock.AsyncMock(side_effect=Exception)
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.get_resource_types(
                "test-architecture-id", "test-id"
            )
        self.assertEqual(e.exception.status_code, 500)
        self.assertEqual(e.exception.detail, "internal server error")
        self.mock_ev_dao.get_latest_version.assert_called_once_with(
            "test-architecture-id", "test-id"
        )
        mock_get_resource_types.assert_not_called()
        self.mock_binary_store.ensure_binary.assert_not_called()
