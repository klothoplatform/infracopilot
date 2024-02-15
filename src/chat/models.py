import json
from dataclasses import dataclass, field
from typing import List


@dataclass
class ResourcesAndEdges:
    resources: List[str] = field(default_factory=list)
    edges: List[str] = field(default_factory=list)

    def __str__(self):
        return json.dumps(self.__dict__)

    def empty(self):
        return len(self.resources) == 0 and len(self.edges) == 0
