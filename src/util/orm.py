from sqlalchemy.orm import Session, DeclarativeBase
from sqlalchemy import create_engine

# @klotho::persist {
#   id = "storage"
# }
engine = create_engine("sqlite://", echo=False, future=True)
session = Session(engine)


class Base(DeclarativeBase):
    pass


