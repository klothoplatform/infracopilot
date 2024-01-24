import logging
from src.engine_service.engine_commands.run import RunEngineResult
from src.environment_management.architecture import ArchitectureDAO
from src.environment_management.environment import EnvironmentDAO
from src.environment_management.environment_version import EnvironmentVersionDAO
from src.environment_management.models import (
    EnvironmentVersion,
    EnvironmentResourceConfiguration,
)
from src.state_manager.architecture_storage import (
    ArchitectureStorage,
)
from src.topology.topology import Topology, TopologyDiff

log = logging.getLogger(__name__)


class EnvironmentTrackingError(Exception):
    expected_id: str
    actual_id: str

    def __init__(self, expected_id: str, actual_id: str):
        super().__init__(f"Expected environment {expected_id} but got {actual_id}")
        self.expected_id = expected_id
        self.actual_id = actual_id


class EnvironmentNotTrackedError(Exception):
    env_id: str

    def __init__(self, env_id: str):
        super().__init__(f"Environment {env_id} is not tracked")
        self.env_id = env_id


class EnvironmentManager:
    def __init__(
        self,
        architecture_storage: ArchitectureStorage,
        arch_dao: ArchitectureDAO,
        env_dao: EnvironmentDAO,
        ev_dao: EnvironmentVersionDAO,
    ):
        self.architecture_storage = architecture_storage
        self.arch_dao = arch_dao
        self.env_dao = env_dao
        self.ev_dao = ev_dao

    async def is_in_sync(
        self,
        architecture_id: str,
        base_env_id: str,
        env_id: str,
    ) -> [bool, str | None, str | None]:
        """
        Check if the environment, for the specified architecture, is in sync with the base environment.

        Args:
            architecture_id (str): The ID of the architecture.
            base_env_id (str): The ID of the base environment.
            env_id (str): The ID of the environment to check for synchronization.

        Returns:
            None
        """
        curr_base: EnvironmentVersion = await self.ev_dao.get_current_version(
            architecture_id, base_env_id
        )
        curr_env: EnvironmentVersion = await self.ev_dao.get_current_version(
            architecture_id, env_id
        )
        env_resource_config: EnvironmentResourceConfiguration = (
            EnvironmentResourceConfiguration.from_dict(
                curr_env.env_resource_configuration
            )
        )
        if (
            env_resource_config.tracks.environment is None
            or env_resource_config.tracks.version_hash is None
        ):
            raise EnvironmentNotTrackedError(env_id)
        if env_resource_config.tracks.environment != curr_base.id:
            raise EnvironmentTrackingError(
                curr_base.id, env_resource_config.tracks.environment
            )
        if env_resource_config.tracks.version_hash != curr_base.version_hash:
            return (
                False,
                curr_base.version_hash,
                env_resource_config.tracks.version_hash,
            )

        return True, curr_base.version_hash, env_resource_config.tracks.version_hash

    async def diff_environments(
        self,
        architecture_id: str,
        base_env_id: str,
        env_id: str,
        include_properties: bool = False,
    ) -> TopologyDiff:
        """
        Check if the environment, for the specified architecture, is in sync with the base environment.

        Args:
            architecture_id (str): The ID of the architecture.
            base_env_id (str): The ID of the base environment.
            env_id (str): The ID of the environment to check for synchronization.

        Returns:
            None
        """
        curr_base: EnvironmentVersion = await self.ev_dao.get_current_version(
            architecture_id, base_env_id
        )
        curr_env: EnvironmentVersion = await self.ev_dao.get_current_version(
            architecture_id, env_id
        )
        base_state: RunEngineResult = await self.architecture_storage.get_state_from_fs(
            curr_base
        )
        env_state: RunEngineResult = await self.architecture_storage.get_state_from_fs(
            curr_env
        )
        base_topology = Topology.from_string(base_state.resources_yaml)
        env_topology = Topology.from_string(env_state.resources_yaml)
        return env_topology.diff_topology(
            base_topology, include_properties=include_properties
        )
