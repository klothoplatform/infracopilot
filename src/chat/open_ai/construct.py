from typing import NamedTuple


class Construct(NamedTuple):
    """
    Construct is a class which represents a node in the ResourceGraph
    """

    name: str
    type: str
    namespace: str | None = None
    abstract: bool = False

    @property
    def id(self):
        return (
            f"{self.type}{':' + self.namespace if self.namespace else ''}/{self.name}"
        )

    @classmethod
    def from_id(cls, id: str):
        t, n = id.split("/", 1)
        ns = None
        if len(t.split(":")) > 1:
            t, ns = t.rsplit(":", 1)
        return cls(type=t, name=n, namespace=ns, abstract="abstract" in t.lower())

    def __str__(self) -> str:
        return self.id
