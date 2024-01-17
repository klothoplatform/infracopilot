from fastapi import Depends, Request, Response
from pydantic import BaseModel
from src.auth_service.entity import Team, User
from src.auth_service.teams_manager import TeamsManager
from src.auth_service.token import PUBLIC_USER, AuthError, get_user_id
from src.dependency_injection.injection import get_teams_manager, get_db
from fastapi import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession
from src.util.logging import logger

router = APIRouter()


class CreateTeamRequest(BaseModel):
    name: str


class CreateTeamResponse(BaseModel):
    name: str


@router.post("/api/teams")
async def create_team(
    request: Request, body: CreateTeamRequest, db: AsyncSession = Depends(get_db)
) -> CreateTeamResponse:
    logger.debug(f"Creating team {body.name}")
    user_id = get_user_id(request)
    if user_id == PUBLIC_USER:
        raise AuthError(
            detail=f"User {user_id} is not authorized to create teams",
            error={
                "code": "unauthorized",
                "description": f"User is not authorized to create teams",
            },
        )
    user = User(user_id)
    teams_manager: TeamsManager = await get_teams_manager(db)
    logger.debug(f"Getting user's organization")
    org = await teams_manager.get_users_organization(user)
    logger.debug(f"Got user's organization {org}")
    if org is None:
        raise AuthError(
            detail=f"User {user_id} is not authorized to create teams",
            error={
                "code": "unauthorized",
                "description": f"User is not authorized to create teams",
            },
        )
    await teams_manager.create_team(body.name, user, org)
    return CreateTeamResponse(name=body.name)


class ListTeamsResponse(BaseModel):
    teams: list[Team]


class ListTeamMembersResponse(BaseModel):
    members: list[User]


@router.get("/api/teams")
async def list_teams(
    request: Request, db: AsyncSession = Depends(get_db)
) -> ListTeamsResponse:
    user_id = get_user_id(request)
    logger.debug(f"Listing teams for user {user_id}")
    if user_id == PUBLIC_USER:
        raise AuthError(
            detail=f"User {user_id} is not authorized to list teams",
            error={
                "code": "unauthorized",
                "description": f"User is not authorized to list teams",
            },
        )
    user = User(user_id)
    teams_manager: TeamsManager = await get_teams_manager(db)
    teams = await teams_manager.get_users_teams(user)
    result = []
    for team in teams:
        team_with_info = Team(id=team.id)
        team_with_info.name = team.name
        team_with_info.organization = team.organization
        team_with_info.admins = await teams_manager.get_team_admins(team)
        team_with_info.parent = await teams_manager.get_parent(team)
        team_with_info.members = await teams_manager.get_team_members(team)
        result.append(team_with_info)
    logger.info(f"Found teams {result} for user {user_id}")
    return ListTeamsResponse(teams=result)


@router.get("/api/organization/teams")
async def list_teams_for_org(
    request: Request, db: AsyncSession = Depends(get_db)
) -> ListTeamsResponse:
    user_id = get_user_id(request)
    if user_id == PUBLIC_USER:
        raise AuthError(
            detail=f"User {user_id} is not authorized to list teams",
            error={
                "code": "unauthorized",
                "description": f"User is not authorized to list teams",
            },
        )
    user = User(user_id)
    teams_manager: TeamsManager = await get_teams_manager(db)
    org = await teams_manager.get_users_organization(user)
    if org is None:
        raise AuthError(
            detail=f"User {user_id} is not authorized to list teams",
            error={
                "code": "unauthorized",
                "description": f"User is not authorized to list teams",
            },
        )
    admin = await teams_manager.get_org_admins(org)
    if user.id not in [a.id for a in admin]:
        raise AuthError(
            detail=f"User {user_id} is not authorized to list teams",
            error={
                "code": "unauthorized",
                "description": f"User is not authorized to list teams",
            },
        )
    teams = await teams_manager.list_teams_for_org(org.id)
    return ListTeamsResponse(teams=teams)


@router.get("/api/my-org/members")
async def list_org_members(
    request: Request, db: AsyncSession = Depends(get_db)
) -> ListTeamMembersResponse:
    user_id = get_user_id(request)
    if user_id == PUBLIC_USER:
        raise AuthError(
            detail=f"User {user_id} is not authorized to list team members",
            error={
                "code": "unauthorized",
                "description": f"User is not authorized to list team members",
            },
        )
    user = User(user_id)
    teams_manager: TeamsManager = await get_teams_manager(db)
    org = await teams_manager.get_users_organization(user)
    if org is None:
        raise AuthError(
            detail=f"User {user_id} is not authorized to list team members",
            error={
                "code": "unauthorized",
                "description": f"User is not authorized to list team members",
            },
        )
    members = await teams_manager.get_org_members(org)
    return ListTeamMembersResponse(members=members)
