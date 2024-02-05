from pathlib import Path, PosixPath
import aiounittest
import tempfile
from unittest import mock

from src.engine_service.engine_commands.run import (
    run_engine,
    RunEngineRequest,
    RunEngineResult,
    EngineException,
)


class TestRunEngine(aiounittest.AsyncTestCase):
    def setUp(self):
        # Create a real temporary directory for testing
        self.temp_dir = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.temp_dir.cleanup()

    def run_engine_side_effect(self, tmp_dir: str):
        dir = Path(tmp_dir)
        with open(dir / "dataflow-topology.yaml", "w") as file:
            file.write("topology_yaml")

        with open(dir / "iac-topology.yaml", "w") as file:
            file.write("iac_topology")

        with open(dir / "resources.yaml", "w") as file:
            file.write("resources_yaml")

        with open(dir / "config_errors.json", "w") as file:
            file.write("[]")

    @mock.patch(
        "src.engine_service.engine_commands.run.run_engine_command",
        new_callable=mock.AsyncMock,
    )
    @mock.patch("tempfile.TemporaryDirectory")
    async def test_run_engine(self, mock_temp_dir: mock.Mock, mock_eng_cmd: mock.Mock):
        request = RunEngineRequest(
            id="test",
            templates=[],
            constraints=[],
            input_graph="test",
            engine_version=0.0,
        )
        mock_temp_dir.return_value.__enter__.return_value = self.temp_dir.name

        mock_eng_cmd.return_value = (
            "",
            "",
        )
        mock_eng_cmd.side_effect = self.run_engine_side_effect(self.temp_dir.name)
        result = await run_engine(request)
        mock_temp_dir.assert_called_once()
        mock_eng_cmd.assert_called_once_with(
            "Run",
            "--input-graph",
            f"{self.temp_dir.name}/graph.yaml",
            "--constraints",
            f"{self.temp_dir.name}/constraints.yaml",
            "--provider",
            "aws",
            "--output-dir",
            self.temp_dir.name,
            cwd=PosixPath(self.temp_dir.name),
        )
        self.assertEqual(
            result,
            RunEngineResult(
                resources_yaml="resources_yaml",
                topology_yaml="topology_yaml",
                iac_topology="iac_topology",
                config_errors=[],
            ),
        )

    @mock.patch(
        "src.engine_service.engine_commands.run.run_engine_command",
        new_callable=mock.AsyncMock,
    )
    @mock.patch("tempfile.TemporaryDirectory")
    async def test_run_engine_configerr(
        self, mock_temp_dir: mock.Mock, mock_eng_cmd: mock.Mock
    ):
        request = RunEngineRequest(
            id="test",
            templates=[],
            constraints=[],
            input_graph="test",
            engine_version=0.0,
        )
        mock_temp_dir.return_value.__enter__.return_value = self.temp_dir.name

        mock_eng_cmd.return_value = (
            "",
            "",
        )

        def run(*args, **kwargs):
            self.run_engine_side_effect(self.temp_dir.name)
            raise EngineException(
                "Run",
                2,
                '[{"error_code": "error"}]',
                "err_logs",
            )

        mock_eng_cmd.side_effect = run
        result = await run_engine(request)
        mock_temp_dir.assert_called_once()
        mock_eng_cmd.assert_called_once_with(
            "Run",
            "--input-graph",
            f"{self.temp_dir.name}/graph.yaml",
            "--constraints",
            f"{self.temp_dir.name}/constraints.yaml",
            "--provider",
            "aws",
            "--output-dir",
            self.temp_dir.name,
            cwd=PosixPath(self.temp_dir.name),
        )
        self.assertEqual(
            result,
            RunEngineResult(
                resources_yaml="resources_yaml",
                topology_yaml="topology_yaml",
                iac_topology="iac_topology",
                config_errors=[{"error_code": "error"}],
            ),
        )

    @mock.patch(
        "src.engine_service.engine_commands.run.run_engine_command",
        new_callable=mock.AsyncMock,
    )
    @mock.patch("tempfile.TemporaryDirectory")
    async def test_run_engine_failure(
        self, mock_temp_dir: mock.Mock, mock_eng_cmd: mock.Mock
    ):
        request = RunEngineRequest(
            id="test",
            templates=[],
            constraints=[],
            input_graph="test",
            engine_version=0.0,
        )
        mock_temp_dir.return_value.__enter__.return_value = self.temp_dir.name

        mock_eng_cmd.ra = (
            "",
            "",
        )

        mock_eng_cmd.side_effect = EngineException(
            "Run",
            1,
            "out_logs",
            "err_logs",
        )
        with self.assertRaises(EngineException) as fre:
            await run_engine(request)
        self.assertEqual(fre.exception.returncode, 1)
        self.assertEqual(fre.exception.stdout, "out_logs")
        self.assertEqual(fre.exception.stderr, "err_logs")

        mock_temp_dir.assert_called_once()
        mock_eng_cmd.assert_called_once_with(
            "Run",
            "--input-graph",
            f"{self.temp_dir.name}/graph.yaml",
            "--constraints",
            f"{self.temp_dir.name}/constraints.yaml",
            "--provider",
            "aws",
            "--output-dir",
            self.temp_dir.name,
            cwd=PosixPath(self.temp_dir.name),
        )
