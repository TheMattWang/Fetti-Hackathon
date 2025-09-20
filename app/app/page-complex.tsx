'use client';

import { useState, useEffect, useCallback } from 'react';
import { VizPayload, VizPlan } from '@/types/viz';
import VizRenderer from '@/components/VizRenderer';
import SmartVizSelector from '@/components/SmartVizSelector';
import DemoTestCases from '@/components/DemoTestCases';

// Import the agent streaming hook
import { useAgentWorker } from '@/hooks/useAgentWorker';

export default function Home() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState<VizPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [agentResponses, setAgentResponses] = useState<string[]>([]);

  // Use the agent streaming hook
  const agentStream = useAgentWorker({
    endpoint: 'https://fetti-hackathon.onrender.com/api/agent/stream',
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000,
    timeout: 60000,
  });

  // Debug logging
  useEffect(() => {
    console.log('Page: Agent stream state changed:', {
      isConnected: agentStream.isConnected,
      isLoading: agentStream.isLoading,
      error: agentStream.error,
      connectionAttempts: agentStream.connectionAttempts
    });
  }, [agentStream.isConnected, agentStream.isLoading, agentStream.error, agentStream.connectionAttempts]);

  const {
    uiSpec,
    isConnected,
    isLoading: agentLoading,
    error: agentError,
    sendMessage,
    reconnect,
    clearErrors,
  } = agentStream;

  // Function to extract visualization recommendation from agent response
  const extractVisualizationRecommendation = (response: string): string => {
    const responseLower = response.toLowerCase();
    
    // Check for specific visualization recommendations
    if (responseLower.includes('map') && (responseLower.includes('location') || responseLower.includes('coordinates'))) {
      return 'map';
    } else if (responseLower.includes('line chart') || responseLower.includes('line graph')) {
      return 'line';
    } else if (responseLower.includes('bar chart') || responseLower.includes('bar graph')) {
      return 'bar';
    } else if (responseLower.includes('histogram')) {
      return 'histogram';
    } else if (responseLower.includes('scatter plot') || responseLower.includes('scatter chart')) {
      return 'scatter';
    } else if (responseLower.includes('pie chart')) {
      return 'pie';
    } else if (responseLower.includes('area chart')) {
      return 'area';
    } else if (responseLower.includes('box plot')) {
      return 'box';
    } else if (responseLower.includes('funnel')) {
      return 'funnel';
    }
    
    // Default fallback based on data characteristics
    return 'bar';
  };

  // Function to determine chart type based on data and query
  const determineChartType = (tableData: any, query: string, agentResponse: string): string => {
    // First, try to extract from agent response
    const recommendedType = extractVisualizationRecommendation(agentResponse);
    if (recommendedType !== 'bar') {
      return recommendedType;
    }

    // Fallback to smart detection based on data and query
    const queryLower = query.toLowerCase();
    const hasCoordinates = tableData.columns.some((col: any) => 
      col.key.toLowerCase().includes('lat') || col.key.toLowerCase().includes('lon')
    );
    const hasTimeData = tableData.columns.some((col: any) => 
      col.key.toLowerCase().includes('date') || col.key.toLowerCase().includes('time') || col.key.toLowerCase().includes('hour')
    );
    const hasLocationData = tableData.columns.some((col: any) => 
      col.key.toLowerCase().includes('address') || col.key.toLowerCase().includes('location')
    );

    // Location-based queries with coordinates
    if ((queryLower.includes('location') || queryLower.includes('pickup') || queryLower.includes('dropoff')) && hasCoordinates) {
      return 'map';
    }
    
    // Time-based queries
    if (queryLower.includes('hour') || queryLower.includes('time') || queryLower.includes('trend') || hasTimeData) {
      return 'line';
    }
    
    // Distribution queries
    if (queryLower.includes('distribution') || queryLower.includes('age') || queryLower.includes('group size')) {
      return 'histogram';
    }
    
    // Location queries without coordinates
    if (hasLocationData && !hasCoordinates) {
      return 'bar';
    }
    
    // Default to bar chart for comparisons
    return 'bar';
  };

  // Handle agent responses
  useEffect(() => {
    if (uiSpec.children && uiSpec.children.length > 0) {
      // Convert agent response to VizPayload format
      const latestComponent = uiSpec.children[uiSpec.children.length - 1];
      if (latestComponent && latestComponent.type === 'Table') {
        // Convert table data to a simple bar chart for now
        const tableData = latestComponent.data;
        if (tableData && tableData.rows && tableData.rows.length > 0) {
          // Extract the actual agent response from the table data
          // The backend sends either 'response' or 'message' field with the cleaned agent response
          const firstRow = tableData.rows[0];
          const agentResponse = firstRow?.response || firstRow?.message || `Found ${tableData.rows.length} records`;
          
          // Debug: Log what we're extracting
          console.log('First row data:', firstRow);
          console.log('Extracted response:', agentResponse);
          
          // Smart field type detection
          const fields = tableData.columns.map((col: any) => {
            const sampleValue = tableData.rows[0]?.[col.key];
            let type: 'quant' | 'cat' | 'time' | 'geo' | 'lat' | 'lon' = 'cat';
            
            // Check for geographic fields
            if (col.key.toLowerCase().includes('lat') || col.key.toLowerCase().includes('latitude')) {
              type = 'lat';
            } else if (col.key.toLowerCase().includes('lon') || col.key.toLowerCase().includes('lng') || col.key.toLowerCase().includes('longitude')) {
              type = 'lon';
            } else if (col.key.toLowerCase().includes('address') || col.key.toLowerCase().includes('location')) {
              type = 'geo';
            } else if (col.key.toLowerCase().includes('date') || col.key.toLowerCase().includes('time')) {
              type = 'time';
            } else if (typeof sampleValue === 'number') {
              type = 'quant';
            }
            
            return {
              name: col.key,
              type
            };
          });

          // Determine the best chart type based on agent recommendation and data
          const chartType = determineChartType(tableData, query, agentResponse);
          console.log('Determined chart type:', chartType);

          // Set appropriate x and y fields based on chart type
          let xField = tableData.columns[0]?.key || "column1";
          let yField = tableData.columns[1]?.key || "column2";
          
          if (chartType === 'map' && fields.some(f => f.type === 'lat') && fields.some(f => f.type === 'lon')) {
            // For maps, use lat/lon fields
            const latField = fields.find(f => f.type === 'lat');
            const lonField = fields.find(f => f.type === 'lon');
            if (latField && lonField) {
              xField = lonField.name;
              yField = latField.name;
            }
          } else if (chartType === 'line' && fields.some(f => f.type === 'time')) {
            // For line charts, use time field as x-axis
            const timeField = fields.find(f => f.type === 'time');
            if (timeField) {
              xField = timeField.name;
            }
          }

          const vizPayload: VizPayload = {
            plan: {
              intent: chartType === 'map' ? "map" : "describe",
              question: query,
              dataset: "agent_result",
              sql: "SELECT * FROM agent_result",
              fields,
              chart: {
                type: chartType as any,
                x: xField,
                y: yField,
                tooltip: tableData.columns.map((col: any) => col.key)
              },
              narrative: agentResponse,
              quality: { rowCount: tableData.rows.length, rowCountCapHit: false, warnings: [] }
            },
            rows: tableData.rows
          };
          setData(vizPayload);
          setLoading(false);
        }
      }
    }
  }, [uiSpec, query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (!isConnected) {
      setError('Not connected to agent. Please wait for connection or try reconnecting.');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    // Send message to agent
    sendMessage(query);
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

  const handleVizChange = (newPlan: VizPlan) => {
    if (data) {
      setData({
        ...data,
        plan: newPlan
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                SQL Agent Insights
              </h1>
              <p className="text-gray-600">
                Ask questions about your data and get interactive visualizations
              </p>
            </div>
          </div>
        </div>

        {/* Test Data */}
        <DemoTestCases onDataChange={setData} />

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
              disabled={loading || agentLoading || !query.trim() || !isConnected}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || agentLoading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </form>

        {/* Connection Status */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">
                {isConnected ? 'Connected to SQL Agent' : 'Disconnected from SQL Agent'}
              </span>
            </div>
            {!isConnected && (
              <button
                onClick={reconnect}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Reconnect
              </button>
            )}
          </div>
        </div>

        {/* Error State */}
        {(error || agentError) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error || agentError}</p>
            <button
              onClick={() => {
                setError(null);
                clearErrors();
              }}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading State */}
        {(loading || agentLoading) && (
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
                
                {/* Visualization Recommendation */}
                {data.plan.narrative.toLowerCase().includes('visualized') || 
                 data.plan.narrative.toLowerCase().includes('chart') || 
                 data.plan.narrative.toLowerCase().includes('map') ? (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-blue-800">
                        AI Recommendation: {data.plan.chart.type.charAt(0).toUpperCase() + data.plan.chart.type.slice(1)} Chart
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      The agent has automatically selected the best visualization type for your data
                    </p>
                  </div>
                ) : null}
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

            {/* Smart Visualization Selector */}
            <SmartVizSelector 
              plan={data.plan} 
              rows={data.rows} 
              onVizChange={handleVizChange}
              agentRecommendation={data.plan.narrative || undefined}
            />

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
                onClick={() => setQuery('When do large groups (6+ riders) typically ride downtown?')}
                className="text-left p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
              >
                <div className="font-medium text-gray-900">Location Analysis</div>
                <div className="text-sm text-gray-600">When do large groups (6+ riders) typically ride downtown?</div>
              </button>
              <button
                onClick={() => setQuery('Show all trip locations on a map')}
                className="text-left p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
              >
                <div className="font-medium text-gray-900">Map Visualization</div>
                <div className="text-sm text-gray-600">Show all trip locations on a map</div>
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
