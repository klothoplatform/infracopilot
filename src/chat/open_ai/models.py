from dataclasses import dataclass
from enum import Enum
from typing import List, Optional, NamedTuple

from src.constraints.application_constraint import ApplicationConstraint
from src.constraints.constraint import Constraint, ConstraintOperator
from src.constraints.edge_constraint import EdgeConstraint
from src.topology.edge import Edge
from src.topology.resource import ResourceID


class Action(Enum):
    CREATE = "create"
    CONNECT = "connect"
    DISCONNECT = "disconnect"
    DELETE = "delete"
    MODIFY = "modify"

    def __str__(self) -> str:
        return self.value


class ActionMessage(NamedTuple):
    action: any
    message: str
    success: bool


action_order = [
    Action.CREATE,
    Action.MODIFY,
    Action.DELETE,
    Action.CONNECT,
    Action.DISCONNECT,
]


@dataclass
class ParsedConstraint:
    constraint: Optional[Constraint]
    reasoning: ActionMessage


@dataclass
class EdgeAction:
    action: Action
    source: ResourceID
    target: ResourceID

    @property
    def resource_types(self) -> List[str]:
        return [self.source.type, self.target.type]

    def execute(self) -> ParsedConstraint:
        source = self.source
        target = self.target

        if source is None:
            return ParsedConstraint(
                constraint=None,
                reasoning=ActionMessage(
                    action=self,
                    success=False,
                    message=f"Unable to find resource id for source {self.source}",
                ),
            )
        if target is None:
            return ParsedConstraint(
                constraint=None,
                reasoning=ActionMessage(
                    action=self,
                    success=False,
                    message=f"Unable to find resource id for target {self.target}",
                ),
            )
        match self.action:
            case Action.CONNECT:
                c = EdgeConstraint(
                    operator=ConstraintOperator.MustExist,
                    target=Edge(source=source, target=target),
                )
                return ParsedConstraint(
                    constraint=c,
                    reasoning=ActionMessage(
                        action=self,
                        success=True,
                        message=f"Connected {self.source} ➔ {self.target}",
                    ),
                )

            case Action.DISCONNECT:
                c = EdgeConstraint(
                    operator=ConstraintOperator.MustNotExist,
                    target=Edge(source=source, target=target),
                )
                return ParsedConstraint(
                    constraint=c,
                    reasoning=ActionMessage(
                        action=self,
                        success=True,
                        message=f"Disconnected {self.source} ➔ {self.target}",
                    ),
                )
        return ParsedConstraint(
            constraint=None,
            reasoning=ActionMessage(
                action=self,
                success=False,
                message=f"Unsupported edge action '{self.action}'",
            ),
        )


@dataclass
class NodeAction:
    action: Action
    node: ResourceID

    @property
    def resource_types(self) -> List[str]:
        return [self.node.type]

    def execute(self) -> ParsedConstraint:
        match self.action:
            case Action.CREATE:
                return ParsedConstraint(
                    constraint=ApplicationConstraint(
                        operator=ConstraintOperator.Add, node=self.node
                    ),
                    reasoning=ActionMessage(
                        action=self, success=True, message=f"Created {self.node}"
                    ),
                )
            case Action.DELETE:
                return ParsedConstraint(
                    constraint=ApplicationConstraint(
                        operator=ConstraintOperator.Remove, node=self.node
                    ),
                    reasoning=ActionMessage(
                        action=self, success=True, message=f"Deleted {self.node}"
                    ),
                )
        return ParsedConstraint(
            constraint=None,
            reasoning=ActionMessage(
                action=self,
                success=False,
                message=f"Unsupported node action '{self.action}'",
            ),
        )


@dataclass
class ModifyAction:
    old: ResourceID
    new: ResourceID
    action = Action.MODIFY

    @property
    def resource_types(self) -> List[str]:
        return [self.old.type, self.new.type]

    def execute(self) -> ParsedConstraint:
        return ParsedConstraint(
            constraint=ApplicationConstraint(
                operator=ConstraintOperator.Replace,
                node=self.old,
                replacement_node=self.new,
            ),
            reasoning=ActionMessage(
                action=self,
                success=True,
                message=f"Modify {self.old} to {self.new}",
            ),
        )


class IntentList:
    actions: List[NodeAction | EdgeAction | ModifyAction]

    def __init__(self, actions=None) -> None:
        self.actions = actions or []

    def execute_all(self) -> List[ParsedConstraint]:
        messages = []
        for action_type in action_order:
            for action in self.actions:
                if action.action == action_type:
                    constraint = action.execute()
                    if constraint is not None:
                        messages.append(constraint)
        return messages
