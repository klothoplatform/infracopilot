import contextlib
import logging
import os
import tempfile
from pathlib import Path
from typing import NamedTuple

import yaml

from src.engine_service.engine_commands.util import run_engine_command, EngineException

log = logging.getLogger(__name__)

KEEP_TMP = os.environ.get("KEEP_TMP", False)


class GetValidEdgeTargetsRequest(NamedTuple):
    id: str
    input_graph: str
    engine_version: float
    config: dict[str, any]


class GetValidEdgeTargetsResult(NamedTuple):
    valid_edge_targets: list[str]


@contextlib.contextmanager
def tempdir():
    if KEEP_TMP:
        yield tempfile.mkdtemp()
    else:
        with tempfile.TemporaryDirectory() as tmp_dir:
            yield tmp_dir


def get_valid_edge_targets(
    request: GetValidEdgeTargetsRequest,
) -> GetValidEdgeTargetsResult:
    log.debug(request.config)
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

            if request.config is not None:
                with open(dir / "config.yaml", "w") as file:
                    file.write(yaml.dump(request.config))
                args.append("--config")
                args.append(f"{tmp_dir}/config.yaml")

            args.extend(
                [
                    "--output-dir",
                    tmp_dir,
                ]
            )

            out_logs, err_logs = run_engine_command(
                "GetValidEdgeTargets",
                *args,
                cwd=dir,
            )

            with open(dir / "valid_edge_targets.yaml") as file:
                edges = yaml.safe_load(file)

            return GetValidEdgeTargetsResult(
                valid_edge_targets=edges,
            )
        except Exception as e:
            log.error(
                f"Error finding valid edge targets: {e}. Config: {request.config}"
            )
            raise EngineException(
                message="Error finding valid edge targets.",
                stdout=out_logs,
                stderr=err_logs,
            )
