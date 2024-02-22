import subprocess
import os
from pulumi import automation as auto
from enum import Enum
import logging
import shutil
import tempfile
from urllib import request
import io
import zipfile

from src.deployer.data.models import Stack

log = logging.getLogger("DeploymentRunner")


class Builds(Enum):
    RELEASE = "release"
    MAINLINE = "main"


class AppBuilder:
    def __init__(self, stack: Stack.ReturnObject, bucket):
        self.stack = stack
        self.output_dir = tempfile.mkdtemp()
        self.bucket = bucket

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        shutil.rmtree(self.output_dir)

    def prepare_stack(self, iac: bytes):
        self.create_output_dir(iac)
        self.install_npm_deps()
        return self.create_pulumi_stack()

    def create_output_dir(self, iac: bytes):
        # Create a BytesIO object from the bytes
        zip_io = io.BytesIO(iac)
        # Open the BytesIO object with zipfile.ZipFile
        with zipfile.ZipFile(zip_io, "r") as zip_file:
            # Extract all files and directories from the zip file
            zip_file.extractall(self.output_dir)

    def create_pulumi_stack(self) -> auto.Stack:
        print(os.getenv("AWS_ENDPOINT"))
        os.environ["PULUMI_DEBUG"] = "true"
        stack = auto.create_or_select_stack(
            f"{self.stack.environment_id}_{self.stack.name}",
            project_name=self.stack.architecture_id,
            work_dir=self.output_dir,
            #     opts=auto.LocalWorkspaceOptions(
            #         project_settings=auto.ProjectSettings(
            #             name=self.app_name,
            #             runtime="nodejs",
            #             backend=auto.ProjectBackend(f's3://{self.bucket.name}/state/{self.app_name}?endpoint=localhost:9000&disableSSL=true&s3ForcePathStyle=true')
            #         ),
            #         env_vars={
            # "AWS_ENDPOINT": "http://localhost:9000",
            #             "AWS_ACCESS_KEY_ID": "minio",
            #     "AWS_SECRET_ACCESS_KEY": "minio123",
            #     "PULUMI_CONFIG_PASSPHRASE": "",
            #     "PULUMI_CONFIG_PASSPHRASE_FILE": "",
            #         }
            #     ),
        )
        log.info(
            f"Successfully created stack for {self.stack.architecture_id} {self.stack.environment_id} {self.stack.name}"
        )
        return stack

    def configure_aws(
        self, stack: auto.Stack, access_key: str, secret_key: str, region: str
    ):
        stack.set_config("aws:accessKey", auto.ConfigValue(access_key))
        stack.set_config("aws:secretKey", auto.ConfigValue(secret_key))
        stack.set_config("aws:region", auto.ConfigValue(region))

    def install_npm_deps(self):
        result: subprocess.CompletedProcess[bytes] = subprocess.run(
            ["npm", "install", "--prefix", self.output_dir],
            stdout=open(os.devnull, "wb"),
        )
        result.check_returncode()
