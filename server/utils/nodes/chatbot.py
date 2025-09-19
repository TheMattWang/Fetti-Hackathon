from utils.state import State


def chatbot_node(llm):
    """
    Create a chatbot node function for the given LLM.
    
    Args:
        llm: The language model instance
        
    Returns:
        A function that can be used as a node in the graph
    """
    def chatbot(state: State):
        """Process the current state and return updated messages."""
        return {"messages": [llm.invoke(state["messages"])]}
    
    return chatbot
