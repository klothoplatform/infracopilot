from src.state_manager.architecture_storage import get_state_from_fs, write_state_to_fs, get_path_for_architecture, root_path
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
    test_content = "this is our test content"

    @classmethod
    def setUpClass(self):
        path = get_path_for_architecture(self.test_architecture)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as file:
            file.write(self.test_content)

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
        assert "No architecture exists at location: state/not-test/1.zip" == str(
            context.exception
        )

    async def test_can_write_template(self):
        new_arch = Architecture(
            id="new-test",
            state=1,
            owner="bob",
            engine_version=1.0,
            constraints={},
            created_at=1,
            updated_by="bob",
        )
        template_string = "this is the template that we are writing"
        await write_state_to_fs(new_arch, template_string)
        with open(get_path_for_architecture(new_arch), "r") as file:
            assert file.read() == template_string
