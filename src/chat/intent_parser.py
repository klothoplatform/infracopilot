from typing import List

from caseconverter import pascalcase

from src.topology.resource import ResourceID
from src.util.logging import logger
from .open_ai.models import (
    IntentList,
    Action,
    EdgeAction,
    NodeAction,
    RenameAction,
    ConfigureAction,
)
from ..constraints.constraint import ConstraintOperator

log = logger.getChild("intent_parser")


class ParseException(Exception):
    def __init__(self, line_num: int, line_text: str, message="") -> None:
        self.line_num = line_num
        self.line_text = line_text
        super().__init__(f"Unable to parse line {line_num} '{line_text}': {message}")


async def parse_intent(response: str) -> IntentList:
    """
    parse_intent takes a llm response and attempts to parse the response into an IntentList, which is a model defined by InfraCopilot
    """
    intents = IntentList()
    if "no changes" in response:
        return intents

    lines = response.splitlines()
    if "```" in response:
        response = response.split("```")[1]
        lines = response.splitlines()

    for i, line in enumerate(lines):
        if len(line.strip()) == 0:
            continue  # skip empty lines
        row = [col.strip() for col in line.split(",", maxsplit=1)]
        if len(row) <= 1:
            raise ParseException(
                i, line, f"Not enough CSV columns, need > 1, got {len(row)}"
            )
        action = row[0]
        args = (
            row[1].split(",")
            if action != "configure"
            else row[1].split(",", 3)  # configure's final argument is a json string
        )

        try:
            action = parse_action(action, args)
            intents.actions.append(action)
        except Exception:
            # raise ParseException(i, line, f'Unable to parse action {action} ({args})') from err
            log.debug("Unable to parse action %s (%s)", action, args, exc_info=True)

    # await normalize_intents(intents)
    return intents


def parse_action(
    action: str, args: List[str]
) -> NodeAction | EdgeAction | RenameAction | ConfigureAction:
    match action:
        case "create":
            # args[0] is for debugging the AI response, it's not used
            node = ResourceID(
                provider=args[1].lower(), type=args[2].lower(), name=args[3]
            )
            return NodeAction(action=Action(action), node=node)
        case "delete":
            node = ResourceID.from_string(args[0])
            return NodeAction(action=Action(action), node=node)
        case "connect" | "disconnect":
            return EdgeAction(
                action=Action(action),
                source=ResourceID.from_string(args[0]),
                target=ResourceID.from_string(args[1]),
            )
        case "rename":
            old = ResourceID.from_string(args[0])
            new = ResourceID.from_string(args[1])
            return RenameAction(old=old, new=new)
        case "configure":
            node = ResourceID.from_string(args[1])
            operator = ConstraintOperator[pascalcase(args[0])]
            return ConfigureAction(
                node=node, operator=operator, property=args[2], value=args[3]
            )

    raise Exception(f"Unknown action '{action}'")
