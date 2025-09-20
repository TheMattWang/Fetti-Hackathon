'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { VizPayload } from '@/types/viz';
import VizRenderer from '@/components/VizRenderer';
import ReactMarkdown from 'react-markdown';

// Import the agent streaming hook
import { useAgentWorker } from '@/hooks/useAgentWorker';

export default function Home() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">Fetti PM Assistant</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <p>Test page - no complex imports</p>
        </div>
      </div>
    </div>
  );
}
