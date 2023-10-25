import logging
import os
from typing import Optional
import json

# @klotho::persist {
#   id = "creds"
#   secret = true
# }
import aiofiles as secrets

logger = logging.getLogger()


async def get_fga_secret() -> Optional[str]:
    try:
        async with secrets.open("fga_secret.key", mode="r") as f:
            secret = await f.read()
            return secret
    except Exception:
        logger.error("could not read fga_secret.key", exc_info=True)
        return None


async def get_fga_client() -> Optional[str]:
    try:
        async with secrets.open("fga_client_id.key", mode="r") as f:
            secret = await f.read()
            return secret
    except Exception:
        logger.error("could not read fga_client_id.key", exc_info=True)
        return None


async def get_fga_store() -> Optional[str]:
    try:
        async with secrets.open("fga_store_id.key", mode="r") as f:
            secret = await f.read()
            return secret
    except Exception:
        logger.error("could not read fga_store_id.key", exc_info=True)
        return None


async def get_fga_model() -> Optional[str]:
    try:
        async with secrets.open("fga_model_id.key", mode="r") as f:
            secret = await f.read()
            return secret
    except Exception:
        logger.error("could not read fga_model_id.key", exc_info=True)
        return None
