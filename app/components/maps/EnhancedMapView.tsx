'use client';

import { useState, useMemo } from 'react';
import Map, { Source, Layer, Popup } from 'react-map-gl/maplibre';
import { VizPlan } from '@/types/viz';
import { 
  getFieldByName, 
  getLatLonFields, 
  formatValue, 
  isNumericField, 
  isCategoricalField,
  getCategoricalFields,
  getNumericFields 
} from '@/lib';

interface EnhancedMapViewProps {
  plan: VizPlan;
  rows: any[];
}

type MapMode = 'points' | 'heatmap' | 'clustered' | 'categorical';

export default function EnhancedMapView({ plan, rows }: EnhancedMapViewProps) {
  const [mapMode, setMapMode] = useState<MapMode>('points');
  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const [popupInfo, setPopupInfo] = useState<any>(null);

  const { lat, lon } = getLatLonFields(plan.fields);
  const valueField = getFieldByName(plan.fields, plan.chart.y || '');
  const categoricalFields = getCategoricalFields(plan.fields);
  const numericFields = getNumericFields(plan.fields);

  // Calculate center point and bounds
  const lats = rows.map(row => parseFloat(row[lat?.name || ''])).filter(val => !isNaN(val));
  const lons = rows.map(row => parseFloat(row[lon?.name || ''])).filter(val => !isNaN(val));
  
  // Default to Austin, TX if no valid coordinates
  const centerLat = lats.length > 0 ? lats.reduce((a, b) => a + b, 0) / lats.length : 30.2672;
  const centerLon = lons.length > 0 ? lons.reduce((a, b) => a + b, 0) / lons.length : -97.7431;

  // Create GeoJSON data
  const geoJsonData = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: rows
      .map((row, index) => {
        const latVal = parseFloat(row[lat?.name || '']);
        const lonVal = parseFloat(row[lon?.name || '']);
        
        // Only include valid coordinates
        if (isNaN(latVal) || isNaN(lonVal)) {
          return null;
        }
        
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [lonVal, latVal]
          },
          properties: {
            id: index,
            value: valueField ? row[valueField.name] : 1,
            ...row
          }
        };
      })
      .filter(feature => feature !== null)
  }), [rows, lat, lon, valueField]);

  // Get categorical values for color mapping
  const categoricalValues = useMemo(() => {
    if (categoricalFields.length === 0) return [];
    const field = categoricalFields[0];
    const values = Array.from(new Set(rows.map(row => row[field.name])));
    return values;
  }, [categoricalFields, rows]);

  // Get numeric value range for sizing
  const numericRange = useMemo(() => {
    if (!valueField || !isNumericField(valueField)) return { min: 1, max: 1 };
    const values = rows.map(row => row[valueField.name]).filter(v => typeof v === 'number');
    return {
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }, [valueField, rows]);

  if (!lat || !lon) {
    return <div className="p-8 text-center text-gray-500">Missing lat/lon fields for map visualization</div>;
  }

  // Color palette for categorical data
  const getCategoricalColor = (value: any) => {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];
    const index = categoricalValues.indexOf(value);
    return colors[index % colors.length];
  };

  const getPointSize = (value: number) => {
    if (!valueField || !isNumericField(valueField)) return 6;
    const normalized = (value - numericRange.min) / (numericRange.max - numericRange.min);
    return 4 + (normalized * 12); // 4-16px radius
  };

  // Render different map layers based on mode
  const renderMapLayers = () => {
    switch (mapMode) {
      case 'heatmap':
        return (
          <>
            <Source id="heatmap" type="geojson" data={geoJsonData}>
              <Layer
                id="heatmap-layer"
                type="heatmap"
                paint={{
                  'heatmap-weight': valueField ? ['get', valueField.name] : 1,
                  'heatmap-intensity': 1,
                  'heatmap-color': [
                    'interpolate',
                    ['linear'],
                    ['heatmap-density'],
                    0, 'rgba(33,102,172,0)',
                    0.2, 'rgb(103,169,207)',
                    0.4, 'rgb(209,229,240)',
                    0.6, 'rgb(253,219,199)',
                    0.8, 'rgb(239,138,98)',
                    1, 'rgb(178,24,43)'
                  ],
                  'heatmap-radius': 20,
                  'heatmap-opacity': 0.8
                }}
              />
            </Source>
          </>
        );

      case 'categorical':
        return (
          <Source id="categorical" type="geojson" data={geoJsonData}>
            {categoricalValues.map((value, index) => (
              <Layer
                key={`categorical-${value}`}
                id={`categorical-${value}`}
                type="circle"
                filter={['==', ['get', categoricalFields[0]?.name || ''], value]}
                paint={{
                  'circle-color': getCategoricalColor(value),
                  'circle-opacity': 0.8,
                  'circle-radius': 8,
                  'circle-stroke-color': '#ffffff',
                  'circle-stroke-width': 2
                }}
              />
            ))}
          </Source>
        );

      case 'clustered':
        return (
          <Source id="clustered" type="geojson" data={geoJsonData} cluster clusterMaxZoom={14} clusterRadius={50}>
            <Layer
              id="clusters"
              type="circle"
              filter={['has', 'point_count']}
              paint={{
                'circle-color': [
                  'step',
                  ['get', 'point_count'],
                  '#51bbd6',
                  100, '#f1f075',
                  750, '#f28cb1'
                ],
                'circle-radius': [
                  'step',
                  ['get', 'point_count'],
                  20,
                  100, 30,
                  750, 40
                ]
              }}
            />
            <Layer
              id="cluster-count"
              type="symbol"
              filter={['has', 'point_count']}
              layout={{
                'text-field': '{point_count_abbreviated}',
                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                'text-size': 12
              }}
            />
            <Layer
              id="unclustered-point"
              type="circle"
              filter={['!', ['has', 'point_count']]}
              paint={{
                'circle-color': '#11b4da',
                'circle-radius': 8,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#fff'
              }}
            />
          </Source>
        );

      default: // points
        return (
          <Source id="points" type="geojson" data={geoJsonData}>
            <Layer
              id="point-circles"
              type="circle"
              paint={{
                'circle-color': valueField && isNumericField(valueField) ? [
                  'interpolate',
                  ['linear'],
                  ['get', valueField.name],
                  numericRange.min, '#3b82f6',
                  numericRange.max, '#ef4444'
                ] : '#3b82f6',
                'circle-opacity': 0.8,
                'circle-radius': valueField && isNumericField(valueField) ? [
                  'interpolate',
                  ['linear'],
                  ['get', valueField.name],
                  numericRange.min, 4,
                  numericRange.max, 16
                ] : 6,
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2
              }}
            />
          </Source>
        );
    }
  };

  // Debug information
  console.log('EnhancedMapView Debug:', {
    latField: lat?.name,
    lonField: lon?.name,
    centerLat,
    centerLon,
    validCoordinates: geoJsonData.features.length,
    totalRows: rows.length,
    mapMode
  });

  if (!lat || !lon) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>Missing latitude or longitude fields for map visualization</p>
        <p className="text-sm mt-2">Available fields: {plan.fields.map(f => f.name).join(', ')}</p>
      </div>
    );
  }

  if (geoJsonData.features.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No valid coordinates found in the data</p>
        <p className="text-sm mt-2">Lat field: {lat.name}, Lon field: {lon.name}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Debug Info */}
      <div className="mb-2 text-xs text-gray-500">
        Showing {geoJsonData.features.length} points • Center: {centerLat.toFixed(4)}, {centerLon.toFixed(4)}
      </div>
      
      {/* Map Mode Selector */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setMapMode('points')}
          className={`px-3 py-1 rounded text-sm ${
            mapMode === 'points' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Points
        </button>
        {valueField && isNumericField(valueField) && (
          <button
            onClick={() => setMapMode('heatmap')}
            className={`px-3 py-1 rounded text-sm ${
              mapMode === 'heatmap' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Heatmap
          </button>
        )}
        <button
          onClick={() => setMapMode('clustered')}
          className={`px-3 py-1 rounded text-sm ${
            mapMode === 'clustered' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Clustered
        </button>
        {categoricalFields.length > 0 && (
          <button
            onClick={() => setMapMode('categorical')}
            className={`px-3 py-1 rounded text-sm ${
              mapMode === 'categorical' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Categories
          </button>
        )}
      </div>

      {/* Map */}
      <div className="h-96 border border-gray-300 rounded-lg overflow-hidden">
        <Map
          initialViewState={{
            longitude: centerLon,
            latitude: centerLat,
            zoom: 10
          }}
          mapStyle={{
            version: 8,
            sources: {
              'raster-tiles': {
                type: 'raster',
                tiles: [
                  'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
                ],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors'
              }
            },
            layers: [
              {
                id: 'simple-tiles',
                type: 'raster',
                source: 'raster-tiles',
                minzoom: 0,
                maxzoom: 22
              }
            ]
          }}
          style={{ width: '100%', height: '100%' }}
          onClick={(e) => {
            if (e.features && e.features.length > 0) {
              setPopupInfo(e.features[0].properties);
            }
          }}
          onError={(error) => {
            console.error('Map error:', error);
          }}
        >
          {renderMapLayers()}
          
          {/* Popup */}
          {popupInfo && (
            <Popup
              longitude={popupInfo[lon.name]}
              latitude={popupInfo[lat.name]}
              onClose={() => setPopupInfo(null)}
              closeButton={true}
              closeOnClick={false}
            >
              <div className="p-2">
                <h3 className="font-semibold mb-2">Location Details</h3>
                {Object.entries(popupInfo).map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span className="font-medium">{key}:</span> {String(value)}
                  </div>
                ))}
              </div>
            </Popup>
          )}
        </Map>
      </div>

      {/* Legend */}
      <div className="mt-4">
        {mapMode === 'categorical' && categoricalFields.length > 0 && (
          <div className="flex flex-wrap gap-4 items-center">
            <div className="text-sm text-gray-600">Categories:</div>
            {categoricalValues.map((value) => (
              <div key={value} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: getCategoricalColor(value) }}
                ></div>
                <span className="text-sm">{String(value)}</span>
              </div>
            ))}
          </div>
        )}

        {mapMode === 'points' && valueField && isNumericField(valueField) && (
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">Value range:</div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span className="text-sm">{formatValue(numericRange.min, valueField)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span className="text-sm">{formatValue(numericRange.max, valueField)}</span>
            </div>
          </div>
        )}

        {mapMode === 'heatmap' && (
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">Heat intensity:</div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-blue-200"></div>
              <div className="w-4 h-4 bg-blue-400"></div>
              <div className="w-4 h-4 bg-yellow-400"></div>
              <div className="w-4 h-4 bg-orange-400"></div>
              <div className="w-4 h-4 bg-red-500"></div>
            </div>
            <span className="text-sm">Low → High</span>
          </div>
        )}
      </div>
      
      {/* Stats */}
      <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
        <div>
          {rows.length} points
          {plan.quality?.rowCountCapHit && ' (capped)'}
        </div>
        <div>
          Mode: {mapMode}
          {plan.quality?.warnings && plan.quality.warnings.length > 0 && (
            <span className="ml-2 text-yellow-600">
              {plan.quality.warnings.length} warning(s)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
