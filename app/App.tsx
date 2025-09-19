import React, { useState, useCallback } from 'react';
import { RenderSpec, LoadingState, ErrorState } from './components/RenderSpec';
import { useAgentWorker } from './hooks/useAgentWorker';
import './App.css';

interface AppProps {
  agentEndpoint?: string;
}

export const App: React.FC<AppProps> = ({ 
  agentEndpoint = 'http://localhost:9000/api/agent/stream' 
}) => {
  const [query, setQuery] = useState('');
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [debugMode, setDebugMode] = useState(false);

  // Use Web Worker for safe agent communication (prevents UI crashes)
  const agentStream = useAgentWorker({
    endpoint: agentEndpoint,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000,
    timeout: 60000,
  });

  // Separate UI state from connection state to minimize re-renders
  const {
    uiSpec,
    isConnected,
    isLoading,
    error,
    errors,
    lastMessage,
    connectionAttempts,
    sendMessage,
    reconnect,
    clearErrors,
    disconnect,
  } = agentStream;

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      return;
    }

    if (!isConnected) {
      alert('Not connected to agent. Please wait for connection or try reconnecting.');
      return;
    }

    // Add to history
    setQueryHistory(prev => [query, ...prev.slice(0, 9)]); // Keep last 10 queries
    
    // Send message
    sendMessage(query);
    
    // Clear input
    setQuery('');
  }, [query, isConnected, sendMessage]);

  const handleQuickQuery = useCallback((quickQuery: string) => {
    setQuery(quickQuery);
  }, []);

  const handleComponentError = useCallback((error: Error, componentId: string) => {
    console.error(`Component ${componentId} error:`, error);
  }, []);

  // Removed quick queries to save LLM calls
  const quickQueries: string[] = [];

  return (
    <div className="app">
      <header className="app-header">
        <h1>SQL Agent Interface</h1>
        <div className="connection-status">
          <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
          <span className="status-text">
            {isConnected ? 'Connected (Web Worker)' : `Disconnected${connectionAttempts > 0 ? ` (${connectionAttempts} attempts)` : ''}`}
          </span>
          {!isConnected && (
            <button onClick={reconnect} className="reconnect-button">
              Reconnect
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {/* Query Interface */}
        <section className="query-section">
          <form onSubmit={handleSubmit} className="query-form">
            <div className="query-input-container">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question about your data..."
                className="query-input"
                rows={3}
                disabled={!isConnected || isLoading}
              />
              <button
                type="submit"
                disabled={!query.trim() || !isConnected || isLoading}
                className="submit-button"
              >
                {isLoading ? 'Processing...' : 'Ask Agent'}
              </button>
            </div>
          </form>

          {/* Quick Queries */}
          {React.useMemo(() => (
            <div className="quick-queries">
              <h3>Quick Queries:</h3>
              <div className="quick-query-buttons">
                {quickQueries.map((quickQuery, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickQuery(quickQuery)}
                    className="quick-query-button"
                    disabled={!isConnected || isLoading}
                  >
                    {quickQuery}
                  </button>
                ))}
              </div>
            </div>
          ), [handleQuickQuery, isConnected, isLoading])}
        

          {/* Query History */}
          {queryHistory.length > 0 && (
            <div className="query-history">
              <h3>Recent Queries:</h3>
              <div className="history-list">
                {queryHistory.map((historyQuery, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickQuery(historyQuery)}
                    className="history-item"
                    disabled={!isConnected || isLoading}
                  >
                    {historyQuery}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Error Display */}
        {error && (
          <section className="error-section">
            <ErrorState error={error} onRetry={clearErrors} />
          </section>
        )}

        {/* Patch Errors */}
        {errors.length > 0 && (
          <section className="patch-errors">
            <div className="patch-error-container">
              <h3>Validation Errors ({errors.length}):</h3>
              {errors.map((error, index) => (
                <div key={index} className="patch-error">
                  <strong>Patch {error.patchIndex}:</strong> {error.error.message}
                </div>
              ))}
              <button onClick={clearErrors} className="clear-errors-button">
                Clear Errors
              </button>
            </div>
          </section>
        )}

        {/* Loading State */}
        {isLoading && <LoadingState />}

        {/* Results Display */}
        <section className="results-section">
          {React.useMemo(() => (
            <RenderSpec 
              uiSpec={uiSpec} 
              onError={handleComponentError}
            />
          ), [uiSpec, handleComponentError])}
        </section>

        {/* Debug Info */}
        {debugMode && React.useMemo(() => (
          <section className="debug-section">
            <details>
              <summary>Debug Information</summary>
              <div className="debug-content">
                <div className="debug-item">
                  <strong>Connection Status:</strong> {isConnected ? 'Connected' : 'Disconnected'}
                </div>
                <div className="debug-item">
                  <strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}
                </div>
                <div className="debug-item">
                  <strong>Components:</strong> {uiSpec.children.length}
                </div>
                <div className="debug-item">
                  <strong>Last Message:</strong> 
                  <pre>{lastMessage ? JSON.stringify(JSON.parse(lastMessage), null, 2) : 'None'}</pre>
                </div>
                <div className="debug-item">
                  <strong>UI Spec:</strong>
                  <pre>{JSON.stringify(uiSpec, null, 2)}</pre>
                </div>
              </div>
            </details>
          </section>
        ), [isConnected, isLoading, uiSpec, lastMessage])}
      </main>

      <footer className="app-footer">
        <p>
          Connected to: <code>{agentEndpoint}</code> (via Web Worker)
        </p>
        <button onClick={disconnect} className="disconnect-button">
          Disconnect
        </button>
        <button onClick={() => setDebugMode(!debugMode)} className="debug-toggle-button">
          {debugMode ? 'Hide Debug' : 'Show Debug'}
        </button>
      </footer>
    </div>
  );
};

export default App;