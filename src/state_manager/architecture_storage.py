from io import BytesIO
from typing import Optional
import boto3
from pathlib import Path
import logging
from botocore.exceptions import ClientError
from src.engine_service.engine_commands.run import RunEngineResult
import jsons
from src.environment_management.environment_version import EnvironmentVersion


from src.util.aws.s3 import put_object, get_object, delete_object, delete_objects


logger = logging.getLogger(__name__)

from src.util.aws.s3 import put_object, get_object, delete_object, delete_objects

logger = logging.getLogger(__name__)


class ArchitectureStateDoesNotExistError(Exception):
    pass


class WriteStateError(Exception):
    pass


class WriteIacError(Exception):
    pass


class ArchitectureStorage:
    def __init__(self, bucket):
        self._bucket = bucket

    def get_state_from_fs(self, arch: EnvironmentVersion) -> Optional[RunEngineResult]:
        if arch.state_location == None and arch.version == 0:
            return None
        elif arch.state_location == None:
            raise ArchitectureStateDoesNotExistError(
                f"No architecture exists for id {arch.id} and state {arch.version}"
            )
        try:
            obj = self._bucket.Object(arch.state_location)
            state_raw = get_object(obj)
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
        except FileNotFoundError as e:
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

    def get_iac_from_fs(self, arch: EnvironmentVersion) -> Optional[BytesIO]:
        if arch.iac_location is None:
            return None
        try:
            obj = self._bucket.Object(arch.iac_location)
            iac_raw = get_object(obj)
            if iac_raw is None:
                raise ArchitectureStateDoesNotExistError(
                    f"No architecture exists at location: {arch.iac_location}"
                )
            if isinstance(iac_raw, str):
                iac_raw = iac_raw.encode()
            return BytesIO(iac_raw)

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

    def write_state_to_fs(
        self, arch: EnvironmentVersion, content: RunEngineResult
    ) -> str:
        key = ArchitectureStorage.get_path_for_architecture(arch) + "/state.json"
        try:
            if not isinstance(content, RunEngineResult):
                raise TypeError(
                    f"content must be of type RunEngineResult, not {type(content)}"
                )
            obj = self._bucket.Object(key)
            put_object(obj, bytes(jsons.dumps(content), "utf-8"))
            return key
        except Exception as e:
            raise WriteStateError(
                f"Failed to write state to S3 bucket {self._bucket.name} and key {key}: {e}"
            )

    def write_iac_to_fs(self, arch: EnvironmentVersion, content: bytes) -> str:
        key = ArchitectureStorage.get_path_for_architecture(arch) + "/iac.zip"
        try:
            if not isinstance(content, bytes):
                raise TypeError(f"content must be of type bytes, not {type(content)}")
            obj = self._bucket.Object(key)
            put_object(obj, content)
            return key
        except Exception as e:
            raise WriteIacError(
                f"Failed to write iac to S3 bucket {self._bucket.name} and key {key}: {e}"
            )

    def delete_state_from_fs(self, arch: EnvironmentVersion):
        keys = [
            ArchitectureStorage.get_path_for_architecture(arch) + "/state.json",
            ArchitectureStorage.get_path_for_architecture(arch) + "/iac.zip",
        ]
        try:
            delete_objects(self._bucket, keys)
        except Exception as e:
            raise WriteStateError(
                f"Failed to delete state from S3 bucket {self._bucket.name} and key {keys}: {e}"
            )

    @staticmethod
    def get_path_for_architecture(env: EnvironmentVersion) -> str:
        root_path = "state"
        return "/".join([root_path, env.architecture_id, env.id, str(env.version)])
