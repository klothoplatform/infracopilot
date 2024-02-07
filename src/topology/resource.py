class ResourceID:
    """
    Class to represent the ID of a resource.
    """

    def __init__(self, provider=None, type=None, namespace=None, name=None):
        """
        Initialize ResourceID with provider, type, namespace and name.

        :param provider: The provider of the resource.
        :param type: The type of the resource.
        :param namespace: The namespace of the resource.
        :param name: The name of the resource.
        """
        self.provider = provider
        self.type = type
        self.namespace = namespace
        self.name = name

    def __str__(self):
        """
        Return string representation of ResourceID.

        :return: String representation of ResourceID.
        """
        if self.namespace is None:
            return f"{self.provider}:{self.type}:{self.name}"
        return f"{self.provider}:{self.type}:{self.namespace}:{self.name}"

    def __eq__(self, __value: object) -> bool:
        """method to compare two ResourceID objects

        Args:
            __value (object): the value to compare with

        Returns:
            bool: True if the values are equal, False otherwise
        """
        if not isinstance(__value, ResourceID):
            return False
        return self.__str__() == __value.__str__()

    def __hash__(self) -> int:
        """method to hash a Resource object

        Returns:
            int: the hash value
        """
        return hash(self.__str__())

    @staticmethod
    def from_string(id_string) -> "ResourceID":
        """
        Static method to create a ResourceID object from a string.

        :param id_string: The string representation of the resource ID.
        :return: A ResourceID object.
        """
        id = ResourceID()
        parts = id_string.split(":")
        id.provider = parts[0]
        id.type = parts[1]
        id.namespace = parts[2] if len(parts) > 3 else None
        id.name = parts[-1]
        return id


class Resource:
    """
    Class to represent a resource.
    """

    def __init__(self, id: ResourceID, properties: dict):
        """
        Initialize Resource with ResourceID and properties.

        :param id: The ResourceID of the resource.
        :param properties: The properties of the resource.
        """
        self.id = id
        self.properties = properties

    def diff_properties(self, other: "Resource") -> dict:
        """
        Compare the properties of this resource with another resource and return the differences.

        :param other: The other Resource object to compare with.
        :return: A dictionary with the differences. The keys are the property names and the values are tuples where the first element is the value in this resource and the second element is the value in the other resource.
        """

        def diff_dict(d1, d2, path=""):
            d1 = d1 or {}
            d2 = d2 or {}

            for k in set(d1.keys()).union(d2.keys()):
                if k not in d1:
                    differences[f"{path}.{k}"] = (None, d2[k])
                elif k not in d2:
                    differences[f"{path}.{k}"] = (d1[k], None)
                elif isinstance(d1[k], dict) and isinstance(d2[k], dict):
                    diff_dict(d1[k], d2[k], path=f"{path}.{k}")
                elif isinstance(d1[k], list) and isinstance(d2[k], list):
                    for i, (a, b) in enumerate(zip(d1[k], d2[k])):
                        if isinstance(a, dict) and isinstance(b, dict):
                            diff_dict(a, b, path=f"{path}.{k}[{i}]")
                        elif a != b:
                            differences[f"{path}.{k}[{i}]"] = (a, b)
                elif d1[k] != d2[k]:
                    differences[f"{path}.{k}"] = (d1[k], d2[k])

        differences = {}
        diff_dict(self.properties, other.properties)
        return differences
