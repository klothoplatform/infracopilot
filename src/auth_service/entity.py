from abc import abstractmethod, ABC
from pydantic import BaseModel


class Entity(ABC):
    id: str

    @staticmethod
    def fromString(string: str) -> "Entity":
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

    @staticmethod
    def get_type_and_id(string: str) -> tuple[str, str]:
        arr = string.split(":")
        if len(arr) != 2:
            raise ValueError(f"Invalid entity string {string}")
        return (arr[0], arr[1])

    @abstractmethod
    def to_auth_string(self):
        pass

    @abstractmethod
    def type(self):
        pass


class User(BaseModel, Entity):
    id: str

    def __init__(self, id: str, **data):
        super().__init__(id=id, **data)
        self.id = id

    def to_auth_string(self):
        return f"user:{self.id}"

    @staticmethod
    def type():
        return "user"


class Organization(BaseModel, Entity):
    id: str

    def __init__(self, id: str, **data):
        super().__init__(id=id, **data)
        self.id = id

    def to_auth_string(self):
        return f"organization:{self.id}"

    @staticmethod
    def type():
        return "organization"


class Team(BaseModel, Entity):
    id: str
    organization: Organization | None = None
    name: str = None
    members: list[User] = []
    admins: list[User] = []
    parent: "Team" = None

    def __init__(self, id: str, **data):
        super().__init__(id=id, **data)
        self.id = id
        self.organization = None
        self.name = None
        self.members = []
        self.admins = []
        self.parent = None

    @staticmethod
    def with_org(id: str, organization: Organization, name: str = None) -> "Team":
        team = Team(id=id)
        team.organization = organization
        team.name = name
        return team

    def to_auth_string(self):
        return f"team:{self.id}"

    @staticmethod
    def type():
        return "team"


KlothoEntity = Organization("klotho")
