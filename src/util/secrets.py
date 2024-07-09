import logging
from typing import Optional

logger = logging.getLogger()


def get_fga_secret() -> Optional[str]:
    try:
        with open("fga_secret.key", mode="r") as f:
            secret = f.read()
            return secret
    except Exception:
        return None


def get_fga_client() -> Optional[str]:
    try:
        with open("fga_client_id.key", mode="r") as f:
            secret = f.read()
            return secret
    except Exception:
        return None


def get_auth0_client() -> Optional[str]:
    try:
        with open("auth0_client_id.key", mode="r") as f:
            secret = f.read()
            return secret
    except Exception:
        logger.error("could not read auth0_client_id.key", exc_info=True)
        return None


def get_auth0_secret() -> Optional[str]:
    try:
        with open("auth0_client_secret.key", mode="r") as f:
            secret = f.read()
            return secret
    except Exception:
        logger.error("could not read auth0_client_secret.key", exc_info=True)
        return None


def get_azure_open_ai_key() -> Optional[str]:
    try:
        with open("azure_openai_api_key.key", mode="r") as f:
            secret = f.read()
            return secret
    except Exception:
        logger.error("could not read azure_openai_api_key.key", exc_info=True)
        return ""
