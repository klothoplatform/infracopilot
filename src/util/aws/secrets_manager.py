import logging

from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


def get_secret_value(client, secret_id: str, stage=None):
    """
    Gets the value of a secret.

    :param stage: The stage of the secret to retrieve. If this is None, the
                    current stage is retrieved.
    :return: The value of the secret. When the secret is a string, the value is
                contained in the `SecretString` field. When the secret is bytes,
                it is contained in the `SecretBinary` field.
    """
    if secret_id is None:
        raise ValueError

    try:
        kwargs = {"SecretId": secret_id}
        if stage is not None:
            kwargs["VersionStage"] = stage
        response = client.get_secret_value(SecretId=secret_id)
        logger.info("Got value for secret %s.", secret_id)
    except ClientError:
        logger.exception("Couldn't get value for secret %s.", secret_id)
        raise
    else:
        return response
