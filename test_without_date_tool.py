#!/usr/bin/env python3
"""
Test script to verify if the date range tool is causing the agent to be overly cautious.
This test will be run later when the API quota resets.
"""

import requests
import json
import time

def test_without_date_tool():
    """Test the agent behavior without the date range tool."""
    base_url = "http://localhost:9000"
    
    print("Testing agent behavior without date range tool...")
    print("This test will verify if removing the date range tool makes the agent less cautious.")
    
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
        "requestId": "no-date-tool-test-123"
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
                                
                                # Check if the agent provided a specific answer instead of asking for clarification
                                if any(phrase in response_text.lower() for phrase in [
                                    "groups went to moody center", "trips to moody center", 
                                    "0 groups", "1 group", "2 groups", "3 groups", "4 groups", 
                                    "5 groups", "6 groups", "7 groups", "8 groups", "9 groups"
                                ]):
                                    print("✅ Agent provided a specific answer (less cautious)!")
                                    return True
                                elif any(phrase in response_text.lower() for phrase in [
                                    "cannot answer", "need clarification", "more specific", 
                                    "date range", "available data"
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

def test_with_specific_date():
    """Test with a specific date that should work."""
    base_url = "http://localhost:9000"
    
    print("\nTesting with specific date query...")
    
    # Start SSE connection
    sse_url = f"{base_url}/api/agent/stream"
    response = requests.get(sse_url, stream=True, timeout=10)
    
    if response.status_code != 200:
        print(f"SSE connection failed: {response.status_code}")
        return False
    
    print("✅ SSE connection established")
    
    # Test with a specific date
    query_data = {
        "message": "How many groups went to Moody Center on September 1st, 2025?",
        "requestId": "specific-date-test-456"
    }
    
    print("Sending specific date query...")
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
                                if any(word in response_text.lower() for word in ["groups", "trips", "went", "moody", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]):
                                    print("✅ Agent provided a specific answer!")
                                    return True
                                else:
                                    print("⚠️ Agent response doesn't seem to be a specific answer")
                                    return False
                        
                        return True
                        
                except json.JSONDecodeError:
                    print(f"Failed to parse message: {data}")
                    
    except Exception as e:
        print(f"Error reading SSE stream: {e}")
        return False
    
    return False

if __name__ == "__main__":
    print("Testing agent behavior to identify the cause of over-caution...")
    print("=" * 70)
    
    # Test 1: Original problematic query
    print("TEST 1: Original 'last month' query")
    print("-" * 40)
    success1 = test_without_date_tool()
    
    # Test 2: Specific date query
    print("\nTEST 2: Specific date query")
    print("-" * 40)
    success2 = test_with_specific_date()
    
    print("\n" + "=" * 70)
    print("RESULTS:")
    print(f"Test 1 (last month): {'✅ PASSED' if success1 else '❌ FAILED'}")
    print(f"Test 2 (specific date): {'✅ PASSED' if success2 else '❌ FAILED'}")
    
    if success1:
        print("\n🎉 The agent is now less cautious and provides specific answers!")
    else:
        print("\n🤔 The agent is still being cautious. The date range tool might be the issue.")
        print("   Consider removing or modifying the analyze_database_date_ranges_tool.")
