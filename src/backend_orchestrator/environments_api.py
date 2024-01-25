from fastapi import Depends, HTTPException, Request, Response
from pydantic import BaseModel
from src.auth_service.main import AuthzService
from src.auth_service.token import PUBLIC_USER, AuthError, get_user_id
from src.dependency_injection.injection import (
    SessionLocal,
    deps,
    get_environment_manager,
    get_db,
)
from fastapi import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession
from src.auth_service.entity import User
from src.environment_management.environment_version import (
    EnvironmentVersionDoesNotExistError,
)
from src.state_manager.architecture_storage import ArchitectureStateDoesNotExistError
from src.util.logging import logger
from src.environment_management.environment_manager import (
    EnvironmentManager,
    EnvironmentTrackingError,
    EnvironmentNotTrackedError,
)

router = APIRouter()


class ExpectedDiff(BaseModel):
    expected: str | None = None
    actual: str | None = None


class InSyncResponse(BaseModel):
    in_sync: bool
    env_diff: ExpectedDiff = None
    version_diff: ExpectedDiff = None


BASE_ENV_ID = "default"


@router.get("/api/architecture/{id}/environment/{env_id}/insync")
async def env_in_sync(
    request: Request,
    id: str,
    env_id: str,
) -> InSyncResponse:
    async with SessionLocal.begin() as db:
        authz = deps["authz_service"]
        user_id = await get_user_id(request)
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
            is_in_sync: [bool, str, str] = await manager.is_in_sync(
                id, BASE_ENV_ID, env_id
            )
            if is_in_sync[0]:
                return InSyncResponse(in_sync=True)
            else:
                return InSyncResponse(
                    in_sync=False,
                    version_diff=ExpectedDiff(
                        expected=is_in_sync[1], actual=is_in_sync[2]
                    ),
                )
        except EnvironmentTrackingError as e:
            return InSyncResponse(
                in_sync=False,
                env_diff=ExpectedDiff(expected=e.expected_id, actual=e.actual_id),
            )
        except EnvironmentNotTrackedError as e:
            return InSyncResponse(
                in_sync=False, env_diff=ExpectedDiff(expected=e.env_id, actual=None)
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail="internal server error")


@router.get("/api/architecture/{id}/environment/{env_id}/diff")
async def env_diff(
    request: Request,
    id: str,
    env_id: str,
):
    async with SessionLocal.begin() as db:
        authz = deps["authz_service"]
        user_id = await get_user_id(request)
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
            diff = await manager.diff_environments(id, BASE_ENV_ID, env_id)
            return diff
        except EnvironmentVersionDoesNotExistError as e:
            raise HTTPException(
                status_code=404, detail=f"Environment {env_id} not found"
            )
        except ArchitectureStateDoesNotExistError as e:
            raise HTTPException(
                status_code=404, detail=f"Environment {env_id} state not found"
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail="internal server error")
