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

    def __eq__(self, __value: object) -> bool:
        if not isinstance(__value, Edge):
            return False
        return self.source == __value.source and self.target == __value.target

    def __hash__(self) -> int:
        return hash(self.__str__())

    def __str__(self):
        return f"{self.source}->{self.target}"

    def to_dict(self):
        """
        Convert the Edge to a dictionary.

        :return: A dictionary representation of the Edge.
        """
        return {
            "source": str(self.source),
            "target": str(self.target),
        }

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
