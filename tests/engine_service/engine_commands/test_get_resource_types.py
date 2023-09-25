import json
from pathlib import PosixPath
import aiounittest
import tempfile
from typing import List
from unittest import mock

from src.engine_service.engine_commands.get_resource_types import (
    get_resource_types,
    GetResourceTypesRequest,
)


class TestRunEngine(aiounittest.AsyncTestCase):
    def setUp(self):
        # Create a real temporary directory for testing
        self.temp_dir = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.temp_dir.cleanup()

    @mock.patch(
        "src.engine_service.engine_commands.get_resource_types.run_engine_command",
        new_callable=mock.AsyncMock,
    )
    async def test_run_engine(self, mock_eng_cmd: mock.Mock):
        request = GetResourceTypesRequest(
            guardrails=None,
        )

        mock_eng_cmd.return_value = (
            '{"aws:lambda_function": ["serverless", "compute"], "aws:rest_api": ["serverless", "api"]}',
            "",
        )
        result = await get_resource_types(request)
        mock_eng_cmd.assert_called_once_with("ListResourceTypes")
        self.assertEqual(
            {
                "aws:lambda_function": ["serverless", "compute"],
                "aws:rest_api": ["serverless", "api"],
            },
            json.loads(result),
        )
