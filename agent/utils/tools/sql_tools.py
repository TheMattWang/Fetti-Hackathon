from langchain_community.agent_toolkits import SQLDatabaseToolkit
from .database import DatabaseManager


def get_sql_tools(db_manager: DatabaseManager, llm):
    """
    Get SQL database tools for the agent.
    
    Args:
        db_manager: The database manager instance
        llm: The language model instance
        
    Returns:
        List of SQL tools for the agent
    """
    toolkit = SQLDatabaseToolkit(db=db_manager.db, llm=llm)
    tools = toolkit.get_tools()
    return tools


def get_sql_system_prompt(dialect: str, top_k: int = 5) -> str:
    """
    Get the system prompt for SQL agent.
    
    Args:
        dialect: The SQL dialect
        top_k: Maximum number of results to return
        
    Returns:
        The formatted system prompt
    """
    return """
You are an agent designed to interact with a SQL database.
Given an input question, create a syntactically correct {dialect} query to run,
then look at the results of the query and return the answer. Unless the user
specifies a specific number of examples they wish to obtain, always limit your
query to at most {top_k} results.

You can order the results by a relevant column to return the most interesting
examples in the database. Never query for all the columns from a specific table,
only ask for the relevant columns given the question.

You MUST double check your query before executing it. If you get an error while
executing a query, rewrite the query and try again.

DO NOT make any DML statements (INSERT, UPDATE, DELETE, DROP etc.) to the
database.

To start you should ALWAYS look at the tables in the database to see what you
can query. Do NOT skip this step.

Then you should query the schema of the most relevant tables.
""".format(
        dialect=dialect,
        top_k=top_k,
    )
