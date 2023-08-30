# @klotho::execution_unit {
#    id = "main"
# }
import logging
from fastapi import FastAPI, Response
from fastapi.middleware.gzip import GZipMiddleware
from src.util.orm import Base, engine

# @klotho::expose {
#   id = "myapi"
#   target = "public"
# }
app = FastAPI()
app.add_middleware(GZipMiddleware, minimum_size=1000)

log = logging.getLogger(__name__)

Base.metadata.create_all(engine)


@app.get("/ping")
async def ping():
    return Response(status_code=204)


class ArchitecutreStateNotLatestError(Exception):
    pass
