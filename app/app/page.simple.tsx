'use client';

import { useState } from 'react';
import { useAgentWorker } from '@/hooks/useAgentWorker.minimal';

export default function Home() {
  const [query, setQuery] = useState('');
  
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">Fetti PM Assistant</h1>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-500">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <p>Simple test page with useAgentWorker hook</p>
          <p>UI Spec children count: {uiSpec.children?.length || 0}</p>
          {agentError && <p className="text-red-500">Error: {agentError}</p>}
        </div>
      </div>
    </div>
  );
}
