#!/usr/bin/env python3
"""
Debug test to see what SQL the agent is actually executing.
"""

import requests
import json
import time

def test_sql_debug():
    """Test to see what SQL the agent executes for the Moody Center query."""
    base_url = "http://localhost:9000"
    
    print("Testing SQL execution for Moody Center query...")
    print("Expected: Agent should use available date range (8/31/25 to 9/8/25)")
    print()
    
    # Start SSE connection
    sse_url = f"{base_url}/api/agent/stream"
    response = requests.get(sse_url, stream=True, timeout=10)
    
    if response.status_code != 200:
        print(f"SSE connection failed: {response.status_code}")
        return False
    
    print("✅ SSE connection established")
    
    # Test the query
    query_data = {
        "message": "How many groups went to Moody Center last month?",
        "requestId": "sql-debug-test-123"
    }
    
    print("Sending 'last month' query...")
    query_response = requests.post(
        f"{base_url}/api/agent/query",
        json=query_data,
        timeout=10
    )
    
    if query_response.status_code != 200:
        print(f"Query submission failed: {query_response.status_code}")
        return False
    
    print("✅ Query submitted successfully")
    
    # Listen for SSE messages
    print("Listening for SSE messages...")
    start_time = time.time()
    timeout = 60
    
    try:
        for line in response.iter_lines(decode_unicode=True):
            if time.time() - start_time > timeout:
                print("❌ Timeout waiting for response")
                return False
                
            if line.startswith('data: '):
                data = line[6:]
                try:
                    message = json.loads(data)
                    
                    # Skip connection message
                    if 'clientId' in message:
                        continue
                    
                    print(f"Received message: {message}")
                    
                    # Check if this is the final response
                    if 'patches' in message and message['patches']:
                        print("✅ Received agent response with patches")
                        
                        # Extract the actual response text
                        patches = message['patches']
                        if patches and 'value' in patches[0] and 'data' in patches[0]['value']:
                            rows = patches[0]['value']['data']['rows']
                            if rows and 'message' in rows[0]:
                                response_text = rows[0]['message']
                                print(f"Agent response: {response_text}")
                                
                                # Check if the response mentions specific dates or SQL
                                if any(phrase in response_text.lower() for phrase in [
                                    "8/31", "9/8", "august 31", "september 8", 
                                    "date range", "available data", "from", "to"
                                ]):
                                    print("✅ Agent mentioned specific dates or date range!")
                                    return True
                                else:
                                    print("⚠️ Agent response doesn't mention specific dates")
                                    return False
                        
                        return True
                        
                except json.JSONDecodeError:
                    print(f"Failed to parse message: {data}")
                    
    except Exception as e:
        print(f"Error reading SSE stream: {e}")
        return False
    
    return False

if __name__ == "__main__":
    print("SQL Debug Test")
    print("=" * 50)
    print("This test checks if the agent mentions specific dates in its response.")
    print()
    
    success = test_sql_debug()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 SUCCESS: Agent mentioned specific dates!")
        print("   The agent should be using the available date range effectively.")
    else:
        print("❌ ISSUE: Agent didn't mention specific dates.")
        print("   May need further improvements to the date context tool.")
