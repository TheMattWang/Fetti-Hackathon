'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { VizPlan } from '@/types/viz';
import { getFieldByName, formatValue } from '@/lib/fieldAccess';

interface LineChartViewProps {
  plan: VizPlan;
  rows: any[];
}

export default function LineChartView({ plan, rows }: LineChartViewProps) {
  const xField = getFieldByName(plan.fields, plan.chart.x || '');
  const yField = getFieldByName(plan.fields, plan.chart.y || '');
  const seriesField = plan.chart.series ? getFieldByName(plan.fields, plan.chart.series) : null;

  if (!xField || !yField) {
    return <div className="p-8 text-center text-gray-500">Missing required fields for line chart</div>;
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

  const hasConfidence = plan.chart.confidence;
  const hasGoal = plan.chart.goal;

  return (
    <div className="w-full">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
              formatter={(value, name) => [formatValue(value, yField), name]}
              labelFormatter={(label) => `${xField.name}: ${label}`}
            />
            
            {hasGoal && plan.chart.goal && (
              <ReferenceLine y={plan.chart.goal} stroke="#ef4444" strokeDasharray="5 5" />
            )}
            
            {seriesField ? (
              // Multiple series
              Object.keys(chartData[0] || {}).filter(key => key !== xField.name).map((series, index) => (
                <Line 
                  key={series}
                  type="monotone"
                  dataKey={series}
                  stroke={`hsl(${index * 60}, 70%, 50%)`}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))
            ) : (
              <Line 
                type="monotone" 
                dataKey={yField.name} 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Meta footer */}
      <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
        <div>
          {rows.length} data points
          {plan.quality?.rowCountCapHit && ' (capped)'}
          {hasConfidence && ' • with confidence intervals'}
          {hasGoal && ' • with goal line'}
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
