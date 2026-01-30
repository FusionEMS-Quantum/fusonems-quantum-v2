# Real-time setup

To use the platform with **live updates** (unit locations, incident status, dispatch, PTT, messages), the Socket.IO server must be running and all clients must point to it.

## 1. Start the Socket.IO server (CAD backend)

The CAD backend serves Socket.IO on the same port as its HTTP API (default `3000`).

```bash
cd cad-backend
npm install
npm run dev
```

In production, run the CAD backend as a long-lived process (PM2, systemd, or your app platform).

## 2. Backend (FastAPI) → Socket bridge

So that the FastAPI backend can **emit** events (e.g. new incidents, assignments), set in `backend/.env`:

- **`CAD_BACKEND_URL`** – Base URL of the CAD backend (e.g. `http://localhost:3000` or `https://cad.yourdomain.com`).
- **`CAD_BACKEND_AUTH_TOKEN`** – Same secret as `CAD_BACKEND_AUTH_TOKEN` in `cad-backend/.env`. The bridge authenticates with this token.

If the bridge fails to connect, the app still runs; real-time events from FastAPI to clients will not flow until it connects.

## 3. Frontends (CAD dashboard, CrewLink PWA, MDT PWA)

In each app’s `.env` (or build env):

- **`VITE_SOCKET_URL`** – Socket.IO server URL. Must match the CAD backend base URL (e.g. `http://localhost:3000` or `https://cad.yourdomain.com`). Used for WebSocket/polling.
- **`VITE_CAD_BACKEND_URL`** or **`VITE_API_URL`** – Same URL for REST API calls to the CAD backend.

Example (development):

```env
VITE_SOCKET_URL=http://localhost:3000
VITE_CAD_BACKEND_URL=http://localhost:3000
VITE_API_URL=http://localhost:3000/api/v1
```

Example (production, same host):

```env
VITE_SOCKET_URL=https://cad.yourdomain.com
VITE_CAD_BACKEND_URL=https://cad.yourdomain.com
```

## 4. What stays real-time

| Component        | Real-time behavior |
|-----------------|--------------------|
| CAD Dashboard   | Unit locations, unit status, incidents, new/updated incidents. Refetches on socket events. |
| CrewLink PWA    | Trip requests, trip updates/cancelled, messages, PTT. |
| MDT PWA         | Incident timestamps, status; join/leave incident room. |
| ePCR (tablet)   | Uses `VITE_WS_URL` (backend 8000) if you run a separate ePCR Socket server; otherwise tablet sync is on load/submit. |

## 5. State endpoints (ePCR)

For **NEMSIS state submission** and **configured states** in the UI:

- **GET `/api/epcr/state-endpoints`** – Returns which state codes are configured and whether each has a submission endpoint (for dropdowns; no URLs exposed).
- **POST `/api/epcr/records/{id}/submit-to-state`** – Submits NEMSIS XML to the configured state (set `WISCONSIN_NEMSIS_ENDPOINT` or `NEMSIS_STATE_ENDPOINTS` in backend `.env`).

Configure in backend `.env`:

```env
NEMSIS_STATE_CODES=WI,IL
NEMSIS_STATE_ENDPOINTS={"WI":"https://...","IL":"https://..."}
# Or for Wisconsin only:
WISCONSIN_NEMSIS_ENDPOINT=https://...
```

## 6. Health

- **CAD Dashboard**: Green dot “Connected” when Socket.IO is connected; “Disconnected” when not. When connected, refetch intervals are relaxed; when disconnected, polling is more frequent.
- **Backend**: Socket bridge health is available via the CAD/socket-bridge health endpoint if implemented; check logs for “Socket bridge connected” / “Socket bridge connection error”.
