'use client';

import { VizPlan } from '@/types/viz';
import TableView from './TableView';
import BarChartView from './charts/BarChartView';
import LineChartView from './charts/LineChartView';
import AreaChartView from './charts/AreaChartView';
import ScatterView from './charts/ScatterView';
import HistView from './charts/HistView';
import BoxView from './charts/BoxView';
import PieView from './charts/PieView';
import FunnelView from './charts/FunnelView';
import ChoroplethView from './maps/ChoroplethView';
import PointMapView from './maps/PointMapView';
import EnhancedMapView from './maps/EnhancedMapView';
import { getLatLonFields, getGeoField } from '@/lib';

interface VizRendererProps {
  plan: VizPlan;
  rows: any[];
  showTable?: boolean;
}

export default function VizRenderer({ plan, rows, showTable = false }: VizRendererProps) {
  // Always show table if requested
  if (showTable) {
    return <TableView plan={plan} rows={rows} />;
  }

  // Map rendering logic
  if (plan.chart.type === 'choropleth') {
    return <ChoroplethView plan={plan} rows={rows} />;
  }

  // Check for lat/lon fields for enhanced maps
  const { lat, lon } = getLatLonFields(plan.fields);
  if (lat && lon && (plan.chart.type === 'scatter' || plan.intent === 'map')) {
    return <EnhancedMapView plan={plan} rows={rows} />;
  }

  // Chart rendering based on type
  switch (plan.chart.type) {
    case 'table':
      return <TableView plan={plan} rows={rows} />;
    case 'text':
      // Text responses are handled in the main page component
      return null;
    case 'bar':
      return <BarChartView plan={plan} rows={rows} />;
    case 'line':
      return <LineChartView plan={plan} rows={rows} />;
    case 'area':
      return <AreaChartView plan={plan} rows={rows} />;
    case 'scatter':
      return <ScatterView plan={plan} rows={rows} />;
    case 'hist':
      return <HistView plan={plan} rows={rows} />;
    case 'box':
      return <BoxView plan={plan} rows={rows} />;
    case 'pie':
      return <PieView plan={plan} rows={rows} />;
    case 'funnel':
      return <FunnelView plan={plan} rows={rows} />;
    default:
      return (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <p>Unsupported chart type: {plan.chart.type}</p>
        </div>
      );
  }
}
