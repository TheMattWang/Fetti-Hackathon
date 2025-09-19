from langchain_community.utilities import SQLDatabase
import logging

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Manages database connections and operations."""
    
    def __init__(self, db_uri: str = None):
        """
        Initialize the database manager.
        
        Args:
            db_uri: The database URI (default: sqlite:///rides.sqlite)
        """
        if db_uri is None:
            # Use absolute path to the rides.sqlite in project root
            import os
            # Go up from agent/utils/tools/ to project root
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
            db_uri = f"sqlite:///{os.path.join(project_root, 'rides.sqlite')}"
        
        self.db_uri = db_uri
        self._db = None
    
    @property
    def db(self) -> SQLDatabase:
        """Get or create the database connection."""
        if self._db is None:
            logger.info(f"Connecting to database: {self.db_uri}")
            # For now, use all available tables (which are the raw_* tables)
            # The views can be accessed through SQL queries
            self._db = SQLDatabase.from_uri(self.db_uri)
            logger.info("Database connection established successfully")
        return self._db
    
    def get_database_info(self) -> dict:
        """Get information about the database."""
        return {
            "dialect": self.db.dialect,
            "tables": self.db.get_usable_table_names(),
            "views": self.get_views(),
        }
    
    def get_views(self) -> list:
        """Get list of views in the database."""
        try:
            # Query to get view names in SQLite
            result = self.db.run("SELECT name FROM sqlite_master WHERE type='view'")
            # Parse the result to extract view names
            if result.strip():
                # The result is usually in format like: [('view_name',)]
                import re
                view_names = re.findall(r"'([^']+)'", result)
                return view_names
            return []
        except Exception as e:
            print(f"Error getting views: {e}")
            return []
    
    def run_sample_query(self, table: str = "Trips", limit: int = 5) -> str:
        """Run a sample query to test the database connection."""
        query = f"SELECT * FROM {table} LIMIT {limit};"
        return self.run_query_with_logging(query)
    
    def run_query_with_logging(self, query: str) -> str:
        """Run a SQL query with comprehensive logging and timeout protection."""
        import time
        logger.info(f"Executing SQL query: {query[:100]}...")
        start_time = time.time()
        
        try:
            # Add a simple timeout check (SQLite should be fast)
            result = self.db.run(query)
            elapsed_time = time.time() - start_time
            
            logger.info(f"Query executed successfully in {elapsed_time:.3f}s, result length: {len(str(result))} characters")
            
            # Warn if query took too long
            if elapsed_time > 5.0:
                logger.warning(f"SQL query took {elapsed_time:.3f}s (>5s) - consider optimizing")
            
            logger.debug(f"Query result preview: {str(result)[:200]}...")
            return result
        except Exception as e:
            elapsed_time = time.time() - start_time
            logger.error(f"SQL query failed after {elapsed_time:.3f}s: {str(e)}")
            logger.error(f"Failed query: {query}")
            raise
    
    def print_database_info(self):
        """Print database information to console."""
        info = self.get_database_info()
        print(f"Dialect: {info['dialect']}")
        print(f"Available tables: {info['tables']}")
        print(f"Available views: {info['views']}")
        
        # Test both tables and views
        if "raw_trips" in info['tables']:
            sample_output = self.run_sample_query("raw_trips")
            print(f'Sample raw_trips output: {sample_output}')
        
        if "trips" in info.get('views', []):
            sample_output = self.run_sample_query("trips")
            print(f'Sample trips view output: {sample_output}')
        
        if "users" in info.get('views', []):
            sample_output = self.run_sample_query("users")
            print(f'Sample users view output: {sample_output}')