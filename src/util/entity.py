from abc import abstractmethod, ABC
from dataclasses import dataclass


@dataclass
class Entity(ABC):
    id: str
    type: str = None

    @staticmethod
    def fromString(string: str):
        arr = string.split(":")
        match arr[0]:
            case "organization":
                return Organization(id=arr[1])
            case "team":
                return Team(id=arr[1])
            case "user":
                return User(id=arr[1])
            case _:
                return None

    @abstractmethod
    def to_auth_string(self):
        pass


@dataclass
class Organization(Entity):
    type = "organization"

    def to_auth_string(self):
        return f"organization:{self.id}"


@dataclass
class Team(Entity):
    type = "team"

    def to_auth_string(self):
        return f"team:{self.id}"


@dataclass
class User(Entity):
    type = "user"

    def to_auth_string(self):
        return f"user:{self.id}"


KlothoEntity = Organization("klotho")
