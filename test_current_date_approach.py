#!/usr/bin/env python3
"""
Test the new current date approach for temporal queries.
"""

import requests
import json
import time

def test_current_date_approach():
    """Test that the agent now uses current date context instead of exact date ranges."""
    base_url = "http://localhost:9000"
    
    print("Testing new current date approach...")
    print("Expected: Agent should interpret 'last month' as August 2025 based on current date")
    print()
    
    # Start SSE connection
    sse_url = f"{base_url}/api/agent/stream"
    response = requests.get(sse_url, stream=True, timeout=10)
    
    if response.status_code != 200:
        print(f"SSE connection failed: {response.status_code}")
        return False
    
    print("✅ SSE connection established")
    
    # Test the original problematic query
    query_data = {
        "message": "How many groups went to Moody Center last month?",
        "requestId": "current-date-test-123"
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
    timeout = 60  # 60 second timeout
    
    try:
        for line in response.iter_lines(decode_unicode=True):
            if time.time() - start_time > timeout:
                print("❌ Timeout waiting for response")
                return False
                
            if line.startswith('data: '):
                data = line[6:]  # Remove 'data: ' prefix
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
                                
                                # Check if the agent provided a specific answer
                                if any(phrase in response_text.lower() for phrase in [
                                    "groups went to moody center", "trips to moody center", 
                                    "0 groups", "1 group", "2 groups", "3 groups", "4 groups", 
                                    "5 groups", "6 groups", "7 groups", "8 groups", "9 groups",
                                    "august 2025", "last month"
                                ]):
                                    print("✅ Agent provided a specific answer using current date context!")
                                    return True
                                elif any(phrase in response_text.lower() for phrase in [
                                    "cannot answer", "need clarification", "more specific", 
                                    "date range", "available data", "does not correspond"
                                ]):
                                    print("❌ Agent is still being cautious (asking for clarification)")
                                    return False
                                else:
                                    print("⚠️ Agent response is unclear")
                                    return False
                        
                        return True
                        
                except json.JSONDecodeError:
                    print(f"Failed to parse message: {data}")
                    
    except Exception as e:
        print(f"Error reading SSE stream: {e}")
        return False
    
    return False

if __name__ == "__main__":
    print("Testing Current Date Approach")
    print("=" * 50)
    print("This test verifies that the agent now uses current date context")
    print("to interpret temporal queries naturally instead of being overly cautious.")
    print()
    
    success = test_current_date_approach()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 SUCCESS: Agent is now using current date context!")
        print("   The agent should interpret 'last month' as August 2025")
        print("   and provide specific answers instead of asking for clarification.")
    else:
        print("❌ FAILED: Agent is still being overly cautious.")
        print("   May need further adjustments to temperature or system prompt.")
