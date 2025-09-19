'use client';

import { useState } from 'react';
import { VizPayload } from '@/types/viz';

interface TestDataSimulatorProps {
  onDataChange: (data: VizPayload) => void;
}

export default function TestDataSimulator({ onDataChange }: TestDataSimulatorProps) {
  const [selectedTest, setSelectedTest] = useState<string>('');

  const testScenarios = {
    'location-data': {
      title: 'Location Data (Map)',
      description: 'Trip locations with coordinates',
      data: {
        plan: {
          intent: "map" as const,
          question: "Show all trip locations on a map",
          dataset: "trips",
          sql: "SELECT trip_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, pickup_address, dropoff_address, riders FROM trips LIMIT 50",
          fields: [
            { name: "trip_id", type: "cat" as const },
            { name: "pickup_lat", type: "lat" as const },
            { name: "pickup_lng", type: "lon" as const },
            { name: "dropoff_lat", type: "lat" as const },
            { name: "dropoff_lng", type: "lon" as const },
            { name: "pickup_address", type: "geo" as const },
            { name: "dropoff_address", type: "geo" as const },
            { name: "riders", type: "quant" as const }
          ],
          chart: {
            type: "scatter" as const,
            x: "pickup_lng",
            y: "pickup_lat",
            tooltip: ["trip_id", "pickup_address", "riders"]
          },
          narrative: "Found 50 trip locations across Austin. The map shows pickup and dropoff points with rider counts.",
          quality: { rowCount: 50, rowCountCapHit: false, warnings: [] }
        },
        rows: [
          {
            trip_id: "734889",
            pickup_lat: 30.2958783,
            pickup_lng: -97.7440765,
            dropoff_lat: 30.2848691,
            dropoff_lng: -97.7355144,
            pickup_address: "Shoal Crest, Rio Grande St, Austin, United States, 78705",
            dropoff_address: "Robert L. Patton Building (RLP), East 23rd Street, Austin, TX, USA",
            riders: 9
          },
          {
            trip_id: "734888",
            pickup_lat: 30.2847998,
            pickup_lng: -97.735696,
            dropoff_lat: 30.2957108,
            dropoff_lng: -97.7442129,
            pickup_address: "University Campus, E 23rd St, Austin, United States, 78712",
            dropoff_address: "Cabo Bob's Burritos, Rio Grande Street, Austin, TX, USA",
            riders: 9
          },
          {
            trip_id: "734886",
            pickup_lat: 30.270065,
            pickup_lng: -97.750424,
            dropoff_lat: 30.2655835,
            dropoff_lng: -97.7333707,
            pickup_address: "Market District, W 6th St, Austin, United States, 78701",
            dropoff_address: "601 Brushy Street, Austin, TX, USA",
            riders: 7
          },
          {
            trip_id: "734882",
            pickup_lat: 30.2874096,
            pickup_lng: -97.7451611,
            dropoff_lat: 30.2669106,
            dropoff_lng: -97.7391248,
            pickup_address: "West Campus, W 23rd St, Austin, United States, 78705",
            dropoff_address: "The Aquarium on 6th, East 6th Street, Austin, TX, USA",
            riders: 10
          },
          {
            trip_id: "734880",
            pickup_lat: 30.2656735,
            pickup_lng: -97.7336251,
            dropoff_lat: 30.2662955,
            dropoff_lng: -97.7451516,
            pickup_address: "East End, E 6th St, Austin, United States, 78702",
            dropoff_address: "Coconut Club, Colorado Street, Austin, TX, USA",
            riders: 8
          },
          {
            trip_id: "734875",
            pickup_lat: 30.267153,
            pickup_lng: -97.743061,
            dropoff_lat: 30.2848691,
            dropoff_lng: -97.7355144,
            pickup_address: "Downtown Austin, Congress Ave, Austin, TX, USA",
            dropoff_address: "University of Texas, Austin, TX, USA",
            riders: 6
          },
          {
            trip_id: "734870",
            pickup_lat: 30.2848691,
            pickup_lng: -97.7355144,
            dropoff_lat: 30.267153,
            dropoff_lng: -97.743061,
            pickup_address: "University of Texas, Austin, TX, USA",
            dropoff_address: "Downtown Austin, Congress Ave, Austin, TX, USA",
            riders: 12
          },
          {
            trip_id: "734865",
            pickup_lat: 30.270065,
            pickup_lng: -97.750424,
            dropoff_lat: 30.2958783,
            dropoff_lng: -97.7440765,
            pickup_address: "South Austin, S 1st St, Austin, TX, USA",
            dropoff_address: "North Austin, Burnet Rd, Austin, TX, USA",
            riders: 5
          }
        ]
      }
    },
    'categorical-data': {
      title: 'Categorical Data (Bar/Pie)',
      description: 'Trip categories and rider counts',
      data: {
        plan: {
          intent: "compare" as const,
          question: "What are the most popular trip categories?",
          dataset: "trips",
          sql: "SELECT category, COUNT(*) as trip_count, AVG(riders) as avg_riders FROM trips GROUP BY category",
          fields: [
            { name: "category", type: "cat" as const },
            { name: "trip_count", type: "quant" as const },
            { name: "avg_riders", type: "quant" as const }
          ],
          chart: {
            type: "bar" as const,
            x: "category",
            y: "trip_count",
            tooltip: ["category", "trip_count", "avg_riders"]
          },
          narrative: "Analysis shows that downtown trips are most popular with 45 trips, followed by university area with 32 trips. Average riders per trip varies by category.",
          quality: { rowCount: 5, rowCountCapHit: false, warnings: [] }
        },
        rows: [
          { category: "Downtown", trip_count: 45, avg_riders: 8.2 },
          { category: "University", trip_count: 32, avg_riders: 6.8 },
          { category: "Airport", trip_count: 28, avg_riders: 4.5 },
          { category: "Residential", trip_count: 22, avg_riders: 3.2 },
          { category: "Entertainment", trip_count: 18, avg_riders: 7.1 }
        ]
      }
    },
    'time-series-data': {
      title: 'Time Series Data (Line Chart)',
      description: 'Daily trip counts over time',
      data: {
        plan: {
          intent: "trend" as const,
          question: "How do trip counts vary by day of week?",
          dataset: "trips",
          sql: "SELECT day_of_week, COUNT(*) as trip_count, AVG(riders) as avg_riders FROM trips GROUP BY day_of_week ORDER BY day_of_week",
          fields: [
            { name: "day_of_week", type: "cat" as const },
            { name: "trip_count", type: "quant" as const },
            { name: "avg_riders", type: "quant" as const }
          ],
          chart: {
            type: "line" as const,
            x: "day_of_week",
            y: "trip_count",
            tooltip: ["day_of_week", "trip_count", "avg_riders"]
          },
          narrative: "Trip patterns show peak activity on weekends (Saturday: 89 trips, Sunday: 76 trips) with lower weekday activity. Average riders per trip is highest on Friday evenings.",
          quality: { rowCount: 7, rowCountCapHit: false, warnings: [] }
        },
        rows: [
          { day_of_week: "Monday", trip_count: 45, avg_riders: 5.2 },
          { day_of_week: "Tuesday", trip_count: 52, avg_riders: 5.8 },
          { day_of_week: "Wednesday", trip_count: 48, avg_riders: 6.1 },
          { day_of_week: "Thursday", trip_count: 61, avg_riders: 6.5 },
          { day_of_week: "Friday", trip_count: 78, avg_riders: 7.8 },
          { day_of_week: "Saturday", trip_count: 89, avg_riders: 8.2 },
          { day_of_week: "Sunday", trip_count: 76, avg_riders: 7.1 }
        ]
      }
    },
    'large-groups-analysis': {
      title: 'Large Groups Analysis (Map + Categories)',
      description: 'When do large groups (6+ riders) typically ride downtown?',
      data: {
        plan: {
          intent: "map" as const,
          question: "When do large groups (6+ riders) typically ride downtown?",
          dataset: "trips",
          sql: "SELECT trip_id, pickup_lat, pickup_lng, pickup_address, time_of_day, riders, day_of_week FROM trips WHERE riders >= 6 AND pickup_address LIKE '%downtown%'",
          fields: [
            { name: "trip_id", type: "cat" as const },
            { name: "pickup_lat", type: "lat" as const },
            { name: "pickup_lng", type: "lon" as const },
            { name: "pickup_address", type: "geo" as const },
            { name: "time_of_day", type: "cat" as const },
            { name: "riders", type: "quant" as const },
            { name: "day_of_week", type: "cat" as const }
          ],
          chart: {
            type: "scatter" as const,
            x: "pickup_lng",
            y: "pickup_lat",
            tooltip: ["trip_id", "time_of_day", "riders", "day_of_week"]
          },
          narrative: "Large groups (6+ riders) typically ride downtown during evening hours (6-10 PM) on weekends. Friday and Saturday evenings show the highest concentration of large group trips, with an average of 8.5 riders per trip during peak hours.",
          quality: { rowCount: 23, rowCountCapHit: false, warnings: [] }
        },
        rows: [
          {
            trip_id: "734889",
            pickup_lat: 30.267153,
            pickup_lng: -97.743061,
            pickup_address: "Downtown Austin, Congress Ave, Austin, TX, USA",
            time_of_day: "Evening",
            riders: 9,
            day_of_week: "Friday"
          },
          {
            trip_id: "734888",
            pickup_lat: 30.267153,
            pickup_lng: -97.743061,
            pickup_address: "Downtown Austin, 6th Street, Austin, TX, USA",
            time_of_day: "Evening",
            riders: 8,
            day_of_week: "Saturday"
          },
          {
            trip_id: "734886",
            pickup_lat: 30.267153,
            pickup_lng: -97.743061,
            pickup_address: "Downtown Austin, Rainey Street, Austin, TX, USA",
            time_of_day: "Evening",
            riders: 7,
            day_of_week: "Friday"
          },
          {
            trip_id: "734882",
            pickup_lat: 30.267153,
            pickup_lng: -97.743061,
            pickup_address: "Downtown Austin, Red River St, Austin, TX, USA",
            time_of_day: "Evening",
            riders: 10,
            day_of_week: "Saturday"
          },
          {
            trip_id: "734880",
            pickup_lat: 30.267153,
            pickup_lng: -97.743061,
            pickup_address: "Downtown Austin, Lavaca St, Austin, TX, USA",
            time_of_day: "Evening",
            riders: 8,
            day_of_week: "Friday"
          },
          {
            trip_id: "734875",
            pickup_lat: 30.267153,
            pickup_lng: -97.743061,
            pickup_address: "Downtown Austin, Congress Ave, Austin, TX, USA",
            time_of_day: "Evening",
            riders: 6,
            day_of_week: "Saturday"
          },
          {
            trip_id: "734870",
            pickup_lat: 30.267153,
            pickup_lng: -97.743061,
            pickup_address: "Downtown Austin, 6th Street, Austin, TX, USA",
            time_of_day: "Evening",
            riders: 12,
            day_of_week: "Friday"
          },
          {
            trip_id: "734865",
            pickup_lat: 30.267153,
            pickup_lng: -97.743061,
            pickup_address: "Downtown Austin, Rainey Street, Austin, TX, USA",
            time_of_day: "Evening",
            riders: 9,
            day_of_week: "Saturday"
          }
        ]
      }
    },
    'distribution-data': {
      title: 'Distribution Data (Histogram)',
      description: 'Distribution of rider counts',
      data: {
        plan: {
          intent: "distribution" as const,
          question: "What is the distribution of rider counts?",
          dataset: "trips",
          sql: "SELECT riders, COUNT(*) as frequency FROM trips GROUP BY riders ORDER BY riders",
          fields: [
            { name: "riders", type: "quant" as const },
            { name: "frequency", type: "quant" as const }
          ],
          chart: {
            type: "hist" as const,
            x: "riders",
            y: "frequency",
            tooltip: ["riders", "frequency"]
          },
          narrative: "The distribution shows that most trips have 4-6 riders (peak at 5 riders with 89 trips), with fewer trips having very small (1-2 riders) or very large (10+ riders) groups.",
          quality: { rowCount: 10, rowCountCapHit: false, warnings: [] }
        },
        rows: [
          { riders: 1, frequency: 12 },
          { riders: 2, frequency: 28 },
          { riders: 3, frequency: 45 },
          { riders: 4, frequency: 67 },
          { riders: 5, frequency: 89 },
          { riders: 6, frequency: 76 },
          { riders: 7, frequency: 54 },
          { riders: 8, frequency: 38 },
          { riders: 9, frequency: 23 },
          { riders: 10, frequency: 15 }
        ]
      }
    }
  };

  const handleTestSelect = (testKey: string) => {
    setSelectedTest(testKey);
    const testData = testScenarios[testKey as keyof typeof testScenarios];
    if (testData) {
      onDataChange(testData.data);
    }
  };

  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="text-lg font-semibold text-blue-900 mb-3">🧪 Test Data Simulator</h3>
      <p className="text-blue-700 text-sm mb-4">
        Since the LLM might not be accessible, use these test scenarios to explore the enhanced visualization system:
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(testScenarios).map(([key, scenario]) => (
          <button
            key={key}
            onClick={() => handleTestSelect(key)}
            className={`p-3 rounded-lg border text-left transition-colors ${
              selectedTest === key
                ? 'border-blue-500 bg-blue-100'
                : 'border-blue-200 bg-white hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            <div className="font-medium text-sm text-blue-900">{scenario.title}</div>
            <div className="text-xs text-blue-600 mt-1">{scenario.description}</div>
          </button>
        ))}
      </div>
      
      {selectedTest && (
        <div className="mt-3 p-2 bg-blue-100 rounded text-sm text-blue-800">
          ✅ Loaded: {testScenarios[selectedTest as keyof typeof testScenarios].title}
        </div>
      )}
    </div>
  );
}
