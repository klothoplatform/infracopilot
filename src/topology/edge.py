from src.topology.resource import ResourceID


class Edge:
    """
    Class to represent an edge.
    """

    def __init__(self, source: ResourceID, target: ResourceID):
        """
        Initialize Edge with source and target ResourceID.

        :param source: The source ResourceID of the edge.
        :param target: The target ResourceID of the edge.
        """
        self.source = source
        self.target = target

    @staticmethod
    def from_string(id_string) -> "Edge":
        """
        Static method to create an Edge object from a string.

        :param id_string: The string representation of the edge.
        :return: An Edge object.
        """
        parts = id_string.split("->")
        source = ResourceID.from_string(parts[0].strip())
        target = ResourceID.from_string(parts[1].strip())
        return Edge(source, target)
