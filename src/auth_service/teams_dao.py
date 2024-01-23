from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.auth_service.entity import Team, Organization
from typing import List
from src.environment_management.models import ModelsBase
from src.util.logging import logger
from sqlalchemy.orm import Mapped, mapped_column


class ArchitectureDoesNotExistError(Exception):
    pass


class TeamModel(ModelsBase):
    __tablename__ = "teams"

    id: Mapped[str] = mapped_column(primary_key=True)
    organization_id: Mapped[str] = mapped_column()
    name: Mapped[str] = mapped_column(nullable=True)

    def __eq__(self, __value: object) -> bool:
        if not isinstance(__value, Team):
            return False
        return (
            self.id == __value.id
            and self.organization_id == __value.organization_id
            and self.name == __value.name
        )

    def __str__(self) -> str:
        return f"Team(team:{self.id}, organization:{self.organization_id}, name:{self.name})"


class TeamsDAO:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def list_teams(self, organization_id: str) -> List[Team]:
        stmt = select(TeamModel).where(TeamModel.organization_id == organization_id)
        results = await self._session.execute(statement=stmt)
        teams: List[Team] = []
        for result in results.fetchall():
            model: TeamModel = result[0]
            teams.append(
                Team.with_org(
                    id=model.id,
                    name=model.name,
                    organization=Organization(id=model.organization_id),
                )
            )
        return teams

    async def get_team(self, team_id) -> Team:
        stmt = select(TeamModel).where(TeamModel.id == team_id)
        result = await self._session.execute(statement=stmt)
        result = result.fetchone()
        if result is None:
            return None
        model: TeamModel = result[0]
        return Team.with_org(
            id=model.id,
            organization=Organization(id=model.organization_id),
            name=model.name,
        )

    async def batch_get_teams(self, team_ids: List[str]) -> List[Team]:
        stmt = select(TeamModel).where(TeamModel.id.in_(team_ids))
        results = await self._session.execute(statement=stmt)
        teams: List[Team] = []
        for result in results.fetchall():
            model: TeamModel = result[0]
            teams.append(
                Team.with_org(
                    id=model.id,
                    organization=Organization(id=model.organization_id),
                    name=model.name,
                )
            )
        return teams

    async def get_team_by_name(self, team_name: str, organization_id: str) -> Team:
        stmt = (
            select(TeamModel)
            .where(TeamModel.name == team_name)
            .where(TeamModel.organization_id == organization_id)
        )
        result = await self._session.execute(statement=stmt)
        result = result.fetchone()
        if result is None:
            return None
        model: TeamModel = result[0]
        return Team.with_org(
            id=model.id,
            organization=Organization(id=model.organization_id),
            name=model.name,
        )

    def create_team(self, team: Team):
        model = TeamModel(
            id=team.id, organization_id=team.organization.id, name=team.name
        )
        logger.debug(f"Creating team {model} in datastore")
        self._session.add(model)

    async def update_organization(self, team: Team, organization_id: str):
        model = TeamModel(id=team.id, organization_id=organization_id, name=team.name)
        logger.debug(f"Updating team {model} in datastore")
        await self._session.merge(model)

    async def delete_team(self, team_id: str):
        logger.debug(f"Deleting team {team_id} from datastore")
        stmt = select(TeamModel).where(TeamModel.id == team_id)
        team = await self._session.execute(statement=stmt)
        team = team.fetchone()
        if team is None:
            return
        await self._session.delete(team[0])
