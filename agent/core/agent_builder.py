from langgraph.prebuilt import create_react_agent
from ..config import get_llm
from ..utils.tools import DatabaseManager, get_sql_tools, get_sql_system_prompt
from .graph_builder import GraphBuilder


class AgentBuilder:
    """Main agent builder class that orchestrates the creation of different agent types."""
    
    def __init__(self, db_uri: str = "sqlite:///rides.sqlite"):
        """
        Initialize the agent builder.
        
        Args:
            db_uri: Database URI for SQL agents
        """
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
    
    def create_sql_agent(self):
        """Create a SQL-enabled reactive agent."""
        if not self.llm:
            self.setup_llm()
        
        tools = get_sql_tools(self.db_manager, self.llm)
        system_prompt = get_sql_system_prompt(self.db_manager.db.dialect)
        
        agent = create_react_agent(
            self.llm,
            tools,
            prompt=system_prompt,
        )
        
        return agent
    
    def get_database_info(self):
        """Get information about the database."""
        return self.db_manager.get_database_info()
    
    def print_database_info(self):
        """Print database information."""
        self.db_manager.print_database_info()


def create_sql_agent(db_uri: str = "sqlite:///rides.sqlite", temperature: float = 0):
    """
    Convenience function to create a SQL agent quickly.
    
    Args:
        db_uri: Database URI
        temperature: LLM temperature setting
        
    Returns:
        The created SQL agent
    """
    builder = AgentBuilder(db_uri)
    return builder.setup_llm(temperature).create_sql_agent()
