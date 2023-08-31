# @klotho::execution_unit {
#    id = "main"
# }
from io import BytesIO
from typing import Optional
from pathlib import Path
import os

import jsons
from botocore.exceptions import ClientError

from src.engine_service.engine_commands.run import RunEngineResult


# @klotho::persist {
#   id = "architecturestore"
# }
import aiofiles

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
                    f"No architecture exists at location: {get_path_for_architecture(arch)}"
                )
            return jsons.loads(state_raw, RunEngineResult)
    except FileNotFoundError:
        raise ArchitectureStateDoesNotExistError(
            f"No architecture exists at location: {get_path_for_architecture(arch)}"
        )
    except ClientError as err:
        # This is only necessary because Klotho's fs implementation
        # doesn't convert this to FileNotFoundError
        if err.response["Error"]["Code"] == "NoSuchKey":
            raise ArchitectureStateDoesNotExistError(
                f"No architecture exists at location: {get_path_for_architecture(arch)}"
            )
        raise


async def get_iac_from_fs(arch: Architecture) -> Optional[str]:
    if arch.iac_location == None:
        return None
    try:
        async with aiofiles.open(arch.iac_location, mode="r") as f:
            state_raw = await f.read()
            if state_raw is None:
                raise ArchitectureStateDoesNotExistError(
                    f"No architecture exists at location: {get_path_for_architecture(arch)}"
                )
            return state_raw
    except FileNotFoundError:
        raise ArchitectureStateDoesNotExistError(
            f"No architecture exists at location: {get_path_for_architecture(arch)}"
        )
    except ClientError as err:
        # This is only necessary because Klotho's fs implementation
        # doesn't convert this to FileNotFoundError
        if err.response["Error"]["Code"] == "NoSuchKey":
            raise ArchitectureStateDoesNotExistError(
                f"No architecture exists at location: {get_path_for_architecture(arch)}"
            )
        raise


async def write_state_to_fs(arch: Architecture, content: RunEngineResult) -> str:
    if not isinstance(content, RunEngineResult):
        raise TypeError(f"content must be of type RunEngineResult, not {type(content)}")
    path = f"{get_path_for_architecture(arch)}/state.json"
    if os.getenv("EXECUNIT_NAME") is None:
        # When running in local dev, we need to create the directory.
        # When running in the cloud, the path is just the S3 object's id - no parent creation necessary.
        Path(os.path.dirname(path)).mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(path, mode="w") as f:
        await f.write(jsons.dumps(content))
    return path


async def write_iac_to_fs(arch: Architecture, content: BytesIO) -> str:
    path = f"{get_path_for_architecture(arch)}/iac.zip"
    if os.getenv("EXECUNIT_NAME") is None:
        # When running in local dev, we need to create the directory.
        # When running in the cloud, the path is just the S3 object's id - no parent creation necessary.
        Path(os.path.dirname(path)).mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(path, mode="w") as f:
        await f.write(content)
    return path


def get_path_for_architecture(arch: Architecture) -> Path:
    return root_path / arch.id
