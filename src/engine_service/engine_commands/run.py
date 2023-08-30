import json
import os
import re
import subprocess
import tempfile
from io import BytesIO
from pathlib import Path
from typing import List, NamedTuple

import yaml

from src.engine_service.engine_commands.util import run_engine_command, EngineException


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


async def run_engine(request: RunEngineRequest) -> RunEngineResult:
    out_logs = None
    err_logs = None
    try:
        with tempfile.TemporaryDirectory() as tmp_dir:
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

            return RunEngineResult(
                resources_yaml=resources_yaml,
                topology_yaml=topology_yaml,
                iac_topology=iac_topology,
            )
    except EngineException:
        raise
    except Exception as e:
        raise EngineException(
            message="Error running engine",
            stdout=out_logs,
            stderr=err_logs,
        )
