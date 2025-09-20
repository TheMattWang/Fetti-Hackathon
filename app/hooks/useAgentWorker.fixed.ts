import { useState, useEffect, useCallback, useRef } from 'react';
import { UISpec, PatchError } from '../lib/schemas.simple';
import { initialUISpec, validateAndApplyPatches, generateRequestId } from '../lib/patch.simple';

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
  const sessionIdRef = useRef<string>(generateRequestId());

  // Initialize worker
  const initializeWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    try {
      console.log('Initializing Web Worker for agent communication...');
      workerRef.current = new Worker('/agent-worker.js');
      console.log('Web Worker created successfully');
      
      workerRef.current.onmessage = (event) => {
        if (!workerRef.current) {
          return;
        }
        
        const { type, data } = event.data;
        
        switch (type) {
          case MessageTypes.CONNECTION_STATUS:
            setState(prev => ({
              ...prev,
              isConnected: data.isConnected || false,
              isLoading: data.isLoading || false,
              connectionAttempts: data.connectionAttempts || 0,
              error: data.error || null,
            }));
            break;
            
          case MessageTypes.AGENT_RESPONSE:
            if (data.patches) {
              const requestId = data.requestId || generateRequestId();
              
              setState(prev => {
                const result = validateAndApplyPatches(prev.uiSpec, data, requestId);
                
                return {
                  ...prev,
                  uiSpec: result.uiSpec,
                  errors: result.errors,
                  lastMessage: data.rawMessage || null,
                  isLoading: false,
                };
              });
            } else if (data.message) {
              setState(prev => ({
                ...prev,
                lastMessage: data.message,
                isLoading: false,
              }));
            }
            break;
            
          case MessageTypes.ERROR:
            setState(prev => ({
              ...prev,
              error: data.message,
              isLoading: false,
            }));
            break;
            
          case MessageTypes.LOG:
            if (data.level === 'error') {
              console.error('[Worker]', data.message);
            } else if (data.level === 'warn') {
              console.warn('[Worker]', data.message);
            } else {
              console.log('[Worker]', data.message);
            }
            break;
        }
      };
      
      workerRef.current.onerror = (error) => {
        console.error('Worker error:', error);
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
      if (!initializeWorker()) {
        return;
      }
      setTimeout(() => {
        if (workerRef.current && mountedRef.current) {
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
    initializeWorker();
    connect();
    
    return () => {
      mountedRef.current = false;
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  return {
    ...state,
    sendMessage,
    reconnect,
    clearErrors,
    disconnect,
  };
}
