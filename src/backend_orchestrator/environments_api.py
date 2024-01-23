from fastapi import Depends, HTTPException, Request, Response
from pydantic import BaseModel
from src.auth_service.main import AuthzService
from src.auth_service.token import PUBLIC_USER, AuthError, get_user_id
from src.dependency_injection.injection import (
    get_authz_service,
    get_environment_manager,
    get_db,
)
from fastapi import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession
from src.auth_service.entity import User
from src.util.logging import logger
from src.environment_management.environment_manager import (
    EnvironmentManager,
    EnvironmentTrackingError,
    EnvironmentNotTrackedError,
)

router = APIRouter()


class Diff(BaseModel):
    expected: str | None = None
    actual: str | None = None


class InSyncResponse(BaseModel):
    in_sync: bool
    env_diff: Diff = None
    version_diff: Diff = None


@router.get("/api/architecture/{id}/environment/{env_id}/insync")
async def env_in_sync(
    request: Request,
    id: str,
    env_id: str,
    db: AsyncSession = Depends(get_db),
    authz: AuthzService = Depends(get_authz_service),
) -> InSyncResponse:
    user_id = get_user_id(request)
    authorized = await authz.can_read_architecture(User(id=user_id), id)
    if not authorized:
        raise AuthError(
            detail=f"User {user_id} is not authorized to read architecture {id}",
            error={
                "code": "unauthorized",
                "description": f"User is not authorized to write to architecture {id}",
            },
        )
    try:
        manager: EnvironmentManager = get_environment_manager(db)
        is_in_sync: [bool, str, str] = await manager.is_in_sync(id, env_id)
        if is_in_sync[0]:
            return InSyncResponse(in_sync=True)
        else:
            return InSyncResponse(
                in_sync=False,
                version_diff=Diff(expected=is_in_sync[1], actual=is_in_sync[2]),
            )
    except EnvironmentTrackingError as e:
        return InSyncResponse(
            in_sync=False, env_diff=Diff(expected=e.expected_id, actual=e.actual_id)
        )
    except EnvironmentNotTrackedError as e:
        return InSyncResponse(
            in_sync=False, env_diff=Diff(expected=e.env_id, actual=None)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="internal server error")
