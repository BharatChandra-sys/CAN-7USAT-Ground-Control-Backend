# CAN-7USAT Frontend Dashboard

Professional ground control interface with real-time telemetry visualization.

## Features

- **Real-time WebSocket streaming** - Live data at 10 Hz
- **High-performance charts** - uPlot rendering at 60 FPS
- **3D rocket visualization** - React Three Fiber with quaternion orientation
- **Flight state tracking** - Visual timeline of mission phases
- **Responsive design** - Professional mission control aesthetic

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Development

Frontend runs at: **http://localhost:5173/**  
Backend WebSocket: **ws://localhost:8000/ws/telemetry**

Make sure the backend is running before starting the frontend.

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Zustand** - State management
- **uPlot** - High-performance charts
- **React Three Fiber** - 3D visualization
- **Three.js** - 3D graphics

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx       # Main dashboard
│   │   ├── Dashboard.css       # Styling
│   │   ├── TelemetryChart.tsx  # uPlot charts
│   │   └── Rocket3D.tsx        # 3D visualization
│   ├── stores/
│   │   └── telemetryStore.ts   # Zustand state
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
└── vite.config.ts
```

## Configuration

WebSocket URL is configured in `src/components/Dashboard.tsx`:

```typescript
const WEBSOCKET_URL = 'ws://localhost:8000/ws/telemetry';
```

Change this if your backend runs on a different host/port.

## Performance

- Chart rendering: 60 FPS
- WebSocket updates: 10 Hz
- 3D rendering: 60 FPS
- Bundle size: ~1.3 MB (gzipped: ~366 KB)

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

WebGL 2.0 required for 3D visualization.
