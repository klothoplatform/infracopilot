from dataclasses import dataclass

from src.engine_service.binaries.fetcher import Binary, write_binary_to_disk
from src.engine_service.engine_commands.util import run_engine_command, EngineException


def get_resource_types() -> str:
    out = None
    err_logs = None
    try:
        args = []

        write_binary_to_disk(Binary.ENGINE)
        out, err_logs = run_engine_command(
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
