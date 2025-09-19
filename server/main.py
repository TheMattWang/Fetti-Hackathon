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

# Configure logging with detailed format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Set specific loggers to INFO level for detailed agent tracking
logging.getLogger("agent").setLevel(logging.INFO)
logging.getLogger("langchain").setLevel(logging.INFO)
logging.getLogger("langgraph").setLevel(logging.INFO)

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

# SSE client management with conversation state
class SSEClient:
    def __init__(self, client_id: str):
        self.client_id = client_id
        self.queue: asyncio.Queue = asyncio.Queue()
        self.connected = True
        self.conversation_history: List[Dict] = []  # Store conversation messages
        self.last_activity = datetime.now()

clients: Dict[str, SSEClient] = {}

# Conversation state management
conversation_sessions: Dict[str, List[Dict]] = {}  # session_id -> message_history

class QueryRequest(BaseModel):
    message: str = Field(..., description="User query for the SQL agent")
    requestId: Optional[str] = Field(None, description="Optional request ID")
    sessionId: Optional[str] = Field(None, description="Optional session ID for conversation continuity")

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
    logger.info(f"[{request_id}] Formatting response of length {len(agent_response)}...")
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
    logger.info(f"[{response.requestId}] Broadcasting to {len(clients)} clients...")
    if not clients:
        logger.info(f"[{response.requestId}] No clients connected, skipping broadcast")
        return
    
    logger.info(f"[{response.requestId}] Serializing response data...")
    message_data = response.model_dump()
    message = f"data: {json.dumps(message_data)}\n\n"
    logger.info(f"[{response.requestId}] Message serialized, length: {len(message)}")
    
    disconnected_clients = []
    
    for client_id, client in clients.items():
        logger.info(f"[{response.requestId}] Sending to client {client_id}...")
        try:
            if client.connected:
                logger.info(f"[{response.requestId}] Putting message in queue for client {client_id}, queue size: {client.queue.qsize()}")
                await client.queue.put(message)
                logger.info(f"[{response.requestId}] Successfully put message in queue for client {client_id}, new queue size: {client.queue.qsize()}")
            else:
                logger.info(f"[{response.requestId}] Client {client_id} is disconnected")
                disconnected_clients.append(client_id)
        except Exception as e:
            logger.error(f"[{response.requestId}] Error sending to client {client_id}: {e}")
            disconnected_clients.append(client_id)
    
    # Clean up disconnected clients
    for client_id in disconnected_clients:
        clients.pop(client_id, None)
        logger.info(f"[{response.requestId}] Removed disconnected client: {client_id}")
    
    logger.info(f"[{response.requestId}] Broadcast completed to {len(clients) - len(disconnected_clients)} clients")

@app.on_event("startup")
async def startup_event():
    """Initialize the agent on startup."""
    global agent_builder, sql_agent
    
    try:
        logger.info("Initializing SQL Agent...")
        agent_builder = AgentBuilder()
        agent_builder.print_database_info()  # This will print to console
        
        # Create agent with retry limits and enhanced logging
        logger.info("Creating SQL agent with max_iterations=3...")
        sql_agent = agent_builder.setup_llm().create_sql_agent(max_iterations=3)
        
        logger.info("SQL Agent initialized successfully!")
        logger.info(f"Agent configuration: max_iterations=3, temperature=0")
        
    except Exception as e:
        logger.error(f"Failed to initialize agent: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
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
            logger.info(f"[{client_id}] SSE event generator started")
            
            # Send initial connection message
            initial_message = {
                "message": "Connected to SQL Agent",
                "clientId": client_id,
                "timestamp": datetime.now().timestamp()
            }
            logger.info(f"[{client_id}] Sending initial connection message")
            yield f"data: {json.dumps(initial_message)}\n\n"
            logger.info(f"[{client_id}] Initial message sent successfully")
            
            # Send heartbeat every 30 seconds and listen for messages
            while client.connected and not await request.is_disconnected():
                try:
                    logger.info(f"[{client_id}] Waiting for queue message...")
                    # Wait for message with timeout for heartbeat
                    message = await asyncio.wait_for(client.queue.get(), timeout=30.0)
                    logger.info(f"[{client_id}] Received message from queue, yielding...")
                    yield message
                    logger.info(f"[{client_id}] Message yielded successfully")
                except asyncio.TimeoutError:
                    logger.info(f"[{client_id}] Queue timeout, sending heartbeat")
                    # Send heartbeat
                    heartbeat = {
                        "heartbeat": True,
                        "timestamp": datetime.now().timestamp()
                    }
                    yield f"data: {json.dumps(heartbeat)}\n\n"
                    logger.info(f"[{client_id}] Heartbeat sent")
                
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
    session_id = query_request.sessionId or str(uuid.uuid4())
    
    logger.info(f"Processing query: {query_request.message} (Request ID: {request_id}, Session ID: {session_id})")
    
    try:
        # Process query with the agent in a background task
        asyncio.create_task(process_query_async(query_request.message, request_id, session_id))
        
        return {
            "status": "processing",
            "requestId": request_id,
            "sessionId": session_id,
            "message": "Query submitted for processing"
        }
        
    except Exception as e:
        logger.error(f"Error processing query: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

async def process_query_async(message: str, request_id: str, session_id: str):
    """Process the query asynchronously and broadcast results."""
    try:
        # Execute the agent query
        # Note: This runs in an executor since the agent might be blocking
        loop = asyncio.get_event_loop()
        
        def run_agent():
            import time
            logger.info(f"[{request_id}] Starting agent execution for query: {message[:100]}...")
            responses = []
            step_count = 0
            start_time = time.time()
            
            try:
                # Apply retry limits by setting a recursion limit
                max_iterations = getattr(sql_agent, '_max_iterations', 3)
                logger.info(f"[{request_id}] Starting agent with max_iterations={max_iterations}")
                
                # Get conversation history for this session
                if session_id not in conversation_sessions:
                    conversation_sessions[session_id] = []
                
                # Add current user message to history
                conversation_sessions[session_id].append({"role": "user", "content": message})
                
                # Use conversation history for context (keep last 10 messages to avoid token limits)
                messages_for_agent = conversation_sessions[session_id][-10:]
                logger.info(f"[{request_id}] Using {len(messages_for_agent)} messages from conversation history")
                
                for step in sql_agent.stream(
                    {"messages": messages_for_agent},
                    stream_mode="values",
                    config={"recursion_limit": max_iterations + 2}  # Tighter limit
                ):
                    step_count += 1
                    current_time = time.time()
                    elapsed_time = current_time - start_time
                    
                    logger.info(f"[{request_id}] Processing step {step_count} (elapsed: {elapsed_time:.2f}s)")
                    
                    # Circuit breaker: Stop if taking too long
                    if elapsed_time > 15.0:  # Internal 15-second limit
                        logger.warning(f"[{request_id}] Agent execution taking too long ({elapsed_time:.2f}s), terminating")
                        responses.append("Query processing was terminated due to timeout. Please try a simpler query.")
                        break
                    
                    # Check if we've exceeded our intended iteration limit
                    if step_count > max_iterations * 2:  # Conservative limit
                        logger.warning(f"[{request_id}] Agent exceeded expected iteration limit ({step_count} steps), terminating")
                        responses.append("Query processing exceeded maximum steps. Please try a simpler query.")
                        break
                    
                    # Log the step content for debugging
                    if step:
                        logger.debug(f"[{request_id}] Step content: {str(step)[:200]}...")
                    
                    # Collect the agent's response
                    if step and "messages" in step and step["messages"]:
                        last_message = step["messages"][-1]
                        if hasattr(last_message, 'content'):
                            logger.info(f"[{request_id}] Message content from step {step_count}: {last_message.content[:100]}...")
                            responses.append(last_message.content)
                        
                        # Check for tool calls or other message types
                        if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
                            logger.info(f"[{request_id}] Tool calls in step {step_count}: {len(last_message.tool_calls)} tools")
                            
                            # Log individual tool calls for debugging
                            for i, tool_call in enumerate(last_message.tool_calls):
                                tool_name = getattr(tool_call, 'name', 'unknown')
                                logger.info(f"[{request_id}] Tool {i+1}: {tool_name}")
                
                logger.info(f"[{request_id}] Agent execution completed after {step_count} steps")
                final_response = "\n".join(responses) if responses else "No response from agent"
                logger.info(f"[{request_id}] Final response length: {len(final_response)} characters")
                
                return final_response
                
            except Exception as e:
                logger.error(f"[{request_id}] Error in agent execution: {str(e)}")
                raise
        
        # Run the agent in a thread pool to avoid blocking with timeout
        logger.info(f"[{request_id}] Executing agent with timeout protection...")
        start_time = asyncio.get_event_loop().time()
        try:
            agent_response = await asyncio.wait_for(
                loop.run_in_executor(None, run_agent),
                timeout=20.0  # Reduced to 20 second timeout
            )
            execution_time = asyncio.get_event_loop().time() - start_time
            logger.info(f"[{request_id}] Agent execution completed successfully in {execution_time:.2f}s")
        except asyncio.TimeoutError:
            execution_time = asyncio.get_event_loop().time() - start_time
            logger.error(f"[{request_id}] Agent execution timed out after {execution_time:.2f} seconds")
            agent_response = "Sorry, the query took too long to process (>20s). Please try a simpler query."
        except Exception as e:
            execution_time = asyncio.get_event_loop().time() - start_time
            logger.error(f"[{request_id}] Agent execution failed after {execution_time:.2f}s: {str(e)}")
            agent_response = f"Error processing query: {str(e)}"
        
        # Add assistant response to conversation history
        if session_id in conversation_sessions and isinstance(agent_response, str):
            conversation_sessions[session_id].append({"role": "assistant", "content": agent_response})
            # Keep conversation history manageable (last 20 messages)
            conversation_sessions[session_id] = conversation_sessions[session_id][-20:]
            logger.info(f"[{request_id}] Added assistant response to conversation history (session: {session_id})")
        
        # Format response as UI patches
        logger.info(f"[{request_id}] Starting response formatting...")
        formatted_response = format_agent_response_as_patches(agent_response, request_id)
        logger.info(f"[{request_id}] Response formatted successfully")
        
        # Broadcast to all connected clients
        logger.info(f"[{request_id}] Starting broadcast to {len(clients)} clients...")
        await broadcast_to_clients(formatted_response)
        logger.info(f"[{request_id}] Broadcast completed")
        
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
