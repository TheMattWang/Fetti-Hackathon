'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { VizPayload } from '@/types/viz';
import VizRenderer from '@/components/VizRenderer';
import ReactMarkdown from 'react-markdown';

// Import the agent streaming hook
import { useAgentWorker } from '@/hooks/useAgentWorker';

interface Message {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
  data?: VizPayload;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'agent',
      content: "Hello! I'm your product management assistant. I can help you analyze metrics, generate insights, and visualize data. What would you like to explore today?",
      timestamp: new Date()
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [showConnectionToast, setShowConnectionToast] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const currentQueryRef = useRef<string>('');

  // Use the agent streaming hook
  const agentStream = useAgentWorker({
    endpoint: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/agent/stream`,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000,
    timeout: 60000,
  });

  const {
    uiSpec,
    isConnected,
    isLoading: agentLoading,
    error: agentError,
    sendMessage,
    reconnect,
    clearErrors,
  } = agentStream;

  // Handle agent responses
  useEffect(() => {
    console.log('Processing agent response:', { uiSpec, lastMessage: agentStream.lastMessage });
    
    // Handle text responses from LLM
    if (agentStream.lastMessage && !uiSpec.children?.length) {
      console.log('Processing text message:', agentStream.lastMessage);
      
      // Create a simple text display payload with the message as narrative
      const vizPayload: VizPayload = {
        plan: {
          intent: "describe",
          question: currentQueryRef.current,
          dataset: "text_response",
          sql: "N/A - Text response",
          fields: [],
          chart: {
            type: "text" as const,
            tooltip: []
          },
          narrative: agentStream.lastMessage,
          quality: { rowCount: 0, rowCountCapHit: false, warnings: [] }
        },
        rows: []
      };
      // Add this response as a new message to chat history
      const agentMessage: Message = {
        id: Date.now().toString(),
        type: 'agent',
        content: agentStream.lastMessage,
        timestamp: new Date(),
        data: vizPayload
      };
      setMessages(prev => [...prev, agentMessage]);
      setLoading(false);
      return;
    }

    // Handle text responses that might have uiSpec children but are still text-only
    if (agentStream.lastMessage && uiSpec.children?.length > 0) {
      console.log('Processing text message with uiSpec children:', agentStream.lastMessage);
      
      // Check if this is actually a text response by looking at the content
      const latestComponent = uiSpec.children[uiSpec.children.length - 1];
      if (latestComponent && latestComponent.type === 'Table' && 
          latestComponent.data && latestComponent.data.rows && 
          latestComponent.data.rows.length === 1 && 
          latestComponent.data.columns && latestComponent.data.columns.length === 1 &&
          (latestComponent.data.columns[0].key === 'response' || latestComponent.data.columns[0].key === 'message')) {
        
        console.log('Detected text response in table format, converting to text response');
        
        // Extract the actual message content from the table data
        const messageContent = latestComponent.data.rows[0][latestComponent.data.columns[0].key];
        console.log('Extracted message content:', messageContent);
        
        const vizPayload: VizPayload = {
          plan: {
            intent: "describe",
            question: currentQueryRef.current,
            dataset: "text_response",
            sql: "N/A - Text response",
            fields: [],
            chart: {
              type: "text" as const,
              tooltip: []
            },
            narrative: messageContent,
            quality: { rowCount: 0, rowCountCapHit: false, warnings: [] }
          },
          rows: []
        };
        // Add this response as a new message to chat history
        const agentMessage: Message = {
          id: Date.now().toString(),
          type: 'agent',
          content: messageContent,
          timestamp: new Date(),
          data: vizPayload
        };
        setMessages(prev => [...prev, agentMessage]);
        setLoading(false);
        return;
      }
    }

    // Handle component responses (only if we haven't already processed a text response)
    if (uiSpec.children && uiSpec.children.length > 0 && !agentStream.lastMessage) {
      console.log('Processing components:', uiSpec.children);
      
      // Convert agent response to VizPayload format
      const latestComponent = uiSpec.children[uiSpec.children.length - 1];
      console.log('Latest component:', latestComponent);
      
      if (latestComponent && latestComponent.type === 'Table') {
        const tableData = latestComponent.data;
        console.log('Table data:', tableData);
        
        // The narrative will be displayed within the visualization chat message
        
        if (tableData && tableData.rows && tableData.rows.length > 0) {
          // Determine the best chart type based on data
          const numericColumns = tableData.columns.filter((col: any) => 
            col.dataType === 'number' || 
            tableData.rows.some((row: any) => typeof row[col.key] === 'number')
          );
          
          const categoricalColumns = tableData.columns.filter((col: any) => 
            col.dataType === 'string' || 
            tableData.rows.some((row: any) => typeof row[col.key] === 'string')
          );

          // Choose appropriate chart type
          let chartType: any = "table";
          let xField = tableData.columns[0]?.key;
          let yField = tableData.columns[1]?.key;

          if (numericColumns.length >= 2) {
            chartType = "bar";
            xField = categoricalColumns[0]?.key || tableData.columns[0]?.key;
            yField = numericColumns[0]?.key;
          } else if (numericColumns.length === 1 && categoricalColumns.length >= 1) {
            chartType = "bar";
            xField = categoricalColumns[0]?.key;
            yField = numericColumns[0]?.key;
          }

          const vizPayload: VizPayload = {
            plan: {
              intent: "describe",
              question: currentQueryRef.current,
              dataset: "agent_result",
              sql: "SELECT * FROM agent_result",
              fields: tableData.columns.map((col: any) => {
                // Better field type detection
                const sampleValue = tableData.rows[0]?.[col.key];
                let fieldType: any = 'cat';
                
                if (col.dataType === 'number' || typeof sampleValue === 'number') {
                  fieldType = 'quant';
                } else if (col.dataType === 'date' || (typeof sampleValue === 'string' && 
                  (sampleValue.includes('-') || sampleValue.includes('/')))) {
                  fieldType = 'time';
                } else if (col.key.toLowerCase().includes('lat')) {
                  fieldType = 'lat';
                } else if (col.key.toLowerCase().includes('lon') || col.key.toLowerCase().includes('lng')) {
                  fieldType = 'lon';
                }
                
                return {
                  name: col.key,
                  type: fieldType
                };
              }),
              chart: {
                type: chartType,
                x: xField,
                y: yField,
                tooltip: tableData.columns.map((col: any) => col.key)
              },
              narrative: `Found ${tableData.rows.length} record${tableData.rows.length !== 1 ? 's' : ''}. ${tableData.rows.length > 0 ? 'Data displayed below.' : 'No data to display.'}`,
              quality: { rowCount: tableData.rows.length, rowCountCapHit: false, warnings: [] }
            },
            rows: tableData.rows
          };
          console.log('Created VizPayload:', vizPayload);
          
          // Add this response as a new message to chat history
          const agentMessage: Message = {
            id: Date.now().toString(),
            type: 'agent',
            content: `Found ${tableData.rows.length} record${tableData.rows.length !== 1 ? 's' : ''}. ${tableData.rows.length > 0 ? 'Data displayed below.' : 'No data to display.'}`,
            timestamp: new Date(),
            data: vizPayload
          };
          setMessages(prev => [...prev, agentMessage]);
          setLoading(false);
        } else {
          // Handle empty table case
          const vizPayload: VizPayload = {
            plan: {
              intent: "describe",
              question: currentQueryRef.current,
              dataset: "agent_result",
              sql: "SELECT * FROM agent_result",
              fields: [],
              chart: {
                type: "table",
                tooltip: []
              },
              narrative: "Query executed successfully but returned no results.",
              quality: { rowCount: 0, rowCountCapHit: false, warnings: [] }
            },
            rows: []
          };
          // Add this response as a new message to chat history
          const agentMessage: Message = {
            id: Date.now().toString(),
            type: 'agent',
            content: "Query executed successfully but returned no results.",
            timestamp: new Date(),
            data: vizPayload
          };
          setMessages(prev => [...prev, agentMessage]);
          setLoading(false);
        }
      }
    }
  }, [uiSpec, agentStream.lastMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading || agentLoading) return;

    if (!isConnected) {
      setShowConnectionToast(true);
      setTimeout(() => setShowConnectionToast(false), 3000);
      return;
    }

    const currentQuery = query.trim();
    currentQueryRef.current = currentQuery;
    
    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: currentQuery,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Clear input immediately to prevent double submission
    setQuery('');
    setLoading(true);
    setError(null);

    // Send message to agent
    sendMessage(currentQuery);
  };


  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Fetti PM Assistant</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Product Intelligence Agent</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {isDarkMode ? (
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd"/>
                </svg>
              )}
            </button>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              {!isConnected && (
                <button
                  onClick={reconnect}
                  className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 font-medium"
                >
                  Reconnect
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.type === 'agent' && (
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
              )}
              <div className={`max-w-2xl ${message.type === 'user' ? 'order-first' : ''}`}>
                <div className={`px-4 py-3 rounded-2xl ${
                  message.type === 'user' 
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white ml-auto' 
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white'
                }`}>
                  {message.type === 'agent' && message.data ? (
                    // Render agent message with data
                    <>
                      {message.data.plan.narrative && (
                        <div className="mb-4">
                          {message.data.plan.dataset === "text_response" ? (
                            <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown>{message.data.plan.narrative}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed">{message.data.plan.narrative}</p>
                          )}
                        </div>
                      )}

                      {message.data.rows && message.data.rows.length > 0 && message.data.plan.dataset !== "text_response" && (
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                          <VizRenderer 
                            plan={message.data.plan} 
                            rows={message.data.rows} 
                            showTable={showTable}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    // Render simple text message
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  )}
                </div>
                
                {/* Data controls for agent messages with data */}
                {message.type === 'agent' && message.data && message.data.rows && message.data.rows.length > 0 && message.data.plan.dataset !== "text_response" && (
                  <div className="flex gap-2 mt-2 justify-start">
                    <button
                      onClick={() => setShowTable(!showTable)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        showTable
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Table
                    </button>
                    <button
                      className="px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => {
                        if (message.data) {
                          const csvContent = message.data.rows.map(row => 
                            Object.values(row).join(',')
                          ).join('\n');
                          const blob = new Blob([csvContent], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'insights.csv';
                          a.click();
                          URL.revokeObjectURL(url);
                        }
                      }}
                    >
                      CSV
                    </button>
                    <button
                      onClick={() => setShowPlan(!showPlan)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        showPlan
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Plan
                    </button>
                  </div>
                )}

                {/* Plan drawer for agent messages */}
                {showPlan && message.type === 'agent' && message.data && message.data.plan.dataset !== "text_response" && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Analysis Plan</h4>
                    <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs text-gray-800 dark:text-gray-200 overflow-auto">
                      {JSON.stringify(message.data.plan, null, 2)}
                    </pre>
                  </div>
                )}

                <p className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {message.type === 'user' && (
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              )}
            </div>
          ))}

          {/* Loading State */}
          {(loading || agentLoading) && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          {/* Error State - Only show if it's not a connection error */}
          {(error || agentError) && !error?.includes('Not connected') && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3 max-w-2xl">
                <p className="text-sm text-red-800 dark:text-red-200">{error || agentError}</p>
                <button
                  onClick={() => {
                    setError(null);
                    clearErrors();
                  }}
                  className="mt-2 text-xs text-red-600 hover:text-red-800 font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Ask about metrics, user behavior, or request data analysis..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 pr-12"
                disabled={loading || agentLoading}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-2">
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                </svg>
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
                </svg>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || agentLoading || !query.trim() || !isConnected}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-2xl hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </form>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            Ask about user metrics, conversion funnels, or request visual analysis
          </p>
        </div>
      </div>

      {/* Connection Toast */}
      {showConnectionToast && (
        <div className="fixed top-4 right-4 bg-red-500 dark:bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span className="text-sm">Not connected to agent</span>
            <button
              onClick={() => setShowConnectionToast(false)}
              className="ml-2 text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}