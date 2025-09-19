"""
Simple debug API for Vercel deployment testing.
"""

import os
import sys
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    return {
        "message": "Debug API is working",
        "python_version": sys.version,
        "current_dir": os.getcwd(),
        "script_dir": os.path.dirname(__file__),
        "files_in_dir": os.listdir(os.path.dirname(__file__)),
        "agent_exists": os.path.exists(os.path.join(os.path.dirname(__file__), 'agent')),
        "python_path": sys.path[:5]  # First 5 entries
    }

@app.get("/test-import")
async def test_import():
    try:
        # Add current directory to path
        current_dir = os.path.dirname(__file__)
        if current_dir not in sys.path:
            sys.path.insert(0, current_dir)
        
        from agent.core import AgentBuilder
        return {"status": "success", "message": "AgentBuilder imported successfully"}
    except ImportError as e:
        return {"status": "error", "message": str(e), "python_path": sys.path}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
