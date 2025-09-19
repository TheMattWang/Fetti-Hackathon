from typing import Annotated
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages


class State(TypedDict):
    """
    State schema for the agent graph.
    
    Attributes:
        messages: A list of messages that gets updated by appending new messages
                 rather than overwriting them.
    """
    messages: Annotated[list, add_messages]
