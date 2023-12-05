import os

from sqlalchemy.orm import Session, DeclarativeBase
from sqlalchemy import create_engine

db = os.getenv("DB_PATH", "")
if db != "":
    db = f"/{db}"

# @klotho::persist {
#   id = "ifcporm"
# }
engine = create_engine(f"sqlite://{db}", echo=False, future=True)
session = Session(engine)


class Base(DeclarativeBase):
    pass
