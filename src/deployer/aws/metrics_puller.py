from datetime import datetime, timedelta
import boto3
from typing import List
from pydantic import BaseModel

from src.deployer.data.models import Resource

from src.util.logging import logger


class MetricData(BaseModel):
    namespace: str
    metric_name: str
    dimensions: List[dict]
    datapoints: List[dict]


metrics_mapping = {
    "aws:lambda_function": {
        "namespace": "AWS/Lambda",
        "metric_names": ["Invocations", "Errors", "Duration"],
        "dimension_name": "FunctionName",
    },
    "aws:dynamodb_table": {
        "namespace": "AWS/DynamoDB",
        "metric_names": [
            "ProvisionedReadCapacityUnits",
            "ProvisionedWriteCapacityUnits",
        ],
        "dimension_name": "TableName",
    },
}


class AwsMetricsPuller:
    def __init__(self, cloudwatch_client):
        self.cloudwatch_client = cloudwatch_client

    def pull_metrics(self, resource: Resource) -> List[MetricData]:
        # Extract the ARN
        arn = resource.properties["arn"]

        # Get the namespace, metric names, and dimension name for this ARN type
        mapping = metrics_mapping.get(resource.type)
        if not mapping:
            raise ValueError(f"Unsupported resource type: {resource.type}")

        # Get the current time
        now = datetime.utcnow()

        # Get the time 24 hours ago
        start_time = now - timedelta(days=1)

        # Convert the times to strings in the format expected by CloudWatch
        start_time_str = start_time.strftime("%Y-%m-%dT%H:%M:%SZ")
        end_time_str = now.strftime("%Y-%m-%dT%H:%M:%SZ")
        logger.info(
            f"Getting metrics for {arn} from {start_time_str} to {end_time_str}"
        )
        # Pull metrics for each metric name
        metric_data_list = []
        for metric_name in mapping["metric_names"]:
            response = self.cloudwatch_client.get_metric_statistics(
                Namespace=mapping["namespace"],
                MetricName=metric_name,
                # Dimensions=[{'Name': mapping['dimension_name'], 'Value': resource.id}],
                StartTime=start_time_str,
                EndTime=end_time_str,
                Period=60,
                Statistics=["SampleCount", "Average", "Sum", "Minimum", "Maximum"],
            )
            logger.info(response)
            metric_data_list.append(
                MetricData(
                    namespace=mapping["namespace"],
                    metric_name=metric_name,
                    dimensions=[{"Name": mapping["dimension_name"], "Value": arn}],
                    datapoints=response["Datapoints"],
                )
            )

        return metric_data_list
