from langgraph.graph import StateGraph, START, END
from ..utils.state import State
from ..utils.nodes import chatbot_node


class GraphBuilder:
    """Builds and manages LangGraph instances."""
    
    def __init__(self):
        self.graph_builder = StateGraph(State)
    
    def add_chatbot_node(self, llm, node_name: str = "chatbot"):
        """
        Add a chatbot node to the graph.
        
        Args:
            llm: The language model instance
            node_name: Name of the node (default: "chatbot")
        """
        chatbot = chatbot_node(llm)
        self.graph_builder.add_node(node_name, chatbot)
        return self
    
    def add_simple_flow(self, start_node: str = "chatbot"):
        """
        Add a simple linear flow from START to END through the specified node.
        
        Args:
            start_node: The node to connect between START and END
        """
        self.graph_builder.add_edge(START, start_node)
        self.graph_builder.add_edge(start_node, END)
        return self
    
    def compile(self):
        """Compile and return the graph."""
        return self.graph_builder.compile()
