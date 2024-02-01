from abc import abstractmethod, ABC
from enum import Enum
from typing import List


class ConstraintOperator(Enum):
    MustExist = "must_exist"
    MustNotExist = "must_not_exist"
    Add = "add"
    Import = "import"
    Remove = "remove"
    Replace = "replace"
    Equals = "equals"


class ConstraintScope(Enum):
    Application = "application"
    Construct = "construct"
    Edge = "edge"
    Resource = "resource"


class Constraint(ABC):
    def __init__(self, scope: ConstraintScope, operator: ConstraintOperator):
        self.scope = scope
        self.operator = operator

    @abstractmethod
    def cancels_out(self, other: "Constraint") -> bool:
        if self.scope != other.scope:
            return False
        pass

    @abstractmethod
    def to_dict(self):
        pass

    @staticmethod
    def valid_operators() -> List[ConstraintOperator]:
        """Subclasses should override this method."""
        pass
