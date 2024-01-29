from typing import Any, Dict, List
from src.topology.resource import ResourceID
from src.topology.edge import Edge
from src.constraints.application_constraint import ApplicationConstraint
from src.constraints.resource_constraint import ResourceConstraint
from src.constraints.construct_constraint import ConstructConstraint
from src.constraints.edge_constraint import EdgeConstraint
from src.constraints.constraint import Constraint, ConstraintOperator, ConstraintScope


def find_mutating_constraints(constraints: List[dict]) -> List[Constraint]:
    """Find all constraints that mutate the topology.

    Args:
        constraints (List[dict]): Input constraints.

    Returns:
        List[Constraint]: List of constraints that mutate the topology.
    """
    constraints = parse_constraints(constraints)
    non_resource_constraints = [
        c for c in constraints if c.scope is not ConstraintScope.Resource
    ]
    return non_resource_constraints


def parse_constraints(constraints: List[Dict[str, Any]]) -> List[Constraint]:
    """Parse a list of constraints.

    Args:
        constraints (List[Dict[str, Any]]): List of constraints.

    Raises:
        Exception: If the constraint scope is unknown.

    Returns:
        List[Constraint]: List of parsed constraints.
    """
    parsed_constraints: List[Constraint] = []
    for constraint in constraints:
        if constraint["scope"] == ConstraintScope.Application.value:
            parsed_constraints.append(
                ApplicationConstraint(
                    ConstraintOperator(constraint["operator"]),
                    ResourceID.from_string(constraint["node"]),
                    (
                        ResourceID.from_string(constraint["replacement_node"])
                        if constraint["replacement_node"]
                        else None
                    ),
                )
            )
        elif constraint["scope"] == ConstraintScope.Construct.value:
            parsed_constraints.append(
                ConstructConstraint(
                    ConstraintOperator(constraint["operator"]),
                    ResourceID.from_string(constraint["target"]),
                    constraint["type"] if "type" in constraint else None,
                    constraint["attributes"] if "attributes" in constraint else None,
                )
            )
        elif constraint["scope"] == ConstraintScope.Edge.value:
            parsed_constraints.append(
                EdgeConstraint(
                    ConstraintOperator(constraint["operator"]),
                    Edge.from_string(constraint["target"]),
                )
            )
        elif constraint["scope"] == ConstraintScope.Resource.value:
            parsed_constraints.append(
                ResourceConstraint(
                    ConstraintOperator(constraint["operator"]),
                    ResourceID.from_string(constraint["target"]),
                    constraint["property"],
                    constraint["value"],
                )
            )
        else:
            raise Exception(f"Unknown constraint scope: {constraint['scope']}")
    return parsed_constraints
