from dataclasses import dataclass

from src.engine_service.binaries.fetcher import Binary, BinaryStorage
from src.engine_service.engine_commands.util import run_engine_command, EngineException


async def get_resource_types(store: BinaryStorage) -> str:
    out = None
    err_logs = None
    try:
        args = []

        store.ensure_binary(Binary.ENGINE)
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
