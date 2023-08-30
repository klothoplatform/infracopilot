import logging
from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import StreamingResponse
from src.backend_orchestrator.main import app, ArchitecutreStateNotLatestError
from src.state_manager.architecture_data import (
    get_architecture_latest,
    add_architecture,
)
from src.state_manager.architecture_storage import (
    get_iac_from_fs,
    get_state_from_fs,
    write_iac_to_fs,
    ArchitectureStateDoesNotExistError,
)
from src.engine_service.engine_commands.export_iac import export_iac, ExportIacRequest

log = logging.getLogger(__name__)


@app.get("/architecture/{id}/iac")
async def copilot_get_iac(id, state: int):
    try:
        arch = await get_architecture_latest(id)

        if arch is None:
            raise ArchitectureStateDoesNotExistError(
                "Architecture with id, {request.architecture_id}, does not exist"
            )
        elif arch.state != state:
            raise ArchitecutreStateNotLatestError(
                f"Architecture state is not the latest. Expected {arch.state}, got {state}"
            )

        iac = await get_iac_from_fs(arch)
        if iac is None:
            arch_state = await get_state_from_fs(arch)
            if arch_state is None:
                raise ArchitectureStateDoesNotExistError(
                    f"No architecture exists for id {id}"
                )
            request = ExportIacRequest(
                input_graph=arch_state.resources_yaml,
                name=arch.name if arch.name is not None else arch.id,
            )
            result = await export_iac(request)
            iac = result.iac_bytes
            if iac is None:
                return Response(content="I failed to generate IaC", status_code=500)
            iac_location = await write_iac_to_fs(arch, str(iac.getvalue()))
            arch.iac_location = iac_location
            await add_architecture(arch)
            return StreamingResponse(
                iter([iac.getvalue()]),
                media_type="application/x-zip-compressed",
                headers={"Content-Disposition": f"attachment; filename=images.zip"},
            )
        return Response(content=iac)
    except ArchitecutreStateNotLatestError as e:
        raise HTTPException(
            status_code=400, detail="Architecture state is not the latest"
        )
    except ArchitectureStateDoesNotExistError as e:
        raise HTTPException(
            status_code=404, detail=f"No architecture exists for id {id}"
        )
    except Exception:
        log.error("Error getting iac", exc_info=True)
        raise HTTPException(status_code=500, detail="internal server error")
