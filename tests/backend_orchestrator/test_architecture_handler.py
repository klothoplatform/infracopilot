from pathlib import Path, PosixPath
import aiounittest
import tempfile
import shutil
import jsons
from unittest import mock

from fastapi.responses import JSONResponse


from src.backend_orchestrator.architecture_handler import (
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
