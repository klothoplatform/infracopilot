from typing import Optional, List
from src.constraints.constraint import Constraint, ConstraintOperator, ConstraintScope
from src.topology.resource import ResourceID
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

    def cancels_out(self, other: "Constraint") -> bool:
        super().cancels_out(other)
        pass

    @staticmethod
    def valid_operators() -> List[ConstraintOperator]:
        return [
            ConstraintOperator.MustExist,
            ConstraintOperator.MustNotExist,
        ]
