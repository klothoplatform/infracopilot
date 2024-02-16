from collections import OrderedDict
from dataclasses import dataclass
from time import perf_counter
from typing import Optional, List

import openai

from src.chat.intent_parser import parse_intent, ParseException
from src.chat.message_execution import MessageExecutionException
from src.chat.models import ResourcesAndEdges
from src.chat.open_ai import prompts
from src.chat.open_ai.models import IntentList, ActionMessage, ParsedConstraint
from src.engine_service.engine_commands.run import (
    RunEngineResult,
)
from src.environment_management.models import EnvironmentVersion
from src.topology.topology import Topology
from src.util.logging import logger
from src.util.secrets import get_azure_open_ai_key

openai.api_version = "2023-05-15"
openai.api_base = "https://gpt16.openai.azure.com/"
openai.api_type = "azure"
openai.api_key = get_azure_open_ai_key()


log = logger.getChild("conversation")


@dataclass
class InterpretMessageResults:
    intents: IntentList
    response_time: float
    ai_response: str


@dataclass
class InterpretMessageException(BaseException):
    response_time: float
    ai_response: Optional[str]


class Conversation:
    environment: EnvironmentVersion
    messages: OrderedDict[str, str]
    initial_state: ResourcesAndEdges

    def __init__(
        self,
        environment_version: EnvironmentVersion,
        initial_state: Optional[RunEngineResult] = None,
    ):
        self.environment = environment_version
        self.initial_state = ResourcesAndEdges()
        self.messages = OrderedDict()
        if initial_state:
            topology = Topology.from_topology_yaml(initial_state.topology_yaml)
            self.initial_state.resources = [str(r.id) for r in topology.resources]
            self.initial_state.edges = [str(e) for e in topology.edges]

    def human_messages(self):
        return [m for m in self.messages.values() if not m.startswith("ai:")]

    async def construct_messages(self, query: str):
        messages = [
            {
                "role": "user",
                "content": await prompts.get_initial_prompt(),
            },
        ]

        # TODO might not be able to fit full history, but it's unlikely to be that long
        for msg_id, msg in self.messages.items():
            if msg_id.startswith("ai:"):
                messages.append(
                    {
                        "role": "assistant",
                        "content": msg,
                    }
                )
            else:
                messages.append(
                    {
                        "role": "user",
                        "content": await prompts.parse_content_short(query=msg),
                    }
                )

        content_prompt = ""
        if not self.initial_state.empty():
            bullet = "\n- "
            content_prompt = await prompts.current_state_prompt(
                state=f"""
Note: Existing resource identifiers may include a namespace component (i.e. provider:type:namespace:name). If a namespace is provided, the given resource is a child of the namespace or "namespaced".
Existing resources:{bullet}{bullet.join(self.initial_state.resources)}

Note: Existing connections are composed of two resources identifiers, a source and a target, separated by an arrow (->). Each resource referenced in a connection must exist in the resources list.
Existing connections:{bullet}{bullet.join(self.initial_state.edges)}"""
            )
        content_prompt += await prompts.parse_content(query=query.lower())

        messages.append(
            {
                "role": "user",
                "content": content_prompt,
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
            completion = await openai.ChatCompletion.acreate(
                model="gpt-35-turbo-16k",
                deployment_id="gpt-35-turbo-16k",
                temperature=0,
                timeout=10 * timeout_sec,
                request_timeout=timeout_sec,
                messages=messages,
            )
        except Exception as err:
            raise InterpretMessageException(
                response_time=perf_counter() - start,
                ai_response=None,
            ) from err

        result = InterpretMessageResults(
            intents=IntentList(),
            ai_response=completion.choices[0].message.content,
            response_time=perf_counter() - start,
        )

        log.debug("Response: %s", completion)

        try:
            result.intents = await parse_intent(result.ai_response)
        except ParseException:
            log.error(
                "Attempting reconciliation, unable to parse intent", exc_info=True
            )

            result.ai_response = completion.choices[0].message.content

            log.debug("Reconcile response: %s", completion)
            response = result.ai_response
            if "I apologize" in response:
                # remove the first line to get to the corrected response
                # this handles cases like:
                #    I apologize for the mistake. Here is the corrected response for the previous message:
                response = response[response.index("\n") + 1 :]

            try:
                result.intents = await parse_intent(response)
            except ParseException as err:
                raise InterpretMessageException(
                    response_time=result.response_time,
                    ai_response=result.ai_response,
                ) from err

        log.debug(
            "Prompt %d tokens returned in: %ss",
            completion.usage.prompt_tokens,
            result.response_time,
        )

        return result

    async def do_query(
        self, query_id: str, query: str, timeout_sec=15
    ) -> List[ParsedConstraint]:
        try:
            intent_result = await self.interpret_query(query, timeout_sec=timeout_sec)
            log.debug(
                "Got actions:\n%s",
                "\n".join(str(a) for a in intent_result.intents.actions),
            )
        except InterpretMessageException as err:
            cause = err.__cause__

            if isinstance(cause, ParseException):
                raise MessageExecutionException(
                    error_message="I didn't understand your prompt",
                    message_id=query_id,
                    user_message=query,
                    ai_response=err.ai_response,
                ) from err

            else:
                raise MessageExecutionException(
                    error_message="Something went wrong",
                    message_id=query_id,
                    user_message=query,
                    ai_response=err.ai_response,
                ) from err

        try:
            parsed_actions = intent_result.intents.execute_all()
            log.debug(
                "Action responses:\n%s",
                "\n".join(r.reasoning.message for r in parsed_actions),
            )
        except Exception as err:
            raise MessageExecutionException(
                error_message="Something went wrong",
                message_id=query_id,
                user_message=query,
                ai_response=intent_result.ai_response,
                intent=intent_result.intents,
                intent_timing=intent_result.response_time,
            ) from err

        return parsed_actions

    def ai_response_for(self, message_id: str) -> Optional[str]:
        return self.messages.get(f"ai:{message_id}", None)


def messages_to_reason(reasoning: List[ActionMessage]):
    if len(reasoning) == 0:
        return "No changes made"
    else:
        reason_str = ""
        successes = [r.message for r in reasoning if r.success]
        if len(successes) > 0:
            reason_str += "Understood, I have:\n- " + "\n- ".join(successes)

        failures = [r.message for r in reasoning if not r.success]
        if len(failures) > 0:
            if reason_str != "":
                reason_str += "\n\n"
            reason_str += "I encountered the following problems:\n- " + "\n- ".join(
                failures
            )
        return reason_str


def err_to_reason(err: MessageExecutionException):
    if err.intent is None:
        # Intent parsing or normalization failed
        return err.error_message

    if err.reasoning is None:
        # Executing intents failed
        # This should not happen, with the current code. Any failures result in a failed ActionMessage
        # instead of an exception.
        return err.error_message

    if err.result.resources_yaml is None:
        # Running the engine failed
        reasoning = "Klotho failed to generate the topology, reverting to last known good state."

        successes = [r.message for r in err.reasoning if r.success]
        if len(successes) > 0:
            reasoning += " Attempted changes:\n- " + "\n- ".join(successes)

        failures = [r.message for r in err.reasoning if not r.success]
        if len(failures) > 0:
            reasoning += "Did not attempt, due to errors:\n- " + "\n- ".join(failures)

        return reasoning
    else:
        return messages_to_reason(err.reasoning)
