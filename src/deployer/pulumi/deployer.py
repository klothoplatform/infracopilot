from multiprocessing import Queue
import subprocess
import uuid
from pulumi import automation as auto
import logging
import os
import boto3
from src.auth_service.entity import User
from src.deployer.data.deployment_dao import DeploymentDAO
from src.deployer.data.models import Deployment, DeploymentStatus, Stack
from src.deployer.data.stack_dao import StackDAO
from src.environment_management.models import (
    EnvironmentVersion,
    EnvironmentResourceConfiguration,
)
from src.util.logging import logger


class PreviewFailure(Exception):
    pass


class DeployFailure(Exception):
    pass


class AppDeployer:
    def __init__(
        self, stack: auto.Stack, stack_dao: StackDAO, deployment_dao: DeploymentDAO
    ):
        self.stack = stack
        self.stack_dao = stack_dao
        self.deployment_dao = deployment_dao

    async def run_deploy_worker(self, q: Queue, deployment: Deployment):
        await self.configure_and_deploy(q, deployment)
        q.put("Done")

    async def run_destroy_worker(self, q: Queue, deployment: Deployment):
        await self.destroy_and_remove_stack(q, deployment)
        q.put("Done")

    async def configure_and_deploy(self, q: Queue, deployment: Deployment):
        try:
            self.deployment_dao.add_deployment(deployment)
            preview_result = self.stack.preview()
            logger.info(f"Preview result: {preview_result}")
        except Exception as e:
            deployment.status = DeploymentStatus.FAILED.value
            await self.deployment_dao.update_deployment(deployment)
            logger.error(f"Failed to preview stack", exc_info=True)
            return
        try:
            self.deployment_dao.add_deployment(deployment)
            url = self.deploy_app(q)
            logger.info(
                f"Deployed stack, {self.stack.name}, successfully. Got API Url: {url}"
            )
            deployment.status = DeploymentStatus.SUCCEEDED.value
            await self.deployment_dao.update_deployment(deployment)
            return
        except Exception as e:
            logger.error(
                f"Deployment of stack, {self.stack.name}, failed.", exc_info=True
            )
            logger.info(f"Refreshing stack {self.stack.name}")
            self.stack.refresh()
            deployment.status = DeploymentStatus.FAILED.value
            await self.deployment_dao.update_deployment(deployment)
            return

    # deploy_app deploys the stack and returns the first apiUrl expecting it to be the intended endpoint for tests
    def deploy_app(self, q: Queue) -> auto.UpResult:
        result: auto.UpResult = self.stack.up(on_output=q.put)
        return result

    def configure_pulumi_app(self, cfg: {str: str}):
        for key in cfg:
            self.stack.set_config(f"{key}", auto.ConfigValue(cfg[key]))

    async def destroy_and_remove_stack(self, q: Queue, deployment: Deployment) -> bool:
        try:
            self.deployment_dao.add_deployment(deployment)
            self.stack.destroy(on_output=q.put)
            logger.info(f"Removing stack {self.stack.name}")
            self.stack.workspace.remove_stack(self.stack.name)
            deployment.status = DeploymentStatus.SUCCEEDED.value
            await self.deployment_dao.update_deployment(deployment)
            return True
        except Exception as e:
            logger.error(e)
            logger.info(f"Refreshing stack {self.stack.name}")
            self.stack.refresh()
            deployment.status = DeploymentStatus.FAILED.value
            await self.deployment_dao.update_deployment(deployment)
            return False
