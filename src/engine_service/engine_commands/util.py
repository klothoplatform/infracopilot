import asyncio
import json
import logging
import os
import shutil
from asyncio.subprocess import Process
from pathlib import Path

from src.engine_service.binaries.fetcher import Binary

log = logging.getLogger()

CAPTURE_ENGINE_FAILURES = os.getenv("CAPTURE_ENGINE_FAILURES", False)
ENGINE_PROFILING = os.getenv("ENGINE_PROFILING", False)


class EngineException(Exception):
    def __init__(self, cmd, returncode: int, stdout: str, stderr: str):
        super().__init__(f"Command {cmd} failed with return code {returncode}")
        self.cmd = cmd
        self.stdout = stdout
        self.stderr = stderr
        self.returncode = returncode

    def err_log_str(self):
        err_logs = [
            json.loads(line)
            for line in self.stderr.splitlines()
            if line.startswith("{")
        ]
        return "\n".join(
            f'{entry["level"].upper()}: {entry["msg"]}'
            for entry in err_logs
            if (
                entry["level"] in ["warn", "error"]
                and "Not logged in" not in entry["msg"]
                and "Klotho compilation failed" not in entry["msg"]
            )
        )


async def run_command(
    b: Binary, *args, cwd: None | Path | str = None
) -> tuple[str, str]:
    env = os.environ.copy()
    cwd = Path(cwd) if cwd else None

    cmd = [
        f"{b.path}",
        # since we're using the engine in the service and not as a CLI, we want to log in JSON format
        "--json-log",
        *args,
    ]
    if ENGINE_PROFILING and cwd is not None:
        if ENGINE_PROFILING.lower() == "true":
            profile_root = cwd if cwd else Path("profiling")
        else:
            profile_root = Path(ENGINE_PROFILING)
        cmd.append(f"--profiling={(profile_root / cwd.name).absolute()}.prof")
    print(f"Running {b.value} command: {' '.join(cmd)}")
    log.debug("Running %s command: %s", b.value, " ".join(cmd))

    process: Process = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=cwd,
        env=env,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await process.communicate()
    out_logs = "" if stdout is None else stdout.decode()
    err_logs = "" if stderr is None else stderr.decode()

    log.info("%s output:\n%s", b.value, out_logs)
    if err_logs is not None and len(err_logs.strip()) > 0:
        log.error("%s error:\n%s", b.value, err_logs)
    if cwd is not None:
        capture_failure(f"failures/{b.value}", cmd, cwd, out_logs, err_logs)

    if process.returncode != 0:
        raise EngineException(
            cmd,
            process.returncode,
            out_logs,
            err_logs,
        )

    return out_logs, err_logs


async def run_engine_command(*args, cwd: None | Path | str = None) -> tuple[str, str]:
    return await run_command(Binary.ENGINE, *args, cwd=cwd)


async def run_iac_command(*args, cwd: None | Path | str = None) -> tuple[str, str]:
    return await run_command(Binary.IAC, *args, cwd=cwd)


def capture_failure(
    failures_dir: Path | str,
    cmd: list,
    cwd: Path,
    out_logs: str,
    err_logs: str,
):
    if not CAPTURE_ENGINE_FAILURES:
        return

    failures_dir = Path(failures_dir)
    capture_dir = failures_dir / cwd.name
    failures_dir.mkdir(parents=True, exist_ok=True)
    with open(cwd / "engine_err.log", "w") as file:
        file.write("Original Command:\n" + " ".join(cmd) + "\n\n")
        file.write(
            "Replay Command:\n"
            + " ".join(cmd).replace(str(cwd), str(capture_dir.absolute()))
            + "\n\n"
        )
    shutil.copytree(cwd, capture_dir)
    (cwd / "out.log").write_text(out_logs)
    (cwd / "err.log").write_text(err_logs)
