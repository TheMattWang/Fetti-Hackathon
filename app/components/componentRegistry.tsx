import React from 'react';
import { TableComponent, ChartComponent, MapComponent } from '../lib/schemas';

// Table Component
interface TableProps {
  component: TableComponent;
}

export const Table: React.FC<TableProps> = ({ component }) => {
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
      {title && <h3 className="table-title">{title}</h3>}
      
      {filterable && (
        <div className="table-controls">
          <input
            type="text"
            placeholder="Filter table..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="table-filter"
          />
        </div>
      )}
      
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column.key)}
                  className={`table-header ${sortable ? 'sortable' : ''} ${
                    sortColumn === column.key ? `sorted-${sortDirection}` : ''
                  }`}
                >
                  {column.title}
                  {sortable && sortColumn === column.key && (
                    <span className="sort-indicator">
                      {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row, index) => (
              <tr key={index} className="table-row">
                {columns.map((column) => (
                  <td key={column.key} className="table-cell">
                    {row[column.key]?.toString() || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {pagination && totalPages > 1 && (
        <div className="table-pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className="pagination-button"
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage === totalPages - 1}
            className="pagination-button"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

// Chart Component
interface ChartProps {
  component: ChartComponent;
}

export const Chart: React.FC<ChartProps> = ({ component }) => {
  const { data, config } = component;
  const { points } = data;
  const { title, kind, xAxisLabel, yAxisLabel, showLegend = true, colors = [] } = config;

  // Group points by series for multi-series charts
  const seriesData = React.useMemo(() => {
    const groups = new Map<string, typeof points>();
    
    points.forEach(point => {
      const series = point.series || 'default';
      if (!groups.has(series)) {
        groups.set(series, []);
      }
      groups.get(series)!.push(point);
    });
    
    return Array.from(groups.entries()).map(([name, data]) => ({ name, data }));
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
        return seriesData.map((series, seriesIndex) => {
          const color = colors[seriesIndex] || `hsl(${seriesIndex * 60}, 70%, 50%)`;
          const pathData = series.data
            .map((point, index) => {
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
          const seriesIndex = seriesData.findIndex(s => s.name === (point.series || 'default'));
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
      {title && <h3 className="chart-title">{title}</h3>}
      
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
              className="axis-label"
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
        <div className="chart-legend">
          {seriesData.map((series, index) => (
            <div key={series.name} className="legend-item">
              <div
                className="legend-color"
                style={{ backgroundColor: colors[index] || `hsl(${index * 60}, 70%, 50%)` }}
              />
              <span className="legend-label">{series.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Map Component (simplified - would use react-leaflet in practice)
interface MapProps {
  component: MapComponent;
}

export const Map: React.FC<MapProps> = ({ component }) => {
  const { data, config } = component;
  const { features } = data;
  const { title, center = [0, 0], zoom = 10, showPopups = true } = config || {};

  // This is a simplified map implementation
  // In practice, you would use react-leaflet and proper GeoJSON rendering
  return (
    <div className="map-container">
      {title && <h3 className="map-title">{title}</h3>}
      
      <div className="map-placeholder">
        <div className="map-info">
          <p>Map View</p>
          <p>Center: [{center[0]}, {center[1]}]</p>
          <p>Zoom: {zoom}</p>
          <p>Features: {features.length}</p>
        </div>
        
        {features.length > 0 && (
          <div className="features-list">
            <h4>Features:</h4>
            {features.slice(0, 5).map((feature, index) => (
              <div key={index} className="feature-item">
                <span className="feature-type">{feature.geometry.type}</span>
                {feature.properties && showPopups && (
                  <span className="feature-props">
                    {Object.keys(feature.properties).length} properties
                  </span>
                )}
              </div>
            ))}
            {features.length > 5 && <p>... and {features.length - 5} more</p>}
          </div>
        )}
      </div>
    </div>
  );
};

// Component Registry
export const componentRegistry = {
  Table,
  Chart,
  Map,
} as const;

export type ComponentType = keyof typeof componentRegistry;
