import aiounittest
from src.topology.topology import Topology, DiffStatus
from src.topology.resource import Resource, ResourceID
from src.topology.edge import Edge


class TestResourceID(aiounittest.AsyncTestCase):
    async def test_from_string(self):
        id_string = "aws:api_stage:rest_api_0:api_stage-0"
        id = ResourceID.from_string(id_string)
        self.assertEqual(id.provider, "aws")
        self.assertEqual(id.type, "api_stage")
        self.assertEqual(id.namespace, "rest_api_0")
        self.assertEqual(id.name, "api_stage-0")


class TestTopology(aiounittest.AsyncTestCase):
    async def test_from_string(self):
        yaml_string = """
        resources:
            aws:api_stage:rest_api_0:api_stage-0:
                Deployment: aws:api_deployment:rest_api_0:api_deployment-0
                RestApi: aws:rest_api:rest_api_0
                StageName: stage
        edges:
            aws:api_stage:rest_api_0:api_stage-0 -> aws:api_deployment:rest_api_0:api_deployment-0:
        """
        topology = Topology.from_string(yaml_string)
        self.assertEqual(len(topology.resources), 1)
        self.assertEqual(len(topology.edges), 1)
        resource = topology.resources[0]
        self.assertEqual(resource.id.provider, "aws")
        self.assertEqual(resource.id.type, "api_stage")
        self.assertEqual(resource.id.namespace, "rest_api_0")
        self.assertEqual(resource.id.name, "api_stage-0")
        self.assertEqual(
            resource.properties["Deployment"],
            "aws:api_deployment:rest_api_0:api_deployment-0",
        )
        self.assertEqual(resource.properties["RestApi"], "aws:rest_api:rest_api_0")
        self.assertEqual(resource.properties["StageName"], "stage")
        edge = topology.edges[0]
        self.assertEqual(edge.source.provider, "aws")
        self.assertEqual(edge.source.type, "api_stage")
        self.assertEqual(edge.source.namespace, "rest_api_0")
        self.assertEqual(edge.source.name, "api_stage-0")
        self.assertEqual(edge.target.provider, "aws")
        self.assertEqual(edge.target.type, "api_deployment")
        self.assertEqual(edge.target.namespace, "rest_api_0")
        self.assertEqual(edge.target.name, "api_deployment-0")

    async def test_diff_topology(self):
        id1 = ResourceID.from_string("aws:api_stage:rest_api_0:api_stage-0")
        properties1 = {
            "Deployment": "aws:api_deployment:rest_api_0:api_deployment-0",
            "RestApi": "aws:rest_api:rest_api_0",
            "StageName": "stage",
        }
        resource1 = Resource(id1, properties1)

        id2 = ResourceID.from_string("aws:api_stage:rest_api_0:api_stage-1")
        properties2 = {
            "Deployment": "aws:api_deployment:rest_api_0:api_deployment-1",
            "RestApi": "aws:rest_api:rest_api_0",
            "StageName": "prod",
        }
        resource2 = Resource(id2, properties2)

        edge1 = Edge.from_string(
            "aws:api_stage:rest_api_0:api_stage-0 -> aws:api_deployment:rest_api_0:api_deployment-0"
        )
        edge2 = Edge.from_string(
            "aws:api_stage:rest_api_0:api_stage-1 -> aws:api_deployment:rest_api_0:api_deployment-1"
        )

        topology1 = Topology([resource1], [edge1])
        topology2 = Topology([resource2], [edge2])

        diff = topology1.diff_topology(topology2)

        self.assertEqual(len(diff.resources), 2)
        self.assertEqual(diff.resources[resource1.id].status, DiffStatus.REMOVED)
        self.assertEqual(diff.resources[resource2.id].status, DiffStatus.ADDED)

        self.assertEqual(len(diff.edges), 2)
        self.assertEqual(diff.edges[edge1.source].status, DiffStatus.REMOVED)
        self.assertEqual(diff.edges[edge2.source].status, DiffStatus.ADDED)

    async def test_diff_topology_with_properties(self):
        id1 = ResourceID.from_string("aws:api_stage:rest_api_0:api_stage-0")
        properties1 = {
            "Deployment": "aws:api_deployment:rest_api_0:api_deployment-0",
            "RestApi": "aws:rest_api:rest_api_0",
            "StageName": "stage",
        }
        resource1 = Resource(id1, properties1)

        properties2 = {
            "Deployment": "aws:api_deployment:rest_api_0:api_deployment-1",
            "RestApi": "aws:rest_api:rest_api_0",
            "StageName": "stage",
        }
        resource2 = Resource(id1, properties2)

        edge = Edge.from_string(
            "aws:api_stage:rest_api_0:api_stage-0 -> aws:api_deployment:rest_api_0:api_deployment-0"
        )

        topology1 = Topology([resource1], [edge])
        topology2 = Topology([resource2], [edge])

        diff_with_properties = topology1.diff_topology(
            topology2, include_properties_diff=True
        )
        self.assertEqual(len(diff_with_properties.resources), 1)
        self.assertEqual(
            diff_with_properties.resources[resource1.id].status, DiffStatus.CHANGED
        )
        self.assertEqual(
            diff_with_properties.resources[resource1.id].properties[".Deployment"],
            (
                "aws:api_deployment:rest_api_0:api_deployment-0",
                "aws:api_deployment:rest_api_0:api_deployment-1",
            ),
        )
        self.assertEqual(len(diff_with_properties.edges), 0)
