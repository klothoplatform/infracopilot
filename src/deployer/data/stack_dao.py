from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from src.deployer.data.models import Stack
from typing import List


class StackNotFoundError(Exception):
    pass


class StackDAO:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def list_stacks(
        self, architecture_id: str, environment_id: str
    ) -> List[Stack]:
        stmt = select(Stack).where(
            and_(
                Stack.architecture_id == architecture_id,
                Stack.environment_id == environment_id,
            )
        )
        result = await self._session.execute(stmt)
        result = result.fetchall()
        return [row[0] for row in result]

    async def get_stack(
        self, name: str, architecture_id: str, environment_id: str
    ) -> Stack:
        stmt = select(Stack).where(
            and_(
                Stack.name == name,
                Stack.architecture_id == architecture_id,
                Stack.environment_id == environment_id,
            )
        )
        result = await self._session.execute(stmt)
        stack = result.scalar()
        if stack is None:
            raise StackNotFoundError
        return stack

    async def add_stack(self, stack: Stack):
        self._session.add(stack)

    async def update_stack(self, stack: Stack):
        existing_stack = await self.get_stack(
            stack.name, stack.architecture_id, stack.environment_id
        )
        for key, value in stack.__dict__.items():
            setattr(existing_stack, key, value)

    async def delete_stack(self, name: str, architecture_id: str, environment_id: str):
        stack = await self.get_stack(name, architecture_id, environment_id)
        await self._session.delete(stack)
