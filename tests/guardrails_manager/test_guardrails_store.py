from src.guardrails_manager.guardrails_store import get_guardrails, write_guardrails, root_path
import aiounittest
import os
import shutil


class TestGuardrailsStore(aiounittest.AsyncTestCase):
    test_owner = "test"
    test_guardrails = "this is our test content"

    @classmethod
    def setUpClass(self):
        os.makedirs(root_path, exist_ok=True)
        with open(root_path / f'{self.test_owner}.yaml', "w") as file:
            file.write(self.test_guardrails)

    @classmethod
    def tearDownClass(self):
        shutil.rmtree(root_path)

    async def test_can_get_architecture(self):
        result = await get_guardrails(self.test_owner)
        assert result == self.test_guardrails

    async def test_can_get_guardrails_does_not_exist(self):
        result = await get_guardrails("who")
        self.assertIsNone(result)

    async def test_can_write_guardrails(self):
        new_owner = "owner"
        new_gurdrails = "this is the guardrails that we are writing"
        await write_guardrails(new_owner, new_gurdrails)
        with open(root_path / f'{new_owner}.yaml', "r") as file:
            assert file.read() == new_gurdrails
