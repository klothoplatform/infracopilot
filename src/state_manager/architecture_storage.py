# @klotho::execution_unit {
#    id = "main"
# }
import json
import os
from io import BytesIO
from pathlib import Path
from typing import Optional

# @klotho::persist {
#   id = "architecturestore"
# }
import aiofiles
import jsons
from botocore.exceptions import ClientError

from src.engine_service.engine_commands.run import RunEngineResult
from src.state_manager.architecture_data import Architecture

root_path = Path("state")


class ArchitectureStateDoesNotExistError(Exception):
    pass


async def get_state_from_fs(arch: Architecture) -> Optional[RunEngineResult]:
    if arch.state_location == None and arch.state == 0:
        return None
    elif arch.state_location == None:
        raise ArchitectureStateDoesNotExistError(
            f"No architecture exists for id {arch.id} and state {arch.state}"
        )
    try:
        async with aiofiles.open(arch.state_location, mode="r") as f:
            state_raw = await f.read()
            if state_raw is None:
                raise ArchitectureStateDoesNotExistError(
                    f"No architecture exists at location: {arch.state_location}"
                )
            data = jsons.loads(state_raw)
            return RunEngineResult(
                resources_yaml=data.get("resources_yaml", ""),
                topology_yaml=data.get("topology_yaml", ""),
                iac_topology=data.get("iac_topology", ""),
                config_errors_json=data.get("config_errors_json", []),
            )
    except FileNotFoundError:
        raise ArchitectureStateDoesNotExistError(
            f"No architecture exists at location: {arch.state_location}"
        )
    except ClientError as err:
        # This is only necessary because Klotho's fs implementation
        # doesn't convert this to FileNotFoundError
        if err.response["Error"]["Code"] == "NoSuchKey":
            raise ArchitectureStateDoesNotExistError(
                f"No architecture exists at location: {arch.state_location}"
            )
        raise


async def get_iac_from_fs(arch: Architecture) -> Optional[BytesIO]:
    if arch.iac_location is None:
        return None
    try:
        async with aiofiles.open(arch.iac_location, mode="rb") as f:
            state_raw = await f.read()
            if state_raw is None:
                raise ArchitectureStateDoesNotExistError(
                    f"No architecture exists at location: {arch.iac_location}"
                )
            if isinstance(state_raw, str):
                state_raw = state_raw.encode()
            return BytesIO(state_raw)

    except FileNotFoundError:
        raise ArchitectureStateDoesNotExistError(
            f"No architecture exists at location: {arch.iac_location}"
        )
    except ClientError as err:
        # This is only necessary because Klotho's fs implementation
        # doesn't convert this to FileNotFoundError
        if err.response["Error"]["Code"] == "NoSuchKey":
            raise ArchitectureStateDoesNotExistError(
                f"No architecture exists at location: {arch.iac_location}"
            )
        raise


async def write_state_to_fs(arch: Architecture, content: RunEngineResult) -> str:
    if not isinstance(content, RunEngineResult):
        raise TypeError(f"content must be of type RunEngineResult, not {type(content)}")
    return await write_file_to_fs(arch, jsons.dumps(content), "state.json", "w")


async def write_iac_to_fs(arch: Architecture, content: BytesIO) -> str:
    if not isinstance(content, BytesIO):
        raise TypeError(f"content must be of type BytesIO, not {type(content)}")
    return await write_file_to_fs(arch, content.getvalue(), "iac.zip", "wb")


async def write_file_to_fs(
    arch: Architecture, content: any, filename: str, mode: str
) -> str:
    path = str(Path(get_path_for_architecture(arch)) / filename)
    if os.getenv("EXECUNIT_NAME") is None:
        # When running in local dev, we need to create the directory.
        # When running in the cloud, the path is just the S3 object's id - no parent creation necessary.
        Path(os.path.dirname(path)).mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(path, mode=mode) as f:
        await f.write(content)
    return path


def get_path_for_architecture(arch: Architecture) -> Path:
    return root_path / arch.id / str(arch.state)
