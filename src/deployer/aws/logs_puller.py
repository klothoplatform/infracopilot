import json
import logging
import os
import subprocess
import time
from typing import List

from pydantic import BaseModel

from src.deployer.data.models import Resource
from src.util.logging import logger as log


class LogStream(BaseModel):
    log_group_name: str
    stream_name: str
    events: List[str]


class AwsLogsPuller:
    def __init__(self, logs_client):
        self.logs_client = logs_client

    def download_logs(self, resource: Resource) -> List[LogStream]:
        streams: List[LogStream] = []
        log.info(f"Getting logs for {resource.id} {resource.type}")
        if resource.type == "aws:log_group":
            log_group_name: str = resource.properties["name"]
            log.info(f"Getting logs from {log_group_name}")
            time.sleep(15)
            try:
                log_streams = self.logs_client.describe_log_streams(
                    logGroupName=log_group_name, limit=50
                )
                log.info(log_streams)
                for stream in log_streams["logStreams"]:
                    stream_name: str = stream["logStreamName"]
                    events = self.get_log_events(log_group_name, stream_name)
                    streams.append(
                        LogStream(
                            log_group_name=log_group_name,
                            stream_name=stream_name,
                            events=events,
                        )
                    )
            except Exception as e:
                log.error(f"Failed to get logs for {log_group_name}", exc_info=True)

        elif resource["type"] == "aws:eks_cluster":
            cluster_name = resource.properties["name"]
            log_group_name: str = f"/aws/containerinsights/{cluster_name}/application"
            log.info(f"Getting logs from {log_group_name}")
            try:
                log_streams = self.logs_client.describe_log_streams(
                    logGroupName=log_group_name, limit=50
                )
                for stream in log_streams["logStreams"]:
                    stream_name: str = stream["logStreamName"]
                    events = self.get_log_events(log_group_name, stream_name)
                    streams.append(
                        LogStream(
                            log_group_name=log_group_name,
                            stream_name=stream_name,
                            events=events,
                        )
                    )
            except Exception as e:
                log.error(f"Failed to get logs for {log_group_name}", exc_info=True)

        return streams

    def get_log_events(self, log_group_name: str, stream: str):
        kwargs = {"logGroupName": log_group_name, "limit": 50, "logStreamName": stream}
        events = []
        while True:
            resp = self.logs_client.get_log_events(**kwargs)
            try:
                [events.append(e["message"]) for e in resp["events"]]
                kwargs["nextToken"] = resp["nextToken"]
            except KeyError:
                break
        return events
