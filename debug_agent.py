#!/usr/bin/env python3
"""
Debug script to test agent execution directly.
"""

import sys
import os
import time

# Add the project root to the path
sys.path.insert(0, os.path.dirname(__file__))

def test_agent_execution():
    """Test agent execution with a simple query."""
    try:
        from agent.core import create_sql_agent
        
        print("Creating SQL agent...")
        agent = create_sql_agent()
        print("✅ Agent created successfully")
        
        # Test with a simple query
        test_query = "How many trips are in the database?"
        print(f"Testing with query: {test_query}")
        
        start_time = time.time()
        
        # Execute the agent
        result = agent.invoke(
            {"messages": [{"role": "user", "content": test_query}]},
            config={"recursion_limit": 10}
        )
        
        elapsed_time = time.time() - start_time
        print(f"✅ Agent completed in {elapsed_time:.2f} seconds")
        print(f"Result: {result}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Testing agent execution...")
    print("=" * 50)
    
    success = test_agent_execution()
    
    if success:
        print("\n✅ Agent execution test passed!")
    else:
        print("\n❌ Agent execution test failed!")
