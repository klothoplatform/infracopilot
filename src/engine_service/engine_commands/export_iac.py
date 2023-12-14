import tempfile
from io import BytesIO
from pathlib import Path
from typing import NamedTuple
from src.engine_service.engine_commands.util import run_iac_command, IacException
from src.util.compress import zip_directory_recurse


class ExportIacRequest(NamedTuple):
    input_graph: str
    name: str
    provider: str = "pulumi"


class ExportIacResult(NamedTuple):
    iac_bytes: BytesIO


async def export_iac(request: ExportIacRequest) -> ExportIacResult:
    out_logs = None
    err_logs = None
    try:
        with tempfile.TemporaryDirectory() as tmp_dir:
            dir = Path(tmp_dir)

            args = []

            with open(dir / "graph.yaml", "w") as file:
                file.write(request.input_graph)
            args.append("--input-graph")
            args.append(f"{tmp_dir}/graph.yaml")

            args.extend(
                [
                    "--provider",
                    "pulumi",
                    "--output-dir",
                    tmp_dir,
                    "--app-name",
                    request.name,
                ]
            )

            out_logs, err_logs = await run_iac_command(
                "Generate",
                *args,
                cwd=dir,
            )

            iac_bytes = BytesIO()
            zip_directory_recurse(iac_bytes, str(dir))

            return ExportIacResult(
                iac_bytes=iac_bytes,
            )
    except IacException:
        raise
    except Exception as e:
        raise IacException(
            message="Error generating iac",
            stdout=out_logs,
            stderr=err_logs,
        )
