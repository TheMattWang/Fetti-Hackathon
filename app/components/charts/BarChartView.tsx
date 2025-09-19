'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { VizPlan } from '@/types/viz';
import { getFieldByName, formatValue } from '@/lib/fieldAccess';

interface BarChartViewProps {
  plan: VizPlan;
  rows: any[];
}

export default function BarChartView({ plan, rows }: BarChartViewProps) {
  const xField = getFieldByName(plan.fields, plan.chart.x || '');
  const yField = getFieldByName(plan.fields, plan.chart.y || '');
  const seriesField = plan.chart.series ? getFieldByName(plan.fields, plan.chart.series) : null;

  if (!xField || !yField) {
    return <div className="p-8 text-center text-gray-500">Missing required fields for bar chart</div>;
  }

  // Group data by series if series field exists
  const chartData = seriesField 
    ? rows.reduce((acc, row) => {
        const xValue = row[xField.name];
        const seriesValue = row[seriesField.name];
        const yValue = row[yField.name];
        
        let existingGroup = acc.find((item: any) => item[xField.name] === xValue);
        if (!existingGroup) {
          existingGroup = { [xField.name]: xValue };
          acc.push(existingGroup);
        }
        existingGroup[seriesValue] = yValue;
        return acc;
      }, [])
    : rows.map(row => ({
        [xField.name]: row[xField.name],
        [yField.name]: row[yField.name]
      }));

  const hasTopK = plan.transforms?.some(t => t.op === 'topk');

  return (
    <div className="w-full">
      {hasTopK && (
        <div className="mb-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Top K applied
          </span>
        </div>
      )}
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={xField.name}
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatValue(value, yField)}
            />
            <Tooltip 
              formatter={(value, name) => [formatValue(value, yField), name]}
              labelFormatter={(label) => `${xField.name}: ${label}`}
            />
            {seriesField ? (
              // Multiple series
              Object.keys(chartData[0] || {}).filter(key => key !== xField.name).map((series, index) => (
                <Bar 
                  key={series}
                  dataKey={series}
                  fill={`hsl(${index * 60}, 70%, 50%)`}
                />
              ))
            ) : (
              <Bar dataKey={yField.name} fill="#3b82f6" />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Meta footer */}
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
