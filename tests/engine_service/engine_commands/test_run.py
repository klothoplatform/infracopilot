
import aiounittest
import os
from unittest import mock

from src.engine_service.engine_commands.run import run_engine, RunEngineRequest, RunEngineResult

class TestRunEngine(aiounittest.AsyncTestCase):

    
    async def test_run_engine(self):
        with mock.patch("src.engine_service.engine_commands.util.run_engine_command") as eng_cmd:
            request = RunEngineRequest(
                id="test",
                templates=[],
                constraints=[],
                guardrails=None,
                input_graph="test",
                engine_version=0.0,
            )
            eng_cmd.return_value = (
                "resources_yaml",
                "topology_yaml",
                "iac_topology",
                None,
            )
            result = await run_engine(request)
            assert result == RunEngineResult(
                resources_yaml="resources_yaml",
                topology_yaml="topology_yaml",
                iac_topology="iac_topology",
                iac_bytes=None,
            )