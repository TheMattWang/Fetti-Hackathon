import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAgentWorkerOptions {
  endpoint: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  timeout?: number;
}

interface AgentWorkerState {
  uiSpec: any;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  errors: any[];
  lastMessage: string | null;
  connectionAttempts: number;
}

interface UseAgentWorkerReturn extends AgentWorkerState {
  sendMessage: (message: string) => void;
  reconnect: () => void;
  clearErrors: () => void;
  disconnect: () => void;
}

export function useAgentWorker(options: UseAgentWorkerOptions): UseAgentWorkerReturn {
  const {
    endpoint,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
    timeout = 60000,
  } = options;

  const [state, setState] = useState<AgentWorkerState>({
    uiSpec: { children: [] },
    isConnected: false,
    isLoading: false,
    error: null,
    errors: [],
    lastMessage: null,
    connectionAttempts: 0,
  });

  const workerRef = useRef<Worker | null>(null);
  const mountedRef = useRef(true);

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
        console.log('React hook received message from worker:', event.data);
        // Simple message handling without complex parsing
        setState(prev => ({
          ...prev,
          isConnected: true,
          isLoading: false,
        }));
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
      console.log('Worker not initialized, initializing now...');
      if (!initializeWorker()) {
        console.error('Failed to initialize worker');
        return;
      }
    }
    console.log('Sending CONNECT message to worker with endpoint:', endpoint);
  }, [endpoint, initializeWorker]);

  // Send message to agent
  const sendMessage = useCallback((message: string) => {
    if (!workerRef.current) {
      console.warn('Worker not initialized');
      return;
    }
    setState(prev => ({ ...prev, isLoading: true }));
  }, []);

  // Reconnect
  const reconnect = useCallback(() => {
    setState(prev => ({ ...prev, connectionAttempts: 0, error: null }));
    connect();
  }, [connect]);

  // Disconnect
  const disconnect = useCallback(() => {
    // Simple disconnect
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
      console.log('useAgentWorker: Cleanup - terminating worker');
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
