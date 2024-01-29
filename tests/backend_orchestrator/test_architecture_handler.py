import datetime
import json
from typing import Type
from unittest import mock

import aiounittest
from fastapi import HTTPException
from openfga_sdk import Tuple, TupleKey
from openfga_sdk.client.models import ClientTuple

from src.auth_service.entity import User, Team
from src.auth_service.sharing_manager import SharingManager, public_user
from src.backend_orchestrator.architecture_handler import (
    ArchitectureHandler,
    CreateArchitectureRequest,
    ShareArchitectureRequest,
)
from src.engine_service.engine_commands.run import RunEngineResult
from src.environment_management.architecture import (
    Architecture,
    ArchitectureDoesNotExistError,
)
from src.environment_management.environment import EnvironmentDoesNotExistError
from src.environment_management.environment_version import (
    EnvironmentVersionDoesNotExistError,
)
from src.environment_management.models import Environment, EnvironmentVersion


class TestArchitectureHandler(aiounittest.AsyncTestCase):
    @classmethod
    def setUpClass(cls):
        test_id = "test-id"
        cls.created_at = datetime.datetime.fromtimestamp(1320382800.0)
        cls.test_architecture = Architecture(
            id=test_id,
            name="test-new",
            owner="test-owner",
            created_at=cls.created_at,
        )
        cls.test_environment = Environment(
            architecture_id=test_id,
            id="default",
            current=0,
            tags=[],
        )
        cls.test_environment_version = EnvironmentVersion(
            architecture_id=test_id,
            id="default",
            version=0,
            version_hash="test-hash",
        )
        cls.test_result = RunEngineResult(
            resources_yaml="test-yaml",
            topology_yaml="test-yaml",
            iac_topology="test-yaml",
        )

        cls.mock_store = mock.MagicMock()
        cls.mock_ev_dao = mock.MagicMock()
        cls.mock_env_dao = mock.MagicMock()
        cls.mock_arch_dao = mock.MagicMock()
        cls.arch_handler = ArchitectureHandler(
            cls.mock_store,
            cls.mock_ev_dao,
            cls.mock_env_dao,
            cls.mock_arch_dao,
        )

    def setUp(self):
        self.mock_store.reset_mock()
        self.mock_ev_dao.reset_mock()
        self.mock_env_dao.reset_mock()
        self.mock_arch_dao.reset_mock()

    @mock.patch(
        "src.backend_orchestrator.architecture_handler.datetime",
        new_callable=mock.Mock,
    )
    @mock.patch(
        "src.backend_orchestrator.architecture_handler.uuid",
        new_callable=mock.Mock,
    )
    async def test_new_architecture(
        self,
        mock_uuid: mock.Mock,
        mock_datetime: mock.Mock,
    ):
        request = CreateArchitectureRequest(
            name="test-new",
            engine_version=0.0,
        )
        user = User("test-user")
        owner = User("test-owner")
        id = "test-id"
        test_hash = "hash"
        mock_datetime.utcnow.return_value = self.created_at
        mock_uuid.uuid4.return_value = test_hash
        result = await self.arch_handler.new_architecture(
            request, user.to_auth_string(), owner, id
        )
        self.assertEqual(result.body, b'{"id":"test-id"}')
        self.assertEqual(result.status_code, 200)
        self.mock_arch_dao.add_architecture.assert_called_once_with(
            Architecture(
                id=id,
                name="test-new",
                owner="user:test-owner",
                created_at=self.created_at,
            )
        )
        self.mock_env_dao.add_environment.assert_any_call(
            Environment(
                architecture_id=id,
                id="default",
                current=0,
                tags={"default": True},
            )
        )
        self.mock_env_dao.add_environment.assert_any_call(
            Environment(
                architecture_id=id,
                id="prod",
                current=0,
            )
        )
        self.mock_ev_dao.add_environment_version.assert_any_call(
            EnvironmentVersion(
                architecture_id=id,
                id="default",
                version=0,
                version_hash=test_hash,
                created_by=user.to_auth_string(),
                created_at=self.created_at,
            )
        )
        self.mock_ev_dao.add_environment_version.assert_any_call(
            EnvironmentVersion(
                architecture_id=id,
                id="prod",
                version=0,
                version_hash=test_hash,
                created_by=user.to_auth_string(),
                created_at=self.created_at,
                env_resource_configuration={
                    "tracks": {
                        "environment": "default",
                        "version_hash": test_hash,
                    },
                    "overrides": None,
                    "diff": None,
                },
            )
        )

    async def test_get_architecture(self):
        self.mock_arch_dao.get_architecture = mock.AsyncMock(
            return_value=self.test_architecture
        )
        self.mock_env_dao.get_environments_for_architecture = mock.AsyncMock(
            return_value=[
                Environment(
                    architecture_id="test-id",
                    id="default",
                    current=0,
                    tags={
                        "default": True,
                    },
                ),
                Environment(
                    architecture_id=id,
                    id="prod",
                    tags=[],
                ),
            ]
        )
        result = await self.arch_handler.get_architecture("test-id")
        print(result.body)
        self.assertEqual(
            result.body,
            b'{"id":"test-id","name":"test-new","owner":"test-owner","created_at":1320382800.0,"environments":[{"id":"default","default":true},{"id":"prod","default":false}]}',
        )
        self.assertEqual(result.status_code, 200)
        self.mock_arch_dao.get_architecture.assert_called_once_with("test-id")
        self.mock_env_dao.get_environments_for_architecture.assert_called_once_with(
            "test-id"
        )

    async def test_get_architecture_not_found(self):
        self.mock_arch_dao.get_architecture = mock.AsyncMock(return_value=None)
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.get_architecture("test-id")
        self.assertEqual(e.exception.detail, "Architecture not found")
        self.assertEqual(e.exception.status_code, 404)
        self.mock_arch_dao.get_architecture.assert_called_once_with("test-id")

    async def test_get_architecture_causes_error(self):
        self.mock_arch_dao.get_architecture = mock.AsyncMock(side_effect=Exception)
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.get_architecture("test-id")
        self.assertEqual(e.exception.detail, "internal server error")
        self.assertEqual(e.exception.status_code, 500)
        self.mock_arch_dao.get_architecture.assert_called_once_with("test-id")

    async def test_delete_architecture(self):
        self.mock_arch_dao.delete_architecture = mock.AsyncMock(return_value=None)
        result = await self.arch_handler.delete_architecture("test-id")
        self.assertEqual(result.body, b"")
        self.assertEqual(result.status_code, 200)
        self.mock_arch_dao.delete_architecture.assert_called_once_with("test-id")

    async def test_delete_architecture_causes_error(self):
        self.mock_arch_dao.delete_architecture = mock.AsyncMock(side_effect=Exception)
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.delete_architecture("test-id")
        self.assertEqual(e.exception.detail, "internal server error")
        self.assertEqual(e.exception.status_code, 500)
        self.mock_arch_dao.delete_architecture.assert_called_once_with("test-id")

    async def test_get_version(self):
        self.mock_ev_dao.get_current_version = mock.AsyncMock(
            return_value=self.test_environment_version
        )
        self.mock_store.get_state_from_fs = mock.Mock(return_value=self.test_result)
        result = await self.arch_handler.get_version("test-id", "default")
        self.assertEqual(
            result.body,
            b'"{\\"architecture_id\\": \\"test-id\\", \\"id\\": \\"default\\", \\"version\\": 0, \\"state\\": {\\"resources_yaml\\": \\"test-yaml\\", \\"topology_yaml\\": \\"test-yaml\\"}, \\"env_resource_configuration\\": {}, \\"config_errors\\": []}"',
        )
        self.assertEqual(result.status_code, 200)
        self.mock_ev_dao.get_current_version.assert_called_once_with(
            "test-id", "default"
        )
        self.mock_store.get_state_from_fs.assert_called_once_with(
            self.test_environment_version
        )

    async def test_get_version_not_found(self):
        self.mock_ev_dao.get_current_version = mock.AsyncMock(return_value=None)
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.get_version("test-id", "default")
        self.assertEqual(
            e.exception.detail, "No environment default exists for architecture test-id"
        )
        self.assertEqual(e.exception.status_code, 404)
        self.mock_ev_dao.get_current_version.assert_called_once_with(
            "test-id", "default"
        )

    async def test_get_version_causes_error(self):
        self.mock_ev_dao.get_current_version = mock.AsyncMock(side_effect=Exception)
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.get_version("test-id", "default")
        self.assertEqual(e.exception.detail, "internal server error")
        self.assertEqual(e.exception.status_code, 500)
        self.mock_ev_dao.get_current_version.assert_called_once_with(
            "test-id", "default"
        )

    async def test_get_environments_previous_state(self):
        self.mock_ev_dao.get_previous_state = mock.AsyncMock(
            return_value=self.test_environment_version
        )
        self.mock_store.get_state_from_fs = mock.Mock(return_value=self.test_result)
        result = await self.arch_handler.get_environments_previous_state(
            "test-id", "default", 1
        )
        self.assertEqual(
            result.body,
            b'"{\\"architecture_id\\": \\"test-id\\", \\"id\\": \\"default\\", \\"version\\": 0, \\"state\\": {\\"resources_yaml\\": \\"test-yaml\\", \\"topology_yaml\\": \\"test-yaml\\"}, \\"env_resource_configuration\\": {}, \\"config_errors\\": []}"',
        )
        self.assertEqual(result.status_code, 200)
        self.mock_ev_dao.get_previous_state.assert_called_once_with(
            "test-id", "default", 1
        )
        self.mock_store.get_state_from_fs.assert_called_once_with(
            self.test_environment_version
        )

    async def test_get_environments_previous_state_not_found(self):
        self.mock_ev_dao.get_previous_state = mock.AsyncMock(
            side_effect=EnvironmentVersionDoesNotExistError
        )
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.get_environments_previous_state(
                "test-id", "default", 1
            )
        self.assertEqual(
            e.exception.detail,
            "Previous state not found for architecture test-id environment default version 1",
        )
        self.assertEqual(e.exception.status_code, 404)
        self.mock_ev_dao.get_previous_state.assert_called_once_with(
            "test-id", "default", 1
        )

    async def test_get_environments_next_state(self):
        self.mock_ev_dao.get_next_state = mock.AsyncMock(
            return_value=self.test_environment_version
        )
        self.mock_store.get_state_from_fs = mock.Mock(return_value=self.test_result)
        result = await self.arch_handler.get_environments_next_state(
            "test-id", "default", 1
        )
        self.assertEqual(
            result.body,
            b'"{\\"architecture_id\\": \\"test-id\\", \\"id\\": \\"default\\", \\"version\\": 0, \\"state\\": {\\"resources_yaml\\": \\"test-yaml\\", \\"topology_yaml\\": \\"test-yaml\\"}, \\"env_resource_configuration\\": {}, \\"config_errors\\": []}"',
        )
        self.assertEqual(result.status_code, 200)
        self.mock_ev_dao.get_next_state.assert_called_once_with("test-id", "default", 1)
        self.mock_store.get_state_from_fs.assert_called_once_with(
            self.test_environment_version
        )

    async def test_get_environments_next_state_not_found(self):
        self.mock_ev_dao.get_next_state = mock.AsyncMock(
            side_effect=EnvironmentVersionDoesNotExistError
        )
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.get_environments_next_state("test-id", "default", 1)
        self.assertEqual(
            e.exception.detail,
            "Architecture next state not found for architecture test-id environment default version 1",
        )
        self.assertEqual(e.exception.status_code, 404)
        self.mock_ev_dao.get_next_state.assert_called_once_with("test-id", "default", 1)

    async def test_set_current_version(self):
        self.mock_env_dao.set_current_version = mock.AsyncMock(return_value=None)
        result = await self.arch_handler.set_current_version("test-id", "default", 1)
        self.assertEqual(result.body, b"")
        self.assertEqual(result.status_code, 200)
        self.mock_env_dao.set_current_version.assert_called_once_with(
            "test-id", "default", 1
        )

    async def test_set_current_version_not_found(self):
        self.mock_env_dao.set_current_version = mock.AsyncMock(
            side_effect=EnvironmentDoesNotExistError
        )
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.set_current_version("test-id", "default", 1)
        self.assertEqual(
            e.exception.detail,
            "Environment, default, not found for architecture, test-id",
        )
        self.assertEqual(e.exception.status_code, 404)
        self.mock_env_dao.set_current_version.assert_called_once_with(
            "test-id", "default", 1
        )

    async def test_set_current_version_causes_error(self):
        self.mock_env_dao.set_current_version = mock.AsyncMock(side_effect=Exception)
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.set_current_version("test-id", "default", 1)
        self.assertEqual(e.exception.detail, "internal server error")
        self.assertEqual(e.exception.status_code, 500)
        self.mock_env_dao.set_current_version.assert_called_once_with(
            "test-id", "default", 1
        )

    async def test_rename_architecture(self):
        self.mock_arch_dao.get_architecture = mock.AsyncMock(
            return_value=self.test_architecture
        )
        self.mock_arch_dao.update_architecture = mock.AsyncMock(return_value=None)
        result = await self.arch_handler.rename_architecture("test-id", "new-name")
        self.assertEqual(
            result.body,
            b'{"id":"test-id","name":"new-name","owner":"test-owner","created_at":1320382800.0}',
        )
        self.assertEqual(result.status_code, 200)
        self.mock_arch_dao.get_architecture.assert_called_once_with("test-id")
        self.mock_arch_dao.update_architecture.assert_called_once_with(
            Architecture(
                id="test-id",
                name="new-name",
                owner="test-owner",
                created_at=self.created_at,
            )
        )

    async def test_rename_architecture_not_found(self):
        self.mock_arch_dao.get_architecture = mock.AsyncMock(return_value=None)
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.rename_architecture("test-id", "new-name")
        self.assertEqual(e.exception.detail, "Architecture not found")
        self.assertEqual(e.exception.status_code, 404)
        self.mock_arch_dao.get_architecture.assert_called_once_with("test-id")

    async def test_rename_architecture_causes_error(self):
        self.mock_arch_dao.get_architecture = mock.AsyncMock(side_effect=Exception)
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.rename_architecture("test-id", "new-name")
        self.assertEqual(e.exception.detail, "internal server error")
        self.assertEqual(e.exception.status_code, 500)
        self.mock_arch_dao.get_architecture.assert_called_once_with("test-id")

    async def test_list_architectures(self):
        self.mock_arch_dao.get_architectures_by_owner = mock.AsyncMock(
            return_value=[self.test_architecture]
        )
        result = await self.arch_handler.list_architectures("test-owner")
        self.assertEqual(
            result.body,
            b'{"architectures":[{"id":"test-id","name":"test-new","owner":"test-owner","created_at":1320382800.0}]}',
        )
        self.assertEqual(result.status_code, 200)
        self.mock_arch_dao.get_architectures_by_owner.assert_called_once_with(
            User("test-owner")
        )

    async def test_list_architectures_causes_error(self):
        self.mock_arch_dao.get_architectures_by_owner = mock.AsyncMock(
            side_effect=Exception
        )
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.list_architectures("test-owner")
        self.assertEqual(e.exception.detail, "internal server error")
        self.assertEqual(e.exception.status_code, 500)
        self.mock_arch_dao.get_architectures_by_owner.assert_called_once_with(
            User("test-owner")
        )

    @mock.patch(
        "src.backend_orchestrator.architecture_handler.datetime",
        new_callable=mock.Mock,
    )
    @mock.patch(
        "src.backend_orchestrator.architecture_handler.uuid",
        new_callable=mock.Mock,
    )
    async def test_clone_architecture(
        self,
        mock_uuid: mock.Mock,
        mock_datetime: mock.Mock,
    ):
        test_hash = "hash"
        mock_datetime.utcnow.return_value = self.created_at
        mock_uuid.uuid4.return_value = test_hash
        self.mock_arch_dao.get_architecture = mock.AsyncMock(
            return_value=self.test_architecture
        )
        self.mock_arch_dao.add_architecture = mock.Mock(return_value=None)
        self.mock_env_dao.get_environments_for_architecture = mock.AsyncMock(
            return_value=[self.test_environment]
        )
        self.mock_env_dao.add_environment = mock.Mock(return_value=None)
        self.mock_ev_dao.list_environment_versions = mock.AsyncMock(
            return_value=[self.test_environment_version]
        )
        self.mock_ev_dao.add_environment_version = mock.Mock(return_value=None)
        self.mock_store.get_state_from_fs = mock.Mock(return_value=self.test_result)
        self.mock_store.write_state_to_fs = mock.Mock(return_value="location")
        mock_authz = mock.MagicMock()
        mock_authz.add_architecture_owner = mock.AsyncMock(return_value=None)
        result = await self.arch_handler.clone_architecture(
            "test-owner", "test-id", "new-name", "test-owner", mock_authz
        )
        self.assertEqual(result.body, b'{"id":"hash"}')
        self.assertEqual(result.status_code, 200)
        self.mock_arch_dao.get_architecture.assert_called_once_with("test-id")
        self.mock_arch_dao.add_architecture.assert_called_once_with(
            Architecture(
                id=test_hash,
                name="new-name",
                owner="user:test-owner",
                created_at=self.created_at,
            )
        )
        mock_authz.add_architecture_owner.assert_called_once_with(
            User("test-owner"), "hash"
        )
        self.mock_env_dao.add_environment.assert_called_once_with(
            Environment(
                architecture_id=test_hash,
                id="default",
                current=0,
                tags=[],
            )
        )
        self.mock_env_dao.get_environments_for_architecture.assert_called_once_with(
            "test-id"
        )
        self.mock_store.get_state_from_fs.assert_called_once_with(
            self.test_environment_version
        )
        v = EnvironmentVersion(
            architecture_id=test_hash,
            id="default",
            version=0,
            version_hash="test-hash",
            state_location="location",
        )
        self.mock_store.write_state_to_fs.assert_called_once_with(v, self.test_result)
        self.mock_ev_dao.list_environment_versions.assert_called_once_with(
            "test-id", "default"
        )
        self.mock_ev_dao.add_environment_version.assert_called_once_with(v)

    async def test_clone_architecture_not_found(self):
        self.mock_arch_dao.get_architecture = mock.AsyncMock(
            side_effect=ArchitectureDoesNotExistError
        )
        mock_authz = mock.MagicMock()
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.clone_architecture(
                "test-owner", "test-id", "new-name", "test-owner", mock_authz
            )
        self.assertEqual(e.exception.detail, "Architecture not found")
        self.assertEqual(e.exception.status_code, 404)
        self.mock_arch_dao.get_architecture.assert_called_once_with("test-id")
        mock_authz.add_architecture_owner.assert_not_called()

    async def test_clone_architecture_causes_error(self):
        self.mock_arch_dao.get_architecture = mock.AsyncMock(side_effect=Exception)
        mock_authz = mock.MagicMock()
        with self.assertRaises(HTTPException) as e:
            await self.arch_handler.clone_architecture(
                "test-owner", "test-id", "new-name", "test-owner", mock_authz
            )
        self.assertEqual(e.exception.detail, "internal server error")
        self.assertEqual(e.exception.status_code, 500)
        self.mock_arch_dao.get_architecture.assert_called_once_with("test-id")
        mock_authz.add_architecture_owner.assert_not_called()

    async def test_add_and_remove_access(self):
        new_user = "user:new-user"
        removed_user = "user:removed-user"
        await self.run_update_architecture_access_test(
            initial_relations={
                "user:test-user": "owner",
                "user:unrelated-user": "editor",
                removed_user: "viewer",
            },
            updated_roles={
                new_user: "viewer",
                removed_user: None,
            },
            expected_writes=[
                ClientTuple(
                    user=new_user,
                    relation="viewer",
                    object="architecture:test-id",
                ),
            ],
            expected_deletions=[
                ClientTuple(
                    user=removed_user,
                    relation="viewer",
                    object="architecture:test-id",
                ),
            ],
            expected_status_code=200,
        )

    async def test_add_team_access(self):
        new_team = "team:new-team#member"
        await self.run_update_architecture_access_test(
            initial_relations={
                "user:test-user": "owner",
                "user:unrelated-user": "editor",
            },
            updated_roles={
                new_team: "viewer",
            },
            expected_writes=[
                ClientTuple(
                    user=new_team,
                    relation="viewer",
                    object="architecture:test-id",
                ),
            ],
            expected_deletions=None,
            expected_status_code=200,
        )

    async def test_limit_public_architecture_to_organization(self):
        org = "organization:test-org"
        await self.run_update_architecture_access_test(
            initial_relations={
                "user:test-user": "owner",
                "user:unrelated-user": "editor",
                public_user: "viewer",
            },
            updated_roles={public_user: None, org: "viewer"},
            expected_writes=[
                ClientTuple(
                    user=org,
                    relation="viewer",
                    object="architecture:test-id",
                ),
            ],
            expected_deletions=[
                ClientTuple(
                    user=public_user,
                    relation="viewer",
                    object="architecture:test-id",
                ),
            ],
            expected_status_code=200,
        )

    async def test_make_private_architecture_public(self):
        public_user = "user:*"
        await self.run_update_architecture_access_test(
            initial_relations={
                "user:test-user": "owner",
                "user:unrelated-user": "editor",
            },
            updated_roles={public_user: "viewer"},
            expected_writes=[
                ClientTuple(
                    user=public_user,
                    relation="viewer",
                    object="architecture:test-id",
                ),
            ],
            expected_deletions=None,
            expected_status_code=200,
        )

    async def test_update_existing_relationship(self):
        other_user = "user:other"
        await self.run_update_architecture_access_test(
            initial_relations={
                "user:test-user": "owner",
                "user:unrelated-user": "editor",
                other_user: "viewer",
            },
            updated_roles={other_user: "editor"},
            expected_writes=[
                ClientTuple(
                    user=other_user,
                    relation="editor",
                    object="architecture:test-id",
                ),
            ],
            expected_deletions=[
                ClientTuple(
                    user=other_user,
                    relation="viewer",
                    object="architecture:test-id",
                ),
            ],
            expected_status_code=200,
        )

    async def test_remove_existing_relationship(self):
        other_user = "user:other"
        await self.run_update_architecture_access_test(
            initial_relations={
                "user:test-user": "owner",
                "user:unrelated-user": "editor",
                other_user: "viewer",
            },
            updated_roles={other_user: None},
            expected_writes=None,
            expected_deletions=[
                ClientTuple(
                    user=other_user,
                    relation="viewer",
                    object="architecture:test-id",
                ),
            ],
            expected_status_code=200,
        )

    async def run_update_architecture_access_test(
        self,
        initial_relations,
        updated_roles,
        expected_writes,
        expected_deletions,
        expected_status_code,
        expected_exception: Type[Exception] = None,
    ):
        mock_authz = mock.MagicMock()
        mock_authz.can_share_architecture = mock.AsyncMock(return_value=True)
        mock_teams = mock.MagicMock()
        mock_teams.batch_get_teams = mock.AsyncMock(
            return_value=[Team(id="test-team", name="test-team")]
        )
        mock_auth0 = mock.MagicMock()
        mock_auth0.get_users = mock.MagicMock(
            return_value=[{"user_id": "test-user", "name": "test-user"}]
        )
        self.mock_arch_dao.get_architecture = mock.AsyncMock(
            return_value=self.test_architecture
        )

        fga_mock = mock.MagicMock()
        sharing_mgr = SharingManager(fga_mock)
        fga_mock.read_tuples = mock.AsyncMock(
            return_value=[
                Tuple(
                    key=TupleKey(
                        user=user,
                        relation=role,
                        object="architecture:test-id",
                    ),
                    timestamp=0,
                )
                for user, role in initial_relations.items()
            ]
        )
        fga_mock.write_tuples = mock.AsyncMock(return_value=None)
        fga_mock.delete_tuples = mock.AsyncMock(return_value=None)
        mock_config = mock.MagicMock()
        mock_config.client_side_validation = False

        if expected_exception is not None:
            with self.assertRaises(expected_exception) as e:
                await self.arch_handler.update_architecture_access(
                    "user:test-user",
                    "test-id",
                    ShareArchitectureRequest(entity_roles=updated_roles),
                    mock_authz,
                    sharing_mgr,
                )
            if e.exception is not None:
                if hasattr(e, "status_code") and expected_status_code is not None:
                    self.assertEqual(expected_status_code, e.status_code)
            return

        result = await self.arch_handler.update_architecture_access(
            "user:test-user",
            "test-id",
            ShareArchitectureRequest(entity_roles=updated_roles),
            mock_authz,
            sharing_mgr,
        )

        self.assertEqual(result.status_code, expected_status_code)
        mock_authz.can_share_architecture.assert_called_once_with(
            User("user:test-user"), "test-id"
        )
        self.mock_arch_dao.get_architecture.assert_called_once_with("test-id")

        if expected_writes is not None and len(expected_writes) > 0:
            fga_mock.write_tuples.assert_called_once_with(expected_writes)
        else:
            fga_mock.write_tuples.assert_not_called()

        if expected_deletions is not None and len(expected_deletions) > 0:
            fga_mock.delete_tuples.assert_called_once_with(expected_deletions)
        else:
            fga_mock.delete_tuples.assert_not_called()

    async def test_adding_public_edit_access_fails(self):
        await self.run_update_architecture_access_test(
            initial_relations={
                "user:test-user": "owner",
            },
            updated_roles={public_user: "editor"},
            expected_writes=None,
            expected_deletions=None,
            expected_exception=HTTPException,
            expected_status_code=400,
        )

    async def test_get_architecture_access_private(self):
        test_user = "user:test-user"
        await self.run_test_get_architecture_access(
            initial_relations={
                test_user: "owner",
            },
            user="test-user",
            expected_status_code=200,
            expected_body={
                "architecture_id": "test-id",
                "can_share": True,
                "can_write": True,
                "entities": [
                    {
                        "id": "user:test-user",
                        "name": "test-user",
                        "role": "owner",
                        "type": "user",
                        "user_id": "test-user",
                    }
                ],
                "general_access": {"entity": None, "type": "restricted"},
            },
        )

    async def test_get_architecture_access_public(self):
        test_user = "user:test-user"
        await self.run_test_get_architecture_access(
            initial_relations={
                test_user: "owner",
                "user:*": "viewer",
            },
            user="test-user",
            expected_status_code=200,
            expected_body={
                "architecture_id": "test-id",
                "can_share": True,
                "can_write": True,
                "entities": [
                    {
                        "id": "user:test-user",
                        "name": "test-user",
                        "role": "owner",
                        "type": "user",
                        "user_id": "test-user",
                    },
                    {"id": "user:*", "role": "viewer", "type": "user"},
                ],
                "general_access": {
                    "entity": {"id": "user:*", "role": "viewer"},
                    "type": "public",
                },
            },
        )

    async def test_get_architecture_access_general_access_org(self):
        test_user = "user:test-user"
        await self.run_test_get_architecture_access(
            initial_relations={
                test_user: "owner",
                "organization:test-org": "viewer",
            },
            user="test-user",
            expected_status_code=200,
            expected_body={
                "architecture_id": "test-id",
                "can_share": True,
                "can_write": True,
                "entities": [
                    {
                        "id": "user:test-user",
                        "name": "test-user",
                        "role": "owner",
                        "type": "user",
                        "user_id": "test-user",
                    },
                    {
                        "id": "organization:test-org",
                        "role": "viewer",
                        "type": "organization",
                    },
                ],
                "general_access": {
                    "entity": {"id": "organization:test-org", "role": "viewer"},
                    "type": "organization",
                },
            },
        )

    async def test_get_architecture_access_summary(self):
        test_user = "user:test-user"
        await self.run_test_get_architecture_access(
            initial_relations={
                test_user: "owner",
                "organization:test-org#member": "viewer",
                "team:test-team#member": "editor",
            },
            user="test-user",
            summarized=True,
            expected_status_code=200,
            expected_body={
                "architecture_id": "test-id",
                "can_share": True,
                "can_write": True,
                "entities": [],
                "general_access": {
                    "entity": {"id": "organization:test-org#member", "role": "viewer"},
                    "type": "organization",
                },
            },
        )

    async def run_test_get_architecture_access(
        self,
        initial_relations: dict[str, str],
        user: str,
        expected_status_code: int,
        expected_body: dict[str, any],
        expected_exception: Type[Exception] = None,
        summarized: bool = False,
    ):
        if expected_exception is not None:
            self.assertRaises(
                expected_exception, self.arch_handler.get_architecture_access
            )
        mock_authz = mock.MagicMock()
        mock_authz.can_share_architecture = mock.AsyncMock(return_value=True)
        mock_authz.can_write_to_architecture = mock.AsyncMock(return_value=True)
        mock_teams = mock.MagicMock()
        mock_teams.batch_get_teams = mock.AsyncMock(
            return_value=[Team(id="test-team", name="test-team")]
        )
        mock_auth0 = mock.MagicMock()
        mock_auth0.get_users = mock.MagicMock(
            return_value=[{"user_id": "test-user", "name": "test-user"}]
        )
        self.mock_arch_dao.get_architecture = mock.AsyncMock(
            return_value=self.test_architecture
        )

        fga_mock = mock.MagicMock()
        sharing_mgr = SharingManager(fga_mock)
        fga_mock.read_tuples = mock.AsyncMock(
            return_value=[
                Tuple(
                    key=TupleKey(
                        user=user,
                        relation=role,
                        object="architecture:test-id",
                    ),
                    timestamp=0,
                )
                for user, role in initial_relations.items()
            ]
        )
        mock_config = mock.MagicMock()
        mock_config.client_side_validation = False

        result = await self.arch_handler.get_architecture_access(
            user,
            "test-id",
            mock_authz,
            sharing_mgr,
            mock_auth0,
            mock_teams,
            summarized=summarized,
        )
        self.assertEqual(result.status_code, expected_status_code)
        self.assertEqual(
            expected_body,
            json.loads(result.body),
        )
        mock_authz.can_share_architecture.assert_called_once_with(User(user), "test-id")
        self.mock_arch_dao.get_architecture.assert_called_once_with("test-id")
        fga_mock.read_tuples.assert_called_once_with(
            TupleKey(
                local_vars_configuration=mock_config,
                object="architecture:test-id",
                user=None,
                relation=None,
            )
        )
