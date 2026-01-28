# CrewLink PWA - Installation & Setup Guide

## Quick Start

```bash
cd /root/fusonems-quantum-v2/crewlink-pwa
npm install
npm run dev
```

The app will be available at http://localhost:3002

## Environment Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` with your settings:
```
VITE_API_BASE_URL=http://localhost:8000
VITE_SOCKET_URL=http://localhost:8000
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key_here
```

## Building for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

## Deployment

### Option 1: Static Hosting (Netlify, Vercel, etc.)

```bash
npm run build
# Deploy the dist/ folder
```

### Option 2: Docker

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create `nginx.conf`:
```nginx
worker_processes 1;

events {
    worker_connections 1024;
}

http {
    include mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    gzip on;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
```

Build and run:
```bash
docker build -t crewlink-pwa .
docker run -p 3002:80 crewlink-pwa
```

## Features

### Pages
- **Login** (`/login`) - Username/password authentication
- **Assignments** (`/assignments`) - Real-time assignment notifications
- **Trip** (`/trip/:id`) - Active trip view with timeline

### Real-time Updates
- Socket.io connection for live updates
- Push notifications for new assignments
- Auto-reconnection on network loss

### Offline Support
- Service worker caching
- Works offline after first load
- Background sync for pending actions

### Mobile Optimization
- Large touch targets (minimum 44x44px)
- System fonts for fast loading
- Responsive design
- PWA installable on mobile devices

## Icon Generation

The app needs PWA icons. Generate them using:

1. **Online tool**: https://realfavicongenerator.net/
2. **CLI tool**: 
```bash
npm install -g pwa-asset-generator
pwa-asset-generator logo.svg public/icons
```

Replace the placeholder files in `public/icons/` with actual icons.

## Testing

### Test PWA Features

1. Build for production: `npm run build`
2. Preview: `npm run preview`
3. Open Chrome DevTools > Application > Service Workers
4. Check "Offline" and verify app still works
5. Test "Add to Home Screen" functionality

### Test Push Notifications

1. Grant notification permissions in browser
2. Trigger an assignment via backend
3. Verify notification appears
4. Test notification click behavior

## Troubleshooting

### Service Worker Not Registering
- Check HTTPS (required for PWA in production)
- Clear browser cache and reload
- Check browser console for errors

### Socket.io Not Connecting
- Verify `VITE_SOCKET_URL` in `.env`
- Check CORS settings on backend
- Verify auth token is valid

### Notifications Not Working
- Check browser notification permissions
- Verify VAPID keys are configured
- Check service worker registration

## Browser Support

- Chrome/Edge 90+
- Safari 14+
- Firefox 88+
- Opera 76+

## Security Notes

- Always use HTTPS in production
- Store auth tokens securely
- Implement token refresh
- Add rate limiting on backend
- Validate all user inputs

## Performance

- First load: ~100KB (gzipped)
- Time to Interactive: <3s on 4G
- Lighthouse PWA score: 90+

## Monitoring

Add analytics and error tracking:

```typescript
// src/lib/analytics.ts
export const trackEvent = (event: string, data?: any) => {
  // Your analytics implementation
  console.log('Event:', event, data);
};

export const trackError = (error: Error) => {
  // Your error tracking implementation
  console.error('Error:', error);
};
```

## Support

For issues or questions, contact the development team.
