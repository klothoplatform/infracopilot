import logging
from typing import Optional

logger = logging.getLogger()


def get_fga_secret() -> Optional[str]:
    try:
        with open("fga_secret.key", mode="r") as f:
            secret = f.read()
            return secret
    except Exception:
        logger.error("could not read fga_secret.key", exc_info=True)
        return None


def get_fga_client() -> Optional[str]:
    try:
        with open("fga_client_id.key", mode="r") as f:
            secret = f.read()
            return secret
    except Exception:
        logger.error("could not read fga_client_id.key", exc_info=True)
        return None


def get_fga_store() -> Optional[str]:
    try:
        with open("fga_store_id.key", mode="r") as f:
            secret = f.read()
            return secret
    except Exception:
        logger.error("could not read fga_store_id.key", exc_info=True)
        return None


def get_fga_model() -> Optional[str]:
    try:
        with open("fga_model_id.key", mode="r") as f:
            secret = f.read()
            return secret
    except Exception:
        logger.error("could not read fga_model_id.key", exc_info=True)
        return None
