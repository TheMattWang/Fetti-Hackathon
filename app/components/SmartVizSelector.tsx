'use client';

import { VizPlan } from '@/types/viz';
import { 
  getLatLonFields, 
  getCategoricalFields, 
  getNumericFields, 
  getTimeFields,
  getAddressFields,
  getCountFields 
} from '@/lib/fieldAccess';

interface SmartVizSelectorProps {
  plan: VizPlan;
  rows: any[];
  onVizChange: (newPlan: VizPlan) => void;
}

export default function SmartVizSelector({ plan, rows, onVizChange }: SmartVizSelectorProps) {
  const { lat, lon } = getLatLonFields(plan.fields);
  const categoricalFields = getCategoricalFields(plan.fields);
  const numericFields = getNumericFields(plan.fields);
  const timeFields = getTimeFields(plan.fields);
  const addressFields = getAddressFields(plan.fields);
  const countFields = getCountFields(plan.fields);

  const hasLocationData = lat && lon;
  const hasCategoricalData = categoricalFields.length > 0;
  const hasNumericData = numericFields.length > 0;
  const hasTimeData = timeFields.length > 0;
  const hasAddressData = addressFields.length > 0;

  const getSuggestedVisualizations = () => {
    const suggestions = [];

    // Map visualizations
    if (hasLocationData) {
      suggestions.push({
        type: 'map',
        title: 'Map View',
        description: 'Show locations on a map',
        icon: '🗺️',
        chartType: 'scatter' as const,
        intent: 'map' as const
      });

      if (hasNumericData) {
        suggestions.push({
          type: 'heatmap',
          title: 'Heatmap',
          description: 'Show density and intensity',
          icon: '🔥',
          chartType: 'scatter' as const,
          intent: 'map' as const
        });
      }
    }

    // Categorical visualizations
    if (hasCategoricalData) {
      suggestions.push({
        type: 'bar',
        title: 'Bar Chart',
        description: 'Compare categories',
        icon: '📊',
        chartType: 'bar' as const,
        intent: 'compare' as const
      });

      suggestions.push({
        type: 'pie',
        title: 'Pie Chart',
        description: 'Show proportions',
        icon: '🥧',
        chartType: 'pie' as const,
        intent: 'segment' as const
      });
    }

    // Time series visualizations
    if (hasTimeData && hasNumericData) {
      suggestions.push({
        type: 'line',
        title: 'Line Chart',
        description: 'Show trends over time',
        icon: '📈',
        chartType: 'line' as const,
        intent: 'trend' as const
      });

      suggestions.push({
        type: 'area',
        title: 'Area Chart',
        description: 'Show cumulative trends',
        icon: '📊',
        chartType: 'area' as const,
        intent: 'trend' as const
      });
    }

    // Distribution visualizations
    if (hasNumericData) {
      suggestions.push({
        type: 'hist',
        title: 'Histogram',
        description: 'Show distribution',
        icon: '📊',
        chartType: 'hist' as const,
        intent: 'distribution' as const
      });

      suggestions.push({
        type: 'box',
        title: 'Box Plot',
        description: 'Show statistical summary',
        icon: '📦',
        chartType: 'box' as const,
        intent: 'distribution' as const
      });
    }

    // Scatter plot for correlations
    if (hasNumericData && numericFields.length >= 2) {
      suggestions.push({
        type: 'scatter',
        title: 'Scatter Plot',
        description: 'Show correlations',
        icon: '⚪',
        chartType: 'scatter' as const,
        intent: 'compare' as const
      });
    }

    // Always include table view
    suggestions.push({
      type: 'table',
      title: 'Table View',
      description: 'Show raw data',
      icon: '📋',
      chartType: 'table' as const,
      intent: 'describe' as const
    });

    return suggestions;
  };

  const handleVizChange = (suggestion: any) => {
    const newPlan: VizPlan = {
      ...plan,
      chart: {
        ...plan.chart,
        type: suggestion.chartType
      },
      intent: suggestion.intent
    };

    // Set appropriate x and y fields based on visualization type
    if (suggestion.chartType === 'bar' && categoricalFields.length > 0 && numericFields.length > 0) {
      newPlan.chart.x = categoricalFields[0].name;
      newPlan.chart.y = numericFields[0].name;
    } else if (suggestion.chartType === 'line' && timeFields.length > 0 && numericFields.length > 0) {
      newPlan.chart.x = timeFields[0].name;
      newPlan.chart.y = numericFields[0].name;
    } else if (suggestion.chartType === 'scatter' && numericFields.length >= 2) {
      newPlan.chart.x = numericFields[0].name;
      newPlan.chart.y = numericFields[1].name;
    } else if (suggestion.chartType === 'pie' && categoricalFields.length > 0) {
      newPlan.chart.x = categoricalFields[0].name;
    } else if (suggestion.chartType === 'hist' && numericFields.length > 0) {
      newPlan.chart.x = numericFields[0].name;
    }

    onVizChange(newPlan);
  };

  const suggestions = getSuggestedVisualizations();

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3">Visualization Options</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => handleVizChange(suggestion)}
            className={`p-3 rounded-lg border text-left transition-colors ${
              plan.chart.type === suggestion.chartType && plan.intent === suggestion.intent
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="text-2xl mb-1">{suggestion.icon}</div>
            <div className="font-medium text-sm">{suggestion.title}</div>
            <div className="text-xs text-gray-600">{suggestion.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
