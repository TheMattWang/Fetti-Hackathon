'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { VizPlan } from '@/types/viz';
import { getFieldByName, formatValue } from '@/lib/fieldAccess';
import { calculateQuantiles } from '@/lib/stats';

interface BoxViewProps {
  plan: VizPlan;
  rows: any[];
}

export default function BoxView({ plan, rows }: BoxViewProps) {
  const field = getFieldByName(plan.fields, plan.chart.y || '');
  const groupField = plan.chart.x ? getFieldByName(plan.fields, plan.chart.x) : null;

  if (!field) {
    return <div className="p-8 text-center text-gray-500">Missing required field for box plot</div>;
  }

  const values = rows.map(row => row[field.name]).filter(v => typeof v === 'number');
  const quantiles = calculateQuantiles(values);

  const chartData = [
    { name: 'Min', value: quantiles.min },
    { name: 'Q1', value: quantiles.q1 },
    { name: 'Median', value: quantiles.median },
    { name: 'Q3', value: quantiles.q3 },
    { name: 'Max', value: quantiles.max }
  ];

  return (
    <div className="w-full">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatValue(value, field)}
            />
            <Tooltip 
              formatter={(value) => [formatValue(value, field), 'Value']}
              labelFormatter={(label) => `${label}`}
            />
            <Bar dataKey="value" fill="#3b82f6" />
          </BarChart>
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
