from typing import List
from src.auth_service.entity import User
from src.deployer.data.deployment_dao import DeploymentDAO
from src.deployer.data.models import Deployment, Stack
from src.deployer.data.stack_dao import StackDAO
import datetime


class StackManager:
    def __init__(self, stack_dao: StackDAO, deployment_dao: DeploymentDAO):
        self.stack_dao = stack_dao
        self.deployment_dao = deployment_dao

    async def create_stack(
        self,
        user: User,
        name: str,
        architecture_id: str,
        environment_id: str,
        provider: str,
        provider_details: dict,
    ) -> Stack:
        stack = Stack(
            created_by=user.to_auth_string(),
            created_at=datetime.datetime.now(),
            name=name,
            architecture_id=architecture_id,
            environment_id=environment_id,
            provider=provider,
            provider_details=provider_details,
        )
        await self.stack_dao.add_stack(stack)
        return stack

    async def list_stacks(
        self, architecture_id: str, environment_id: str
    ) -> List[Stack]:
        return await self.stack_dao.list_stacks(architecture_id, environment_id)

    async def get_stack(
        self, name: str, architecture_id: str, environment_id: str
    ) -> Stack:
        return await self.stack_dao.get_stack(name, architecture_id, environment_id)

    async def update_stack(self, stack: Stack):
        await self.stack_dao.update_stack(stack)

    async def delete_stack(self, name: str, architecture_id: str, environment_id: str):
        await self.stack_dao.delete_stack(name, architecture_id, environment_id)

    async def get_stack_events(self, stack: Stack) -> List[Deployment]:
        return await self.deployment_dao.get_deployments_by_stack(stack)
