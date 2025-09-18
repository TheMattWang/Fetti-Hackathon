"""
FastAPI server for SQL Agent with Server-Sent Events streaming.

This server bridges the LangGraph agent with the React frontend,
providing SSE streaming for real-time UI updates.
"""

import asyncio
import json
import logging
import uuid
from typing import Dict, List, Optional
from datetime import datetime

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import uvicorn

# Import your organized agent
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from agent.core import AgentBuilder

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SQL Agent API",
    description="FastAPI server for LangGraph SQL Agent with SSE streaming",
    version="1.0.0"
)

# CORS configuration - restricted to known app origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # React frontend on multiple ports
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Global agent instance
agent_builder = None
sql_agent = None

# SSE client management
class SSEClient:
    def __init__(self, client_id: str):
        self.client_id = client_id
        self.queue: asyncio.Queue = asyncio.Queue()
        self.connected = True

clients: Dict[str, SSEClient] = {}

class QueryRequest(BaseModel):
    message: str = Field(..., description="User query for the SQL agent")
    requestId: Optional[str] = Field(None, description="Optional request ID")

class AgentResponse(BaseModel):
    patches: List[dict] = Field(default_factory=list)
    requestId: str
    message: Optional[str] = None
    timestamp: float = Field(default_factory=lambda: datetime.now().timestamp())

def format_agent_response_as_patches(agent_response: str, request_id: str) -> AgentResponse:
    """
    Convert agent response to UI patches format.
    
    This is a simplified version - in practice, you'd want to:
    1. Parse the agent's SQL results
    2. Determine the best visualization (Table/Chart/Map)
    3. Format the data according to the frontend schemas
    """
    try:
        # For now, we'll create a simple table with the agent's text response
        # In practice, you'd extract structured data from the SQL agent
        
        # Check if response contains structured data patterns
        if "SELECT" in agent_response.upper() or "table" in agent_response.lower():
            # Create a table component
            table_component = {
                "id": f"table-{request_id}",
                "type": "Table",
                "data": {
                    "columns": [
                        {"key": "response", "title": "Agent Response", "dataType": "string"}
                    ],
                    "rows": [
                        {"response": agent_response}
                    ]
                },
                "config": {
                    "title": "SQL Agent Response",
                    "sortable": False,
                    "filterable": False,
                    "pagination": False
                }
            }
        else:
            # Create a simple text display as a table
            table_component = {
                "id": f"response-{request_id}",
                "type": "Table", 
                "data": {
                    "columns": [
                        {"key": "message", "title": "Response", "dataType": "string"}
                    ],
                    "rows": [
                        {"message": agent_response[:500] + "..." if len(agent_response) > 500 else agent_response}
                    ]
                },
                "config": {
                    "title": "Agent Response",
                    "sortable": False,
                    "filterable": False,
                    "pagination": False
                }
            }

        return AgentResponse(
            patches=[{
                "op": "append",
                "path": "/children",
                "value": table_component
            }],
            requestId=request_id,
            message="Response from SQL agent"
        )
        
    except Exception as e:
        logger.error(f"Error formatting agent response: {e}")
        # Fallback error response
        error_component = {
            "id": f"error-{request_id}",
            "type": "Table",
            "data": {
                "columns": [
                    {"key": "error", "title": "Error", "dataType": "string"}
                ],
                "rows": [
                    {"error": f"Error processing response: {str(e)}"}
                ]
            },
            "config": {
                "title": "Error",
                "sortable": False,
                "filterable": False,
                "pagination": False
            }
        }
        
        return AgentResponse(
            patches=[{
                "op": "append", 
                "path": "/children",
                "value": error_component
            }],
            requestId=request_id,
            message="Error occurred"
        )

async def broadcast_to_clients(response: AgentResponse):
    """Broadcast response to all connected SSE clients."""
    if not clients:
        return
    
    message_data = response.model_dump()
    message = f"data: {json.dumps(message_data)}\n\n"
    
    disconnected_clients = []
    
    for client_id, client in clients.items():
        try:
            if client.connected:
                await client.queue.put(message)
            else:
                disconnected_clients.append(client_id)
        except Exception as e:
            logger.error(f"Error sending to client {client_id}: {e}")
            disconnected_clients.append(client_id)
    
    # Clean up disconnected clients
    for client_id in disconnected_clients:
        clients.pop(client_id, None)
        logger.info(f"Removed disconnected client: {client_id}")

@app.on_event("startup")
async def startup_event():
    """Initialize the agent on startup."""
    global agent_builder, sql_agent
    
    try:
        logger.info("Initializing SQL Agent...")
        agent_builder = AgentBuilder()
        agent_builder.print_database_info()  # This will print to console
        sql_agent = agent_builder.setup_llm().create_sql_agent()
        logger.info("SQL Agent initialized successfully!")
    except Exception as e:
        logger.error(f"Failed to initialize agent: {e}")
        # Continue startup even if agent fails - we can try to reinitialize later

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "agent_ready": sql_agent is not None,
        "connected_clients": len(clients)
    }

@app.get("/api/agent/stream")
async def agent_stream(request: Request):
    """SSE endpoint for streaming agent responses."""
    client_id = str(uuid.uuid4())
    client = SSEClient(client_id)
    clients[client_id] = client
    
    logger.info(f"SSE client connected: {client_id}")
    
    async def event_generator():
        try:
            # Send initial connection message
            initial_message = {
                "message": "Connected to SQL Agent",
                "clientId": client_id,
                "timestamp": datetime.now().timestamp()
            }
            yield f"data: {json.dumps(initial_message)}\n\n"
            
            # Send heartbeat every 30 seconds and listen for messages
            while client.connected and not await request.is_disconnected():
                try:
                    # Wait for message with timeout for heartbeat
                    message = await asyncio.wait_for(client.queue.get(), timeout=30.0)
                    yield message
                except asyncio.TimeoutError:
                    # Send heartbeat
                    heartbeat = {
                        "heartbeat": True,
                        "timestamp": datetime.now().timestamp()
                    }
                    yield f"data: {json.dumps(heartbeat)}\n\n"
                
        except asyncio.CancelledError:
            logger.info(f"SSE stream cancelled for client {client_id}")
        except Exception as e:
            logger.error(f"Error in SSE stream for client {client_id}: {e}")
        finally:
            # Clean up
            client.connected = False
            clients.pop(client_id, None)
            logger.info(f"SSE client disconnected: {client_id}")
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",  # Will be handled by CORS middleware
            "Access-Control-Allow-Credentials": "true",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )

@app.post("/api/agent/query")
async def process_query(query_request: QueryRequest):
    """Process user query and stream response via SSE."""
    if not sql_agent:
        raise HTTPException(status_code=503, detail="SQL Agent not initialized")
    
    request_id = query_request.requestId or str(uuid.uuid4())
    
    logger.info(f"Processing query: {query_request.message} (Request ID: {request_id})")
    
    try:
        # Process query with the agent in a background task
        asyncio.create_task(process_query_async(query_request.message, request_id))
        
        return {
            "status": "processing",
            "requestId": request_id,
            "message": "Query submitted for processing"
        }
        
    except Exception as e:
        logger.error(f"Error processing query: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

async def process_query_async(message: str, request_id: str):
    """Process the query asynchronously and broadcast results."""
    try:
        # Execute the agent query
        # Note: This runs in an executor since the agent might be blocking
        loop = asyncio.get_event_loop()
        
        def run_agent():
            responses = []
            for step in sql_agent.stream(
                {"messages": [{"role": "user", "content": message}]},
                stream_mode="values",
            ):
                # Collect the agent's response
                if step and "messages" in step and step["messages"]:
                    last_message = step["messages"][-1]
                    if hasattr(last_message, 'content'):
                        responses.append(last_message.content)
            return "\n".join(responses) if responses else "No response from agent"
        
        # Run the agent in a thread pool to avoid blocking
        agent_response = await loop.run_in_executor(None, run_agent)
        
        # Format response as UI patches
        formatted_response = format_agent_response_as_patches(agent_response, request_id)
        
        # Broadcast to all connected clients
        await broadcast_to_clients(formatted_response)
        
        logger.info(f"Query processed successfully: {request_id}")
        
    except Exception as e:
        logger.error(f"Error in async query processing: {e}")
        
        # Send error response
        error_response = AgentResponse(
            patches=[{
                "op": "append",
                "path": "/children", 
                "value": {
                    "id": f"error-{request_id}",
                    "type": "Table",
                    "data": {
                        "columns": [{"key": "error", "title": "Error", "dataType": "string"}],
                        "rows": [{"error": f"Processing error: {str(e)}"}]
                    },
                    "config": {"title": "Error", "sortable": False}
                }
            }],
            requestId=request_id,
            message="Error occurred during processing"
        )
        
        await broadcast_to_clients(error_response)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=9000,
        reload=True,
        log_level="info"
    )
