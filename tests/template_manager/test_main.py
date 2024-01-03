from src.util.orm import Base, engine
from src.template_manager.template_data import ResourceTemplateData, EdgeTemplateData
from src.template_manager.main import get_owner_templates
import aiounittest
from sqlalchemy.orm import Session


class TestResourceTemplateData(aiounittest.AsyncTestCase):
    @classmethod
    def setUpClass(self):
        Base.metadata.create_all(engine)
        self.session = Session(engine)
        self.session.add(
            ResourceTemplateData(
                resource="test", version=1.0, owner="bob", location="test"
            )
        )
        self.session.add(
            ResourceTemplateData(
                resource="klotho-test", version=1.0, owner="klotho", location="test"
            )
        )
        self.session.add(
            ResourceTemplateData(
                resource="test", version=2.0, owner="bob", location="test"
            )
        )
        self.session.add(
            ResourceTemplateData(
                resource="test", version=3.0, owner="alice", location="test"
            )
        )
        self.session.add(
            ResourceTemplateData(
                resource="test", version=3.0, owner="klotho", location="test"
            )
        )
        self.session.add(
            EdgeTemplateData(
                source="test",
                destination="test",
                version=1.0,
                owner="bob",
                location="test",
            )
        )
        self.session.add(
            EdgeTemplateData(
                source="test",
                destination="test",
                version=2.0,
                owner="bob",
                location="test",
            )
        )
        self.session.add(
            EdgeTemplateData(
                source="test",
                destination="test2",
                version=1.0,
                owner="bob",
                location="test",
            )
        )
        self.session.add(
            EdgeTemplateData(
                source="test",
                destination="test",
                version=1.0,
                owner="klotho",
                location="test",
            )
        )
        self.session.add(
            EdgeTemplateData(
                source="src",
                destination="test",
                version=1.0,
                owner="klotho",
                location="test",
            )
        )
        self.session.commit()

    @classmethod
    def tearDownClass(self):
        self.session.close()
        Base.metadata.drop_all(engine)

    async def test_get_owner_templates(self):
        templates = await get_owner_templates("bob")
        assert len(templates) == 5
        self.assertIn(
            ResourceTemplateData(
                resource="test", version=2.0, owner="bob", location="test"
            ),
            templates,
        )
        self.assertIn(
            ResourceTemplateData(
                resource="klotho-test", version=1.0, owner="klotho", location="test"
            ),
            templates,
        )
        self.assertIn(
            EdgeTemplateData(
                source="test",
                destination="test2",
                version=1.0,
                owner="bob",
                location="test",
            ),
            templates,
        )
        self.assertIn(
            EdgeTemplateData(
                source="test",
                destination="test",
                version=2.0,
                owner="bob",
                location="test",
            ),
            templates,
        )
        self.assertIn(
            EdgeTemplateData(
                source="src",
                destination="test",
                version=1.0,
                owner="klotho",
                location="test",
            ),
            templates,
        )
