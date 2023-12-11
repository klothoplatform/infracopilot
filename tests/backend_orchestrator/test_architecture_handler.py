from pathlib import Path, PosixPath
import aiounittest
import tempfile
import shutil
import jsons
from unittest import mock

from fastapi.responses import JSONResponse


from src.backend_orchestrator.architecture_handler import (
    copilot_clone_architecture,
    copilot_get_previous_state,
    copilot_get_next_state,
    copilot_new_architecture,
    copilot_get_resource_types,
    CreateArchitectureRequest,
    copilot_get_state,
)
from src.state_manager.architecture_data import Architecture
from src.engine_service.engine_commands.run import RunEngineResult
from src.engine_service.engine_commands.get_resource_types import (
    GetResourceTypesRequest,
)
from src.util.entity import User


class TestNewArchitecture(aiounittest.AsyncTestCase):
    @mock.patch(
        "src.backend_orchestrator.architecture_handler.add_architecture_owner",
        new_callable=mock.AsyncMock,
    )
    @mock.patch("uuid.uuid4")
    @mock.patch(
        "src.backend_orchestrator.architecture_handler.add_architecture",
        new_callable=mock.AsyncMock,
    )
    async def test_copilot_new_architecture(
        self, mock_add: mock.Mock, mock_uuid: mock.Mock, mock_add_owner: mock.Mock
    ):
        request = CreateArchitectureRequest(
            name="test-new",
            owner="test-owner",
            engine_version=0.0,
        )
        mock_uuid.return_value = "test-uuid"
        mock_add_owner.return_value = None
        result = await copilot_new_architecture(request)
        mock_add.assert_called_once()
        self.assertEqual(
            mock_add.call_args.args[0],
            Architecture(
                id="test-uuid",
                name="test-new",
                state=0,
                constraints=[],
                owner="user:test-owner",
                created_at=mock.ANY,
                updated_by="user:test-owner",
                engine_version=0.0,
            ),
        )
        mock_add_owner.assert_called_once_with(User(id="test-owner"), "test-uuid")
        self.assertEqual(result.body, JSONResponse(content={"id": "test-uuid"}).body)
        self.assertEqual(result.status_code, 200)


class TestGetState(aiounittest.AsyncTestCase):
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
        decisions=[{"id": "test"}],
    )
    test_result = RunEngineResult(
        resources_yaml="test-yaml",
        topology_yaml="test-yaml",
        iac_topology="test-yaml",
    )

    @mock.patch(
        "src.backend_orchestrator.architecture_handler.get_architecture_changelog_history",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.architecture_handler.get_architecture_latest",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.architecture_handler.get_state_from_fs",
        new_callable=mock.AsyncMock,
    )
    async def test_copilot_get_state(
        self,
        mock_fs: mock.Mock,
        mock_latest: mock.Mock,
        mock_get_architecture_changelog_history: mock.Mock,
    ):
        mock_latest.return_value = self.test_architecture
        mock_fs.return_value = self.test_result
        mock_get_architecture_changelog_history.return_value = [{"id": "test"}]
        result = await copilot_get_state(self.test_id)
        mock_fs.assert_called_once_with(self.test_architecture)
        mock_latest.assert_called_once_with(self.test_id)
        mock_get_architecture_changelog_history.assert_called_once_with(self.test_id)
        response = jsons.loads(result.body.decode("utf-8"))
        self.assertEqual(response["id"], "test-id")
        self.assertEqual(
            response["state"],
            {
                "resources_yaml": "test-yaml",
                "topology_yaml": "test-yaml",
            },
        )
        self.assertEqual(response["decisions"], [{"id": "test"}])


class TestGetPreviousState(aiounittest.AsyncTestCase):
    test_id = "test-id"
    test_architecture = Architecture(
        id=test_id,
        name="test-new",
        state=1,
        constraints={},
        owner="test-owner",
        created_at=mock.ANY,
        updated_by="test-owner",
        engine_version=0.0,
        decisions=[{"id": "test"}],
    )
    test_architecture_1 = Architecture(
        id=test_id,
        name="test-new",
        state=2,
        constraints={},
        owner="test-owner",
        created_at=mock.ANY,
        updated_by="test-owner",
        engine_version=0.0,
        decisions=[{"id": "test"}],
    )
    test_result = RunEngineResult(
        resources_yaml="test-yaml",
        topology_yaml="test-yaml",
        iac_topology="test-yaml",
    )

    @mock.patch(
        "src.backend_orchestrator.architecture_handler.get_architecture_changelog_history",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.architecture_handler.get_previous_state",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.architecture_handler.get_state_from_fs",
        new_callable=mock.AsyncMock,
    )
    async def test_copilot_get_previous_state(
        self,
        mock_get_state_from_fs: mock.Mock,
        mock_get_previous_state: mock.Mock,
        mock_get_architecture_changelog_history: mock.Mock,
    ):
        mock_get_state_from_fs.return_value = self.test_result
        mock_get_previous_state.return_value = self.test_architecture
        mock_get_architecture_changelog_history.return_value = [{"id": "test"}]
        result = await copilot_get_previous_state(self.test_id, 2)
        mock_get_state_from_fs.assert_called_once_with(self.test_architecture)
        mock_get_previous_state.assert_called_once_with(self.test_id, 2)
        mock_get_architecture_changelog_history.assert_called_once_with(self.test_id)
        response = jsons.loads(result.body.decode("utf-8"))
        self.assertEqual(response["id"], "test-id")
        self.assertEqual(
            response["state"],
            {
                "resources_yaml": "test-yaml",
                "topology_yaml": "test-yaml",
            },
        )
        self.assertEqual(response["decisions"], [{"id": "test"}])


class TestGetNextState(aiounittest.AsyncTestCase):
    test_id = "test-id"
    test_architecture = Architecture(
        id=test_id,
        name="test-new",
        state=1,
        constraints={},
        owner="test-owner",
        created_at=mock.ANY,
        updated_by="test-owner",
        engine_version=0.0,
        decisions=[{"id": "test"}],
    )
    test_architecture_1 = Architecture(
        id=test_id,
        name="test-new",
        state=2,
        constraints={},
        owner="test-owner",
        created_at=mock.ANY,
        updated_by="test-owner",
        engine_version=0.0,
        decisions=[{"id": "test"}],
    )
    test_result = RunEngineResult(
        resources_yaml="test-yaml",
        topology_yaml="test-yaml",
        iac_topology="test-yaml",
    )

    @mock.patch(
        "src.backend_orchestrator.architecture_handler.get_architecture_changelog_history",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.architecture_handler.get_next_state",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.architecture_handler.get_state_from_fs",
        new_callable=mock.AsyncMock,
    )
    async def test_copilot_get_next_state(
        self,
        mock_get_state_from_fs: mock.Mock,
        mock_get_next_state: mock.Mock,
        mock_get_architecture_changelog_history: mock.Mock,
    ):
        mock_get_state_from_fs.return_value = self.test_result
        mock_get_next_state.return_value = self.test_architecture
        mock_get_architecture_changelog_history.return_value = [{"id": "test"}]
        result = await copilot_get_next_state(self.test_id, 1)
        mock_get_state_from_fs.assert_called_once_with(self.test_architecture)
        mock_get_next_state.assert_called_once_with(self.test_id, 1)
        mock_get_architecture_changelog_history.assert_called_once_with(self.test_id)
        response = jsons.loads(result.body.decode("utf-8"))
        self.assertEqual(response["id"], "test-id")
        self.assertEqual(
            response["state"],
            {
                "resources_yaml": "test-yaml",
                "topology_yaml": "test-yaml",
            },
        )
        self.assertEqual(response["decisions"], [{"id": "test"}])


class TestCloneArchitecture(aiounittest.AsyncTestCase):
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
        decisions=[{"id": "test"}],
    )
    test_result = RunEngineResult(
        resources_yaml="test-yaml",
        topology_yaml="test-yaml",
        iac_topology="test-yaml",
    )

    @mock.patch("uuid.uuid4")
    @mock.patch(
        "src.backend_orchestrator.architecture_handler.add_architecture_owner",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.architecture_handler.add_architecture",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.architecture_handler.get_architecture_latest",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.architecture_handler.get_state_from_fs",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.architecture_handler.write_state_to_fs",
        new_callable=mock.AsyncMock,
    )
    async def test_copilot_get_state(
        self,
        mock_write_fs: mock.Mock,
        mock_get_fs: mock.Mock,
        mock_latest: mock.Mock,
        mock_add_architecture: mock.Mock,
        mock_add_architecture_owner: mock.Mock,
        mock_uuid: mock.Mock,
    ):
        test_uuid = "test-uuid"
        mock_uuid.return_value = test_uuid
        mock_latest.return_value = self.test_architecture
        mock_get_fs.return_value = self.test_result
        mock_write_fs.return_value = "location"
        mock_add_architecture.return_value = None
        mock_add_architecture_owner.return_value = None
        result = await copilot_clone_architecture(
            "test-owner", self.test_id, "test-new", "test-owner"
        )
        mock_get_fs.assert_called_once_with(arch=self.test_architecture)
        mock_latest.assert_called_once_with(self.test_id)
        mock_write_fs.assert_called_once_with(
            mock.ANY,
            self.test_result,
        )
        mock_add_architecture.assert_called_once()
        self.assertEqual(mock_add_architecture.call_args.args[0].id, test_uuid)
        self.assertEqual(mock_add_architecture.call_args.args[0].state, 0)
        self.assertEqual(
            mock_add_architecture.call_args.args[0].state_location, "location"
        )
        mock_add_architecture_owner.assert_called_once()
        self.assertEqual(
            mock_add_architecture_owner.call_args.args[0],
            User(id="test-owner"),
        )
        self.assertEqual(result.body, JSONResponse(content={"id": test_uuid}).body)
        self.assertEqual(result.status_code, 200)


class TestListResourceTypes(aiounittest.AsyncTestCase):
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

    @mock.patch(
        "src.backend_orchestrator.architecture_handler.get_architecture_latest",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.architecture_handler.get_guardrails",
        new_callable=mock.AsyncMock,
    )
    @mock.patch(
        "src.backend_orchestrator.architecture_handler.get_resource_types",
        new_callable=mock.AsyncMock,
    )
    async def test_copilot_list_resource_types(
        self,
        mock_get_resource_types: mock.Mock,
        mock_guardrails: mock.Mock,
        mock_latest: mock.Mock,
    ):
        mock_latest.return_value = self.test_architecture
        mock_get_resource_types.return_value = '{"test-resource": ["classification"]}'
        mock_guardrails.return_value = None
        result = await copilot_get_resource_types(self.test_id)
        mock_guardrails.assert_called_once_with(self.test_architecture.owner)
        mock_latest.assert_called_once_with(self.test_id)
        mock_get_resource_types.assert_called_once()
        self.assertEqual(
            mock_get_resource_types.call_args.args[0],
            GetResourceTypesRequest(guardrails=None),
        )
        response = jsons.loads(result.body.decode("utf-8"))
        self.assertEqual(
            {
                "test-resource": ["classification"],
            },
            response,
        )
