from dataclasses import dataclass
from typing import Optional, List

from src.chat.open_ai.models import IntentList, ActionMessage
from src.engine_service.engine_commands.run import RunEngineResult
from src.topology.topology import Topology


@dataclass
class MessageExecutionException(BaseException):
    error_message: str
    message_id: str
    user_message: str
    ai_response: Optional[str] = None
    intent: Optional[IntentList] = None
    intent_timing: Optional[float] = None
    input_graph: Optional[Topology] = None
    reasoning: Optional[List[ActionMessage]] = None
    result: Optional[RunEngineResult] = None
    klotho_timing: Optional[float] = None


@dataclass
class MessageExecutionResult:
    message_id: str
    user_message: str
    ai_response: str
    intent: IntentList
    intent_timing: float
    input_graph: Topology
    result: RunEngineResult
    reasoning: List[ActionMessage]
    klotho_timing: float
