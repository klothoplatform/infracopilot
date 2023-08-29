from typing import Optional
from pathlib import Path
import os

from botocore.exceptions import ClientError


# @klotho::persist {
#   id = "guardrails-store"
# }
import aiofiles

root_path = Path("guardrails")


async def get_guardrails(org_id: str) -> Optional[str]:
    try:
        async with aiofiles.open(root_path / f"{org_id}.yaml", mode="r") as f:
            state_raw = await f.read()
            return state_raw
    except FileNotFoundError:
        return None
    except ClientError as err:
        # This is only necessary because Klotho's fs implementation
        # doesn't convert this to FileNotFoundError
        if err.response["Error"]["Code"] == "NoSuchKey":
            return None
        raise


async def write_guardrails(org_id: str, content: str):
    if os.getenv("EXECUNIT_NAME") is None:
        # When running in local dev, we need to create the directory.
        # When running in the cloud, the path is just the S3 object's id - no parent creation necessary.
        root_path.mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(root_path / f"{org_id}.yaml", mode="w") as f:
        await f.write(content)
