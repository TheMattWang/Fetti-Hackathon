from langchain_community.agent_toolkits import SQLDatabaseToolkit
from .database import DatabaseManager
from .geo_intelligence import analyze_austin_location, get_austin_search_suggestions
import logging

logger = logging.getLogger(__name__)


def get_sql_tools(db_manager: DatabaseManager, llm):
    """
    Get SQL database tools for the agent.
    
    Args:
        db_manager: The database manager instance
        llm: The language model instance
        
    Returns:
        List of SQL tools for the agent
    """
    logger.info("Creating SQL database toolkit...")
    toolkit = SQLDatabaseToolkit(db=db_manager.db, llm=llm)
    tools = toolkit.get_tools()
    
    # Add Austin geographic intelligence tools
    tools.extend([
        analyze_austin_location,
        get_austin_search_suggestions
    ])
    
    logger.info(f"Created {len(tools)} SQL tools: {[tool.name for tool in tools]}")
    logger.info("Added Austin geographic intelligence tools for location analysis")
    return tools


def get_sql_system_prompt(dialect: str, top_k: int = 5, db_manager: DatabaseManager = None) -> str:
    """
    Get the system prompt for SQL agent.
    
    Args:
        dialect: The SQL dialect
        top_k: Maximum number of results to return
        db_manager: Database manager to get additional info
        
    Returns:
        The formatted system prompt
    """
    
    # Get additional database info if available
    view_info = ""
    if db_manager:
        try:
            views = db_manager.get_views()
            if views:
                view_info = f"""

IMPORTANT: This database also contains these VIEWS that you can query:
{', '.join(views)}

These views provide cleaned, formatted data:
- 'trips' view: Contains trip information with proper column names (trip_id, booking_user_id, started_at, pickup_address, dropoff_address, etc.)
- 'users' view: Contains user information 
- 'trip_users' view: Contains trip-user relationships

PREFER using the views (trips, users, trip_users) over the raw_ tables when possible, as they have cleaner column names and better data formatting.
"""
        except Exception:
            pass
    
    return """You are an Austin ride-sharing data analyst. Analyze trip data from Austin, Texas using SQL queries.

TOOLS:
- analyze_austin_location: Use when user mentions Austin locations
- get_austin_search_suggestions: Get SQL patterns for locations  

WORKFLOW:
1. For location queries: Call analyze_austin_location first, then use provided patterns
2. Always use LIMIT {top_k} unless more data requested
3. Query 'trips' view for clean data (pickup_address, dropoff_address, etc.)
4. Maximum 2 tool calls per question

RULES:
- Read-only queries only (no INSERT/UPDATE/DELETE)
- Stop after 2 failed queries - don't retry indefinitely
- Use conversation context but keep responses concise

{view_info}
""".format(
        dialect=dialect,
        top_k=top_k,
        view_info=view_info,
    )
