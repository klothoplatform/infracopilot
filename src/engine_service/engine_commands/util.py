import json
import logging
import os
import re
import subprocess
import tempfile
from io import BytesIO
from pathlib import Path
from typing import List, NamedTuple

import yaml


log = logging.getLogger()


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

class EngineRunner:
    engine_path = os.environ.get("ENGINE_PATH", "engine")

    async def run_engine_command(self, *args, **kwargs) -> tuple[str, str]:
        cwd = kwargs.get("cwd", None)

        env = os.environ.copy()

        cmd = [
            self.engine_path,
            *args,
        ]
        print("Running engine command: %s", " ".join(cmd))
        log.debug("Running engine command: %s", " ".join(cmd))

        result = subprocess.run(cmd, capture_output=True, cwd=cwd, env=env)

        out_logs = result.stdout.decode()
        err_logs = result.stderr.decode()

        log.debug("engine output:\n%s", out_logs)
        print("engine output:\n%s", out_logs)
        if err_logs is not None and len(err_logs.strip()) > 0:
            log.error("engine error:\n%s", err_logs)
            print("engine error:\n%s", err_logs)

        if result.returncode != 0:
            raise EngineException(
                f"Engine {cmd} returned non-zero exit code: {result.returncode}",
                out_logs,
                err_logs,
            )
        return out_logs, err_logs


