from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
import tempfile
from typing import List
from src.engine_service.engine_commands.util import EngineRunner, EngineException
from src.guardrails_manager.guardrails_store import get_guardrails
from src.state_manager.architecture_data import get_architecture_latest
from src.state_manager.architecture_storage import ArchitectureStateDoesNotExistError

@dataclass
class GetResourceTypesRequest:
    guardrails: str | None

async def get_resource_types(request: GetResourceTypesRequest, runner: EngineRunner) -> List[str]:
    out = None
    err_logs = None
    try:
        with tempfile.TemporaryDirectory() as tmp_dir:
            dir = Path(tmp_dir)

            args = [
                "--provider",
                "aws",
            ]

            if request.guardrails is not None:
                with open(dir / "guardrails.yaml", "w") as file:
                    file.write(request.guardrails)
                args.append("--guardrails")
                args.append("guardrails.yaml")

            out, err_logs = await runner.run_engine_command(
                "ListResourceTypes",
                *args,
                cwd=dir,
            )
        return out.strip().splitlines()
    except EngineException:
        raise 
    except Exception as e:
        raise EngineException(
            message=f"Error running engine: {e}",
            out=out,
            err_logs=err_logs,
            )