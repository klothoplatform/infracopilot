from dataclasses import dataclass


class Entity:
    id: str
    type: str
    name: str


@dataclass
class Organization(Entity):
    type = "organization"


@dataclass
class Team(Entity):
    type = "team"


@dataclass
class User(Entity):
    type = "user"


KlothoEntity = Organization()
KlothoEntity.id = "klotho"
KlothoEntity.name = "Klotho"
