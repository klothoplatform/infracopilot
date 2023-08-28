from src.template_manager.template_store import get_template, write_template_for_owner
from src.template_manager.template_data import ResourceTemplateData, EdgeTemplateData
import aiounittest
import os
import shutil


class TestTemplateStore(aiounittest.AsyncTestCase):
    test_data = ResourceTemplateData(
        resource="test", version=1.0, owner="bob", location="./tmp/test_template.yaml"
    )
    test_template = "this is our test template"

    @classmethod
    def setUpClass(self):
        os.makedirs("./tmp", exist_ok=True)
        with open(self.test_data.location, "w") as file:
            file.write(self.test_template)

    @classmethod
    def tearDownClass(self):
        shutil.rmtree("./tmp")

    async def test_can_get_template(self):
        result = await get_template(self.test_data.location)
        assert result == self.test_template

    async def test_can_get_template_does_not_exist(self):
        bad_test_data = ResourceTemplateData(
            resource="test",
            version=1.0,
            owner="bob",
            location="./tmp/bad_template.yaml",
        )
        with self.assertRaises(Exception) as context:
            await get_template(bad_test_data.location)
        assert "No template exists at location: ./tmp/bad_template.yaml" == str(
            context.exception
        )

    async def test_can_write_template(self):
        template_string = "this is the template that we are writing"
        await write_template_for_owner(self.test_data.location, template_string)
        with open(self.test_data.location, "r") as file:
            assert file.read() == template_string
