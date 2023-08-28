import decimal
from datetime import datetime
from typing import List, Dict, Optional
from dataclasses import dataclass, field
from pathlib import Path
import os

from aiocache import Cache
import jsons
from dataclasses_json import dataclass_json
from botocore.exceptions import ClientError


# @klotho::persist {
#   id = "architecture_store"
# }
import aiofiles

from src.state_manager.architecture_data import Architecture

root_path = Path("state")

class ArchitectureStateDoesNotExistError(Exception):
    pass


async def get_state_from_fs(arch: Architecture) -> Optional[str]:
    print(arch.state)
    if arch.state == 0:
        return None
    try:
        async with aiofiles.open(get_path_for_architecture(arch), mode="r") as f:
            state_raw = await f.read()
            if state_raw is None:
                raise ArchitectureStateDoesNotExistError(f'No architecture exists at location: {get_path_for_architecture(arch)}')
            return state_raw
    except FileNotFoundError:
        raise ArchitectureStateDoesNotExistError(f'No architecture exists at location: {get_path_for_architecture(arch)}')
    except ClientError as err:
        # This is only necessary because Klotho's fs implementation
        # doesn't convert this to FileNotFoundError
        if err.response["Error"]["Code"] == "NoSuchKey":
            raise ArchitectureStateDoesNotExistError(f'No architecture exists at location: {get_path_for_architecture(arch)}')
        raise


async def write_state_to_fs(arch: Architecture, content: str):
    if os.getenv("EXECUNIT_NAME") is None:
        # When running in local dev, we need to create the directory.
        # When running in the cloud, the path is just the S3 object's id - no parent creation necessary.
        Path(os.path.dirname(get_path_for_architecture(arch))).mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(get_path_for_architecture(arch), mode="w") as f:
        await f.write(content)

def get_path_for_architecture(arch: Architecture) -> Path:
    return root_path / arch.id / f"{arch.state}.zip"