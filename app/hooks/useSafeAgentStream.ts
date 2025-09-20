import { useState, useEffect, useCallback, useRef } from 'react';
import { UISpec, PatchError } from '../lib/schemas';
import { initialUISpec, validateAndApplyPatches, generateRequestId } from '../lib/patch';

interface UseSafeAgentStreamOptions {
  endpoint: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  timeout?: number;
  enabled?: boolean; // Allow disabling the connection
}

interface SafeAgentStreamState {
  uiSpec: UISpec;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  errors: PatchError[];
  lastMessage: string | null;
  connectionAttempts: number;
}

interface UseSafeAgentStreamReturn extends SafeAgentStreamState {
  sendMessage: (message: string) => void;
  reconnect: () => void;
  clearErrors: () => void;
  disconnect: () => void;
}

export function useSafeAgentStream(options: UseSafeAgentStreamOptions): UseSafeAgentStreamReturn {
  const {
    endpoint,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
    timeout = 60000,
    enabled = true,
  } = options;

  const [state, setState] = useState<SafeAgentStreamState>({
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
  const mountedRef = useRef(true);

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

    if (mountedRef.current) {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isLoading: false,
      }));
    }
  }, [clearTimeouts]);

  const startHeartbeat = useCallback(() => {
    if (!enabled) return;
    
    heartbeatRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      
      if (eventSourceRef.current?.readyState !== EventSource.OPEN) {
        console.warn('EventSource not open during heartbeat check');
        disconnect();
      }
    }, heartbeatInterval);
  }, [heartbeatInterval, disconnect, enabled]);

  const connect = useCallback(() => {
    if (!enabled || !mountedRef.current) {
      console.log('Connection disabled or component unmounted');
      return;
    }

    if (eventSourceRef.current) {
      disconnect();
    }

    console.log(`Connecting to agent stream: ${endpoint}`);
    
    if (mountedRef.current) {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        connectionAttempts: prev.connectionAttempts + 1,
      }));
    }

    try {
      const eventSource = new EventSource(endpoint, {
        withCredentials: true
      });
      eventSourceRef.current = eventSource;

      // Connection opened
      eventSource.onopen = () => {
        console.log('Agent stream connected');
        if (mountedRef.current) {
          setState(prev => ({
            ...prev,
            isConnected: true,
            isLoading: false,
            error: null,
            connectionAttempts: 0,
          }));
        }
        
        startHeartbeat();
      };

      // Handle incoming patches
      eventSource.onmessage = (event) => {
        if (!mountedRef.current) return;
        
        try {
          const rawData = event.data;
          if (!rawData || !rawData.trim()) {
            console.warn('Received empty event data');
            return;
          }
          const data = JSON.parse(rawData);
          console.log('Received agent data:', data);

          // Reset timeout on message
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          // Apply timeout for next message
          timeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              console.warn('Agent stream timeout - no messages received');
              setState(prev => ({ ...prev, error: 'Connection timeout' }));
            }
          }, timeout);

          // Process patches if present
          if (data.patches && mountedRef.current) {
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
          } else if (data.message && mountedRef.current) {
            // Handle text messages
            setState(prev => ({
              ...prev,
              lastMessage: data.message,
            }));
          }

        } catch (error) {
          console.error('Error processing agent message:', error);
          if (mountedRef.current) {
            setState(prev => ({
              ...prev,
              error: `Failed to process message: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }));
          }
        }
      };

      // Handle errors
      eventSource.onerror = (error) => {
        console.error('Agent stream error:', error);
        
        if (!mountedRef.current) return;
        
        setState(prev => {
          const shouldReconnect = prev.connectionAttempts < maxReconnectAttempts && enabled;
          
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
          if (prev.connectionAttempts < maxReconnectAttempts && enabled && mountedRef.current) {
            const delay = Math.min(reconnectInterval * Math.pow(2, prev.connectionAttempts), 30000);
            console.log(`Scheduling reconnection in ${delay}ms (attempt ${prev.connectionAttempts + 1}/${maxReconnectAttempts})`);
            reconnectTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                connect();
              }
            }, delay);
          }
          return prev;
        });
      };

    } catch (error) {
      console.error('Failed to create EventSource:', error);
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }));
      }
    }
  }, [endpoint, maxReconnectAttempts, reconnectInterval, startHeartbeat, timeout, disconnect, enabled]);

  const sendMessage = useCallback((message: string) => {
    if (!state.isConnected || !enabled) {
      console.warn('Cannot send message: not connected to agent stream or disabled');
      return;
    }

    const requestId = generateRequestId();
    
    if (mountedRef.current) {
      setState(prev => ({ ...prev, isLoading: true }));
    }

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
      if (mountedRef.current) {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    })
    .catch(error => {
      console.error('Error sending message:', error);
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: `Failed to send message: ${error.message}`,
        }));
      }
    });
  }, [endpoint, state.isConnected, enabled]);

  const reconnect = useCallback(() => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, connectionAttempts: 0 }));
      connect();
    }
  }, [connect]);

  const clearErrors = useCallback(() => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, error: null, errors: [] }));
    }
  }, []);

  // Connect on mount if enabled
  useEffect(() => {
    if (enabled) {
      connect();
    }
    
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [enabled]); // Only depend on enabled, not connect/disconnect

  // Handle endpoint changes
  useEffect(() => {
    if (enabled && eventSourceRef.current) {
      disconnect();
      connect();
    }
  }, [endpoint, enabled]); // Depend on endpoint and enabled

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
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
