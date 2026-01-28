# MDT PWA Quick Start Guide

## Installation

```bash
cd /root/fusonems-quantum-v2/mdt-pwa
npm install
```

## Configuration

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your backend URLs:

```env
VITE_API_URL=http://localhost:8000
VITE_SOCKET_URL=http://localhost:8000
```

## Development

```bash
npm run dev
```

Open http://localhost:3004 in your browser.

## Production Build

```bash
npm run build
```

Output will be in `dist/` directory.

## Testing on Tablet

### Local Network Testing

1. Start dev server:
   ```bash
   npm run dev -- --host
   ```

2. Find your local IP:
   ```bash
   hostname -I
   ```

3. On tablet, navigate to: `http://YOUR_IP:3004`

### HTTPS Requirement

For GPS and service workers to work, you need HTTPS in production:

```bash
# Using ngrok for testing
npx ngrok http 3004
```

## Usage

### 1. Login
- Enter credentials
- Grant location permissions when prompted
- App will redirect to active trip screen

### 2. Active Trip
- GPS tracking starts automatically
- View incident details, patient info, locations
- Monitor geofence status (pending/approaching/inside)
- Auto-timestamps trigger when crossing geofences:
  - Leaving pickup → "Transporting Patient"
  - Entering destination → "At Destination Facility"
- Manual override available via "Override Timestamp" button
- "Patient Contact" button for manual patient contact timestamp

### 3. Trip History
- View past trips
- Filter by: All / Today / This Week
- Click trip to view details

## Geofence Behavior

### Pickup Location
- **Inside (<500m)**: Green "INSIDE" status
- **Approaching (500m-1km)**: Orange "APPROACHING" status
- **Pending (>1km)**: Gray "PENDING" status

### Destination Location
- Same logic as pickup
- Auto-timestamp "At Destination Facility" when entering geofence

### Auto-Timestamps
- System monitors GPS every 5 seconds
- Detects when crossing geofence boundaries
- Sends timestamp via Socket.io with `source: 'auto'`
- Shows green badge in timeline

### Manual Overrides
- Click "Override Timestamp" button
- Select timestamp type
- Sends with `source: 'manual'`
- Shows blue badge in timeline

## Troubleshooting

### GPS Not Working
- Check location permissions in browser settings
- Ensure HTTPS (or localhost)
- Wait 10-30 seconds for GPS lock
- Check accuracy value (<20m is good)

### Battery Draining
- High-accuracy GPS drains battery faster
- Keep device plugged in during shifts
- Warning appears when battery <20%

### Timestamps Not Sending
- Check Socket.io connection (console logs)
- Verify backend is running
- Check network connectivity
- Manual override should still work

### App Not Installing (PWA)
- Must be served over HTTPS
- Chrome: "Install app" prompt in address bar
- Safari: Share → Add to Home Screen

## Key Features

✅ Automatic GPS-based timestamps  
✅ 500m geofence radius  
✅ Real-time Socket.io updates  
✅ Offline support with service workers  
✅ Wake lock prevents screen sleep  
✅ Battery monitoring  
✅ ETA calculations  
✅ Dark theme optimized for tablets  
✅ Large touch-friendly buttons  

## Production Deployment

### Static Hosting

```bash
npm run build
# Upload dist/ to your web server
```

### Docker (example)

```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
```

```bash
docker build -t mdt-pwa .
docker run -p 80:80 mdt-pwa
```

### Environment-specific Builds

```bash
# Staging
VITE_API_URL=https://staging-api.example.com npm run build

# Production
VITE_API_URL=https://api.example.com npm run build
```

## Performance

- Initial load: **273.86 KiB** (85.53 KiB gzipped)
- GPS update frequency: Every 5 seconds
- Geofence check: On every GPS update
- Battery impact: High (continuous GPS tracking)

## Browser Support

✅ Chrome/Edge 90+  
✅ Safari 14+ (iOS/iPadOS)  
✅ Firefox 88+  

## Security Considerations

- Location data transmitted over Socket.io (use WSS in production)
- Auth token stored in localStorage
- API requests include Bearer token
- HTTPS required for GPS access

## Development Tips

### Hot Reload
Changes to `src/` files trigger automatic reload.

### TypeScript Strict Mode
All files use strict TypeScript. Errors will prevent build.

### Tailwind CSS
Use existing utility classes. Check `tailwind.config.js` for custom colors.

### Socket.io Events
Monitor events in browser console during development.

---

**MDT PWA is ready for deployment to ambulance and helicopter tablets!**
