from dataclasses import dataclass
from typing import List
from src.engine_service.engine_commands.util import run_engine_command, EngineException


@dataclass
class GetResourceTypesRequest:
    guardrails: str | None


async def get_resource_types(request: GetResourceTypesRequest) -> List[str]:
    out = None
    err_logs = None
    try:
        args = [
            "--provider",
            "aws",
        ]

        if request.guardrails is not None:
            with open(dir / "guardrails.yaml", "w") as file:
                file.write(request.guardrails)
            args.append("--guardrails")
            args.append("guardrails.yaml")

        out, err_logs = await run_engine_command(
            "ListResourceTypes",
            *args,
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
