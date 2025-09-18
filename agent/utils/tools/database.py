from langchain_community.utilities import SQLDatabase


class DatabaseManager:
    """Manages database connections and operations."""
    
    def __init__(self, db_uri: str = "sqlite:///rides.sqlite"):
        """
        Initialize the database manager.
        
        Args:
            db_uri: The database URI (default: sqlite:///rides.sqlite)
        """
        self.db_uri = db_uri
        self._db = None
    
    @property
    def db(self) -> SQLDatabase:
        """Get or create the database connection."""
        if self._db is None:
            self._db = SQLDatabase.from_uri(self.db_uri)
        return self._db
    
    def get_database_info(self) -> dict:
        """Get information about the database."""
        return {
            "dialect": self.db.dialect,
            "tables": self.db.get_usable_table_names(),
        }
    
    def run_sample_query(self, table: str = "Trips", limit: int = 5) -> str:
        """Run a sample query to test the database connection."""
        query = f"SELECT * FROM {table} LIMIT {limit};"
        return self.db.run(query)
    
    def print_database_info(self):
        """Print database information to console."""
        info = self.get_database_info()
        print(f"Dialect: {info['dialect']}")
        print(f"Available tables: {info['tables']}")
        
        if "Trips" in info['tables']:
            sample_output = self.run_sample_query()
            print(f'Sample output: {sample_output}')
