"""
FastAPI server for SQL Agent with Server-Sent Events streaming.

This server bridges the LangGraph agent with the React frontend,
providing SSE streaming for real-time UI updates.
"""

import asyncio
import json
import logging
import re
import uuid
from typing import Dict, List, Optional
from datetime import datetime

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import uvicorn

# Import your organized agent with dynamic loading
import os, sys

# Add the server directory to the Python path to ensure proper imports
server_dir = os.path.dirname(os.path.abspath(__file__))
if server_dir not in sys.path:
    sys.path.insert(0, server_dir)

print("CWD:", os.getcwd())
print("sys.path[:5]:", sys.path[:5])
print("LISTDIR .:", os.listdir("."))
print("Server dir:", server_dir)

# Use lightweight agent wrapper to reduce bundle size
def get_lightweight_agent():
    """Get the lightweight agent that loads dependencies dynamically."""
    from agent.lightweight_agent import get_lightweight_agent
    return get_lightweight_agent()

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

# CORS configuration - allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "https://*.vercel.app",  # Vercel frontend deployments
        "https://fetti-hackathon.vercel.app",  # Your specific Vercel domain
        "https://fetti-hackathon-git-main-mattwang.vercel.app",  # Vercel preview URLs
        # Add your production frontend domain here
        "https://your-frontend-domain.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "HEAD"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Cache-Control",
        "Pragma",
        "Date",
        "X-Api-Version",
        "X-CSRF-Token",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
    ],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight for 1 hour
)

# Global lightweight agent instance
lightweight_agent = None

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

def clean_agent_response(agent_response: str) -> str:
    """
    Clean up agent response to show only the final user-friendly result.
    
    Removes debug information, raw SQL results, and tool outputs.
    """
    # First, try to extract the final answer if it's clearly marked
    final_answer_match = re.search(r'Final Answer:\s*(.+?)(?=\n\n|\nAction:|$)', agent_response, re.DOTALL | re.IGNORECASE)
    if final_answer_match:
        return final_answer_match.group(1).strip()
    
    # Split by lines and process
    lines = agent_response.strip().split('\n')
    cleaned_lines = []
    
    for line in lines:
        line = line.strip()
        
        # Skip empty lines
        if not line:
            continue
            
        # Skip debug patterns
        if any(pattern in line for pattern in [
            'LOCATION:', 'PATTERNS:', 'RELATED:', 'USE:',  # Tool outputs
            '[(', ')]',  # Raw SQL results like [(6,)]
            'SELECT', 'FROM', 'WHERE', 'LIMIT',  # SQL queries
            'Action:', 'Observation:', 'Thought:', 'Action Input:'  # Agent reasoning
        ]):
            continue
            
        # Keep the final human-readable answer
        if re.search(r'\d+\s+(groups?|trips?|users?|records?)', line, re.IGNORECASE):
            cleaned_lines.append(line)
        elif line and not any(skip in line.upper() for skip in ['TOOL', 'SQL', 'QUERY', 'ACTION', 'OBSERVATION']):
            # Keep other descriptive text that doesn't contain technical terms
            cleaned_lines.append(line)
    
    # If we have cleaned lines, join them
    if cleaned_lines:
        result = ' '.join(cleaned_lines)
        # Clean up any remaining artifacts
        result = re.sub(r'\s+', ' ', result)  # Multiple spaces to single
        return result.strip()
    
    # Fallback: try to extract just the final answer
    # Look for patterns like "6 groups went to..."
    match = re.search(r'(\d+\s+(?:groups?|trips?|users?|records?).*?)(?=\n|$)', agent_response, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    
    # Last resort: return original but truncated
    return agent_response[:200].strip()

def format_agent_response_as_patches(agent_response: str, request_id: str) -> AgentResponse:
    """
    Convert agent response to UI patches format with clean formatting.
    
    Extracts clean results from agent responses and formats them nicely.
    """
    logger.info(f"[{request_id}] Formatting response of length {len(agent_response)}...")
    try:
        # Clean up the agent response for better user experience
        cleaned_response = clean_agent_response(agent_response)
        
        # Log both original and cleaned for debugging
        logger.info(f"[{request_id}] Original response: {agent_response[:200]}...")
        logger.info(f"[{request_id}] Cleaned response: {cleaned_response}")
        logger.info(f"[{request_id}] Full original response: {agent_response}")
        logger.info(f"[{request_id}] Full cleaned response: {cleaned_response}")
        
        # Check if response contains structured data patterns
        if "SELECT" in agent_response.upper() or "table" in agent_response.lower():
            # Create a table component
            table_component = {
                "id": f"table-{request_id}",
                "type": "Table",
                "data": {
                    "columns": [
                        {"key": "response", "title": "Query Result", "dataType": "string"}
                    ],
                    "rows": [
                        {"response": cleaned_response}
                    ]
                },
                "config": {
                    "title": "SQL Query Result",
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
                        {"message": cleaned_response[:500] + "..." if len(cleaned_response) > 500 else cleaned_response}
                    ]
                },
                "config": {
                    "title": "Analysis Result",
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
    logger.info(f"[{response.requestId}] Message data structure: {message_data}")
    message = f"data: {json.dumps(message_data)}\n\n"
    logger.info(f"[{response.requestId}] Message serialized, length: {len(message)}")
    logger.info(f"[{response.requestId}] SSE message preview: {message[:200]}...")
    
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
    """Initialize the lightweight agent on startup."""
    global lightweight_agent
    
    try:
        logger.info("Initializing Lightweight SQL Agent...")
        # Get the lightweight agent (dependencies loaded on first use)
        lightweight_agent = get_lightweight_agent()
        
        logger.info("Lightweight SQL Agent initialized successfully!")
        logger.info("Heavy dependencies will be loaded on first query")
        
    except Exception as e:
        logger.error(f"Failed to initialize lightweight agent: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        # Continue startup even if agent fails - we can try to reinitialize later

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "agent_ready": lightweight_agent is not None and lightweight_agent.is_ready(),
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
            "X-Accel-Buffering": "no",  # Disable nginx buffering
            "Access-Control-Allow-Origin": "*",  # Allow all origins for SSE
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Headers": "Cache-Control",
            "Access-Control-Expose-Headers": "*",
        }
    )

@app.post("/api/agent/query")
async def process_query(query_request: QueryRequest):
    """Process user query and stream response via SSE."""
    if not lightweight_agent:
        raise HTTPException(status_code=503, detail="Lightweight Agent not initialized")
    
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
                max_iterations = 3  # Default max iterations
                logger.info(f"[{request_id}] Starting agent with max_iterations={max_iterations}")
                
                # Get conversation history for this session
                if session_id not in conversation_sessions:
                    conversation_sessions[session_id] = []
                
                # Add current user message to history
                conversation_sessions[session_id].append({"role": "user", "content": message})
                
                # Use conversation history for context (keep last 4 messages to avoid token limits)
                messages_for_agent = conversation_sessions[session_id][-4:]
                logger.info(f"[{request_id}] Using {len(messages_for_agent)} messages from conversation history")
                
                # Use invoke with lightweight agent (loads dependencies on first use)
                result = lightweight_agent.invoke(
                    {"messages": messages_for_agent},
                    config={"recursion_limit": 20}  # Increased limit for complex queries
                )
                
                logger.info(f"[{request_id}] Agent execution completed")
                
                # Extract the final response from the result
                if result and "messages" in result and result["messages"]:
                    last_message = result["messages"][-1]
                    if hasattr(last_message, 'content') and last_message.content:
                        final_response = last_message.content
                        logger.info(f"[{request_id}] Final response: {final_response[:100]}...")
                        return final_response
                
                # Fallback if no content found
                logger.warning(f"[{request_id}] No content found in agent response")
                return "I received your query but couldn't generate a proper response. Please try rephrasing your question."
                
            except Exception as e:
                error_msg = str(e)
                logger.error(f"[{request_id}] Error in agent execution: {error_msg}")
                
                # Handle specific error types
                if "recursion limit" in error_msg.lower():
                    return "I'm sorry, but this query is too complex and caused the agent to loop indefinitely. Please try a simpler query or break it into smaller parts."
                elif "timeout" in error_msg.lower():
                    return "The query timed out. Please try a simpler query."
                else:
                    return f"Error processing query: {error_msg}"
        
        # Run the agent in a thread pool to avoid blocking with timeout
        logger.info(f"[{request_id}] Executing agent with timeout protection...")
        start_time = asyncio.get_event_loop().time()
        try:
            agent_response = await asyncio.wait_for(
                loop.run_in_executor(None, run_agent),
                timeout=45.0  # Increased to 45 second timeout to accommodate LLM retries
            )
            execution_time = asyncio.get_event_loop().time() - start_time
            logger.info(f"[{request_id}] Agent execution completed successfully in {execution_time:.2f}s")
        except asyncio.TimeoutError:
            execution_time = asyncio.get_event_loop().time() - start_time
            logger.error(f"[{request_id}] Agent execution timed out after {execution_time:.2f} seconds")
            agent_response = "Sorry, the query took too long to process (>45s). This might be due to LLM service issues. Please try again."
        except Exception as e:
            execution_time = asyncio.get_event_loop().time() - start_time
            logger.error(f"[{request_id}] Agent execution failed after {execution_time:.2f}s: {str(e)}")
            agent_response = f"Error processing query: {str(e)}"
        
        # Add assistant response to conversation history
        if session_id in conversation_sessions and isinstance(agent_response, str):
            conversation_sessions[session_id].append({"role": "assistant", "content": agent_response})
            # Keep conversation history manageable (last 8 messages)
            conversation_sessions[session_id] = conversation_sessions[session_id][-8:]
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
