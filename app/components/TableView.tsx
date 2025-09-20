'use client';

import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
import { VizPlan } from '@/types/viz';
import { formatValue } from '@/lib/fieldAccess';

interface TableViewProps {
  plan: VizPlan;
  rows: any[];
}

export default function TableView({ plan, rows }: TableViewProps) {
  const columnHelper = createColumnHelper<any>();

  const columns = useMemo(() => {
    return plan.fields.map(field => 
      columnHelper.accessor(field.name, {
        header: field.name,
        cell: ({ getValue }) => formatValue(getValue(), field),
        sortingFn: field.type === 'quant' ? 'basic' : 'alphanumeric',
      })
    );
  }, [plan.fields, columnHelper]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: plan.chart.sort ? [{ id: plan.chart.y || plan.fields[0].name, desc: plan.chart.sort === 'desc' }] : [],
    },
  });

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && '↑'}
                      {header.column.getIsSorted() === 'desc' && '↓'}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Meta footer */}
      <div className="mt-4 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
        <div>
          {rows.length} rows
          {plan.quality?.rowCountCapHit && ' (capped)'}
        </div>
        <div>
          {plan.quality?.warnings && plan.quality.warnings.length > 0 && (
            <span className="text-yellow-600 dark:text-yellow-400">
              {plan.quality.warnings.length} warning(s)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
