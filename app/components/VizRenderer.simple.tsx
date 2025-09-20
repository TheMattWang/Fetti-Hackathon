'use client';

import { VizPlan } from '@/types/viz';

interface VizRendererProps {
  plan: VizPlan;
  rows: any[];
  showTable?: boolean;
}

export default function VizRenderer({ plan, rows, showTable = false }: VizRendererProps) {
  // Simple table rendering
  if (showTable || plan.chart.type === 'table') {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {Object.keys(rows[0] || {}).map((key) => (
                <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row, index) => (
              <tr key={index}>
                {Object.values(row).map((value, cellIndex) => (
                  <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {String(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Simple chart rendering
  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">{plan.chart.type} Chart</h3>
      <p className="text-sm text-gray-600">
        {rows.length} rows of data
      </p>
      <div className="mt-4 text-xs text-gray-500">
        Chart visualization would go here
      </div>
    </div>
  );
}
