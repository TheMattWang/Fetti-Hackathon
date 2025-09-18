"""
Main agent module demonstrating the organized agent structure.

This module showcases how to use the organized agent components to create
both simple chatbots and SQL-enabled reactive agents.
"""

from core import AgentBuilder, create_sql_agent
from utils.nodes import stream_graph_updates

def main():
    """Main function demonstrating the organized agent structure."""
    
    # Create an agent builder instance
    builder = AgentBuilder()
    
    # Print database information
    print("="*50)
    print("DATABASE INFORMATION")
    print("="*50)
    builder.print_database_info()
    
    # Create a SQL agent using the organized structure
    print("\n" + "="*50)
    print("CREATING SQL AGENT")
    print("="*50)
    agent = builder.setup_llm().create_sql_agent()
    
    # Test the agent with a sample question
    print("\n" + "="*50)
    print("TESTING SQL AGENT")
    print("="*50)
    question = "What is the most common place for drop offs"
    print(f"Question: {question}")
    print("-" * 30)
    
    for step in agent.stream(
        {"messages": [{"role": "user", "content": question}]},
        stream_mode="values",
    ):
        step["messages"][-1].pretty_print()
    
    # Alternatively, you can create a simple chatbot
    print("\n" + "="*50)
    print("CREATING SIMPLE CHATBOT")
    print("="*50)
    simple_graph = builder.create_simple_chatbot()
    
    # Example of using the convenience function
    print("\n" + "="*50)
    print("USING CONVENIENCE FUNCTION")
    print("="*50)
    quick_agent = create_sql_agent()
    print("Quick SQL agent created successfully!")


def interactive_mode():
    """Run the agent in interactive mode."""
    builder = AgentBuilder()
    graph = builder.setup_llm().create_simple_chatbot()
    
    print("Interactive mode started. Type 'quit', 'exit', or 'q' to stop.")
    
    while True:
        try:
            user_input = input("User: ")
            if user_input.lower() in ["quit", "exit", "q"]:
                print("Goodbye!")
                break
            stream_graph_updates(graph, user_input)
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break
        except Exception as e:
            print(f"Error: {e}")
            break


if __name__ == "__main__":
    main()
    
    # Uncomment the line below to run in interactive mode instead
    # interactive_mode()