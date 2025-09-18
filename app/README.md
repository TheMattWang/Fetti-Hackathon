# SQL Agent Frontend

A React frontend for the LangGraph SQL Agent with server-driven UI capabilities following security-first design principles.

## Features

### 🔒 Security-First Design
- **Whitelisted Components**: Only Table, Chart, and Map components are allowed
- **Patch Validation**: Every patch is validated with Zod schemas before application
- **Payload Limits**: Enforced limits on data sizes (200 table rows, 1000 chart points, 5000 map points)
- **Error Handling**: Failed patches are dropped and logged, never breaking the UI

### 🎨 Server-Driven UI
- **Dynamic Components**: UI components are created based on agent responses
- **Patch Protocol**: Supports `append` and `set` operations on component arrays
- **Real-time Updates**: Components update live as the agent processes queries

### 📊 Rich Visualizations
- **Interactive Tables**: Sortable, filterable, paginated data tables
- **Dynamic Charts**: Line, bar, and scatter plots with customizable styling
- **Map Support**: GeoJSON-ready map components (placeholder implementation)

### 🔄 Real-Time Communication
- **Server-Sent Events**: Efficient streaming of agent responses
- **Heartbeat Monitoring**: Automatic connection health checks
- **Auto-Reconnection**: Intelligent reconnection with exponential backoff

## Project Structure

```
app/
├── lib/
│   ├── schemas.ts         # Zod schemas & TS types for components + patches
│   └── patch.ts           # validateAndApplyPatches + patch operations
├── components/
│   ├── componentRegistry.tsx   # Whitelisted Table/Chart/Map components
│   └── RenderSpec.tsx          # Dynamic component rendering
├── hooks/
│   └── useAgentStream.ts       # SSE/WebSocket connection management
├── App.tsx                     # Main application component
├── App.css                     # Application styles
├── main.tsx                    # React entry point
├── index.html                  # HTML template
├── package.json               # Dependencies and scripts
├── vite.config.ts             # Vite configuration
└── tsconfig.json              # TypeScript configuration
```

## Getting Started

### Prerequisites
- Node.js 18.0.0 or higher
- npm or yarn package manager

### Installation

1. Install dependencies:
   ```bash
   cd app
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to `http://localhost:3000`

### Build for Production

```bash
npm run build
npm run preview
```

## Configuration

### Environment Variables
- The app connects to `http://localhost:8000/agent/stream` by default
- Pass a custom endpoint via the `agentEndpoint` prop to the App component

### CORS Setup
The app is configured to work with an agent backend on `localhost:8000`. Update `vite.config.ts` if your backend runs on a different port.

## Component System

### Table Component
- **Features**: Sorting, filtering, pagination
- **Data Limit**: 200 rows per table
- **Configuration**: Title, sort options, pagination settings

### Chart Component
- **Types**: Line, bar, scatter plots
- **Data Limit**: 1000 points per chart
- **Features**: Multi-series support, custom colors, axis labels

### Map Component
- **Format**: GeoJSON features
- **Data Limit**: 5000 features per map
- **Features**: Center/zoom control, popup support
- **Note**: Currently shows placeholder - integrate with react-leaflet for full functionality

## Patch Protocol

The frontend accepts patch operations that modify the UI specification:

```json
{
  "patches": [
    {
      "op": "append",
      "path": "/children",
      "value": {
        "id": "table-1",
        "type": "Table",
        "data": { ... },
        "config": { ... }
      }
    }
  ],
  "requestId": "req_123"
}
```

### Supported Operations
- `append`: Add a new component to the end of the children array
- `set`: Replace a component at a specific index

### Security Validation
- All patches are validated against Zod schemas
- Invalid patches are dropped and logged
- Component data is size-limited per security rules
- Only whitelisted component types are allowed

## Agent Integration

### Expected Backend Interface

**Stream Endpoint**: `GET /agent/stream`
- Returns Server-Sent Events
- Sends patch operations as JSON messages

**Query Endpoint**: `POST /agent/query`
- Accepts user queries
- Triggers processing and streaming responses

### Message Format
```json
{
  "patches": [...],
  "requestId": "unique-id",
  "message": "Optional status message"
}
```

## Development

### Type Safety
- Full TypeScript coverage
- Zod runtime validation
- Strict type checking enabled

### Code Quality
- ESLint configuration for React and TypeScript
- React hooks rules enforcement
- Unused variable detection

### Performance
- Component-level error boundaries
- Efficient re-rendering with React.memo patterns
- Lazy loading support for large datasets

## Debugging

### Debug Mode
In development, the app shows a debug panel with:
- Connection status
- UI specification state
- Raw message content
- Component count and errors

### Error Handling
- Component-level error boundaries
- Patch validation error display
- Connection error recovery
- User-friendly error messages

## Security Features

### Input Validation
- All incoming data validated with Zod schemas
- Malformed patches are rejected
- Safe component rendering only

### Content Security
- No dynamic HTML or script execution
- Sanitized data rendering
- CORS-restricted connections

### Error Boundaries
- Graceful degradation on component errors
- Isolated failure handling
- Error reporting without UI breaks

## Future Enhancements

### Map Integration
- Replace placeholder with react-leaflet
- Full GeoJSON rendering support
- Interactive map controls

### Chart Enhancements
- Additional chart types (pie, area, etc.)
- Animation support
- Export functionality

### Real-time Features
- WebSocket upgrade option
- Live data streaming
- Collaborative features

## License

This project is part of the Fetti Hackathon codebase.
