import jsons
import os
import tempfile
from pathlib import Path
from typing import List, NamedTuple, Dict
import logging
import yaml
import contextlib

from src.engine_service.engine_commands.util import (
    ConfigValidationException,
    run_engine_command,
    EngineException,
)

log = logging.getLogger(__name__)

KEEP_TMP = os.environ.get("KEEP_TMP", False)


class RunEngineRequest(NamedTuple):
    id: str
    templates: List[str]
    input_graph: str
    constraints: List[dict]
    guardrails: str
    engine_version: float


class RunEngineResult(NamedTuple):
    resources_yaml: str
    topology_yaml: str
    iac_topology: str
    config_errors_json: List[Dict] = []


class FailedRunException(Exception):
    config_errors_json: List[Dict] = []
    error_type: str

    def __init__(self, message, error_type, config_errors_json):
        super().__init__(message)
        self.error_type = error_type
        self.config_errors_json = config_errors_json


@contextlib.contextmanager
def tempdir():
    if KEEP_TMP:
        yield tempfile.mkdtemp()
    else:
        with tempfile.TemporaryDirectory() as tmp_dir:
            yield tmp_dir


async def run_engine(request: RunEngineRequest) -> RunEngineResult:
    print(request.constraints)
    out_logs = None
    err_logs = None
    with tempdir() as tmp_dir:
        try:
            dir = Path(tmp_dir)

            args = []

            if request.input_graph is not None:
                with open(dir / "graph.yaml", "w") as file:
                    file.write(request.input_graph)
                args.append("--input-graph")
                args.append(f"{tmp_dir}/graph.yaml")

            if request.guardrails is not None:
                with open(dir / "guardrails.yaml", "w") as file:
                    file.write(request.guardrails)
                args.append("--guardrails")
                args.append(f"{tmp_dir}/guardrails.yaml")

            if request.constraints is not None:
                with open(dir / "constraints.yaml", "w") as file:
                    file.write(yaml.dump({"constraints": request.constraints}))
                args.append("--constraints")
                args.append(f"{tmp_dir}/constraints.yaml")

            args.extend(
                [
                    "--provider",
                    "aws",
                    "--output-dir",
                    tmp_dir,
                ]
            )

            out_logs, err_logs = await run_engine_command(
                "Run",
                *args,
                cwd=dir,
            )

            with open(dir / "dataflow-topology.yaml") as file:
                topology_yaml = file.read()

            with open(dir / "iac-topology.yaml") as file:
                iac_topology = file.read()

            with open(dir / "resources.yaml") as file:
                resources_yaml = file.read()

            config_errors_json = {}
            if "config_errors.json" in os.listdir(tmp_dir):
                with open(dir / "config_errors.json") as file:
                    raw_str = file.read()
                    config_errors_json = jsons.loads(raw_str)

            return RunEngineResult(
                resources_yaml=resources_yaml,
                topology_yaml=topology_yaml,
                iac_topology=iac_topology,
                config_errors_json=config_errors_json,
            )
        except ConfigValidationException as cve:
            config_errors_json = {}
            if "config_errors.json" in os.listdir(tmp_dir):
                with open(dir / "config_errors.json") as file:
                    raw_str = file.read()
                    config_errors_json = jsons.loads(raw_str)
            raise FailedRunException(
                "Could not solve graph",
                error_type=cve.type,
                config_errors_json=config_errors_json,
            )
        except EngineException as e:
            if "config_errors.json" in os.listdir(tmp_dir):
                with open(dir / "config_errors.json") as file:
                    raw_str = file.read()
                    config_errors_json = jsons.loads(raw_str)
                raise FailedRunException(
                    "Could not solve graph",
                    error_type=e.type,
                    config_errors_json=config_errors_json,
                )
            raise
        except Exception as e:
            log.error(f"Error running engine: {e}. Constraints: {request.constraints}")
            raise EngineException(
                message="Error running engine",
                stdout=out_logs,
                stderr=err_logs,
            )
