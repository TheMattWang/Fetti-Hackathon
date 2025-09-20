'use client';

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { VizPlan } from '@/types/viz';
import { getFieldByName, formatValue } from '@/lib';

interface ScatterViewProps {
  plan: VizPlan;
  rows: any[];
}

export default function ScatterView({ plan, rows }: ScatterViewProps) {
  const xField = getFieldByName(plan.fields, plan.chart.x || '');
  const yField = getFieldByName(plan.fields, plan.chart.y || '');
  const seriesField = plan.chart.series ? getFieldByName(plan.fields, plan.chart.series) : null;

  if (!xField || !yField) {
    return <div className="p-8 text-center text-gray-500">Missing required fields for scatter chart</div>;
  }

  const chartData = rows.map(row => ({
    [xField.name]: row[xField.name],
    [yField.name]: row[yField.name],
    ...(seriesField && { [seriesField.name]: row[seriesField.name] })
  }));

  return (
    <div className="w-full">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={xField.name}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatValue(value, xField)}
            />
            <YAxis 
              dataKey={yField.name}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatValue(value, yField)}
            />
            <Tooltip 
              formatter={(value, name) => [formatValue(value, getFieldByName(plan.fields, String(name)) || yField), name]}
              labelFormatter={(label) => `${xField.name}: ${label}`}
            />
            <Scatter 
              dataKey={yField.name} 
              fill="#3b82f6"
              r={4}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
        <div>
          {rows.length} data points
          {plan.quality?.rowCountCapHit && ' (capped)'}
        </div>
        <div>
          {plan.quality?.warnings && plan.quality.warnings.length > 0 && (
            <span className="text-yellow-600">
              {plan.quality.warnings.length} warning(s)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
