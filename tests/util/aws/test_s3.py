import aiounittest
import boto3
from moto import mock_aws
from src.util.aws.s3 import (
    put_object,
    get_object,
    delete_object,
    delete_objects,
    list_objects,
)


class TestS3Methods(aiounittest.AsyncTestCase):
    @mock_aws
    def test_put_object(self):
        conn = boto3.resource("s3", region_name="us-east-1")
        conn.create_bucket(Bucket="mybucket")
        bucket = conn.Bucket("mybucket")
        obj = bucket.Object("mykey")
        put_object(obj, bytearray("Hello World!", "utf-8"))
        body = obj.get()["Body"].read().decode("utf-8")
        self.assertEqual(body, "Hello World!")

    @mock_aws
    def test_get_object(self):
        conn = boto3.resource("s3", region_name="us-east-1")
        conn.create_bucket(Bucket="mybucket")
        bucket = conn.Bucket("mybucket")
        obj = bucket.Object("mykey")
        obj.put(Body="Hello World!")
        body = get_object(obj)
        self.assertEqual(body, b"Hello World!")

    @mock_aws
    def test_list_objects(self):
        conn = boto3.resource("s3", region_name="us-east-1")
        conn.create_bucket(Bucket="mybucket")
        bucket = conn.Bucket("mybucket")
        obj = bucket.Object("mykey")
        obj.put(Body="Hello World!")
        objects = list_objects(bucket)
        self.assertEqual(len(objects), 1)
        self.assertEqual(objects[0].key, "mykey")

    @mock_aws
    def test_delete_objects(self):
        conn = boto3.resource("s3", region_name="us-east-1")
        conn.create_bucket(Bucket="mybucket")
        bucket = conn.Bucket("mybucket")
        obj = bucket.Object("mykey")
        obj.put(Body="Hello World!")
        objects = list(bucket.objects.all())
        delete_objects(bucket, ["mykey"])
        objects = list(bucket.objects.all())
        self.assertEqual(len(objects), 0)

    @mock_aws
    def test_delete_object(self):
        conn = boto3.resource("s3", region_name="us-east-1")
        conn.create_bucket(Bucket="mybucket")
        bucket = conn.Bucket("mybucket")
        obj = bucket.Object("mykey")
        obj.put(Body="Hello World!")
        delete_object(bucket, "mykey")
        objects = list(bucket.objects.all())
        self.assertEqual(len(objects), 0)
