'use client';

import { useState } from 'react';
import { VizPayload } from '@/types/viz';
import VizRenderer from '@/components/VizRenderer';

export default function Home() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState<VizPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [showPlan, setShowPlan] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/insight?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }
      const result: VizPayload = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!data) return;
    
    const headers = data.plan.fields.map(f => f.name).join(',');
    const rows = data.rows.map(row => 
      data.plan.fields.map(f => `"${row[f.name] || ''}"`).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'insights.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            SQL Agent Insights
          </h1>
          <p className="text-gray-600">
            Ask questions about your data and get interactive visualizations
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about your data... (e.g., 'Show weekly active users by plan for last quarter, forecast next 2 weeks')"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </form>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="mb-6 p-8 bg-white rounded-lg shadow-sm">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        )}

        {/* Results */}
        {data && !loading && (
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
              <button
                className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 transition-colors"
                onClick={downloadCSV}
              >
                Download CSV
              </button>
              <button
                onClick={() => setShowPlan(!showPlan)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  showPlan
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                Show Plan
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

            {/* Plan Drawer */}
            {showPlan && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Plan</h3>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
                  {JSON.stringify(data.plan, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Example Queries */}
        {!data && !loading && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Try these examples:</h2>
            <div className="grid gap-3">
              <button
                onClick={() => setQuery('Show weekly active users by plan for last quarter, forecast next 2 weeks')}
                className="text-left p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
              >
                <div className="font-medium text-gray-900">Trend Analysis</div>
                <div className="text-sm text-gray-600">Show weekly active users by plan for last quarter, forecast next 2 weeks</div>
              </button>
              <button
                onClick={() => setQuery('Revenue by state last month (map)')}
                className="text-left p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
              >
                <div className="font-medium text-gray-900">Geographic Analysis</div>
                <div className="text-sm text-gray-600">Revenue by state last month (map)</div>
              </button>
              <button
                onClick={() => setQuery('Top categories by revenue')}
                className="text-left p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
              >
                <div className="font-medium text-gray-900">Category Analysis</div>
                <div className="text-sm text-gray-600">Top categories by revenue</div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
