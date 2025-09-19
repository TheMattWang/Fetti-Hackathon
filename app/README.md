# SQL Agent Insights Frontend

A production-ready Next.js frontend for interactive data visualization powered by LangGraph.

## Features

- **Interactive Visualizations**: Charts, tables, and maps using Recharts, TanStack Table, and MapLibre GL
- **Server-Driven UI**: Renders visualizations from normalized specs returned by the backend
- **Multiple Chart Types**: Bar, line, area, scatter, histogram, box, pie, funnel, and choropleth maps
- **Geographic Mapping**: Choropleth maps for regions and point maps for lat/lon data
- **Responsive Design**: Clean, minimal UI with Tailwind CSS
- **Data Export**: CSV download functionality
- **Plan Inspection**: View the analysis plan in a collapsible drawer

## Tech Stack

- **Next.js 14+** with App Router
- **TypeScript** for type safety
- **Recharts** for data visualization
- **TanStack Table** for data tables
- **MapLibre GL** via `react-map-gl` for maps
- **Tailwind CSS** for styling

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser** and navigate to `http://localhost:3000`

## Example Queries

Try these example queries to see the different visualization types:

- **Trend Analysis**: "Show weekly active users by plan for last quarter, forecast next 2 weeks"
- **Geographic Analysis**: "Revenue by state last month (map)"
- **Category Analysis**: "Top categories by revenue"

## Data Contract

The frontend expects data in the following format from the backend API:

```typescript
type VizPayload = {
  plan: VizPlan;
  rows: any[];
};

type VizPlan = {
  intent: "describe"|"trend"|"compare"|"segment"|"forecast"|"distribution"|"map"|"funnel";
  question: string;
  dataset: string;
  sql: string;
  fields: Field[];
  chart: ChartSpec;
  narrative?: string;
  quality?: { rowCount?: number; rowCountCapHit?: boolean; warnings?: string[] };
};
```

## API Endpoints

- `GET /api/insight?q={query}` - Returns visualization data based on the query

## Project Structure

```
app/
├── app/                    # Next.js App Router
│   ├── api/insight/       # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── charts/           # Chart components
│   ├── maps/             # Map components
│   ├── TableView.tsx     # Data table
│   └── VizRenderer.tsx   # Main renderer
├── data/                 # GeoJSON data files
├── lib/                  # Utility functions
├── types/                # TypeScript types
└── public/               # Static assets
```

## Features Implemented

✅ **Chart Types**: All requested chart types (bar, line, area, scatter, hist, box, pie, funnel)
✅ **Maps**: Choropleth and point maps with MapLibre GL
✅ **Table View**: Sortable data table with TanStack Table
✅ **Responsive Design**: Mobile-friendly layout
✅ **Loading States**: Skeleton loading animations
✅ **Error Handling**: User-friendly error messages
✅ **CSV Export**: Download data as CSV
✅ **Plan Inspection**: View analysis plan JSON
✅ **Auto-conversion**: Pie charts auto-convert to bar for >6 categories
✅ **Top K Badge**: Shows when top K transform is applied
✅ **Confidence Intervals**: Support for forecast confidence bands
✅ **Goal Lines**: Support for reference lines in charts

## Mock Data

The application includes three mock responses:

1. **Trend Data**: Weekly active users with forecast confidence intervals
2. **Map Data**: Revenue by US state for choropleth visualization
3. **Bar Data**: Top categories by revenue

## Development

- **Type Checking**: `npm run type-check`
- **Linting**: `npm run lint`
- **Build**: `npm run build`
- **Start**: `npm start`

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)