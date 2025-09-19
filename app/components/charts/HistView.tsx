'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { VizPlan } from '@/types/viz';
import { getFieldByName, formatValue } from '@/lib/fieldAccess';
import { calculateHistogramBins } from '@/lib/stats';

interface HistViewProps {
  plan: VizPlan;
  rows: any[];
}

export default function HistView({ plan, rows }: HistViewProps) {
  const field = getFieldByName(plan.fields, plan.chart.bin?.field || plan.chart.y || '');

  if (!field) {
    return <div className="p-8 text-center text-gray-500">Missing required field for histogram</div>;
  }

  const values = rows.map(row => row[field.name]).filter(v => typeof v === 'number');
  const maxBins = plan.chart.bin?.maxbins || 20;
  const { bins, counts } = calculateHistogramBins(values, maxBins);

  const chartData = bins.map((bin, index) => ({
    bin: bin.toFixed(1),
    count: counts[index]
  }));

  return (
    <div className="w-full">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="bin"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value) => [value, 'Count']}
              labelFormatter={(label) => `Bin: ${label}`}
            />
            <Bar dataKey="count" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
        <div>
          {rows.length} data points • {maxBins} bins
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
