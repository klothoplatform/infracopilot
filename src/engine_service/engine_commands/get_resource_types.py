from src.engine_service.binaries.fetcher import Binary, BinaryStorage
from src.engine_service.engine_commands.util import run_engine_command


async def get_resource_types(store: BinaryStorage) -> str:
    args = []

    store.ensure_binary(Binary.ENGINE)
    out, err_logs = await run_engine_command(
        "ListResourceTypes",
        *args,
    )
    return out
