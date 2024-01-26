from unittest import mock
import aiounittest
from unittest.mock import MagicMock, AsyncMock, Mock, patch
from src.auth_service.entity import User
from src.constraints.resource_constraint import ResourceConstraint
from src.engine_service.binaries.fetcher import Binary
from src.engine_service.engine_commands.run import RunEngineRequest
from src.environment_management.environment_manager import (
    EnvironmentManager,
    EnvironmentTrackingError,
    EnvironmentNotTrackedError,
)
from src.environment_management.models import (
    EnvironmentResourceConfiguration,
    EnvironmentTracker,
    EnvironmentVersion,
)
from src.topology.topology import Topology, TopologyDiff, DiffStatus, Diff


class TestEnvironmentManager(aiounittest.AsyncTestCase):
    @classmethod
    def setUpClass(self):
        self.architecture_storage = MagicMock()
        self.arch_dao = MagicMock()
        self.env_dao = MagicMock()
        self.ev_dao = MagicMock()
        self.binary_storage = MagicMock()
        self.manager = EnvironmentManager(
            self.architecture_storage,
            self.arch_dao,
            self.env_dao,
            self.ev_dao,
            self.binary_storage,
        )

    def setUp(self):
        self.architecture_storage.reset_mock()
        self.arch_dao.reset_mock()
        self.env_dao.reset_mock()
        self.ev_dao.reset_mock()
        self.binary_storage.reset_mock()

    async def test_is_in_sync(self):
        self.ev_dao.get_current_version = AsyncMock(
            side_effect=[
                MagicMock(id="base_env_id", version_hash="version_hash"),
                MagicMock(
                    id="env_id",
                    version_hash="version_hash",
                    env_resource_configuration={
                        "tracks": {
                            "environment": "base_env_id",
                            "version_hash": "version_hash",
                        }
                    },
                ),
            ]
        )

        # Act
        result = await self.manager.is_in_sync(
            "architecture_id", "base_env_id", "env_id"
        )

        # Assert
        self.assertTrue(result[0])
        self.assertEqual(result[1], "version_hash")
        self.assertEqual(result[2], "version_hash")
        self.ev_dao.get_current_version.assert_any_call(
            "architecture_id", "base_env_id"
        )
        self.ev_dao.get_current_version.assert_any_call("architecture_id", "env_id")

    async def test_is_not_in_sync(self):
        self.ev_dao.get_current_version = AsyncMock(
            side_effect=[
                MagicMock(id="base_env_id", version_hash="version_hash"),
                MagicMock(
                    id="env_id",
                    version_hash="version_hash",
                    env_resource_configuration={
                        "tracks": {
                            "environment": "base_env_id",
                            "version_hash": "version_hash2",
                        }
                    },
                ),
            ]
        )

        # Act
        result = await self.manager.is_in_sync(
            "architecture_id", "base_env_id", "env_id"
        )

        # Assert
        self.assertFalse(result[0])
        self.assertEqual(result[1], "version_hash")
        self.assertEqual(result[2], "version_hash2")
        self.ev_dao.get_current_version.assert_any_call(
            "architecture_id", "base_env_id"
        )
        self.ev_dao.get_current_version.assert_any_call("architecture_id", "env_id")

    async def test_is_in_sync_not_tracked(self):
        self.ev_dao.get_current_version = AsyncMock(
            side_effect=[
                MagicMock(id="base_env_id", version_hash="version_hash"),
                MagicMock(
                    id="env_id",
                    version_hash="version_hash",
                    env_resource_configuration={},
                ),
            ]
        )

        # Act & Assert
        with self.assertRaises(EnvironmentNotTrackedError) as e:
            await self.manager.is_in_sync("architecture_id", "base_env_id", "env_id")

        self.assertEqual(e.exception.env_id, "env_id")
        self.ev_dao.get_current_version.assert_any_call(
            "architecture_id", "base_env_id"
        )
        self.ev_dao.get_current_version.assert_any_call("architecture_id", "env_id")

    async def test_is_in_sync_tracking_error(self):
        self.ev_dao.get_current_version = AsyncMock(
            side_effect=[
                MagicMock(id="base_env_id", version_hash="version_hash"),
                MagicMock(
                    id="env_id",
                    version_hash="version_hash",
                    env_resource_configuration={
                        "tracks": {
                            "environment": "wrong_env_id",
                            "version_hash": "wrong_hash",
                        }
                    },
                ),
            ]
        )

        # Act & Assert
        with self.assertRaises(EnvironmentTrackingError) as e:
            await self.manager.is_in_sync("architecture_id", "base_env_id", "env_id")

        self.assertEqual(e.exception.actual_id, "wrong_env_id")
        self.assertEqual(e.exception.expected_id, "base_env_id")
        self.ev_dao.get_current_version.assert_any_call(
            "architecture_id", "base_env_id"
        )
        self.ev_dao.get_current_version.assert_any_call("architecture_id", "env_id")

    @patch("src.environment_management.environment_manager.diff_engine_results")
    async def test_diff_environments(self, mock_diff_engine_results):
        base_env = MagicMock(id="base_env_id", version_hash="version_hash")
        env = MagicMock(
            id="env_id",
            version_hash="version_hash",
            env_resource_configuration={
                "tracks": {
                    "environment": "base_env_id",
                    "version_hash": "version_hash",
                }
            },
        )
        self.ev_dao.get_current_version = AsyncMock(side_effect=[base_env, env])

        mock_base_result = (MagicMock(resources_yaml="base_env_yaml"),)
        mock_env_result = (MagicMock(resources_yaml="env_yaml"),)
        self.architecture_storage.get_state_from_fs = Mock(
            side_effect=[
                mock_base_result,
                mock_env_result,
            ]
        )

        mock_diff_engine_results.return_value = TopologyDiff(
            resources={
                "res1": Diff(status=DiffStatus.CHANGED),
            },
            edges={},
        )

        # Call diff_environments
        diff = await self.manager.diff_environments("arch_id", "base_env_id", "env_id")

        # Check the result
        self.assertIsInstance(diff, TopologyDiff)
        self.assertEqual(len(diff.resources), 1)
        self.assertEqual(diff.resources["res1"].status, DiffStatus.CHANGED)
        self.assertEqual(len(diff.edges), 0)

        self.ev_dao.get_current_version.assert_any_call("arch_id", "base_env_id")
        self.ev_dao.get_current_version.assert_any_call("arch_id", "env_id")
        self.architecture_storage.get_state_from_fs.assert_any_call(base_env)
        self.architecture_storage.get_state_from_fs.assert_any_call(env)
        mock_diff_engine_results.assert_called_once_with(
            mock_env_result, mock_base_result, False
        )

    @patch.object(EnvironmentManager, "is_in_sync")
    @patch.object(EnvironmentManager, "get_constraint_list_stream_since_last_promotion")
    @patch.object(EnvironmentManager, "get_overrides")
    @mock.patch(
        "src.environment_management.environment_manager.run_engine", new_callable=Mock
    )
    @mock.patch(
        "src.environment_management.environment_manager.diff_engine_results",
        new_callable=Mock,
    )
    @mock.patch(
        "src.environment_management.environment_manager.uuid", new_callable=Mock
    )
    @mock.patch(
        "src.environment_management.environment_manager.datetime", new_callable=Mock
    )
    async def test_promote(
        self,
        mock_datetime,
        mock_uuid,
        mock_diff_engine_results: Mock,
        mock_run_engine,
        mock_get_overrides: AsyncMock,
        mock_constraints_list: AsyncMock,
        mock_is_in_sync: AsyncMock,
    ):
        mock_uuid.uuid4.return_value = "uuid"
        mock_datetime.utcnow.return_value = "now"
        curr_base = MagicMock(
            id="env_id",
            version_hash="version_hash",
            env_resource_configuration={
                "tracks": {
                    "environment": "base_env_id",
                    "version_hash": "version_hash",
                }
            },
        )
        env_version = MagicMock(id="env_id", version_hash="version_hash")
        env_version.version = 1
        self.ev_dao.get_current_version = AsyncMock(
            side_effect=[
                env_version,
                curr_base,
            ]
        )
        mock_is_in_sync.return_value = (False, "version_hash", "version_hash")
        mock_constraints_list.return_value = []
        mock_get_overrides.return_value = []
        base_state = MagicMock(resources_yaml="base_env_yaml")
        self.architecture_storage.get_state_from_fs = Mock(
            return_value=base_state,
        )
        run_result = MagicMock()
        mock_run_engine.return_value = run_result
        mock_diff_engine_results.return_value = TopologyDiff()
        self.architecture_storage.write_state_to_fs = Mock(return_value="location")
        self.env_dao.set_current_version = AsyncMock()
        user = User(id="user_id")

        # Act
        ev, result = await self.manager.promote(
            "architecture_id", "base_env_id", "env_id", user
        )
        env_config = EnvironmentResourceConfiguration(
            tracks=EnvironmentTracker(
                environment=None,
                version_hash="version_hash",
            ),
            overrides=[],
            diff={"resources": {}, "edges": {}},
        )
        new_version = EnvironmentVersion(
            architecture_id="architecture_id",
            id="env_id",
            version=env_version.version + 1,
            version_hash="uuid",
            constraints=[],
            env_resource_configuration=env_config.to_dict(),
            created_at="now",
            created_by=user.to_auth_string(),
            state_location="location",
        )
        self.assertEqual(ev, new_version)
        self.assertEqual(result, run_result)

        # Assert
        self.ev_dao.get_current_version.assert_any_call(
            "architecture_id", "base_env_id"
        )
        self.ev_dao.get_current_version.assert_any_call("architecture_id", "env_id")
        mock_is_in_sync.assert_called_once_with(
            "architecture_id", "base_env_id", "env_id"
        )
        mock_constraints_list.assert_called_once_with(
            "architecture_id", "env_id", "base_env_id"
        )
        mock_get_overrides.assert_called_once_with(
            "architecture_id", "base_env_id", "env_id"
        )
        self.architecture_storage.get_state_from_fs.assert_called_once_with(curr_base)
        self.binary_storage.ensure_binary.assert_called_once_with(Binary.ENGINE)
        mock_run_engine.assert_called_once_with(
            RunEngineRequest(
                id="architecture_id",
                templates=[],
                input_graph="base_env_yaml",
                constraints=[],
                engine_version=1.0,
            )
        )
        mock_diff_engine_results.assert_called_once_with(run_result, base_state)
        self.architecture_storage.write_state_to_fs.assert_called_once_with(
            new_version, run_result
        )
        self.ev_dao.add_environment_version.assert_called_once_with(new_version)
        self.env_dao.set_current_version.assert_called_once_with(
            "architecture_id", "env_id", new_version.version
        )

    @mock.patch(
        "src.environment_management.environment_manager.parse_constraints",
        new_callable=Mock,
    )
    async def test_get_constraint_list_stream_since_last_promotion(
        self,
        mock_parse_constraints: Mock,
    ):
        env = MagicMock()
        env.env_resource_configuration = {
            "tracks": {
                "environment": "base_env_id",
                "version_hash": "version_hash",
            }
        }
        self.ev_dao.get_current_version = AsyncMock(return_value=env)
        self.ev_dao.get_all_versions_after_hash = AsyncMock(
            return_value=[
                MagicMock(
                    version=1,
                    constraints=[
                        {"name": "constraint1", "type": "type1"},
                    ],
                ),
                MagicMock(
                    version=2,
                    constraints=[
                        {"name": "constraint2", "type": "type2"},
                    ],
                ),
            ]
        )
        constraint1 = MagicMock()
        constraint2 = MagicMock()
        mock_parse_constraints.side_effect = [
            [constraint1],
            [constraint2],
        ]

        constraint2.cancels_out = Mock(return_value=True)

        # Act
        result = await self.manager.get_constraint_list_stream_since_last_promotion(
            "architecture_id", "env_id", "base_env_id"
        )

        # Assert
        self.assertEqual(result, [constraint2])
        self.ev_dao.get_current_version.assert_called_once_with(
            "architecture_id", "env_id"
        )
        self.ev_dao.get_all_versions_after_hash.assert_called_once_with(
            "architecture_id", "base_env_id", "version_hash"
        )
        mock_parse_constraints.assert_any_call(
            [{"name": "constraint1", "type": "type1"}]
        )
        mock_parse_constraints.assert_any_call(
            [{"name": "constraint2", "type": "type2"}]
        )
        constraint2.cancels_out.assert_called_once_with(constraint1)

    @mock.patch(
        "src.environment_management.environment_manager.parse_constraints",
        new_callable=Mock,
    )
    async def test_get_overrides(self, mock_parse_constraints):
        env = MagicMock()
        env.env_resource_configuration = {
            "tracks": {
                "environment": "base_env_id",
                "version_hash": "version_hash",
            }
        }
        self.ev_dao.get_current_version = AsyncMock(return_value=env)
        self.ev_dao.get_all_versions_tracking_hash = AsyncMock(
            return_value=[
                MagicMock(
                    version=1,
                    constraints=[
                        {"name": "override1", "type": "type1"},
                    ],
                ),
                MagicMock(
                    version=2,
                    constraints=[
                        {"name": "override2", "type": "type2"},
                    ],
                ),
            ]
        )
        constraint1 = MagicMock()
        constraint2 = MagicMock()
        mock_parse_constraints.side_effect = [
            [constraint1],
            [constraint2],
        ]

        constraint2.cancels_out = Mock(return_value=True)

        # Act
        result = await self.manager.get_overrides(
            "architecture_id", "base_env_id", "env_id"
        )

        # Assert
        self.assertEqual(result, [constraint2])
        self.ev_dao.get_current_version.assert_called_once_with(
            "architecture_id", "env_id"
        )
        self.ev_dao.get_all_versions_tracking_hash.assert_called_once_with(
            "architecture_id", "env_id", "base_env_id", "version_hash"
        )
        mock_parse_constraints.assert_any_call([{"name": "override1", "type": "type1"}])
        mock_parse_constraints.assert_any_call([{"name": "override2", "type": "type2"}])
        constraint2.cancels_out.assert_called_once_with(constraint1)
