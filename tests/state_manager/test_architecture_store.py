import jsons
from src.engine_service.engine_commands.run import RunEngineResult
from src.state_manager.architecture_storage import (
    get_state_from_fs,
    write_state_to_fs,
    get_path_for_architecture,
    root_path,
)
from src.state_manager.architecture_data import Architecture
import aiounittest
import os
import shutil


class TestTemplateStore(aiounittest.AsyncTestCase):
    test_architecture = Architecture(
        id="test",
        state=1,
        owner="bob",
        engine_version=1.0,
        constraints={},
        created_at=1,
        updated_by="bob",
    )
    test_content = RunEngineResult(
        resources_yaml="resources_yaml",
        topology_yaml="topology_yaml",
        iac_topology="iac_topology",
    )

    @classmethod
    def setUpClass(self):
        path = f"{get_path_for_architecture(self.test_architecture)}/state.json"
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as file:
            file.write(jsons.dumps(self.test_content))
        self.test_architecture.state_location = path

    @classmethod
    def tearDownClass(self):
        shutil.rmtree(root_path)

    async def test_can_get_architecture(self):
        result = await get_state_from_fs(self.test_architecture)
        assert result == self.test_content

    async def test_can_get_architecture_does_not_exist(self):
        bad_test_data = Architecture(
            id="not-test",
            state=1,
            owner="bob",
            engine_version=1.0,
            constraints={},
            created_at=1,
            updated_by="bob",
        )
        with self.assertRaises(Exception) as context:
            await get_state_from_fs(bad_test_data)
        self.assertEqual(
            "No architecture exists for id not-test and state 1", str(context.exception)
        )

    async def test_can_write_architecture_state(self):
        new_arch = Architecture(
            id="new-test",
            state=1,
            owner="bob",
            engine_version=1.0,
            constraints={},
            created_at=1,
            updated_by="bob",
        )

        result = RunEngineResult(
            resources_yaml="resources_yaml",
            topology_yaml="topology_yaml",
            iac_topology="iac_topology",
        )
        await write_state_to_fs(new_arch, result)
        with open(f"{get_path_for_architecture(new_arch)}/state.json", "r") as file:
            assert file.read() == jsons.dumps(result)
