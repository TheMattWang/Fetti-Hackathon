from langgraph.prebuilt import create_react_agent
from ..config import get_llm
from ..utils.tools import DatabaseManager, get_sql_tools, get_sql_system_prompt
from .graph_builder import GraphBuilder


class AgentBuilder:
    """Main agent builder class that orchestrates the creation of different agent types."""
    
    def __init__(self, db_uri: str = None):
        """
        Initialize the agent builder.
        
        Args:
            db_uri: Database URI for SQL agents
        """
        if db_uri is None:
            # Use absolute path to the rides.sqlite in project root
            import os
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            db_uri = f"sqlite:///{os.path.join(project_root, 'rides.sqlite')}"
        
        self.db_manager = DatabaseManager(db_uri)
        self.llm = None
    
    def setup_llm(self, temperature: float = 0):
        """Setup the language model."""
        self.llm = get_llm(temperature)
        return self
    
    def create_simple_chatbot(self):
        """Create a simple chatbot agent."""
        if not self.llm:
            self.setup_llm()
        
        builder = GraphBuilder()
        graph = (builder
                .add_chatbot_node(self.llm)
                .add_simple_flow()
                .compile())
        
        return graph
    
    def create_sql_agent(self, max_iterations: int = 3):
        """Create a SQL-enabled reactive agent with retry limits."""
        if not self.llm:
            self.setup_llm()
        
        tools = get_sql_tools(self.db_manager, self.llm)
        system_prompt = get_sql_system_prompt(self.db_manager.db.dialect, db_manager=self.db_manager)
        
        # Create agent (create_react_agent doesn't support max_iterations directly)
        agent = create_react_agent(
            self.llm,
            tools,
            prompt=system_prompt,
        )
        
        # Note: Retry limits will be implemented at the invocation level
        # Store max_iterations for use during agent invocation
        agent._max_iterations = max_iterations
        
        return agent
    
    def get_database_info(self):
        """Get information about the database."""
        return self.db_manager.get_database_info()
    
    def print_database_info(self):
        """Print database information."""
        self.db_manager.print_database_info()


def create_sql_agent(db_uri: str = None, temperature: float = 0, max_iterations: int = 3):
    """
    Convenience function to create a SQL agent quickly.
    
    Args:
        db_uri: Database URI
        temperature: LLM temperature setting
        max_iterations: Maximum retry attempts for each node
        
    Returns:
        The created SQL agent
    """
    builder = AgentBuilder(db_uri)
    return builder.setup_llm(temperature).create_sql_agent(max_iterations=max_iterations)
