import os
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker, scoped_session
from src.state_manager.architecture_storage import ArchitectureStorage
from src.environment_management.environment_version import EnvironmentVersionDAO
from src.environment_management.environment import EnvironmentDAO
from src.environment_management.architecture import ArchitectureDAO
from src.backend_orchestrator.architecture_handler import ArchitectureHandler
from src.backend_orchestrator.iac_handler import IaCOrchestrator
from src.backend_orchestrator.run_engine_handler import EngineOrchestrator
from src.backend_orchestrator.get_valid_edge_targets_handler import EdgeTargetHandler
from src.environment_management.models import ModelsBase
import boto3
from typing import Generator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker


db = os.getenv("DB_PATH", "")
if db != "":
    db = f"/{db}"
engine = create_async_engine(f"sqlite+aiosqlite://{db}", echo=False)
SessionLocal = async_sessionmaker(engine)


def create_s3_resource():
    return boto3.resource(
        "s3",
        endpoint_url="http://localhost:9000",
        aws_access_key_id="minio",
        aws_secret_access_key="minio123",
    )


async def get_db():
    async with engine.begin() as conn:
        await conn.run_sync(ModelsBase.metadata.create_all)
    db = SessionLocal()
    try:
        yield db
        await db.commit()
    except:
        await db.rollback()
        raise
    finally:
        await db.close()


def get_architecture_storage():
    bucket_name = os.getenv("ARCHITECTURE_BUCKET_NAME", "ifcp-architecture-storage")
    s3_resource = create_s3_resource()
    return ArchitectureStorage(bucket=s3_resource.Bucket(bucket_name))  # type: ignore


def get_environment_version_dao(session: AsyncSession):
    return EnvironmentVersionDAO(
        session=session,
    )


def get_environment_dao(session: AsyncSession):
    return EnvironmentDAO(
        session=session,
    )


def get_architecture_dao(session: AsyncSession):
    return ArchitectureDAO(
        session=session,
    )


def get_architecture_handler(session: AsyncSession):
    return ArchitectureHandler(
        architecture_storage=get_architecture_storage(),
        ev_dao=get_environment_version_dao(session),
        env_dao=get_environment_dao(session),
        arch_dao=get_architecture_dao(session),
    )


def get_iac_orchestrator(session: AsyncSession):
    return IaCOrchestrator(
        architecture_storage=get_architecture_storage(),
        arch_dao=get_architecture_dao(session),
        session=get_environment_version_dao(session),
    )


def get_engine_orchestrator(session: AsyncSession):
    return EngineOrchestrator(
        architecture_storage=get_architecture_storage(),
        ev_dao=get_environment_version_dao(session),
        env_dao=get_environment_dao(session),
    )


def get_edge_target_handler(session: AsyncSession):
    return EdgeTargetHandler(
        architecture_storage=get_architecture_storage(),
        ev_dao=get_environment_version_dao(session),
    )
