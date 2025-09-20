import { useState, useEffect, useCallback, useRef } from 'react';
import { UISpec, PatchError } from '../lib/schemas.simple';
import { initialUISpec, validateAndApplyPatches, generateRequestId } from '../lib/patch';

interface UseAgentWorkerOptions {
  endpoint: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  timeout?: number;
}

interface AgentWorkerState {
  uiSpec: UISpec;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  errors: PatchError[];
  lastMessage: string | null;
  connectionAttempts: number;
}

interface UseAgentWorkerReturn extends AgentWorkerState {
  sendMessage: (message: string) => void;
  reconnect: () => void;
  clearErrors: () => void;
  disconnect: () => void;
}

// Message types for worker communication
const MessageTypes = {
  CONNECT: 'CONNECT',
  DISCONNECT: 'DISCONNECT', 
  SEND_QUERY: 'SEND_QUERY',
  CONNECTION_STATUS: 'CONNECTION_STATUS',
  AGENT_RESPONSE: 'AGENT_RESPONSE',
  ERROR: 'ERROR',
  LOG: 'LOG'
} as const;

export function useAgentWorker(options: UseAgentWorkerOptions): UseAgentWorkerReturn {
  const {
    endpoint,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
    timeout = 60000,
  } = options;

  const [state, setState] = useState<AgentWorkerState>({
    uiSpec: initialUISpec,
    isConnected: false,
    isLoading: false,
    error: null,
    errors: [],
    lastMessage: null,
    connectionAttempts: 0,
  });

  const workerRef = useRef<Worker | null>(null);
  const mountedRef = useRef(true);
  const sessionIdRef = useRef<string>(generateRequestId()); // Generate persistent session ID

  // Initialize worker
  const initializeWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    try {
      console.log('Initializing Web Worker for agent communication...');
      // Create worker from public directory
      workerRef.current = new Worker('/agent-worker.js');
      console.log('Web Worker created successfully');
      
      // Handle worker messages - set this immediately after worker creation
      workerRef.current.onmessage = (event) => {
        console.log('React hook: onmessage handler called!', {
          mounted: mountedRef.current,
          workerExists: !!workerRef.current,
          message: event.data
        });
        
        // Only check if worker still exists, not if component is mounted
        // (React Strict Mode causes unmounting during development)
        if (!workerRef.current) {
          console.log('React hook: Worker terminated, ignoring message');
          return;
        }
        
        console.log('React hook received message from worker:', event.data);
        const { type, data } = event.data;
        
        switch (type) {
          case MessageTypes.CONNECTION_STATUS:
            console.log('Received CONNECTION_STATUS from worker:', data);
            setState(prev => ({
              ...prev,
              isConnected: data.isConnected || false,
              isLoading: data.isLoading || false,
              connectionAttempts: data.connectionAttempts || 0,
              error: data.error || null,
            }));
            break;
            
          case MessageTypes.AGENT_RESPONSE:
            console.log('Processing AGENT_RESPONSE from worker:', data);
            console.log('Has patches:', !!data.patches, 'Has message:', !!data.message);
            
            // Process agent response and apply patches
            if (data.patches) {
              console.log('Processing patches:', data.patches.length, 'patches');
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
                  lastMessage: data.rawMessage || null,
                  isLoading: false, // Clear loading state when response received
                };
              });
            } else if (data.message) {
              console.log('Processing text message:', data.message);
              setState(prev => ({
                ...prev,
                lastMessage: data.message,
                isLoading: false, // Clear loading state when response received
              }));
            } else {
              console.warn('Received AGENT_RESPONSE but no patches or message field:', data);
            }
            break;
            
          case MessageTypes.ERROR:
            console.error('Worker error:', data.message);
            setState(prev => ({
              ...prev,
              error: data.message,
              isLoading: false, // Ensure loading is cleared on errors
            }));
            break;
            
          case MessageTypes.LOG:
            // Optional: Handle worker logs
            if (data.level === 'error') {
              console.error('[Worker]', data.message);
            } else if (data.level === 'warn') {
              console.warn('[Worker]', data.message);
            } else {
              console.log('[Worker]', data.message);
            }
            break;
            
          default:
            console.warn('Unknown worker message type:', type);
        }
      };
      
      // Handle worker errors
      workerRef.current.onerror = (error) => {
        console.error('Worker error:', error);
        console.error('Worker error details:', {
          message: error.message,
          filename: error.filename,
          lineno: error.lineno,
          colno: error.colno
        });
        if (mountedRef.current) {
          setState(prev => ({
            ...prev,
            error: `Worker error: ${error.message || 'Unknown error'}`,
            isLoading: false,
          }));
        }
      };
      
      return true;
    } catch (error) {
      console.error('Failed to initialize worker:', error);
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          error: `Failed to initialize worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }));
      }
      return false;
    }
  }, []);

  // Connect to agent
  const connect = useCallback(() => {
    if (!workerRef.current) {
      console.log('Worker not initialized, initializing now...');
      if (!initializeWorker()) {
        console.error('Failed to initialize worker');
        return;
      }
      // Wait a bit for worker to initialize before sending connect message
      setTimeout(() => {
        if (workerRef.current && mountedRef.current) {
          console.log('Sending CONNECT message to worker with endpoint:', endpoint);
          workerRef.current.postMessage({
            type: MessageTypes.CONNECT,
            data: {
              endpoint,
              config: {
                reconnectInterval,
                maxReconnectAttempts,
                heartbeatInterval,
                timeout,
              }
            }
          });
        }
      }, 100);
    } else {
      console.log('Sending CONNECT message to worker with endpoint:', endpoint);
      workerRef.current.postMessage({
        type: MessageTypes.CONNECT,
        data: {
          endpoint,
          config: {
            reconnectInterval,
            maxReconnectAttempts,
            heartbeatInterval,
            timeout,
          }
        }
      });
    }
  }, [endpoint, reconnectInterval, maxReconnectAttempts, heartbeatInterval, timeout, initializeWorker]);

  // Send message to agent
  const sendMessage = useCallback((message: string) => {
    if (!workerRef.current) {
      console.warn('Worker not initialized');
      return;
    }

    const requestId = generateRequestId();
    
    setState(prev => ({ ...prev, isLoading: true }));

    workerRef.current.postMessage({
      type: MessageTypes.SEND_QUERY,
      data: {
        message,
        requestId,
        sessionId: sessionIdRef.current,
      }
    });
  }, []);

  // Reconnect
  const reconnect = useCallback(() => {
    setState(prev => ({ ...prev, connectionAttempts: 0, error: null }));
    connect();
  }, [connect]);

  // Disconnect
  const disconnect = useCallback(() => {
    workerRef.current?.postMessage({
      type: MessageTypes.DISCONNECT,
      data: {}
    });
  }, []);

  // Clear errors
  const clearErrors = useCallback(() => {
    setState(prev => ({ ...prev, error: null, errors: [] }));
  }, []);

  // Initialize on mount
  useEffect(() => {
    console.log('useAgentWorker: Initial mount, initializing worker and connecting...');
    initializeWorker();
    connect();
    
    return () => {
      console.log('useAgentWorker: Cleanup - terminating worker', {
        workerExists: !!workerRef.current,
        mounted: mountedRef.current
      });
      mountedRef.current = false;
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run on mount

  // Handle endpoint changes separately from mount
  const previousEndpointRef = useRef(endpoint);
  useEffect(() => {
    // Only reconnect if endpoint actually changed after initial mount
    if (previousEndpointRef.current !== endpoint && workerRef.current && mountedRef.current) {
      console.log('Endpoint changed from', previousEndpointRef.current, 'to', endpoint, '- reconnecting...');
      disconnect();
      setTimeout(() => {
        if (mountedRef.current) {
          connect();
        }
      }, 100);
    }
    previousEndpointRef.current = endpoint;
  }, [endpoint]); // Only depend on endpoint

  return {
    ...state,
    sendMessage,
    reconnect,
    clearErrors,
    disconnect,
  };
}
