'use client';

import Map, { Source, Layer } from 'react-map-gl/maplibre';
import { VizPlan } from '@/types/viz';
import { getFieldByName, getLatLonFields, formatValue } from '@/lib';

interface PointMapViewProps {
  plan: VizPlan;
  rows: any[];
}

export default function PointMapView({ plan, rows }: PointMapViewProps) {
  const { lat, lon } = getLatLonFields(plan.fields);
  const valueField = getFieldByName(plan.fields, plan.chart.y || '');

  if (!lat || !lon) {
    return <div className="p-8 text-center text-gray-500">Missing lat/lon fields for point map</div>;
  }

  // Create GeoJSON for points
  const pointData = {
    type: 'FeatureCollection',
    features: rows.map(row => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [row[lon.name], row[lat.name]]
      },
      properties: {
        value: valueField ? row[valueField.name] : 1,
        ...row
      }
    }))
  };

  // Calculate center point
  const lats = rows.map(row => row[lat.name]);
  const lons = rows.map(row => row[lon.name]);
  const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const centerLon = lons.reduce((a, b) => a + b, 0) / lons.length;

  // Calculate radius scale if we have values
  const values = valueField ? rows.map(row => row[valueField.name]).filter(v => typeof v === 'number') : [1];
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  const getRadius = (value: number) => {
    if (!valueField || typeof value !== 'number') return 6;
    const normalized = (value - minValue) / (maxValue - minValue);
    return 4 + (normalized * 12); // 4-16px radius
  };

  return (
    <div className="w-full">
      <div className="h-96">
        <Map
          initialViewState={{
            longitude: centerLon,
            latitude: centerLat,
            zoom: 6
          }}
          mapStyle="https://demotiles.maplibre.org/style.json"
          style={{ width: '100%', height: '100%' }}
        >
          <Source id="points" type="geojson" data={pointData}>
            <Layer
              id="point-circles"
              type="circle"
              paint={{
                'circle-color': '#3b82f6',
                'circle-opacity': 0.8,
                'circle-radius': [
                  'case',
                  ['has', 'value'],
                  ['interpolate', ['linear'], ['get', 'value'], minValue, 4, maxValue, 16],
                  6
                ]
              }}
            />
            <Layer
              id="point-borders"
              type="circle"
              paint={{
                'circle-color': '#ffffff',
                'circle-radius': [
                  'case',
                  ['has', 'value'],
                  ['+', ['interpolate', ['linear'], ['get', 'value'], minValue, 4, maxValue, 16], 1],
                  7
                ],
                'circle-opacity': 1
              }}
            />
          </Source>
        </Map>
      </div>

      {/* Legend */}
      {valueField && (
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">Point size:</div>
            <div className="flex items-center gap-2">
              <div 
                className="rounded-full bg-blue-500" 
                style={{ width: getRadius(minValue) * 2, height: getRadius(minValue) * 2 }}
              ></div>
              <span className="text-sm">{formatValue(minValue, valueField)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="rounded-full bg-blue-500" 
                style={{ width: getRadius(maxValue) * 2, height: getRadius(maxValue) * 2 }}
              ></div>
              <span className="text-sm">{formatValue(maxValue, valueField)}</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
        <div>
          {rows.length} points
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
