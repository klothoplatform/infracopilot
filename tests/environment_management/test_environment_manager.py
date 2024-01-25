import aiounittest
from unittest.mock import MagicMock, AsyncMock, patch
from src.environment_management.environment_manager import (
    EnvironmentManager,
    EnvironmentTrackingError,
    EnvironmentNotTrackedError,
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

    @patch.object(Topology, "from_string")
    async def test_diff_environments(self, mock_from_string: MagicMock):
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

        self.architecture_storage.get_state_from_fs = AsyncMock(
            side_effect=[
                MagicMock(resources_yaml="base_env_yaml"),
                MagicMock(resources_yaml="env_yaml"),
            ]
        )

        env_topo = MagicMock(resources={})
        base_topo = MagicMock(resources={})
        mock_from_string.side_effect = [
            base_topo,
            env_topo,
        ]

        env_topo.diff_topology = MagicMock(
            return_value=TopologyDiff(
                resources={
                    "res1": Diff(status=DiffStatus.CHANGED),
                },
                edges={},
            )
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
        mock_from_string.assert_any_call("base_env_yaml")
        mock_from_string.assert_any_call("env_yaml")
        env_topo.diff_topology.assert_called_once_with(
            base_topo, include_properties=False
        )
