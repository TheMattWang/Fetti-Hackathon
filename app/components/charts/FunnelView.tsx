'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { VizPlan } from '@/types/viz';
import { getFieldByName, formatValue } from '@/lib/fieldAccess';

interface FunnelViewProps {
  plan: VizPlan;
  rows: any[];
}

export default function FunnelView({ plan, rows }: FunnelViewProps) {
  const xField = getFieldByName(plan.fields, plan.chart.x || '');
  const yField = getFieldByName(plan.fields, plan.chart.y || '');

  if (!xField || !yField) {
    return <div className="p-8 text-center text-gray-500">Missing required fields for funnel chart</div>;
  }

  // Sort by value descending for funnel effect
  const chartData = [...rows]
    .sort((a, b) => b[yField.name] - a[yField.name])
    .map(row => ({
      [xField.name]: row[xField.name],
      [yField.name]: row[yField.name]
    }));

  return (
    <div className="w-full">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={xField.name}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatValue(value, yField)}
            />
            <Tooltip 
              formatter={(value) => [formatValue(value, yField), yField.name]}
              labelFormatter={(label) => `${xField.name}: ${label}`}
            />
            <Bar dataKey={yField.name} fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
        <div>
          {rows.length} stages
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
