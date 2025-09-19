def stream_graph_updates(graph, user_input: str):
    """
    Stream graph updates for the given user input.
    
    Args:
        graph: The compiled graph instance
        user_input: The user's input message
    """
    for event in graph.stream({"messages": [{"role": "user", "content": user_input}]}):
        for value in event.values():
            print("Assistant:", value["messages"][-1].content)
