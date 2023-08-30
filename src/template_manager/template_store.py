# @klotho::execution_unit {
#    id = "main"
# }
from pathlib import Path

from botocore.exceptions import ClientError
import os

# @klotho::persist {
#   id = "template_store"
# }
import aiofiles


class TemplateDoesNotExistError(Exception):
    pass


async def get_template(location: str) -> str:
    try:
        async with aiofiles.open(location, mode="r") as f:
            state_raw = await f.read()
            return state_raw
    except FileNotFoundError:
        raise TemplateDoesNotExistError(f"No template exists at location: {location}")
    except ClientError as err:
        # This is only necessary because Klotho's fs implementation
        # doesn't convert this to FileNotFoundError
        if err.response["Error"]["Code"] == "NoSuchKey":
            raise TemplateDoesNotExistError(
                f"No template exists at location: {location}"
            )
        raise


async def write_template_for_owner(location: str, template: str):
    if os.getenv("EXECUNIT_NAME") is None:
        # When running in local dev, we need to create the directory.
        # When running in the cloud, the path is just the S3 object's id - no parent creation necessary.
        Path(os.path.dirname(location)).mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(location, mode="w") as f:
        await f.write(template)
