// Web Worker for SQL Agent SSE Communication
// This runs in a separate thread to prevent UI crashes

let eventSource = null;
let heartbeatTimer = null;
let reconnectTimer = null;
let connectionAttempts = 0;
let isConnected = false;
let endpoint = '';
let config = {};

// Worker message types
const MessageTypes = {
  CONNECT: 'CONNECT',
  DISCONNECT: 'DISCONNECT', 
  SEND_QUERY: 'SEND_QUERY',
  CONNECTION_STATUS: 'CONNECTION_STATUS',
  AGENT_RESPONSE: 'AGENT_RESPONSE',
  ERROR: 'ERROR',
  LOG: 'LOG'
};

// Send message to main thread
function sendToMain(type, data = {}) {
  self.postMessage({
    type,
    data,
    timestamp: Date.now()
  });
}

// Logging function
function log(message, level = 'info') {
  console.log(`[AgentWorker] ${message}`);
  sendToMain(MessageTypes.LOG, { message, level });
}

// Cleanup function
function cleanup() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  
  isConnected = false;
}

// Start heartbeat
function startHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  
  heartbeatTimer = setInterval(() => {
    if (eventSource && eventSource.readyState !== EventSource.OPEN) {
      log('Heartbeat failed - connection lost', 'warn');
      handleConnectionError();
    }
  }, config.heartbeatInterval || 30000);
}

// Handle connection errors
function handleConnectionError() {
  isConnected = false;
  sendToMain(MessageTypes.CONNECTION_STATUS, { 
    isConnected: false, 
    connectionAttempts,
    error: 'Connection lost'
  });
  
  // Attempt reconnection
  if (connectionAttempts < (config.maxReconnectAttempts || 5)) {
    const delay = Math.min(
      (config.reconnectInterval || 3000) * Math.pow(2, connectionAttempts), 
      30000
    );
    
    log(`Scheduling reconnection in ${delay}ms (attempt ${connectionAttempts + 1})`);
    
    reconnectTimer = setTimeout(() => {
      connect();
    }, delay);
  } else {
    log('Max reconnection attempts reached', 'error');
    sendToMain(MessageTypes.ERROR, { 
      message: 'Failed to connect after maximum attempts' 
    });
  }
}

// Connect to SSE stream
function connect() {
  if (!endpoint) {
    log('No endpoint configured', 'error');
    return;
  }
  
  // Clean up existing connection
  cleanup();
  
  connectionAttempts++;
  log(`Connecting to ${endpoint} (attempt ${connectionAttempts})`);
  
  sendToMain(MessageTypes.CONNECTION_STATUS, { 
    isConnected: false, 
    isLoading: true,
    connectionAttempts
  });
  
  try {
    eventSource = new EventSource(endpoint, {
      withCredentials: true
    });
    
    eventSource.onopen = () => {
      log('SSE connection opened');
      isConnected = true;
      connectionAttempts = 0;
      
      log('Sending CONNECTION_STATUS: connected');
      sendToMain(MessageTypes.CONNECTION_STATUS, { 
        isConnected: true, 
        isLoading: false,
        connectionAttempts: 0
      });
      
      startHeartbeat();
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        log(`Received message: ${event.data.substring(0, 100)}...`);
        
        // Forward agent response to main thread
        sendToMain(MessageTypes.AGENT_RESPONSE, {
          ...data,
          rawMessage: event.data
        });
        
      } catch (error) {
        log(`Error parsing message: ${error.message}`, 'error');
        sendToMain(MessageTypes.ERROR, { 
          message: `Failed to parse agent message: ${error.message}` 
        });
      }
    };
    
    eventSource.onerror = (error) => {
      log(`SSE error: ${error}`, 'error');
      handleConnectionError();
    };
    
  } catch (error) {
    log(`Failed to create EventSource: ${error.message}`, 'error');
    sendToMain(MessageTypes.ERROR, { 
      message: `Connection failed: ${error.message}` 
    });
    
    sendToMain(MessageTypes.CONNECTION_STATUS, { 
      isConnected: false, 
      isLoading: false,
      connectionAttempts
    });
  }
}

// Send query to agent
async function sendQuery(message, requestId, sessionId) {
  if (!isConnected) {
    log('Cannot send query - not connected', 'warn');
    sendToMain(MessageTypes.ERROR, { 
      message: 'Not connected to agent' 
    });
    return;
  }
  
  const queryEndpoint = endpoint.replace('/api/agent/stream', '/api/agent/query');
  
  try {
    log(`Sending query: ${message} (Session: ${sessionId})`);
    
    const response = await fetch(queryEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        requestId,
        sessionId
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    log(`Query sent successfully: ${JSON.stringify(result)}`);
    
  } catch (error) {
    log(`Error sending query: ${error.message}`, 'error');
    sendToMain(MessageTypes.ERROR, { 
      message: `Failed to send query: ${error.message}` 
    });
  }
}

// Handle messages from main thread
self.onmessage = function(event) {
  const { type, data } = event.data;
  log(`Worker received message: ${type}`);
  
  switch (type) {
    case MessageTypes.CONNECT:
      endpoint = data.endpoint;
      config = data.config || {};
      connectionAttempts = 0;
      log(`Received connect request to ${endpoint}`);
      connect();
      break;
      
    case MessageTypes.DISCONNECT:
      log('Received disconnect request');
      cleanup();
      sendToMain(MessageTypes.CONNECTION_STATUS, { 
        isConnected: false, 
        isLoading: false,
        connectionAttempts: 0
      });
      break;
      
    case MessageTypes.SEND_QUERY:
      sendQuery(data.message, data.requestId, data.sessionId);
      break;
      
    default:
      log(`Unknown message type: ${type}`, 'warn');
  }
};

// Handle worker errors
self.onerror = function(error) {
  log(`Worker error: ${error.message}`, 'error');
  sendToMain(MessageTypes.ERROR, { 
    message: `Worker error: ${error.message}` 
  });
};

log('Agent worker initialized');
