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

    async def test_diff_properties_nested_array_deep(self):
        id1 = ResourceID.from_string("aws:api_stage:rest_api_0:api_stage-0")
        properties1 = {
            "AssumeRolePolicyDoc": {
                "Statement": [
                    {
                        "Action": ["sts:AssumeRole"],
                        "Effect": "Allow",
                        "Principal": {"Service": ["lambda.amazonaws.com"]},
                    }
                ],
                "Version": "2012-10-17",
            },
            "InlinePolicies": [
                {
                    "Name": "s3-bucket-1-policy",
                    "Policy": {
                        "Statement": [
                            {
                                "Action": ["s3:read"],
                                "Condition": {},
                                "Effect": "Allow",
                                "Principal": {},
                                "Resource": [
                                    "aws:s3_bucket:s3-bucket-1#Arn",
                                    "aws:s3_bucket:s3-bucket-1#AllBucketDirectory",
                                ],
                            }
                        ],
                        "Version": "2012-10-17",
                    },
                }
            ],
            "ManagedPolicies": [
                "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
            ],
        }
        resource1 = Resource(id1, properties1)

        id2 = ResourceID.from_string("aws:api_stage:rest_api_0:api_stage-0")
        properties2 = {
            "AssumeRolePolicyDoc": {
                "Statement": [
                    {
                        "Action": ["sts:AssumeRole"],
                        "Effect": "Deny",
                        "Principal": {"Service": ["lambda.amazonaws.com"]},
                    }
                ],
                "Version": "2012-10-17",
            },
            "InlinePolicies": [
                {
                    "Name": "s3-bucket-1-policy",
                    "Policy": {
                        "Statement": [
                            {
                                "Action": ["s3:*"],
                                "Effect": "Allow",
                                "Resource": [
                                    "aws:s3_bucket:s3-bucket-1#Arn",
                                    "aws:s3_bucket:s3-bucket-1#AllBucketDirectory",
                                ],
                            }
                        ],
                        "Version": "2012-10-17",
                    },
                }
            ],
            "ManagedPolicies": [
                "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
            ],
        }
        resource2 = Resource(id2, properties2)

        differences = resource1.diff_properties(resource2)
        self.assertEqual(len(differences), 4)
        self.assertEqual(
            differences[".AssumeRolePolicyDoc.Statement[0].Effect"], ("Allow", "Deny")
        )
        self.assertEqual(
            differences[".InlinePolicies[0].Policy.Statement[0].Action[0]"],
            ("s3:read", "s3:*"),
        )
        self.assertEqual(
            differences[".InlinePolicies[0].Policy.Statement[0].Condition"], ({}, None)
        )
        self.assertEqual(
            differences[".InlinePolicies[0].Policy.Statement[0].Principal"], ({}, None)
        )

    async def test_diff_properties_empty(self):
        id1 = ResourceID.from_string("aws:api_stage:rest_api_0:api_stage-0")
        properties1 = {}
        resource1 = Resource(id1, properties1)

        id2 = ResourceID.from_string("aws:api_stage:rest_api_0:api_stage-0")
        properties2 = {}
        resource2 = Resource(id2, properties2)

        differences = resource1.diff_properties(resource2)
        self.assertEqual(len(differences), 0)
