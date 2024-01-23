import aiounittest
from unittest.mock import MagicMock, AsyncMock
from src.environment_management.environment_manager import (
    EnvironmentManager,
    EnvironmentTrackingError,
    EnvironmentNotTrackedError,
)


class TestEnvironmentManager(aiounittest.AsyncTestCase):
    @classmethod
    def setUpClass(self):
        self.architecture_storage = MagicMock()
        self.arch_dao = MagicMock()
        self.env_dao = MagicMock()
        self.ev_dao = MagicMock()
        self.manager = EnvironmentManager(
            self.architecture_storage,
            self.arch_dao,
            self.env_dao,
            self.ev_dao,
        )

    def setUp(self):
        self.architecture_storage.reset_mock()
        self.arch_dao.reset_mock()
        self.env_dao.reset_mock()
        self.ev_dao.reset_mock()

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
