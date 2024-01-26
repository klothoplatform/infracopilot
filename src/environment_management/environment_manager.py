from datetime import datetime
import logging
from typing import List, Tuple
import uuid

import jsons
from src.auth_service.entity import Entity
from src.topology.topology import TopologicalChangesNotAllowed
from src.constraints.application_constraint import ApplicationConstraint
from src.constraints.constraint import Constraint, ConstraintOperator, ConstraintScope
from src.constraints.util import parse_constraints, substitute_name_changes
from src.engine_service.binaries.fetcher import Binary, BinaryStorage
from src.engine_service.engine_commands.run import (
    RunEngineRequest,
    RunEngineResult,
    run_engine,
)
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
from src.topology.util import diff_engine_results

from src.util.logging import logger

BASE_ENV_ID = "default"
PROD_ENV_ID = "prod"


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
        binary_storage: BinaryStorage,
    ):
        self.architecture_storage = architecture_storage
        self.arch_dao = arch_dao
        self.env_dao = env_dao
        self.ev_dao = ev_dao
        self.binary_storage = binary_storage

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
        base_state: RunEngineResult = self.architecture_storage.get_state_from_fs(
            curr_base
        )
        env_state: RunEngineResult = self.architecture_storage.get_state_from_fs(
            curr_env
        )
        return diff_engine_results(env_state, base_state, include_properties)

    async def promote(
        self, architecture_id: str, base_env_id: str, env_id: str, requester: Entity
    ) -> Tuple[EnvironmentVersion, RunEngineResult]:
        """
        Promote the base environment, for the specified architecture, to the specified environment.

        Args:
            architecture_id (str): The ID of the architecture.
            base_env_id (str): The ID of the base environment.
            env_id (str): The ID of the environment to promote to.

        Returns:
            None
        """

        env_version = await self.ev_dao.get_current_version(architecture_id, env_id)

        # Check if the environment is in sync with the base environment
        in_sync, base_version_hash, env_version_hash = await self.is_in_sync(
            architecture_id, base_env_id, env_id
        )
        if in_sync:
            curr_state = self.architecture_storage.get_state_from_fs(env_version)
            return env_version, curr_state

        # Get the current version of the base environment
        curr_base: EnvironmentVersion = await self.ev_dao.get_current_version(
            architecture_id, base_env_id
        )

        base_constraints: List[
            Constraint
        ] = await self.get_constraint_list_stream_since_last_promotion(
            architecture_id, env_id, base_env_id
        )

        overrides: List[Constraint] = await self.get_overrides(
            architecture_id, base_env_id, env_id
        )

        for c in base_constraints:
            if (
                c.scope is ConstraintScope.Application
                and c.operator is ConstraintOperator.Replace
                and isinstance(c, ApplicationConstraint)
            ):
                overrides = substitute_name_changes(
                    overrides, c.node, c.replacement_node
                )

        # Get the state of the base environment
        base_state: RunEngineResult = self.architecture_storage.get_state_from_fs(
            curr_base
        )

        self.binary_storage.ensure_binary(Binary.ENGINE)
        request = RunEngineRequest(
            id=architecture_id,
            input_graph=base_state.resources_yaml if base_state is not None else None,
            templates=[],
            engine_version=1.0,
            constraints=overrides,
        )
        result: RunEngineResult = run_engine(request)
        diff: TopologyDiff = diff_engine_results(result, base_state)
        if diff.contains_differences():
            raise TopologicalChangesNotAllowed(env_id, constraints=overrides, diff=diff)

        env_specific_config = EnvironmentResourceConfiguration.from_dict(
            env_version.env_resource_configuration
        )
        env_specific_config.tracks.version_hash = curr_base.version_hash
        env_specific_config.diff = diff.__dict__()
        env_specific_config.overrides = jsons.dump(overrides)
        # Create the new environment version
        new_version = EnvironmentVersion(
            architecture_id=architecture_id,
            id=env_id,
            version=env_version.version + 1,
            version_hash=str(uuid.uuid4()),
            constraints=overrides,
            env_resource_configuration=env_specific_config.to_dict(),
            created_at=datetime.utcnow(),
            created_by=requester.to_auth_string(),
        )
        location = self.architecture_storage.write_state_to_fs(new_version, result)
        new_version.state_location = location

        self.ev_dao.add_environment_version(new_version)
        await self.env_dao.set_current_version(
            architecture_id, env_id, env_version.version + 1
        )
        logger.info(f"Promoted {env_id} to version {env_version.version + 1}")
        return new_version, result

    async def get_constraint_list_stream_since_last_promotion(
        self,
        architecture_id: str,
        env_id: str,
        base_env_id: str,
    ) -> List[Constraint]:
        """
        Get the overrides for the specified environment, for the specified architecture, to the specified environment.

        Args:
            architecture_id (str): The ID of the architecture.
            base_env_id (str): The ID of the base environment.
            env_id (str): The ID of the environment to promote to.

        Returns:
            List[Constraint]: The list of constraints as overrides
        """
        logger.info(
            f"Getting constraint list stream since last promotion for {env_id} for architecture {architecture_id}"
        )
        env: EnvironmentVersion = await self.ev_dao.get_current_version(
            architecture_id, env_id
        )
        env_specific_config = EnvironmentResourceConfiguration.from_dict(
            env.env_resource_configuration
        )
        if env_specific_config.tracks.environment != base_env_id:
            raise EnvironmentTrackingError(
                base_env_id, env_specific_config.tracks.environment
            )
        if env_specific_config.tracks.version_hash is None:
            raise EnvironmentNotTrackedError(env_id)

        versions_after_hash: List[
            EnvironmentVersion
        ] = await self.ev_dao.get_all_versions_after_hash(
            architecture_id, base_env_id, env_specific_config.tracks.version_hash
        )

        constraints = []
        for version in versions_after_hash:
            for constraint in parse_constraints(version.constraints):
                for c in constraints:
                    if constraint.cancels_out(c):
                        constraints.remove(c)
                constraints.append(constraint)

        return constraints

    async def get_overrides(
        self,
        architecture_id: str,
        base_env_id: str,
        env_id: str,
    ) -> List[Constraint]:
        """
        Get the overrides for the specified environment, for the specified architecture, to the specified environment.

        Args:
            architecture_id (str): The ID of the architecture.
            base_env_id (str): The ID of the base environment.
            env_id (str): The ID of the environment to promote to.

        Returns:
            List[Constraint]: The list of constraints as overrides
        """
        logger.info(
            f"Getting overrides for {env_id} for architecture {architecture_id}"
        )
        env: EnvironmentVersion = await self.ev_dao.get_current_version(
            architecture_id, env_id
        )
        env_specific_config = EnvironmentResourceConfiguration.from_dict(
            env.env_resource_configuration
        )
        if env_specific_config.tracks.environment != base_env_id:
            raise EnvironmentTrackingError(
                base_env_id, env_specific_config.tracks.environment
            )
        if env_specific_config.tracks.version_hash is None:
            raise EnvironmentNotTrackedError(env_id)

        tracking_versions: List[
            EnvironmentVersion
        ] = await self.ev_dao.get_all_versions_tracking_hash(
            architecture_id,
            env_id,
            env_specific_config.tracks.environment,
            env_specific_config.tracks.version_hash,
        )

        constraints = []
        for version in tracking_versions:
            for constraint in parse_constraints(version.constraints):
                for c in constraints:
                    if constraint.cancels_out(c):
                        constraints.remove(c)
                constraints.append(constraint)

        return constraints
