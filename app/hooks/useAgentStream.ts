import { useState, useEffect, useCallback, useRef } from 'react';
import { UISpec, PatchError, PatchRequest } from '../lib/schemas';
import { initialUISpec, validateAndApplyPatches, generateRequestId } from '../lib/patch';

interface UseAgentStreamOptions {
  endpoint: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  timeout?: number;
}

interface AgentStreamState {
  uiSpec: UISpec;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  errors: PatchError[];
  lastMessage: string | null;
  connectionAttempts: number;
}

interface UseAgentStreamReturn extends AgentStreamState {
  sendMessage: (message: string) => void;
  reconnect: () => void;
  clearErrors: () => void;
  disconnect: () => void;
}

export function useAgentStream(options: UseAgentStreamOptions): UseAgentStreamReturn {
  const {
    endpoint,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
    timeout = 60000,
  } = options;

  const [state, setState] = useState<AgentStreamState>({
    uiSpec: initialUISpec,
    isConnected: false,
    isLoading: false,
    error: null,
    errors: [],
    lastMessage: null,
    connectionAttempts: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimeouts = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    clearTimeouts();
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      isLoading: false,
    }));
  }, [clearTimeouts]);

  const startHeartbeat = useCallback(() => {
    // SSE/WebSocket must heartbeat; disconnect idle clients
    heartbeatRef.current = setInterval(() => {
      if (eventSourceRef.current?.readyState !== EventSource.OPEN) {
        console.warn('EventSource not open during heartbeat check');
        disconnect();
      }
    }, heartbeatInterval);
  }, [heartbeatInterval, disconnect]);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      disconnect();
    }

    console.log(`Connecting to agent stream: ${endpoint}`);
    
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      connectionAttempts: prev.connectionAttempts + 1,
    }));

    try {
      const eventSource = new EventSource(endpoint, {
        withCredentials: true
      });
      eventSourceRef.current = eventSource;

      // Connection opened
      eventSource.onopen = () => {
        console.log('Agent stream connected');
        setState(prev => ({
          ...prev,
          isConnected: true,
          isLoading: false,
          error: null,
          connectionAttempts: 0,
        }));
        
        startHeartbeat();
      };

      // Handle incoming patches
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received agent data:', data);

          // Reset timeout on message
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          // Apply timeout for next message
          timeoutRef.current = setTimeout(() => {
            console.warn('Agent stream timeout - no messages received');
            setState(prev => ({ ...prev, error: 'Connection timeout' }));
          }, timeout);

          // Process patches if present
          if (data.patches) {
            const requestId = data.requestId || generateRequestId();
            
            setState(prev => {
              const result = validateAndApplyPatches(prev.uiSpec, data, requestId);
              
              if (result.errors.length > 0) {
                console.warn(`Patch validation errors: ${result.errors.length}`);
              }

              return {
                ...prev,
                uiSpec: result.uiSpec,
                errors: result.errors,
                lastMessage: event.data,
              };
            });
          } else if (data.message) {
            // Handle text messages
            setState(prev => ({
              ...prev,
              lastMessage: data.message,
            }));
          }

        } catch (error) {
          console.error('Error processing agent message:', error);
          setState(prev => ({
            ...prev,
            error: `Failed to process message: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }));
        }
      };

      // Handle errors
      eventSource.onerror = (error) => {
        console.error('Agent stream error:', error);
        
        setState(prev => {
          const shouldReconnect = prev.connectionAttempts < maxReconnectAttempts;
          
          return {
            ...prev,
            isConnected: false,
            isLoading: false,
            error: shouldReconnect 
              ? `Connection error (attempt ${prev.connectionAttempts}/${maxReconnectAttempts})`
              : 'Connection failed after maximum attempts',
          };
        });

        // Attempt reconnection if under limit  
        setState(prev => {
          if (prev.connectionAttempts < maxReconnectAttempts) {
            const delay = Math.min(reconnectInterval * Math.pow(2, prev.connectionAttempts), 30000); // Exponential backoff, max 30s
            console.log(`Scheduling reconnection in ${delay}ms (attempt ${prev.connectionAttempts + 1}/${maxReconnectAttempts})`);
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          }
          return prev;
        });
      };

    } catch (error) {
      console.error('Failed to create EventSource:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }));
    }
  }, [endpoint, maxReconnectAttempts, reconnectInterval, startHeartbeat, timeout, disconnect]);

  const sendMessage = useCallback((message: string) => {
    if (!state.isConnected) {
      console.warn('Cannot send message: not connected to agent stream');
      return;
    }

    // For EventSource, we need to use a separate POST request to send messages
    const requestId = generateRequestId();
    
    setState(prev => ({ ...prev, isLoading: true }));

    fetch(endpoint.replace('/api/agent/stream', '/api/agent/query'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        requestId,
      }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Message sent successfully:', data);
      setState(prev => ({ ...prev, isLoading: false }));
    })
    .catch(error => {
      console.error('Error sending message:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: `Failed to send message: ${error.message}`,
      }));
    });
  }, [endpoint, state.isConnected]);

  const reconnect = useCallback(() => {
    setState(prev => ({ ...prev, connectionAttempts: 0 }));
    connect();
  }, [connect]);

  const clearErrors = useCallback(() => {
    setState(prev => ({ ...prev, error: null, errors: [] }));
  }, []);

  // Connect on mount and cleanup on unmount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, []); // Empty dependency array - only run on mount/unmount

  // Handle endpoint changes
  useEffect(() => {
    // Reconnect when endpoint changes (but not on initial mount)
    const isInitialMount = !eventSourceRef.current;
    if (!isInitialMount) {
      disconnect();
      connect();
    }
  }, [endpoint]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  return {
    ...state,
    sendMessage,
    reconnect,
    clearErrors,
    disconnect,
  };
}

// Hook for WebSocket alternative (if EventSource isn't suitable)
export function useAgentWebSocket(options: UseAgentStreamOptions): UseAgentStreamReturn {
  // Similar implementation but using WebSocket instead of EventSource
  // This would be used if bidirectional communication is needed
  // Implementation would follow similar patterns but with WebSocket API
  
  // For now, we'll use the EventSource implementation
  return useAgentStream(options);
}
