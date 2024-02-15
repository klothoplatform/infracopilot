from typing import Any, Dict, List

from src.constraints.application_constraint import ApplicationConstraint
from src.constraints.constraint import Constraint, ConstraintOperator, ConstraintScope
from src.constraints.construct_constraint import ConstructConstraint
from src.constraints.edge_constraint import EdgeConstraint
from src.constraints.resource_constraint import ResourceConstraint
from src.topology.edge import Edge
from src.topology.resource import ResourceID


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


def substitute_name_changes(
    constraints: List[Constraint], oldId: ResourceID, newId: ResourceID
) -> List[Constraint]:
    """Substitute oldId with newId in all constraints.

    Args:
        constraints (List[Constraint]): List of constraints.
        oldId (ResourceID): Old ID.
        newId (ResourceID): New ID.

    Returns:
        List[Constraint]: List of constraints with substitutions.
    """
    for constraint in constraints:
        if constraint.scope is ConstraintScope.Application:
            if constraint.node == oldId:
                constraint.node = newId
        elif constraint.scope is ConstraintScope.Construct:
            if constraint.target == oldId:
                constraint.target = newId
        elif constraint.scope is ConstraintScope.Edge:
            if constraint.target.source == oldId:
                constraint.target.source = newId
            if constraint.target.target == oldId:
                constraint.target.target = newId
        elif constraint.scope is ConstraintScope.Resource:
            if constraint.target == oldId:
                constraint.target = newId
    return constraints


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
    if constraints is None:
        return parsed_constraints
    for constraint in constraints:
        if constraint["scope"] == ConstraintScope.Application.value:
            parsed_constraints.append(
                ApplicationConstraint(
                    ConstraintOperator(constraint["operator"]),
                    ResourceID.from_string(constraint["node"]),
                    (
                        ResourceID.from_string(constraint["replacement_node"])
                        if "replacement_node" in constraint
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
                    Edge(
                        ResourceID.from_string(constraint["target"]["source"]),
                        ResourceID.from_string(constraint["target"]["target"]),
                    ),
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
