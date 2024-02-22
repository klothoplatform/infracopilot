from typing import List
import pulumi.automation as auto
from src.deployer.data.models import Stack, Resource
from src.engine_service.engine_commands.run import RunEngineResult
from src.util.aws.s3 import put_object, get_object, delete_object, delete_objects
from src.util.logging import logger
import json
import yaml
from src.deployer.pulumi.type_mappings import pulumi_type_mappings


class StateManager:

    def __init__(self, bucket):
        self.bucket = bucket

    def save_resources_state_from_stack(
        self, arch_stack: Stack.ReturnObject, stack: auto.Stack
    ):
        if stack is None:
            put_object(
                self.bucket.Object(
                    f"state/{arch_stack.architecture_id}/{arch_stack.environment_id}/${arch_stack.name}/stack_state.json"
                ),
                bytes(json.dumps({}), "utf-8"),
            )
            return {}
        state: auto.Deployment = stack.export_stack()
        resources = state.deployment["resources"]
        object = self.bucket.Object(
            f"state/{arch_stack.architecture_id}/{arch_stack.environment_id}/${arch_stack.name}/stack_state.json"
        )
        put_object(object, bytes(json.dumps(resources), "utf-8"))
        return resources

    def get_state_from_storage(self, arch_stack: Stack.ReturnObject):
        object = self.bucket.Object(
            f"state/{arch_stack.architecture_id}/{arch_stack.environment_id}/${arch_stack.name}/stack_state.json"
        )
        state = get_object(object)
        return json.loads(state)

    def convert_output_to_objects(self, outputs: List[dict]) -> List[Resource]:
        resources: List[Resource] = []
        for output in outputs:
            output_type: str = output["type"]
            logger.info(f"converting output: {output_type} to resource object")
            if pulumi_type_mappings.get(output_type) is not None:
                output_type = pulumi_type_mappings[output_type]
                id = output["urn"].split(":")[-1]
                outputs: dict = output["outputs"]
                outputs.pop("__meta", None)
                resource = Resource(
                    id=id,
                    provider_id=output["id"],
                    type=output_type,
                    properties=output["outputs"],
                )
                resources.append(resource)
            else:
                logger.info(f"Skipping output of type: {output_type}")

        return resources
