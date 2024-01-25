import json
from pathlib import PosixPath
import aiounittest
import tempfile
from typing import List
from unittest import mock

from src.engine_service.engine_commands.get_resource_types import (
    get_resource_types,
)
from src.engine_service.binaries.fetcher import BinaryStorage, Binary


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
        mock_eng_cmd.return_value = (
            '{"aws:lambda_function": ["serverless", "compute"], "aws:rest_api": ["serverless", "api"]}',
            "",
        )
        binary_store = mock.MagicMock()
        binary_store.ensure_binary = mock.Mock()
        result = await get_resource_types(binary_store)
        mock_eng_cmd.assert_called_once_with("ListResourceTypes")
        self.assertEqual(
            {
                "aws:lambda_function": ["serverless", "compute"],
                "aws:rest_api": ["serverless", "api"],
            },
            json.loads(result),
        )
        binary_store.ensure_binary.assert_called_once_with(Binary.ENGINE)
