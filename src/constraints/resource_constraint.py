from src.constraints.constraint import ConstraintOperator, ConstraintScope, Constraint
from src.topology.resource import ResourceID
from typing import List


class ResourceConstraint(Constraint):
    def __init__(
        self, operator: ConstraintOperator, target: ResourceID, property: str, value
    ):
        super().__init__(ConstraintScope.Resource, operator)
        self.target = target
        self.property = property
        self.value = value

    def __eq__(self, __value: object) -> bool:
        if not isinstance(__value, ResourceConstraint):
            return False
        return (
            self.operator == __value.operator
            and self.target == __value.target
            and self.property == __value.property
            and self.value == __value.value
        )

    def to_dict(self):
        return {
            "scope": self.scope.value,
            "operator": self.operator.value,
            "target": str(self.target),
            "property": self.property,
            "value": self.value,
        }

    def cancels_out(self, other: "Constraint") -> bool:
        super().cancels_out(other)
        if not isinstance(other, ResourceConstraint):
            return False
        if self.target != other.target:
            return False
        if self.operator == ConstraintOperator.Equals:
            return True

    @staticmethod
    def valid_operators() -> List[ConstraintOperator]:
        return [
            ConstraintOperator.Equals,
            ConstraintOperator.Add,
            ConstraintOperator.Remove,
        ]
