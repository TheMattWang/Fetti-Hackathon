'use client';

import { VizPayload } from '@/types/viz';

interface SimpleTestDataProps {
  onDataChange: (data: VizPayload) => void;
}

export default function SimpleTestData({ onDataChange }: SimpleTestDataProps) {
  const loadMapData = () => {
    const testData: VizPayload = {
      plan: {
        intent: "map",
        question: "Show all trip locations on a map",
        dataset: "trips",
        sql: "SELECT trip_id, pickup_lat, pickup_lng, riders FROM trips LIMIT 20",
        fields: [
          { name: "trip_id", type: "cat" },
          { name: "pickup_lat", type: "lat" },
          { name: "pickup_lng", type: "lon" },
          { name: "riders", type: "quant" }
        ],
        chart: {
          type: "scatter",
          x: "pickup_lng",
          y: "pickup_lat",
          tooltip: ["trip_id", "riders"]
        },
        narrative: "Quick test: Showing 20 trip locations on a map with rider counts.",
        quality: { rowCount: 20, rowCountCapHit: false, warnings: [] }
      },
      rows: Array.from({ length: 20 }, (_, i) => ({
        trip_id: `trip_${i + 1}`,
        pickup_lat: 30.267153 + (Math.random() - 0.5) * 0.1,
        pickup_lng: -97.743061 + (Math.random() - 0.5) * 0.1,
        riders: Math.floor(Math.random() * 10) + 1
      }))
    };
    onDataChange(testData);
  };

  const loadBarData = () => {
    const testData: VizPayload = {
      plan: {
        intent: "compare",
        question: "What are the most popular trip categories?",
        dataset: "trips",
        sql: "SELECT category, COUNT(*) as trip_count FROM trips GROUP BY category",
        fields: [
          { name: "category", type: "cat" },
          { name: "trip_count", type: "quant" }
        ],
        chart: {
          type: "bar",
          x: "category",
          y: "trip_count",
          tooltip: ["category", "trip_count"]
        },
        narrative: "Analysis shows that downtown trips are most popular with 45 trips, followed by university area with 32 trips.",
        quality: { rowCount: 5, rowCountCapHit: false, warnings: [] }
      },
      rows: [
        { category: "Downtown", trip_count: 45 },
        { category: "University", trip_count: 32 },
        { category: "Airport", trip_count: 28 },
        { category: "Residential", trip_count: 22 },
        { category: "Entertainment", trip_count: 18 }
      ]
    };
    onDataChange(testData);
  };

  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="text-lg font-semibold text-blue-900 mb-3">🧪 Test Data</h3>
      <p className="text-blue-700 text-sm mb-4">
        Load test data to explore the enhanced visualization system:
      </p>
      
      <div className="flex gap-3">
        <button
          onClick={loadMapData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          🗺️ Load Map Data
        </button>
        <button
          onClick={loadBarData}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          📊 Load Bar Chart Data
        </button>
      </div>
    </div>
  );
}
