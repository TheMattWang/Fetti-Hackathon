'use client';

import { useState, useEffect } from 'react';
import Map, { Source, Layer } from 'react-map-gl/maplibre';
import { VizPlan } from '@/types/viz';
import { getFieldByName, getGeoField, formatValue } from '@/lib';

interface ChoroplethViewProps {
  plan: VizPlan;
  rows: any[];
}

export default function ChoroplethView({ plan, rows }: ChoroplethViewProps) {
  const [geoData, setGeoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const geoField = getGeoField(plan.fields);
  const valueField = getFieldByName(plan.fields, plan.chart.y || '');

  useEffect(() => {
    // Load appropriate GeoJSON based on data
    const loadGeoData = async () => {
      try {
        // Simple heuristic: if we have US state codes, use USA states
        const hasUSStates = rows.some(row => 
          ['CA', 'NY', 'TX', 'FL', 'IL', 'PA'].includes(row[geoField?.name || ''])
        );
        
        const geoFile = hasUSStates ? '/data/usa_states.geojson' : '/data/world_countries.geojson';
        const response = await fetch(geoFile);
        const data = await response.json();
        setGeoData(data);
      } catch (error) {
        console.error('Failed to load GeoJSON:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGeoData();
  }, [geoField?.name, rows]);

  if (!geoField || !valueField) {
    return <div className="p-8 text-center text-gray-500">Missing required fields for choropleth map</div>;
  }

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  if (!geoData) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-gray-500">Failed to load map data</div>
      </div>
    );
  }

  // Create lookup for values by region code
  const valueLookup = rows.reduce((acc, row) => {
    acc[row[geoField.name]] = row[valueField.name];
    return acc;
  }, {} as Record<string, number>);

  // Calculate color scale
  const values = Object.values(valueLookup).filter(v => typeof v === 'number') as number[];
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  const getColor = (value: number) => {
    if (typeof value !== 'number') return '#e5e7eb';
    const normalized = (value - minValue) / (maxValue - minValue);
    const hue = 240 - (normalized * 120); // Blue to red
    return `hsl(${hue}, 70%, 50%)`;
  };

  return (
    <div className="w-full">
      <div className="h-96">
        <Map
          initialViewState={{
            longitude: -95,
            latitude: 38,
            zoom: 3
          }}
          mapStyle="https://demotiles.maplibre.org/style.json"
          style={{ width: '100%', height: '100%' }}
        >
          <Source id="regions" type="geojson" data={geoData}>
            <Layer
              id="region-fills"
              type="fill"
              paint={{
                'fill-color': [
                  'case',
                  ['has', ['get', 'code'], ['get', 'code']],
                  [
                    'case',
                    ['has', ['get', 'code'], ['get', 'code']],
                    getColor(valueLookup[String(['get', 'code'])] || 0),
                    '#e5e7eb'
                  ],
                  '#e5e7eb'
                ],
                'fill-opacity': 0.8
              }}
            />
            <Layer
              id="region-borders"
              type="line"
              paint={{
                'line-color': '#ffffff',
                'line-width': 1
              }}
            />
          </Source>
        </Map>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">Legend:</div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getColor(minValue) }}></div>
            <span className="text-sm">{formatValue(minValue, valueField)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getColor(maxValue) }}></div>
            <span className="text-sm">{formatValue(maxValue, valueField)}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
        <div>
          {rows.length} regions
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
