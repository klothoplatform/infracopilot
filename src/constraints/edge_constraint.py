from typing import List

from src.constraints.constraint import Constraint, ConstraintOperator, ConstraintScope
from src.topology.edge import Edge


class EdgeConstraint(Constraint):
    def __init__(
        self,
        operator: ConstraintOperator,
        target: Edge,
    ):
        super().__init__(ConstraintScope.Edge, operator)
        self.target = target

    def __eq__(self, __value: object) -> bool:
        if not isinstance(__value, EdgeConstraint):
            return False
        return self.operator == __value.operator and self.target == __value.target

    def to_dict(self):
        return {
            "scope": self.scope.value,
            "operator": self.operator.value,
            "target": self.target.to_dict(),
        }

    def cancels_out(self, other: "Constraint") -> bool:
        super().cancels_out(other)
        pass

    @staticmethod
    def valid_operators() -> List[ConstraintOperator]:
        return [
            ConstraintOperator.MustExist,
            ConstraintOperator.MustNotExist,
        ]
