from fastapi import APIRouter
from fastapi import HTTPException, Request, Response
from pydantic import BaseModel

from src.auth_service.entity import User
from src.auth_service.main import AuthzService
from src.auth_service.token import AuthError, get_user_id
from src.backend_orchestrator.architecture_handler import (
    EnvironmentVersionResponseObject,
    VersionState,
)
from src.dependency_injection.injection import (
    SessionLocal,
    deps,
    get_environment_manager,
)
from src.environment_management.environment_manager import (
    EnvironmentManager,
    EnvironmentTrackingError,
    EnvironmentNotTrackedError,
    BASE_ENV_ID,
)
from src.environment_management.environment_version import (
    EnvironmentVersionDoesNotExistError,
)
from src.state_manager.architecture_storage import ArchitectureStateDoesNotExistError
from src.util.logging import logger

router = APIRouter()


class ExpectedDiff(BaseModel):
    expected: str | None = None
    actual: str | None = None


class InSyncResponse(BaseModel):
    in_sync: bool
    env_diff: ExpectedDiff = None
    version_diff: ExpectedDiff = None


@router.get("/api/architecture/{id}/environment/{env_id}/insync")
async def env_in_sync(
    request: Request,
    id: str,
    env_id: str,
) -> InSyncResponse:
    async with SessionLocal.begin() as db:
        authz = deps.authz_service
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
            logger.error("Error checking if environment is in sync", exc_info=True)
            raise HTTPException(status_code=500, detail="internal server error")


@router.get("/api/architecture/{id}/environment/{env_id}/diff")
async def env_diff(
    request: Request,
    id: str,
    env_id: str,
):
    logger.info(f"Getting diff for architecture: {id}, environment: {env_id}")
    authz: AuthzService = deps.authz_service
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
    async with SessionLocal.begin() as db:
        try:
            manager: EnvironmentManager = get_environment_manager(db)
            diff = await manager.diff_environments(id, BASE_ENV_ID, env_id)
            logger.info(diff.__dict__())
            return diff.__dict__()
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


@router.post("/api/architecture/{id}/environment/{env_id}/promote")
async def promote(
    request: Request,
    id: str,
    env_id: str,
):
    logger.info(f"Promoting environment: {env_id} to architecture: {id}")
    user_id = await get_user_id(request)
    authz: AuthzService = deps.authz_service
    authorized = await authz.can_write_to_architecture(User(id=user_id), id)
    if not authorized:
        raise AuthError(
            detail=f"User {user_id} is not authorized to write to architecture {id}",
            error={
                "code": "unauthorized",
                "description": f"User is not authorized to write to architecture {id}",
            },
        )
    try:
        accept = request.headers.get("accept")
        async with SessionLocal.begin() as db:
            manager: EnvironmentManager = get_environment_manager(db)
            env, result = await manager.promote(
                id, BASE_ENV_ID, env_id, User(id=user_id)
            )
            payload = EnvironmentVersionResponseObject(
                architecture_id=env.architecture_id,
                id=env.id,
                version=env.version,
                state=VersionState(
                    resources_yaml=result.resources_yaml,
                    topology_yaml=result.topology_yaml,
                ),
                env_resource_configuration=env.env_resource_configuration,
                config_errors=result.config_errors_json,
            )
        return Response(
            headers={
                "Content-Type": (
                    "application/octet-stream"
                    if accept == "application/octet-stream"
                    else "application/json"
                )
            },
            content=payload.model_dump(mode="json"),
        )
    except EnvironmentVersionDoesNotExistError as e:
        raise HTTPException(status_code=404, detail=f"Environment {env_id} not found")
    except ArchitectureStateDoesNotExistError as e:
        raise HTTPException(
            status_code=404, detail=f"Environment {env_id} state not found"
        )
    except EnvironmentNotTrackedError as e:
        raise HTTPException(
            status_code=400, detail=f"Environment {env_id} not tracking any environment"
        )
    except EnvironmentTrackingError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Environment {env_id} tracking incorrect environment {e.actual_id} instead of {e.expected_id}",
        )
    except Exception as e:
        logger.error("Error promoting environment", exc_info=True)
        raise HTTPException(status_code=500, detail="internal server error")
