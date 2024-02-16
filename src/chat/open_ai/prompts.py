import os
from pathlib import Path

import aiofiles

from src.util.logging import logger

log = logger.getChild("prompts")

PROMPTS_DIR = Path(os.environ.get("PROMPTS_DIR", "src/chat/open_ai/prompts"))


async def get_prompt(name: str) -> str:
    try:
        log.info(f"attempting to load prompt from {PROMPTS_DIR}/%s", name)
        async with aiofiles.open(PROMPTS_DIR / name, mode="r") as f:
            return await f.read()
    except Exception:
        log.info("falling back to to load prompt from prompts/%s", name)
        async with aiofiles.open(f"prompts/{name}", "r") as f:
            return await f.read()


async def current_state_prompt(state) -> str:
    current_state_prompt = await get_prompt("state.txt")
    return current_state_prompt.format(state=state)


async def parse_content_short(query: str) -> str:
    parse_prompt_content_short = await get_prompt("parse_content_short.txt")
    return parse_prompt_content_short.format(query=query)


async def parse_content(query: str) -> str:
    content_short = await parse_content_short(query)
    parse_prompt_content = await get_prompt("parse_content.txt")
    return parse_prompt_content.format(parse_prompt_content_short=content_short)


async def get_initial_prompt() -> str:
    return await get_prompt("initial_message.txt")


async def get_explain_diff_prompt() -> str:
    return await get_prompt("explain_diff.txt")


async def get_explain_architecture_prompt() -> str:
    return await get_prompt("explain_architecture.txt")
