from typing import List
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from src.deployer.data.models import Deployment, Stack


class DeploymentNotFoundError(Exception):
    pass


class DeploymentDAO:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_deployment(self, deployment_id: str) -> Deployment:
        stmt = select(Deployment).where(Deployment.id == deployment_id)
        result = await self._session.execute(stmt)
        deployment = result.scalar()
        if deployment is None:
            raise DeploymentNotFoundError
        return deployment

    def add_deployment(self, deployment: Deployment):
        self._session.add(deployment)

    async def update_deployment(self, deployment: Deployment):
        stmt = (
            update(Deployment)
            .where(Deployment.id == deployment.id)
            .values(
                architecture_id=deployment.architecture_id,
                environment_id=deployment.environment_id,
                stack_name=deployment.stack_name,
                version=deployment.version,
                action=deployment.action,
                status=deployment.status,
                status_reason=deployment.status_reason,
                diff=deployment.diff,
                initiated_at=deployment.initiated_at,
                initiated_by=deployment.initiated_by,
            )
        )
        await self._session.execute(stmt)

    async def delete_deployment(self, deployment_id: str):
        deployment = await self.get_deployment(deployment_id)
        await self._session.delete(deployment)

    async def get_deployments_by_stack(self, stack: Stack) -> List[Deployment]:
        stmt = (
            select(Deployment)
            .where(Deployment.stack_name == stack.name)
            .where(Deployment.architecture_id == stack.architecture_id)
            .where(Deployment.environment_id == stack.environment_id)
        )
        result = await self._session.execute(stmt)
        result = result.fetchall()
        return [row[0] for row in result]
