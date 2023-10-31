import json
import logging
import os
import shutil
import subprocess
from pathlib import Path

from src.engine_service.binaries.fetcher import (
    engine_executable_path,
    iac_cli_executable_path,
)

log = logging.getLogger()

CAPTURE_ENGINE_FAILURES = os.getenv("CAPTURE_ENGINE_FAILURES", False)


class EngineException(Exception):
    def __init__(self, message, stdout: str, stderr: str):
        super().__init__(message)
        self.stdout = stdout
        self.stderr = stderr

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


class IacException(Exception):
    def __init__(self, message, stdout: str, stderr: str):
        super().__init__(message)
        self.stdout = stdout
        self.stderr = stderr

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


async def run_engine_command(*args, **kwargs) -> tuple[str, str]:
    cwd = kwargs.get("cwd", None)

    env = os.environ.copy()

    cmd = [
        engine_executable_path,
        *args,
    ]
    print("Running engine command: %s", " ".join(cmd))
    log.debug("Running engine command: %s", " ".join(cmd))

    result = subprocess.run(cmd, capture_output=True, cwd=cwd, env=env)

    out_logs = result.stdout.decode()
    err_logs = result.stderr.decode()

    log.debug("engine output:\n%s", out_logs)
    if err_logs is not None and len(err_logs.strip()) > 0:
        log.error("engine error:\n%s", err_logs)

    if result.returncode != 0:
        capture_failure("failures/engine", cmd, cwd, err_logs)
        raise EngineException(
            f"Engine {cmd} returned non-zero exit code: {result.returncode}",
            out_logs,
            err_logs,
        )

    return out_logs, err_logs


async def run_iac_command(*args, **kwargs) -> tuple[str, str]:
    cwd = kwargs.get("cwd", None)

    env = os.environ.copy()

    cmd = [
        iac_cli_executable_path,
        *args,
    ]
    print("Running iac command: %s", " ".join(cmd))
    log.debug("Running iac command: %s", " ".join(cmd))

    result = subprocess.run(cmd, capture_output=True, cwd=cwd, env=env)

    out_logs = result.stdout.decode()
    err_logs = result.stderr.decode()

    log.debug("iac output:\n%s", out_logs)
    if err_logs is not None and len(err_logs.strip()) > 0:
        log.error("iac error:\n%s", err_logs)

    if result.returncode != 0:
        capture_failure("failures/iac", cmd, cwd, err_logs)
        raise EngineException(
            f"Engine {cmd} returned non-zero exit code: {result.returncode}",
            out_logs,
            err_logs,
        )
    return out_logs, err_logs


def capture_failure(failures_dir: Path | str, cmd: list, cwd: Path, err_logs: str):
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
        file.write(err_logs)
    shutil.copytree(cwd, capture_dir)
