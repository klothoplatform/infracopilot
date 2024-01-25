from typing import List
from src.constraints.constraint import ConstraintOperator, ConstraintScope, Constraint
from src.topology.resource import ResourceID


class ConstructConstraint(Constraint):
    def __init__(
        self,
        operator: ConstraintOperator,
        target: ResourceID,
        type: str,
        attributes: dict,
    ):
        super().__init__(ConstraintScope.Construct, operator)
        self.target = target
        self.type = type
        self.attributes = attributes

    def __eq__(self, __value: object) -> bool:
        if not isinstance(__value, ConstructConstraint):
            return False
        return (
            self.operator == __value.operator
            and self.target == __value.target
            and self.type == __value.type
            and self.attributes == __value.attributes
        )

    def cancels_out(self, other: "Constraint") -> bool:
        super().cancels_out(other)
        pass

    @staticmethod
    def valid_operators() -> List[ConstraintOperator]:
        return [
            ConstraintOperator.Equals,
            ConstraintOperator.Add,
        ]
