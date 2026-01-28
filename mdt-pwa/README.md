# MDT PWA

Mobile Data Terminal Progressive Web App with automatic GPS-based timestamping.

## Features

- Automatic geofence-triggered timestamps
- High-accuracy GPS tracking
- Real-time Socket.io communication
- Offline support with service workers
- Wake lock to prevent device sleep
- Battery monitoring
- ETA calculations
- Trip history

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Environment Variables

Create `.env`:

```
VITE_API_URL=http://localhost:8000
VITE_SOCKET_URL=http://localhost:8000
```
