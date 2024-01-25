from pathlib import Path, PosixPath
import aiounittest
import tempfile
import shutil
import os
from unittest import mock

from src.engine_service.engine_commands.export_iac import (
    export_iac,
    ExportIacRequest,
    ExportIacResult,
)


class TestExportIac(aiounittest.AsyncTestCase):
    def setUp(self):
        # Create a real temporary directory for testing
        self.temp_dir = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.temp_dir.cleanup()

    def run_iac_side_effect(self, tmp_dir: str):
        dir = Path(tmp_dir)
        with open(dir / "index.ts", "w") as file:
            file.write("index")

    @mock.patch(
        "src.engine_service.engine_commands.export_iac.run_iac_command",
        new_callable=mock.AsyncMock,
    )
    @mock.patch("tempfile.TemporaryDirectory")
    async def test_run_engine(self, mock_temp_dir: mock.Mock, mock_eng_cmd: mock.Mock):
        request = ExportIacRequest(
            name="test",
            input_graph="test-graph",
        )
        mock_temp_dir.return_value.__enter__.return_value = self.temp_dir.name

        mock_eng_cmd.return_value = (
            "",
            "",
        )
        mock_eng_cmd.side_effect = self.run_iac_side_effect(self.temp_dir.name)
        result = await export_iac(request)
        mock_temp_dir.assert_called_once()
        mock_eng_cmd.assert_called_once_with(
            "Generate",
            "--input-graph",
            f"{self.temp_dir.name}/graph.yaml",
            "--provider",
            "pulumi",
            "--output-dir",
            self.temp_dir.name,
            "--app-name",
            "test",
            cwd=PosixPath(self.temp_dir.name),
        )
        self.assertIsNotNone(result.iac_bytes)
