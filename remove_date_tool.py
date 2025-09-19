#!/usr/bin/env python3
"""
Script to temporarily remove the date range tool from the SQL tools
to test if it's causing the agent to be overly cautious.
"""

import os
import shutil
from datetime import datetime

def backup_and_remove_date_tool():
    """Backup the current sql_tools.py and remove the date range tool."""
    
    sql_tools_path = "agent/utils/tools/sql_tools.py"
    backup_path = f"agent/utils/tools/sql_tools_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.py"
    
    # Create backup
    shutil.copy2(sql_tools_path, backup_path)
    print(f"✅ Created backup: {backup_path}")
    
    # Read current file
    with open(sql_tools_path, 'r') as f:
        content = f.read()
    
    # Remove the date range tool import
    content = content.replace(
        "from .date_range_analysis import analyze_database_date_ranges\n",
        "# from .date_range_analysis import analyze_database_date_ranges  # Temporarily disabled\n"
    )
    
    # Remove the date range tool from context_tools
    content = content.replace(
        "        analyze_database_date_ranges_tool",
        "#         analyze_database_date_ranges_tool  # Temporarily disabled"
    )
    
    # Remove the date range tool creation
    content = content.replace(
        """    # Create a tool for date range analysis
    @tool
    def analyze_database_date_ranges_tool() -> str:
        \"\"\"Analyze available date ranges in the database to understand temporal scope.\"\"\"
        return analyze_database_date_ranges(db_manager)
    
    """,
        """    # Create a tool for date range analysis (temporarily disabled)
    # @tool
    # def analyze_database_date_ranges_tool() -> str:
    #     \"\"\"Analyze available date ranges in the database to understand temporal scope.\"\"\"
    #     return analyze_database_date_ranges(db_manager)
    
    """
    )
    
    # Remove from system prompt
    content = content.replace(
        "- analyze_database_date_ranges_tool: Get information about available date ranges in the database\n",
        "# - analyze_database_date_ranges_tool: Get information about available date ranges in the database (disabled)\n"
    )
    
    content = content.replace(
        "- For date queries: Use analyze_database_date_ranges_tool → understand available dates → analyze_date_patterns → build query → execute\n",
        "- For date queries: Use analyze_date_patterns → get SQL patterns → build query → execute\n"
    )
    
    content = content.replace(
        "- For \"last month\" queries: Use analyze_database_date_ranges_tool → check if dates exist → build appropriate query → execute\n",
        "- For \"last month\" queries: Make reasonable assumptions about date ranges → build appropriate query → execute\n"
    )
    
    # Write modified content
    with open(sql_tools_path, 'w') as f:
        f.write(content)
    
    print("✅ Removed date range tool from sql_tools.py")
    print("📝 The agent will now rely on temperature and system prompt for date handling")
    
    return backup_path

def restore_date_tool(backup_path):
    """Restore the original sql_tools.py from backup."""
    
    sql_tools_path = "agent/utils/tools/sql_tools.py"
    
    # Restore from backup
    shutil.copy2(backup_path, sql_tools_path)
    print(f"✅ Restored sql_tools.py from backup: {backup_path}")
    
    # Remove backup file
    os.remove(backup_path)
    print("✅ Removed backup file")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "restore":
        if len(sys.argv) > 2:
            backup_path = sys.argv[2]
            restore_date_tool(backup_path)
        else:
            print("❌ Please provide backup path: python remove_date_tool.py restore <backup_path>")
    else:
        print("Date Range Tool Removal Script")
        print("=" * 40)
        print("This script will temporarily remove the date range tool to test")
        print("if it's causing the agent to be overly cautious.")
        print()
        
        choice = input("Do you want to remove the date range tool? (y/n): ").lower().strip()
        
        if choice == 'y':
            backup_path = backup_and_remove_date_tool()
            print()
            print("🔄 Please restart the server to apply changes.")
            print("🧪 Run test_without_date_tool.py to test the behavior.")
            print()
            print("To restore later, run:")
            print(f"python remove_date_tool.py restore {backup_path}")
        else:
            print("❌ Operation cancelled.")
