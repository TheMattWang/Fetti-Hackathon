'use client';

import { useState } from 'react';
import { VizPayload } from '@/types/viz';
import VizRenderer from '@/components/VizRenderer';
import SimpleTestData from '@/components/SimpleTestData';

export default function SimplePage() {
  const [data, setData] = useState<VizPayload | null>(null);
  const [showTable, setShowTable] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            SQL Agent Insights - Test Mode
          </h1>
          <p className="text-gray-600">
            Test the enhanced visualization system with sample data
          </p>
        </div>

        {/* Test Data */}
        <SimpleTestData onDataChange={setData} />

        {/* Results */}
        {data && (
          <div className="space-y-6">
            {/* Narrative */}
            {data.plan.narrative && (
              <div className="p-6 bg-white rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Insight</h2>
                <p className="text-gray-700">{data.plan.narrative}</p>
              </div>
            )}

            {/* Action Chips */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowTable(!showTable)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  showTable
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                Show Table
              </button>
            </div>

            {/* Visualization */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <VizRenderer 
                plan={data.plan} 
                rows={data.rows} 
                showTable={showTable}
              />
            </div>
          </div>
        )}

        {/* Instructions */}
        {!data && (
          <div className="mt-12 p-6 bg-white rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">How to Test</h2>
            <div className="space-y-3 text-gray-600">
              <p>1. Click "Load Map Data" to test the enhanced map visualization with multiple modes</p>
              <p>2. Click "Load Bar Chart Data" to test categorical data visualization</p>
              <p>3. Use the visualization selector to switch between different chart types</p>
              <p>4. Try different map modes: Points, Heatmap, Clustered, and Categorical</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
