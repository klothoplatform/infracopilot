from src.util.orm import Base, engine
from src.template_manager.template_data import (
    ResourceTemplateData,
    add_resource_template,
    add_edge_template,
    get_resource_templates_data_for_owner,
    get_klotho_supported_resource_template_data,
    EdgeTemplateData,
    get_klotho_supported_edge_template_data,
    get_edge_templates_data_for_owner,
)
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

    @classmethod
    def tearDownClass(self):
        self.session.close()
        Base.metadata.drop_all(engine)

    async def test_can_get_templates_for_owner_none_exist(self):
        result = await get_resource_templates_data_for_owner("unknown")
        assert result == []

    async def test_can_get_templates_for_owner(self):
        result = await get_resource_templates_data_for_owner("bob")
        assert len(result) == 1
        assert result[0].resource == "test"

    async def test_can_get_klotho_supported_templates(self):
        result = await get_klotho_supported_resource_template_data()
        assert len(result) == 1
        assert result[0].resource == "klotho-test"

    async def can_add_template_versions(self):
        template = ResourceTemplateData(
            resource="test", version=2.0, owner="bob", location="test"
        )
        await add_resource_template(template)
        result = await get_resource_templates_data_for_owner("bob")
        assert len(result) == 2
        assert result[0].resource == "test"
        assert result[0].version == 1.0
        assert result[1].version == 2.0

    async def can_add_template_owners(self):
        template = ResourceTemplateData(
            resource="test", version=1.0, owner="alice", location="test"
        )
        await add_resource_template(template)
        result = await get_resource_templates_data_for_owner("alice")
        assert len(result) == 1
        assert result[0].resource == "test"
        assert result[0].version == 1.0


class TestEdgeTemplateData(aiounittest.AsyncTestCase):
    @classmethod
    def setUpClass(self):
        Base.metadata.create_all(engine)
        self.session = Session(engine)
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
                source="klotho-test",
                destination="test",
                version=1.0,
                owner="klotho",
                location="test",
            )
        )

    @classmethod
    def tearDownClass(self):
        self.session.close()
        Base.metadata.drop_all(engine)

    async def test_can_get_templates_for_owner_none_exist(self):
        result = await get_edge_templates_data_for_owner("unknown")
        assert result == []

    async def test_can_get_templates_for_owner(self):
        result = await get_edge_templates_data_for_owner("bob")
        assert len(result) == 1
        assert result[0].source == "test"

    async def test_can_get_klotho_supported_templates(self):
        result = await get_klotho_supported_edge_template_data()
        assert len(result) == 1
        assert result[0].source == "klotho-test"

    async def can_add_template_versions(self):
        template = EdgeTemplateData(
            source="test", destination="test", version=2.0, owner="bob", location="test"
        )
        await add_edge_template(template)
        result = await get_edge_templates_data_for_owner("bob")
        assert len(result) == 2
        assert result[0].source == "test"
        assert result[0].version == 1.0
        assert result[1].version == 2.0

    async def can_add_template_owners(self):
        template = EdgeTemplateData(
            source="test",
            destination="test",
            version=1.0,
            owner="alice",
            location="test",
        )
        await add_edge_template(template)
        result = await get_edge_templates_data_for_owner("alice")
        assert len(result) == 1
        assert result[0].source == "test"
        assert result[0].version == 1.0
