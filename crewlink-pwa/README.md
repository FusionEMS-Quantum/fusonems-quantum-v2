# CrewLink PWA

Progressive Web App for EMS crew assignment and trip management.

## Features

- Real-time assignment notifications via Socket.io
- Push notifications for incoming assignments
- Offline support with service workers
- Mobile-optimized UI with large touch targets
- Dark theme (#1a1a1a, #ff6b35)
- Geolocation tracking for acknowledgments

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update environment variables in `.env`:
- `VITE_API_BASE_URL`: Backend API URL
- `VITE_SOCKET_URL`: Socket.io server URL
- `VITE_VAPID_PUBLIC_KEY`: VAPID public key for push notifications

4. Start development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

## Pages

- `/login` - Authentication
- `/assignments` - Main assignment screen with real-time updates
- `/trip/:id` - Active trip view with timeline

## Socket.io Events

- `assignment:received` - New assignment notification
- `assignment:updated` - Assignment status update
- `trip:updated` - Trip status update
- `timeline:event` - New timeline event

## API Endpoints

- `POST /api/v1/auth/login` - User authentication
- `POST /api/v1/timeline/:id/acknowledge` - Acknowledge assignment
- `GET /api/v1/trips/:id` - Get trip details
- `POST /api/v1/timeline/:id/complete` - Complete trip
- `GET /api/v1/assignments` - Get assignments list

## PWA Features

- Installable on mobile devices
- Offline support
- Push notifications
- Background sync
- Service worker caching
