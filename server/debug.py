#!/usr/bin/env python3
"""
Debug script to help troubleshoot Vercel deployment issues.
"""

import sys
import os

print("=== Vercel Debug Information ===")
print(f"Python version: {sys.version}")
print(f"Current working directory: {os.getcwd()}")
print(f"Script location: {__file__}")
print(f"Script directory: {os.path.dirname(__file__)}")

print("\n=== Python Path ===")
for i, path in enumerate(sys.path):
    print(f"{i}: {path}")

print("\n=== Files in current directory ===")
try:
    files = os.listdir(os.path.dirname(__file__))
    for file in sorted(files):
        print(f"  {file}")
except Exception as e:
    print(f"Error listing files: {e}")

print("\n=== Agent directory check ===")
agent_dir = os.path.join(os.path.dirname(__file__), 'agent')
print(f"Agent directory path: {agent_dir}")
print(f"Agent directory exists: {os.path.exists(agent_dir)}")

if os.path.exists(agent_dir):
    try:
        agent_files = os.listdir(agent_dir)
        print("Files in agent directory:")
        for file in sorted(agent_files):
            print(f"  {file}")
    except Exception as e:
        print(f"Error listing agent files: {e}")

print("\n=== Import test ===")
try:
    # Add current directory to path
    current_dir = os.path.dirname(__file__)
    if current_dir not in sys.path:
        sys.path.insert(0, current_dir)
    
    # Try to import
    from agent.core import AgentBuilder
    print("✅ SUCCESS: AgentBuilder imported successfully!")
except ImportError as e:
    print(f"❌ FAILED: {e}")
    print("Trying alternative import methods...")
    
    # Try direct import
    try:
        import agent
        print("✅ agent module found")
        print(f"Agent module location: {agent.__file__}")
    except ImportError as e2:
        print(f"❌ agent module not found: {e2}")

print("\n=== End Debug ===")
