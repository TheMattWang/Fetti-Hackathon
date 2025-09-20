'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { VizPlan } from '@/types/viz';
import { getFieldByName, formatValue } from '@/lib';
import BarChartView from './BarChartView';

interface PieViewProps {
  plan: VizPlan;
  rows: any[];
}

export default function PieView({ plan, rows }: PieViewProps) {
  const xField = getFieldByName(plan.fields, plan.chart.x || '');
  const yField = getFieldByName(plan.fields, plan.chart.y || '');

  if (!xField || !yField) {
    return <div className="p-8 text-center text-gray-500">Missing required fields for pie chart</div>;
  }

  // Auto-convert to bar chart if more than 6 categories
  const uniqueCategories = new Set(rows.map(row => row[xField.name]));
  if (uniqueCategories.size > 6) {
    return <BarChartView plan={plan} rows={rows} />;
  }

  const chartData = rows.map((row, index) => ({
    name: row[xField.name],
    value: row[yField.name],
    fill: `hsl(${index * 60}, 70%, 50%)`
  }));

  const COLORS = chartData.map(item => item.fill);

  return (
    <div className="w-full">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => [formatValue(value, yField), yField.name]}
            />
            <Legend />
          </PieChart>
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
