from dataclasses import dataclass

from src.engine_service.binaries.fetcher import Binary, write_binary_to_disk
from src.engine_service.engine_commands.util import run_engine_command, EngineException


@dataclass
class GetResourceTypesRequest:
    guardrails: str


async def get_resource_types(request: GetResourceTypesRequest) -> str:
    out = None
    err_logs = None
    try:
        args = []

        if request.guardrails is not None:
            with open(dir / "guardrails.yaml", "w") as file:
                file.write(request.guardrails)
            args.append("--guardrails")
            args.append("guardrails.yaml")

        await write_binary_to_disk(Binary.ENGINE)
        out, err_logs = await run_engine_command(
            "ListResourceTypes",
            *args,
        )
        return out
    except EngineException:
        raise
    except Exception as e:
        raise EngineException(
            message=f"Error running engine: {e}",
            stdout=out,
            stderr=err_logs,
        )
