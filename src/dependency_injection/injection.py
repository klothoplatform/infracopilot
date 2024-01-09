import os
import logging

from src.state_manager.architecture_storage import ArchitectureStorage
from src.engine_service.binaries.fetcher import BinaryStorage
from src.environment_management.environment_version import EnvironmentVersionDAO
from src.environment_management.environment import EnvironmentDAO
from src.environment_management.architecture import ArchitectureDAO
from src.backend_orchestrator.architecture_handler import ArchitectureHandler
from src.backend_orchestrator.iac_handler import IaCOrchestrator
from src.backend_orchestrator.run_engine_handler import EngineOrchestrator
from src.backend_orchestrator.get_valid_edge_targets_handler import EdgeTargetHandler
from src.environment_management.models import ModelsBase
from src.auth_service.main import AuthzService
from src.auth_service.fga_manager import FGAManager
from src.auth_service.teams_manager import TeamsManager
import boto3
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from openfga_sdk import ClientConfiguration
from openfga_sdk.credentials import Credentials, CredentialConfiguration
from src.util.secrets import (
    get_fga_secret,
    get_fga_client,
    get_fga_model,
    get_fga_store,
)

log = logging.getLogger(__name__)

db = os.getenv("DB_PATH", "")
if db != "":
    engine = create_async_engine(f"sqlite+aiosqlite:///{db}", echo=False)
elif os.getenv("DB_ENDPOINT", "") != "":
    endpoint = os.getenv("DB_ENDPOINT", "")
    username = os.getenv("DB_USERNAME", "")
    password = os.getenv("DB_PASSWORD", "")
    conn = f"postgresql+asyncpg://{username}:{password}@{endpoint}/main"
    log.info("Connecting to database: %s", conn)
    engine = create_async_engine(conn, echo=False)
else:
    engine = create_async_engine(f"sqlite+aiosqlite://", echo=False)

SessionLocal = async_sessionmaker(engine)


def create_s3_resource():
    if os.getenv("ARCHITECTURE_BUCKET_NAME", None) is None:
        return boto3.resource(
            "s3",
            endpoint_url="http://localhost:9000",
            aws_access_key_id="minio",
            aws_secret_access_key="minio123",
        )
    else:
        return boto3.resource("s3")


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


async def get_fga_manager() -> FGAManager:
    secret = get_fga_secret()
    client_id = get_fga_client()
    store_name = os.environ.get("FGA_STORE_NAME")
    store_id = os.environ.get("FGA_STORE_ID")
    authorization_model_id = os.environ.get("FGA_AUTHORIZATION_MODEL_ID")

    # Step 02. Initialize the SDK
    # credentials = None
    # if secret and client_id:
    #     credentials = Credentials(
    #         method="client_credentials",
    #         configuration=CredentialConfiguration(
    #             api_issuer="fga.us.auth0.com",
    #             api_audience="https://api.us1.fga.dev/",
    #             client_id=client_id,
    #             client_secret=secret,  # Secret you got from this page
    #         ),
    # configuration=CredentialConfiguration(
    #     api_issuer="fga.us.auth0.com",
    #     api_audience="https://api.us1.fga.dev/",
    #     client_id=client_id,
    #     client_secret=secret,  # Secret you got from this page
    # ),
    # )

    configuration = ClientConfiguration(
        api_scheme=os.environ.get("FGA_API_SCHEME"),
        api_host=os.environ.get(
            "FGA_API_HOST"
        ),  # required, define without the scheme (e.g. api.fga.example instead of https://api.fga.example)
        store_id=store_id,  # optional, not needed for \`CreateStore\` and \`ListStores\`, required before calling for all other methods
        # model_id = os.environ.get('FGA_MODEL_ID'), # optional, can be overridden per request
        # TODO: Dont use secrets for this in case it updates
        authorization_model_id=authorization_model_id,  # Optionally, you can specify a model id to target, which can improve latency, this will need to be changed every time we update the model, so in the future lets bootstrap this
        # credentials=credentials,
        # api_scheme="https",
        # api_host="api.us1.fga.dev",
        # store_id=store_id,
        # # TODO: Dont use secrets for this in case it updates
        # authorization_model_id=authorization_model_id,  # Optionally, you can specify a model id to target, which can improve latency, this will need to be changed every time we update the model, so in the future lets bootstrap this
        # credentials=credentials,
    )

    manager = FGAManager(configuration=configuration)
    if store_name is None and store_id is None:
        raise Exception("Store id or name must be defined")

    # forces creation of our local store
    if store_id is None:
        stores = await manager.list_stores()
        for store in stores:
            if store.name == store_name:
                store_id = store.id
                break
        if store_id is None:
            store_id = await manager.create_store("test-store")
        manager.configuration.store_id = store_id

    if authorization_model_id is None:
        authorization_model_id = await manager.write_authorization_model()
        manager.configuration.authorization_model_id = authorization_model_id

    return manager


async def get_authz_service() -> AuthzService:
    manager = await get_fga_manager()
    return AuthzService(
        manager=manager,
        store_id=manager.configuration.store_id,
    )


async def get_teams_manager(session: AsyncSession) -> TeamsManager:
    manager = await get_fga_manager()
    teams_dao = TeamsDAO(session=session)
    return TeamsManager(
        manager=manager,
        teams_dao=teams_dao,
    )


def get_architecture_storage():
    bucket_name = os.getenv("ARCHITECTURE_BUCKET_NAME", "ifcp-architecture-storage")
    s3_resource = create_s3_resource()
    return ArchitectureStorage(bucket=s3_resource.Bucket(bucket_name))  # type: ignore


def get_binary_storage():
    bucket_name = os.getenv("BINARY_BUCKET_NAME", "ifcp-binary-storage")
    s3_resource = create_s3_resource()
    return BinaryStorage(bucket=s3_resource.Bucket(bucket_name))  # type: ignore


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
        binary_storage=get_binary_storage(),
    )


def get_engine_orchestrator(session: AsyncSession):
    return EngineOrchestrator(
        architecture_storage=get_architecture_storage(),
        ev_dao=get_environment_version_dao(session),
        env_dao=get_environment_dao(session),
        binary_storage=get_binary_storage(),
    )


def get_edge_target_handler(session: AsyncSession):
    return EdgeTargetHandler(
        architecture_storage=get_architecture_storage(),
        ev_dao=get_environment_version_dao(session),
        binary_storage=get_binary_storage(),
    )
