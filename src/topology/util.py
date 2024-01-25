from src.engine_service.engine_commands.run import RunEngineResult
from src.topology.topology import Topology, TopologyDiff


def diff_engine_results(
    current: RunEngineResult, previous: RunEngineResult
) -> TopologyDiff:
    """
    Compare two RunEngineResult objects and return the differences.

    Args:
        current (RunEngineResult): The current RunEngineResult object.
        previous (RunEngineResult): The previous RunEngineResult object.

    Returns:
        dict: A dictionary with the differences.
    """
    prev_topology = Topology.from_string(previous.resources_yaml)
    curr_topology = Topology.from_string(current.resources_yaml)
    diff: TopologyDiff = curr_topology.diff_topology(prev_topology)
    return diff
