# @klotho::execution_unit {
#    id = "main"
# }
from typing import Optional
from pathlib import Path
import os
from enum import Enum
from botocore.exceptions import ClientError


# @klotho::persist {
#   id = "binarystore"
# }
import aiofiles

# @klotho::static_unit {
#   id = "binarystore"
#   static_files = ["/binaries/**"]
# }

root_path = Path("binaries")

iac_binary_path_suffix = "iac"
engine_binary_path_suffix = "engine"

engine_path = os.environ.get(
    "ENGINE_PATH", os.path.abspath(f"{root_path}/{engine_binary_path_suffix}")
)
iac_cli_path = os.environ.get(
    "IAC_CLI_PATH", os.path.abspath(f"{root_path}/{iac_binary_path_suffix}")
)

engine_executable_path = "/tmp/engine"
iac_cli_executable_path = "/tmp/iac"


class Binary(Enum):
    ENGINE = engine_binary_path_suffix
    IAC = iac_binary_path_suffix


async def get_binary(binary: Binary) -> Optional[str]:
    path = engine_path if binary == Binary.ENGINE else iac_cli_path
    try:
        async with aiofiles.open(path, mode="rb") as f:
            b_raw = await f.read()
            return b_raw
    except FileNotFoundError:
        return None
    except ClientError as err:
        # This is only necessary because Klotho's fs implementation
        # doesn't convert this to FileNotFoundError
        if err.response["Error"]["Code"] == "NoSuchKey":
            return None
        raise


# write binary to disk checks to see if the binary passed in exists otherwise it will read it and write it to disk
async def write_binary_to_disk(binary: Binary):
    path = (
        engine_executable_path if binary == Binary.ENGINE else iac_cli_executable_path
    )
    if not os.path.exists(path):
        raw = await get_binary(binary)
        with open(path, "wb") as file:
            file.write(raw)
        os.chmod(path, 0o755)
