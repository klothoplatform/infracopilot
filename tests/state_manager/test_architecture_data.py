from src.util.entity import User
from src.util.orm import Base, engine, session
from src.state_manager.architecture_data import (
    Architecture,
    delete_architecture,
    delete_future_states,
    get_architecture_at_state,
    get_architecture_changelog_history,
    get_architecture_latest,
    get_architecture_history,
    add_architecture,
    get_architectures_by_owner,
    get_next_state,
    get_previous_state,
    get_architecture_current,
    set_current_state,
)
import aiounittest


class TestArchitectureData(aiounittest.AsyncTestCase):
    @classmethod
    def setUpClass(self):
        Base.metadata.create_all(engine)
        self.session = session

    @classmethod
    def tearDownClass(self):
        self.session.rollback()
        self.session.close()
        Base.metadata.drop_all(engine)

    def setUp(self):
        self.session.add(
            Architecture(
                id="test",
                state=1,
                owner="user:bob",
                engine_version=1.0,
                constraints={},
                created_at=1,
                updated_by="bob",
                decisions=[{"id": "test"}],
            )
        )
        self.session.add(
            Architecture(
                id="test",
                state=2,
                owner="user:bob",
                engine_version=1.0,
                constraints={},
                created_at=1,
                updated_by="bob",
                decisions=[{"id": "another test"}],
            )
        )

    def tearDown(self):
        self.session.query(Architecture).delete()

    async def test_set_current_state(self):
        await set_current_state("test", 1)
        result = await get_architecture_current("test")
        self.assertEqual(
            result,
            Architecture(
                id="test",
                state=1,
                owner="user:bob",
                engine_version=1.0,
                constraints={},
                decisions=[{"id": "test"}],
                created_at=1,
                updated_by="bob",
                extraFields={"current": True},
            ),
        )
        self.assertEqual(result.extraFields["current"], True)

    async def test_set_current_state_sets_other_states_to_false(self):
        await set_current_state("test", 1)
        await set_current_state("test", 2)
        result = await get_architecture_current("test")
        self.assertEqual(
            result,
            Architecture(
                id="test",
                state=2,
                owner="user:bob",
                engine_version=1.0,
                constraints={},
                decisions=[{"id": "another test"}],
                created_at=1,
                updated_by="bob",
                extraFields={"current": True},
            ),
        )
        self.assertEqual(result.extraFields["current"], True)
        arch1 = await get_architecture_at_state("test", 1)
        self.assertEqual(arch1.extraFields["current"], False)

    async def test_get_architecture_current_none_exists(self):
        result = await get_architecture_current("unknown")
        self.assertIsNone(result)

    async def test_get_architecture_current_uses_latest_if_no_current(self):
        result = await get_architecture_current("test")
        self.assertEqual(
            result,
            Architecture(
                id="test",
                state=2,
                owner="user:bob",
                engine_version=1.0,
                constraints={},
                decisions=[{"id": "another test"}],
                created_at=1,
                updated_by="bob",
                extraFields={"current": True},
            ),
        )
        self.assertEqual(result.extraFields["current"], True)

    async def test_can_delete_future_states(self):
        await delete_future_states("test", 1)
        result = await get_architecture_history("test")
        self.assertEqual(
            result,
            [
                Architecture(
                    id="test",
                    state=1,
                    owner="user:bob",
                    engine_version=1.0,
                    constraints={},
                    decisions=[{"id": "test"}],
                    created_at=1,
                    updated_by="bob",
                )
            ],
        )

    async def test_delete_architecture(self):
        await delete_architecture("test")
        result = await get_architecture_latest("test")
        self.assertIsNone(result)

    async def test_can_latest_architecture_none_exist(self):
        result = await get_architecture_latest("unknown")
        self.assertIsNone(result)

    async def test_can_latest_architecture(self):
        result = await get_architecture_latest("test")
        self.assertEqual(
            result,
            Architecture(
                id="test",
                state=2,
                owner="user:bob",
                engine_version=1.0,
                constraints={},
                created_at=1,
                updated_by="bob",
            ),
        )

    async def test_can_get_architecture_at_state(self):
        result = await get_architecture_at_state("test", 1)
        self.assertEqual(
            result,
            Architecture(
                id="test",
                state=1,
                owner="user:bob",
                engine_version=1.0,
                constraints={},
                decisions=[{"id": "test"}],
                created_at=1,
                updated_by="bob",
            ),
        )

    async def test_get_architecture_at_state_none_exist(self):
        result = await get_architecture_at_state("test", 3)
        self.assertIsNone(result)

    async def test_get_previous_state(self):
        result = await get_previous_state("test", 2)
        self.assertEqual(
            result,
            Architecture(
                id="test",
                state=1,
                owner="user:bob",
                engine_version=1.0,
                constraints={},
                decisions=[{"id": "test"}],
                created_at=1,
                updated_by="bob",
            ),
        )

    async def test_get_previous_state_none_exist(self):
        result = await get_previous_state("test", 1)
        self.assertIsNone(result)

    async def test_get_next_state(self):
        result = await get_next_state("test", 1)
        self.assertEqual(
            result,
            Architecture(
                id="test",
                state=2,
                owner="user:bob",
                engine_version=1.0,
                constraints={},
                decisions=[{"id": "another test"}],
                created_at=1,
                updated_by="bob",
            ),
        )

    async def test_get_next_state_none_exist(self):
        result = await get_next_state("test", 2)
        self.assertIsNone(result)

    async def test_can_get_architecture_history(self):
        result = await get_architecture_history("test")
        self.assertEqual(
            result,
            [
                Architecture(
                    id="test",
                    state=1,
                    owner="user:bob",
                    decisions=[{"id": "test"}],
                    engine_version=1.0,
                    constraints={},
                    created_at=1,
                    updated_by="bob",
                ),
                Architecture(
                    id="test",
                    state=2,
                    owner="user:bob",
                    decisions=[{"id": "another test"}],
                    engine_version=1.0,
                    constraints={},
                    created_at=1,
                    updated_by="bob",
                ),
            ],
        )

    async def test_can_get_architecture_history_none_exist(self):
        result = await get_architecture_history("unknown")
        self.assertEqual(result, [])

    async def test_can_get_architectures_by_owner(self):
        result = await get_architectures_by_owner(User("bob"))
        self.assertEqual(len(result), 2)

    async def test_can_get_architectures_by_owner_none_exist(self):
        result = await get_architectures_by_owner(User("unknown"))
        self.assertEqual(result, [])

    async def test_can_add_architecture(self):
        architecture = Architecture(
            id="test",
            state=3,
            owner="user:bob",
            engine_version=1.0,
            constraints={},
            created_at=1,
            updated_by="bob",
        )
        await add_architecture(architecture)
        result = await get_architecture_history("test")
        self.assertEqual(
            result,
            [
                Architecture(
                    id="test",
                    state=1,
                    owner="user:bob",
                    engine_version=1.0,
                    constraints={},
                    decisions=[{"id": "test"}],
                    created_at=1,
                    updated_by="bob",
                ),
                Architecture(
                    id="test",
                    state=2,
                    owner="user:bob",
                    engine_version=1.0,
                    decisions=[{"id": "another test"}],
                    constraints={},
                    created_at=1,
                    updated_by="bob",
                ),
                Architecture(
                    id="test",
                    state=3,
                    owner="user:bob",
                    engine_version=1.0,
                    constraints={},
                    created_at=1,
                    updated_by="bob",
                ),
            ],
        )

    async def test_get_architecture_changelog_history(self):
        history = await get_architecture_changelog_history("test")
        self.assertEqual(
            history,
            [
                {"constraints": {}, "decisions": [{"id": "test"}]},
                {"constraints": {}, "decisions": [{"id": "another test"}]},
            ],
        )
