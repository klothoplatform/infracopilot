import aiounittest
import boto3
from moto import mock_aws

from src.util.aws.secrets_manager import get_secret_value


class TestSecretsManagerMethods(aiounittest.AsyncTestCase):
    @mock_aws
    def test_get_secret_value(self):
        conn = boto3.client("secretsmanager", region_name="us-east-1")
        conn.create_secret(Name="mysecret", SecretString="Hello World!")
        secret_value = get_secret_value(conn, "mysecret")
        self.assertEqual(secret_value["SecretString"], "Hello World!")
