from langchain_community.agent_toolkits import SQLDatabaseToolkit
from .database import DatabaseManager
from .geo_intelligence import analyze_austin_location, get_austin_search_suggestions
from .date_analysis import analyze_date_patterns, get_day_of_week_sql_patterns
from .date_range_analysis import analyze_database_date_ranges
from langchain.tools import tool
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
    
    # Create a tool for date range analysis
    @tool
    def analyze_database_date_ranges_tool() -> str:
        """Analyze available date ranges in the database to understand temporal scope."""
        return analyze_database_date_ranges(db_manager)
    
    # Add context tools (for gathering information to build better SQL queries)
    context_tools = [
        analyze_austin_location,
        get_austin_search_suggestions,
        analyze_date_patterns,
        get_day_of_week_sql_patterns,
        analyze_database_date_ranges_tool
    ]
    
    # Add context tools to the main tools list
    tools.extend(context_tools)
    
    # Log tool organization
    execution_tools = [tool for tool in tools if tool.name.startswith('sql_db_')]
    logger.info(f"Created {len(tools)} total tools:")
    logger.info(f"  - {len(execution_tools)} EXECUTION tools: {[tool.name for tool in execution_tools]}")
    logger.info(f"  - {len(context_tools)} CONTEXT tools: {[tool.name for tool in context_tools]}")
    
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

CONTEXT TOOLS (Use these to gather information for building better SQL queries):
- analyze_austin_location: Get location patterns and SQL suggestions for Austin locations
- get_austin_search_suggestions: Get SQL patterns for specific location names
- analyze_date_patterns: Get date/time analysis and SQL patterns for date queries
- get_day_of_week_sql_patterns: Get SQL patterns for day-of-week analysis
- analyze_database_date_ranges_tool: Get current date context to interpret temporal queries naturally
- sql_db_schema: Get database schema information
- sql_db_list_tables: List available tables and views

EXECUTION TOOLS (Use these to run actual SQL queries):
- sql_db_query: Execute SQL queries against the database and return results

WORKFLOW:
1. **Gather Context**: Use context tools to understand locations, dates, or database structure
2. **Build Query**: Use the context information to construct an appropriate SQL query
3. **Execute Query**: Use sql_db_query to run the query and get results
4. **Present Results**: Format the results in a clear, conversational way

EXAMPLES:
- For "Moody Center" queries: Use analyze_austin_location → get patterns → build SQL → execute
- For date queries: Use analyze_database_date_ranges_tool → get current date context → analyze_date_patterns → build query → execute
- For schema questions: Use sql_db_schema → understand structure → build query → execute
- For "last month" queries: Use analyze_database_date_ranges_tool → interpret based on current date → build appropriate query → execute

RULES:
- Always use LIMIT {top_k} unless more data requested
- Query 'trips' view for clean data (pickup_address, dropoff_address, started_at, etc.)
- Read-only queries only (no INSERT/UPDATE/DELETE)
- Present results in a clear, conversational format
- Make reasonable assumptions when users ask about "last month" or similar time periods
- If the database contains data from August-September 2025, interpret "last month" as referring to that period
- Be confident and provide specific answers rather than asking for clarification

{view_info}
""".format(
        dialect=dialect,
        top_k=top_k,
        view_info=view_info,
    )
