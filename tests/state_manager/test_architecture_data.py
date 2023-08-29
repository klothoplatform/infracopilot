from src.util.orm import Base, engine, session
from src.state_manager.architecture_data import (
    Architecture,
    get_architecture_latest,
    get_architecture_history,
    add_architecture,
    get_architectures_by_owner,
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
                owner="bob",
                engine_version=1.0,
                constraints={},
                created_at=1,
                updated_by="bob",
            )
        )
        self.session.add(
            Architecture(
                id="test",
                state=2,
                owner="bob",
                engine_version=1.0,
                constraints={},
                created_at=1,
                updated_by="bob",
            )
        )

    def tearDown(self):
        self.session.query(Architecture).delete()

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
                owner="bob",
                engine_version=1.0,
                constraints={},
                created_at=1,
                updated_by="bob",
            ),
        )

    async def test_can_get_architecture_history(self):
        result = await get_architecture_history("test")
        self.assertEqual(
            result,
            [
                Architecture(
                    id="test",
                    state=1,
                    owner="bob",
                    engine_version=1.0,
                    constraints={},
                    created_at=1,
                    updated_by="bob",
                ),
                Architecture(
                    id="test",
                    state=2,
                    owner="bob",
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
        result = await get_architectures_by_owner("bob")
        self.assertEqual(result, {"test"})

    async def test_can_get_architectures_by_owner_none_exist(self):
        result = await get_architectures_by_owner("unknown")
        self.assertEqual(result, set())

    async def test_can_add_architecture(self):
        architecture = Architecture(
            id="test",
            state=3,
            owner="bob",
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
                    owner="bob",
                    engine_version=1.0,
                    constraints={},
                    created_at=1,
                    updated_by="bob",
                ),
                Architecture(
                    id="test",
                    state=2,
                    owner="bob",
                    engine_version=1.0,
                    constraints={},
                    created_at=1,
                    updated_by="bob",
                ),
                Architecture(
                    id="test",
                    state=3,
                    owner="bob",
                    engine_version=1.0,
                    constraints={},
                    created_at=1,
                    updated_by="bob",
                ),
            ],
        )
