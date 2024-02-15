import logging

from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


def put_object(obj, data):
    """
    Upload data to the object.

    :param data: The data to upload. This can either be bytes or a string. When this
                 argument is a string, it is interpreted as a file name, which is
                 opened in read bytes mode.
    """
    put_data = data
    if isinstance(data, str):
        try:
            put_data = open(data, "rb")
        except IOError:
            logger.exception("Expected file name or binary data, got '%s'.", data)
            raise

    try:
        obj.put(Body=put_data)
        obj.wait_until_exists()
        logger.info(
            "Put object '%s' to bucket '%s'.",
            obj.key,
            obj.bucket_name,
        )
    except ClientError:
        logger.exception(
            "Couldn't put object '%s' to bucket '%s'.",
            obj.key,
            obj.bucket_name,
        )
        raise
    finally:
        if getattr(put_data, "close", None):
            put_data.close()


def get_object(obj):
    """
    Gets the object.

    :return: The object data in bytes.
    """
    try:
        body = obj.get()["Body"].read()
        logger.info(
            "Got object '%s' from bucket '%s'.",
            obj.key,
            obj.bucket_name,
        )
    except ClientError:
        logger.exception(
            "Couldn't get object '%s' from bucket '%s'.",
            obj.key,
            obj.bucket_name,
        )
        raise
    else:
        return body


def list_objects(bucket, prefix=None):
    """
    Lists the objects in a bucket, optionally filtered by a prefix.

    :param bucket: The bucket to query. This is a Boto3 Bucket resource.
    :param prefix: When specified, only objects that start with this prefix are listed.
    :return: The list of objects.
    """
    try:
        if not prefix:
            objects = list(bucket.objects.all())
        else:
            objects = list(bucket.objects.filter(Prefix=prefix))
        logger.info(
            "Got objects %s from bucket '%s'", [o.key for o in objects], bucket.name
        )
    except ClientError:
        logger.exception("Couldn't get objects for bucket '%s'.", bucket.name)
        raise
    else:
        return objects


def delete_objects(bucket, object_keys):
    """
    Removes a list of objects from a bucket.
    This operation is done as a batch in a single request.

    :param bucket: The bucket that contains the objects. This is a Boto3 Bucket
                    resource.
    :param object_keys: The list of keys that identify the objects to remove.
    :return: The response that contains data about which objects were deleted
                and any that could not be deleted.
    """
    try:
        response = bucket.delete_objects(
            Delete={"Objects": [{"Key": key} for key in object_keys]}
        )
        if "Deleted" in response:
            logger.info(
                "Deleted objects '%s' from bucket '%s'.",
                [del_obj["Key"] for del_obj in response["Deleted"]],
                bucket.name,
            )
        if "Errors" in response:
            logger.warning(
                "Could not delete objects '%s' from bucket '%s'.",
                [
                    f"{del_obj['Key']}: {del_obj['Code']}"
                    for del_obj in response["Errors"]
                ],
                bucket.name,
            )
    except ClientError:
        logger.exception("Couldn't delete any objects from bucket %s.", bucket.name)
        raise
    else:
        return response


def delete_object(bucket, object_key: str):
    """
    Deletes the object.
    """
    try:
        obj = bucket.Object(object_key)
        obj.delete()
        obj.wait_until_not_exists()
        logger.info(
            "Deleted object '%s' from bucket '%s'.",
            obj.key,
            obj.bucket_name,
        )
    except ClientError as err:
        if err.response["Error"]["Code"] == "NoSuchKey":
            return
        logger.exception(
            "Couldn't delete object '%s' from bucket '%s'.",
            obj.key,
            obj.bucket_name,
        )
        raise
