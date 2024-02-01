import yaml
from typing import List, Dict
from enum import Enum
from src.topology.resource import Resource, ResourceID
from src.topology.edge import Edge


class DiffStatus(Enum):
    """
    Enum to represent the status of a difference.
    """

    ADDED = "added"
    REMOVED = "removed"
    CHANGED = "changed"


class Diff:
    """
    Class to represent the differences in a resource or an edge.
    """

    def __init__(self, status, properties=None, target: ResourceID = None):
        """
        Initialize Diff with status, properties, and target.

        :param status: The status of the difference ('added', 'removed', or 'changed').
        :param properties: The differences in the properties of a resource.
        :param target: The differences in the target of an edge.
        """
        self.status = status
        self.properties = properties
        self.target = target

    def __dict__(self):
        result = {
            "status": self.status,
        }
        if self.target is not None:
            result["target"] = self.target.__str__()
        if self.properties is not None:
            result["properties"] = self.properties
        return result


class TopologyDiff:
    """
    Class to represent the differences between two topologies.
    """

    def __init__(
        self,
        resources: Dict[ResourceID, Diff] = None,
        edges: Dict[ResourceID, Diff] = None,
    ):
        """
        Initialize TopologyDiff with resources and edges.

        :param resources: The differences in the resources of the topologies.
        :param edges: The differences in the edges of the topologies.
        """
        self.resources = resources if resources is not None else {}
        self.edges = edges if edges is not None else {}

    def __dict__(self):
        return {
            "resources": {str(k): v.__dict__() for k, v in self.resources.items()},
            "edges": {str(k): v.__dict__() for k, v in self.edges.items()},
        }

    def contains_differences(self) -> bool:
        """
        Check if the TopologyDiff contains any differences.

        :return: True if the TopologyDiff contains any differences, False otherwise.
        """
        if self.resources is None and self.edges is None:
            return False
        if len(self.resources.keys()) == 0 and len(self.edges.keys()) == 0:
            return False
        return True


class TopologicalChangesNotAllowed(Exception):
    """
    Exception to be raised when topological changes are not allowed.
    """

    def __init__(
        self, env_id: str, constraints: List[dict] = None, diff: TopologyDiff = None
    ):
        super().__init__(
            f"Topological changes are not allowed for environment {env_id}"
        )
        self.constraints = constraints
        self.diff = diff
        self.env_id = env_id
        self.error_type = "topological_changes_not_allowed"


class Topology:
    """
    Class to represent a topology.
    """

    def __init__(self, resources: List[Resource], edges: List[Edge]):
        """
        Initialize Topology with list of resources and edges.

        :param resources: The list of resources in the topology.
        :param edges: The list of edges in the topology.
        """
        self.resources = resources
        self.edges = edges

    @staticmethod
    def from_string(yaml_string) -> "Topology":
        """
        Static method to create a Topology object from a YAML string.

        :param yaml_string: The YAML string representation of the topology.
        :return: A Topology object.
        """
        data = yaml.safe_load(yaml_string)

        if data is None:
            return Topology([], [])

        resources = (
            []
            if data["resources"] is None
            else [
                Resource(ResourceID.from_string(id), properties)
                for id, properties in data["resources"].items()
            ]
        )

        edges = (
            []
            if data["edges"] is None
            else [Edge.from_string(edge) for edge, value in data["edges"].items()]
        )
        return Topology(resources, edges)

    def diff_topology(
        self, other: "Topology", include_properties_diff=False
    ) -> TopologyDiff:
        """
        Compare this topology with another topology and return the differences.

        :param other: The other Topology object to compare with.
        :return: A TopologyDiff object with the differences.
        """
        resource_diffs = {}
        edge_diffs = {}

        # Compare resources
        for id in set([r.id for r in self.resources]).union(
            [r.id for r in other.resources]
        ):
            if id not in [r.id for r in self.resources]:
                resource_diffs[id] = Diff(DiffStatus.ADDED, target=id)
            elif id not in [r.id for r in other.resources]:
                resource_diffs[id] = Diff(DiffStatus.REMOVED, target=id)
            elif include_properties_diff:
                current_resource = next(r for r in self.resources if r.id == id)
                previous_resource = next(r for r in other.resources if r.id == id)
                diff_properties = current_resource.diff_properties(previous_resource)
                if diff_properties:
                    resource_diffs[id] = Diff(
                        DiffStatus.CHANGED, properties=diff_properties
                    )

        # Compare edges
        for edge in set(self.edges).union(other.edges):
            if edge not in self.edges:
                edge_diffs[edge.source] = Diff(DiffStatus.ADDED, target=edge.target)
            elif edge not in other.edges:
                edge_diffs[edge.source] = Diff(DiffStatus.REMOVED, target=edge.target)

        return TopologyDiff(resource_diffs, edge_diffs)
