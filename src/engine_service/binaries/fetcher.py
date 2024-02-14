import logging
import os
from enum import Enum
from io import BytesIO
from pathlib import Path

from botocore.exceptions import ClientError

from src.util.aws.s3 import get_object

log = logging.getLogger()

# root_path is the root for the binaries if they are not overridden. For lambdas, since the root FS is read-only
# this must be somewhere in /tmp
root_path = Path(os.environ.get("BINARIES_ROOT", "/tmp"))

# engine_path and iac_path are the paths to the binaries if they are overridden. This is useful for local testing
# and can be easily set to the one on your path via `ENGINE_PATH=$(which engine)`
engine_path = os.environ.get("ENGINE_PATH")
iac_path = os.environ.get("IAC_PATH")


class Binary(Enum):
    ENGINE = "engine"
    IAC = "iac"

    @property
    def path(self):
        if self == Binary.ENGINE:
            if engine_path is not None:
                return Path(engine_path)
        elif self == Binary.IAC:
            if iac_path is not None:
                return Path(iac_path)

        return root_path / self.value


class BinaryNotFoundException(Exception):
    pass


class BinaryStorage:
    def __init__(self, bucket) -> None:
        self._bucket = bucket

    def get_binary(self, binary: Binary) -> BytesIO:
        path = binary.value
        try:
            log.info(f"Reading binary from {path}")
            obj = self._bucket.Object(path)
            binary_raw = get_object(obj)
            if binary_raw is None:
                raise BinaryNotFoundException(f"Empty result from {path}")
            if isinstance(binary_raw, str):
                binary_raw = binary_raw.encode()
            return BytesIO(binary_raw)
        except ClientError as err:
            if err.response["Error"]["Code"] == "NoSuchKey":
                log.error(f"Binary not found at {path}")
                raise BinaryNotFoundException(f"Binary not found at {path}") from err
            raise

    # write binary to disk checks to see if the binary passed in exists otherwise it will read it and write it to disk
    def ensure_binary(self, binary: Binary):
        if not binary.path.exists():
            raw = self.get_binary(binary)
            binary.path.parent.mkdir(parents=True, exist_ok=True)
            with binary.path.open("wb") as file:
                file.write(raw.getbuffer())
            os.chmod(binary.path, 0o755)
            print(f"Successfully wrote {binary.path} : {binary.path.exists()}")
