from collections import OrderedDict
from dataclasses import dataclass
from time import perf_counter
from typing import Optional

from src.chat.message_execution import MessageExecutionException
from src.chat.open_ai import prompts, client
from src.util.logging import logger

log = logger.getChild("conversation")


@dataclass
class InterpretMessageResults:
    response_time: float
    ai_response: str


@dataclass
class InterpretMessageException(BaseException):
    response_time: float
    ai_response: Optional[str]


class ExplainDiff:
    messages: OrderedDict[str, str]

    def __init__(
        self,
    ):
        self.messages = OrderedDict()

    async def construct_messages(self, diff: str):
        messages = [
            {
                "role": "user",
                "content": await prompts.get_explain_diff_prompt(),
            },
        ]

        messages.append(
            {
                "role": "user",
                "content": diff,
            }
        )

        return messages

    async def interpret_query(
        self, message: str, timeout_sec=15
    ) -> InterpretMessageResults:
        messages = await self.construct_messages(message)

        for i, m in enumerate(messages):
            log.debug("Message[%d]: %s", i, m)

        start = perf_counter()
        try:
            completion = await client.chat.completions.create(
                model="klo4o",
                temperature=0,
                timeout=10 * timeout_sec,
                messages=messages,
            )
        except Exception as err:
            raise InterpretMessageException(
                response_time=perf_counter() - start,
                ai_response=None,
            ) from err

        result = InterpretMessageResults(
            ai_response=completion.choices[0].message.content,
            response_time=perf_counter() - start,
        )

        log.debug("Response: %s", completion)
        log.debug(
            "Prompt %d tokens returned in: %ss",
            completion.usage.prompt_tokens,
            result.response_time,
        )

        return result

    async def do_query(
        self, query_id: str, query: str, timeout_sec=15
    ) -> InterpretMessageResults:
        try:
            result = await self.interpret_query(query, timeout_sec=timeout_sec)
            log.debug(
                "Got:\n%s",
                "\n".join(str(a) for a in result.ai_response.split("\n")),
            )
            return result
        except InterpretMessageException as err:
            cause = err.__cause__
            log.error(
                "Failed to interpret message",
                exc_info=(type(cause), cause, cause.__traceback__),
            )
            raise MessageExecutionException(
                error_message="Something went wrong",
                message_id=query_id,
                user_message=query,
                ai_response=err.ai_response,
            ) from err
