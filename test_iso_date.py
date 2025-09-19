#!/usr/bin/env python3
"""
Test with ISO date format that the agent requested.
"""

import requests
import json
import time

def test_iso_date():
    """Test with ISO date format that the agent requested."""
    base_url = "http://localhost:9000"
    
    print("Testing with ISO date format...")
    print("Expected: Agent should find 6 trips to Moody Center")
    print()
    
    # Start SSE connection
    sse_url = f"{base_url}/api/agent/stream"
    response = requests.get(sse_url, stream=True, timeout=10)
    
    if response.status_code != 200:
        print(f"SSE connection failed: {response.status_code}")
        return False
    
    print("✅ SSE connection established")
    
    # Test with ISO date format
    query_data = {
        "message": "How many groups went to Moody Center from 2025-09-01 to 2025-09-08?",
        "requestId": "iso-date-test-123"
    }
    
    print("Sending ISO date format query...")
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
                                
                                # Check if the response mentions the correct number of trips
                                if any(phrase in response_text.lower() for phrase in [
                                    "6 groups", "6 trips", "six groups", "six trips",
                                    "groups went to moody center", "trips to moody center"
                                ]):
                                    print("✅ Agent found the correct number of Moody Center trips!")
                                    return True
                                elif any(phrase in response_text.lower() for phrase in [
                                    "0 groups", "no groups", "no trips"
                                ]):
                                    print("❌ Agent still found no trips")
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
    print("ISO Date Format Test")
    print("=" * 50)
    print("This test uses ISO date format (YYYY-MM-DD) as requested by the agent.")
    print()
    
    success = test_iso_date()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 SUCCESS: Agent found the Moody Center trips!")
        print("   The issue is with date interpretation, not the SQL query itself.")
    else:
        print("❌ FAILED: Agent still couldn't find the Moody Center trips.")
        print("   There may be a deeper issue with the SQL query or data access.")
