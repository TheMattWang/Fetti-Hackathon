'use client';

import { VizPayload } from '@/types/viz';

interface DemoTestCasesProps {
  onDataChange: (data: VizPayload) => void;
}

export default function DemoTestCases({ onDataChange }: DemoTestCasesProps) {
  const loadMoodyCenterDemo = () => {
    const testData: VizPayload = {
      plan: {
        intent: "analyze",
        question: "How many groups went to Moody Center last month?",
        dataset: "trips",
        sql: "SELECT group_size, COUNT(*) as trip_count FROM trips WHERE dropoff_address LIKE '%Moody Center%' AND started_at >= '2024-08-01' AND started_at < '2024-09-01' GROUP BY group_size ORDER BY group_size",
        fields: [
          { name: "group_size", type: "quant" },
          { name: "trip_count", type: "quant" }
        ],
        chart: {
          type: "bar",
          x: "group_size",
          y: "trip_count",
          tooltip: ["group_size", "trip_count"]
        },
        narrative: "Analysis of Moody Center visits last month shows interesting group size patterns. Solo riders (1 person) made up the largest segment with 45 trips, followed by couples (2 people) with 38 trips. Medium groups of 3-4 people accounted for 52 trips combined, while larger groups of 5+ people made 25 trips total. This suggests Moody Center attracts both individual concert-goers and social groups, with a healthy mix of group sizes.",
        quality: { rowCount: 6, rowCountCapHit: false, warnings: [] }
      },
      rows: [
        { group_size: 1, trip_count: 45 },
        { group_size: 2, trip_count: 38 },
        { group_size: 3, trip_count: 28 },
        { group_size: 4, trip_count: 24 },
        { group_size: 5, trip_count: 15 },
        { group_size: 6, trip_count: 10 }
      ]
    };
    onDataChange(testData);
  };

  const loadSaturdayNightDemo = () => {
    // Generate realistic Austin locations for 18-24 year olds on Saturday nights
    const austinHotspots = [
      { name: "6th Street", lat: 30.2672, lng: -97.7431, count: 23 },
      { name: "Rainey Street", lat: 30.2606, lng: -97.7334, count: 18 },
      { name: "South by SoCo", lat: 30.2500, lng: -97.7500, count: 15 },
      { name: "East 6th Street", lat: 30.2672, lng: -97.7300, count: 12 },
      { name: "West Campus", lat: 30.2849, lng: -97.7341, count: 20 },
      { name: "Domain", lat: 30.4000, lng: -97.7000, count: 8 },
      { name: "South Austin", lat: 30.2000, lng: -97.7500, count: 14 },
      { name: "Cedar Park", lat: 30.5000, lng: -97.8200, count: 6 },
      { name: "Round Rock", lat: 30.5000, lng: -97.6700, count: 9 },
      { name: "Pflugerville", lat: 30.4500, lng: -97.6200, count: 5 },
      { name: "Lake Travis", lat: 30.4000, lng: -97.9000, count: 7 },
      { name: "Barton Springs", lat: 30.2642, lng: -97.7731, count: 11 },
      { name: "Zilker Park", lat: 30.2669, lng: -97.7714, count: 13 },
      { name: "South Lamar", lat: 30.2500, lng: -97.7800, count: 16 },
      { name: "North Loop", lat: 30.3000, lng: -97.7200, count: 10 },
      { name: "Burnet Road", lat: 30.3200, lng: -97.7400, count: 8 },
      { name: "Manor Road", lat: 30.3000, lng: -97.7000, count: 6 },
      { name: "Airport Blvd", lat: 30.2800, lng: -97.6800, count: 4 },
      { name: "Guadalupe Street", lat: 30.2849, lng: -97.7400, count: 17 },
      { name: "Red River", lat: 30.2700, lng: -97.7400, count: 19 }
    ];

    const testData: VizPayload = {
      plan: {
        intent: "map",
        question: "What are the top drop-off spots for 18–24 year-olds on Saturday nights?",
        dataset: "trips",
        sql: "SELECT location_name, latitude, longitude, trip_count FROM (SELECT dropoff_address as location_name, pickup_lat as latitude, pickup_lng as longitude, COUNT(*) as trip_count FROM trips WHERE user_age BETWEEN 18 AND 24 AND strftime('%w', started_at) = '6' AND strftime('%H', started_at) BETWEEN '20' AND '23' GROUP BY dropoff_address, pickup_lat, pickup_lng ORDER BY trip_count DESC LIMIT 20)",
        fields: [
          { name: "location_name", type: "cat" },
          { name: "latitude", type: "lat" },
          { name: "longitude", type: "lon" },
          { name: "trip_count", type: "quant" }
        ],
        chart: {
          type: "scatter",
          x: "longitude",
          y: "latitude",
          tooltip: ["location_name", "trip_count"]
        },
        narrative: "Saturday night drop-off patterns for 18-24 year olds reveal Austin's vibrant nightlife scene. 6th Street dominates as the top destination with 23 trips, followed by Rainey Street (18 trips) and West Campus (20 trips). The data shows clear clustering around entertainment districts, with East 6th Street, South by SoCo, and South Lamar also popular destinations. This reflects the typical Saturday night flow of young adults heading to bars, clubs, and social venues across Austin's most happening areas.",
        quality: { rowCount: 20, rowCountCapHit: false, warnings: [] }
      },
      rows: austinHotspots.map(spot => ({
        location_name: spot.name,
        latitude: spot.lat + (Math.random() - 0.5) * 0.01, // Add slight variation
        longitude: spot.lng + (Math.random() - 0.5) * 0.01,
        trip_count: spot.count
      }))
    };
    onDataChange(testData);
  };

  return (
    <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl">
      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
        🎯 Demo Test Cases
      </h3>
      <p className="text-gray-700 mb-6">
        Try these realistic scenarios that showcase the full agent-to-visualization flow:
      </p>
      
      <div className="grid md:grid-cols-2 gap-4">
        {/* Moody Center Demo */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
            📊 Distribution Analysis
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            <strong>Query:</strong> "How many groups went to Moody Center last month?"
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Shows group size distribution with bar chart visualization
          </p>
          <button
            onClick={loadMoodyCenterDemo}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            🎵 Load Moody Center Analysis
          </button>
        </div>

        {/* Saturday Night Demo */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
            🗺️ Location Mapping
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            <strong>Query:</strong> "What are the top drop-off spots for 18–24 year-olds on Saturday nights?"
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Interactive map showing Austin nightlife hotspots with trip counts
          </p>
          <button
            onClick={loadSaturdayNightDemo}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            🌃 Load Saturday Night Map
          </button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>💡 Demo Features:</strong> These test cases demonstrate the complete flow from natural language query → SQL generation → data processing → intelligent visualization selection → interactive charts and maps.
        </p>
      </div>
    </div>
  );
}
