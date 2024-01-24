import aiounittest
from src.topology.resource import ResourceID, Resource


class TestResource(aiounittest.AsyncTestCase):
    async def test_diff_properties_shallow(self):
        id1 = ResourceID.from_string("aws:api_stage:rest_api_0:api_stage-0")
        properties1 = {
            "Deployment": "aws:api_deployment:rest_api_0:api_deployment-0",
            "RestApi": "aws:rest_api:rest_api_0",
            "StageName": "stage",
        }
        resource1 = Resource(id1, properties1)

        id2 = ResourceID.from_string("aws:api_stage:rest_api_0:api_stage-0")
        properties2 = {
            "Deployment": "aws:api_deployment:rest_api_0:api_deployment-1",
            "RestApi": "aws:rest_api:rest_api_0",
            "StageName": "prod",
        }
        resource2 = Resource(id2, properties2)

        differences = resource1.diff_properties(resource2)
        self.assertEqual(len(differences), 2)
        self.assertEqual(
            differences[".Deployment"],
            (
                "aws:api_deployment:rest_api_0:api_deployment-0",
                "aws:api_deployment:rest_api_0:api_deployment-1",
            ),
        )
        self.assertEqual(differences[".StageName"], ("stage", "prod"))

    async def test_diff_properties_deep(self):
        id1 = ResourceID.from_string("aws:api_stage:rest_api_0:api_stage-0")
        properties1 = {
            "Deployment": {
                "Version": "1.0",
                "Config": {"Memory": "512", "Timeout": "180"},
            },
            "RestApi": "aws:rest_api:rest_api_0",
            "StageName": "stage",
        }
        resource1 = Resource(id1, properties1)

        id2 = ResourceID.from_string("aws:api_stage:rest_api_0:api_stage-0")
        properties2 = {
            "Deployment": {
                "Version": "1.1",
                "Config": {"Memory": "1024", "Timeout": "180"},
            },
            "RestApi": "aws:rest_api:rest_api_0",
            "StageName": "stage",
        }
        resource2 = Resource(id2, properties2)

        differences = resource1.diff_properties(resource2)
        self.assertEqual(len(differences), 2)
        self.assertEqual(differences[".Deployment.Version"], ("1.0", "1.1"))
        self.assertEqual(differences[".Deployment.Config.Memory"], ("512", "1024"))
