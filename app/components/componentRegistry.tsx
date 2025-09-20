import React from 'react';
import { TableComponent, ChartComponent, MapComponent } from '../lib/schemas.simple';

// Table Component
interface TableProps {
  component: TableComponent;
}

export const Table: React.FC<TableProps> = React.memo(({ component }) => {
  const { data, config } = component;
  const { columns, rows } = data;
  const { title, sortable = true, filterable = false, pagination = true, pageSize = 25 } = config || {};

  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = React.useState<string>('');
  const [currentPage, setCurrentPage] = React.useState(0);

  // Filter rows
  const filteredRows = React.useMemo(() => {
    if (!filterable || !filter) return rows;
    
    return rows.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(filter.toLowerCase())
      )
    );
  }, [rows, filter, filterable]);

  // Sort rows
  const sortedRows = React.useMemo(() => {
    if (!sortable || !sortColumn) return filteredRows;
    
    return [...filteredRows].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (aVal === bVal) return 0;
      
      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredRows, sortColumn, sortDirection, sortable]);

  // Paginate rows
  const paginatedRows = React.useMemo(() => {
    if (!pagination) return sortedRows;
    
    const start = currentPage * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize, pagination]);

  const handleSort = (columnKey: string) => {
    if (!sortable) return;
    
    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const totalPages = Math.ceil(sortedRows.length / pageSize);

  return (
    <div className="table-container">
      {title && <h3 className="table-title text-gray-900 font-semibold text-lg mb-4">{title}</h3>}
      
      {filterable && (
        <div className="table-controls">
          <input
            type="text"
            placeholder="Filter table..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="table-filter px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500"
          />
        </div>
      )}
      
      <div className="table-wrapper">
        <table className="data-table w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column.key)}
                  className={`px-4 py-3 text-left text-sm font-medium text-gray-900 border-b border-gray-200 ${sortable ? 'cursor-pointer hover:bg-gray-100' : ''} ${
                    sortColumn === column.key ? `bg-gray-100` : ''
                  }`}
                >
                  {column.title}
                  {sortable && sortColumn === column.key && (
                    <span className="ml-1 text-gray-600">
                      {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50 border-b border-gray-100">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-sm text-gray-800">
                    {row[column.key]?.toString() || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {pagination && totalPages > 1 && (
        <div className="table-pagination flex items-center justify-between mt-4 px-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="pagination-info text-sm text-gray-700">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage === totalPages - 1}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
});

Table.displayName = 'Table';

// Chart Component
interface ChartProps {
  component: ChartComponent;
}

export const Chart: React.FC<ChartProps> = React.memo(({ component }) => {
  const { data, config } = component;
  const { points } = data;
  const { title, kind, xAxisLabel, yAxisLabel, showLegend = true, colors = [] } = config;

  // Group points by series for multi-series charts
  const seriesData = React.useMemo(() => {
    const groups: Record<string, Array<{ x: string | number; y: number; series?: string }>> = {};
    
    points.forEach(point => {
      const series = point.series || 'default';
      if (!groups[series]) {
        groups[series] = [];
      }
      groups[series].push(point);
    });
    
    return Object.entries(groups).map(([name, data]) => ({ name, data }));
  }, [points]);

  // Calculate chart dimensions and scales
  const chartWidth = 800;
  const chartHeight = 400;
  const margin = { top: 20, right: 20, bottom: 40, left: 60 };
  const plotWidth = chartWidth - margin.left - margin.right;
  const plotHeight = chartHeight - margin.top - margin.bottom;

  const xValues = points.map(p => typeof p.x === 'number' ? p.x : 0);
  const yValues = points.map(p => p.y);
  
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);

  const xScale = (x: number) => ((x - xMin) / (xMax - xMin)) * plotWidth;
  const yScale = (y: number) => plotHeight - ((y - yMin) / (yMax - yMin)) * plotHeight;

  const renderChart = () => {
    switch (kind) {
      case 'line':
        return seriesData.map((series: any, seriesIndex) => {
          const color = colors[seriesIndex] || `hsl(${seriesIndex * 60}, 70%, 50%)`;
          const pathData = series.data
            .map((point: any, index: number) => {
              const x = typeof point.x === 'number' ? xScale(point.x) : index * (plotWidth / series.data.length);
              const y = yScale(point.y);
              return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
            })
            .join(' ');

          return (
            <path
              key={series.name}
              d={pathData}
              stroke={color}
              strokeWidth="2"
              fill="none"
            />
          );
        });

      case 'bar':
        const barWidth = plotWidth / points.length * 0.8;
        return points.map((point, index) => {
          const x = (index / points.length) * plotWidth + (plotWidth / points.length - barWidth) / 2;
          const y = yScale(point.y);
          const height = plotHeight - y;
          const color = colors[0] || 'steelblue';

          return (
            <rect
              key={index}
              x={x}
              y={y}
              width={barWidth}
              height={height}
              fill={color}
            />
          );
        });

      case 'scatter':
        return points.map((point, index) => {
          const x = typeof point.x === 'number' ? xScale(point.x) : index * (plotWidth / points.length);
          const y = yScale(point.y);
          const seriesIndex = seriesData.findIndex((s: any) => s.name === (point.series || 'default'));
          const color = colors[seriesIndex] || `hsl(${seriesIndex * 60}, 70%, 50%)`;

          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="4"
              fill={color}
            />
          );
        });

      default:
        return null;
    }
  };

  return (
    <div className="chart-container">
      {title && <h3 className="chart-title text-gray-900 font-semibold text-lg mb-4">{title}</h3>}
      
      <svg width={chartWidth} height={chartHeight} className="chart-svg">
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Y-axis */}
          <line x1="0" y1="0" x2="0" y2={plotHeight} stroke="#ccc" />
          
          {/* X-axis */}
          <line x1="0" y1={plotHeight} x2={plotWidth} y2={plotHeight} stroke="#ccc" />
          
          {/* Chart content */}
          {renderChart()}
          
          {/* Axis labels */}
          {xAxisLabel && (
            <text
              x={plotWidth / 2}
              y={plotHeight + 35}
              textAnchor="middle"
              className="axis-label text-gray-700 text-sm"
            >
              {xAxisLabel}
            </text>
          )}
          
          {yAxisLabel && (
            <text
              x={-30}
              y={plotHeight / 2}
              textAnchor="middle"
              transform={`rotate(-90, -30, ${plotHeight / 2})`}
              className="axis-label"
            >
              {yAxisLabel}
            </text>
          )}
        </g>
      </svg>
      
      {showLegend && seriesData.length > 1 && (
        <div className="chart-legend flex flex-wrap gap-4 mt-4">
          {seriesData.map((series: any, index) => (
            <div key={series.name} className="legend-item flex items-center gap-2">
              <div
                className="legend-color w-4 h-4 rounded"
                style={{ backgroundColor: colors[index] || `hsl(${index * 60}, 70%, 50%)` }}
              />
              <span className="legend-label text-sm text-gray-700">{series.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

Chart.displayName = 'Chart';

// Map Component (simplified - would use react-leaflet in practice)
interface MapProps {
  component: MapComponent;
}

export const Map: React.FC<MapProps> = React.memo(({ component }) => {
  const { data, config } = component;
  const { features } = data;
  const { title, center = [0, 0], zoom = 10, showPopups = true } = config || {};

  // This is a simplified map implementation
  // In practice, you would use react-leaflet and proper GeoJSON rendering
  return (
    <div className="map-container">
      {title && <h3 className="map-title text-gray-900 font-semibold text-lg mb-4">{title}</h3>}
      
      <div className="map-placeholder bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="map-info text-gray-800">
          <p className="text-lg font-medium mb-2">Map View</p>
          <p className="text-sm">Center: [{center[0]}, {center[1]}]</p>
          <p className="text-sm">Zoom: {zoom}</p>
          <p className="text-sm">Features: {features.length}</p>
        </div>
        
        {features.length > 0 && (
          <div className="features-list mt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Features:</h4>
            {features.slice(0, 5).map((feature, index) => (
              <div key={index} className="feature-item text-sm text-gray-700 mb-1">
                <span className="feature-type font-medium">{feature.geometry.type}</span>
                {feature.properties && showPopups && (
                  <span className="feature-props ml-2">
                    {Object.keys(feature.properties).length} properties
                  </span>
                )}
              </div>
            ))}
            {features.length > 5 && <p className="text-sm text-gray-600 mt-2">... and {features.length - 5} more</p>}
          </div>
        )}
      </div>
    </div>
  );
});

Map.displayName = 'Map';

// Component Registry
export const componentRegistry = {
  Table,
  Chart,
  Map,
} as const;

export type ComponentType = keyof typeof componentRegistry;
