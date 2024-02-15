from typing import Optional, List

from src.constraints.constraint import Constraint, ConstraintOperator, ConstraintScope
from src.topology.resource import ResourceID


class ApplicationConstraint(Constraint):
    def __init__(
        self,
        operator: ConstraintOperator,
        node: ResourceID,
        replacement_node: Optional[ResourceID] = None,
    ):
        super().__init__(ConstraintScope.Application, operator)
        self.node = node
        self.replacement_node = replacement_node

    def cancels_out(self, other: "Constraint") -> bool:
        super().cancels_out(other)
        pass

    def __eq__(self, __value: object) -> bool:
        if not isinstance(__value, ApplicationConstraint):
            return False
        return (
            self.operator == __value.operator
            and self.node == __value.node
            and self.replacement_node == __value.replacement_node
        )

    def to_dict(self):
        if self.replacement_node is None:
            return {
                "scope": self.scope.value,
                "operator": self.operator.value,
                "node": str(self.node),
            }
        return {
            "scope": self.scope.value,
            "operator": self.operator.value,
            "node": str(self.node),
            "replacement_node": str(self.replacement_node),
        }

    @staticmethod
    def valid_operators() -> List[ConstraintOperator]:
        return [
            ConstraintOperator.Add,
            ConstraintOperator.Remove,
            ConstraintOperator.Replace,
        ]
