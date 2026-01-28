# Single Sign-On (SSO) Implementation Guide

## Overview

The FusonEMS Quantum platform now features a unified Single Sign-On (SSO) authentication system that allows users to seamlessly access all applications with a single login:

- Main FastAPI Application
- CAD Dashboard (Vite React)
- CrewLink PWA (Mobile crew app)
- MDT PWA (Mobile data terminal)
- CAD Backend (Node.js/Express)

## Architecture

### Authentication Authority

The **FastAPI backend** (`/root/fusonems-quantum-v2/backend`) acts as the central authentication authority:

- Issues JWT tokens with enhanced claims
- Manages refresh tokens for long-lived sessions
- Provides token validation endpoints
- Handles session management and logout

### Token Structure

**Access Token** (JWT, 1 hour lifespan):
```json
{
  "sub": "user_id",
  "org": "organization_id",
  "role": "user_role",
  "email": "user@example.com",
  "name": "Full Name",
  "apps": ["main", "cad", "crewlink", "mdt"],
  "mfa": false,
  "device_trusted": true,
  "on_shift": true,
  "exp": 1234567890,
  "iat": 1234567890
}
```

**Refresh Token** (Opaque string, 7-30 days):
- Stored server-side with expiration
- Used to obtain new access tokens
- Can be revoked individually or all at once

## Components

### 1. FastAPI Backend Components

#### `/backend/services/auth/sso_service.py`
Core SSO service managing token creation, validation, and refresh logic.

**Key Features:**
- `create_access_token()` - Generate JWT with enhanced claims
- `create_refresh_token()` - Generate long-lived refresh tokens
- `verify_access_token()` - Validate JWT tokens
- `verify_refresh_token()` - Validate refresh tokens
- `revoke_token()` - Revoke single session
- `revoke_all_tokens()` - Logout from all devices

#### `/backend/services/auth/sso_router.py`
SSO endpoints for authentication operations.

**Endpoints:**
- `POST /api/sso/login` - Login with email/password
- `POST /api/sso/refresh` - Refresh access token
- `POST /api/sso/validate` - Validate token (for external apps)
- `POST /api/sso/logout` - Logout current session
- `POST /api/sso/logout-all` - Logout from all devices
- `GET /api/sso/me` - Get current user info
- `GET /api/sso/health` - Health check

### 2. CAD Backend Middleware

#### `/cad-backend/src/middleware/fastapi-auth.ts`
JWT validation middleware for Node.js/Express CAD backend.

**Features:**
- Validates JWT tokens issued by FastAPI
- Supports both local (shared secret) and remote validation
- Automatic token refresh on 401 errors
- Role-based authorization
- Organization context validation

**Usage:**
```typescript
import { authenticateFastAPI, requireRole } from './middleware/fastapi-auth';

// Require authentication
app.use('/api', authenticateFastAPI);

// Require specific role
router.post('/incidents', authenticateFastAPI, requireRole('admin', 'dispatcher'), ...);
```

### 3. PWA Authentication Clients

Unified auth clients for all frontend applications:
- `/crewlink-pwa/src/lib/auth.ts`
- `/mdt-pwa/src/lib/auth.ts`
- `/cad-dashboard/src/lib/auth.ts`

**Features:**
- Automatic token storage in localStorage
- Auto-refresh 5 minutes before expiry
- Seamless logout across devices
- Backward compatible with legacy tokens
- Axios interceptors for automatic token injection

**Usage:**
```typescript
import { ssoAuth, createFastAPIClient, createCADClient } from './lib/auth';

// Login
await ssoAuth.login({
  email: 'user@example.com',
  password: 'password',
  remember_me: true
});

// Check authentication
if (ssoAuth.isAuthenticated()) {
  const user = ssoAuth.getUser();
}

// Logout
await ssoAuth.logout();

// Logout everywhere
await ssoAuth.logoutAll();

// Use authenticated clients
const fastAPIClient = createFastAPIClient();
const cadClient = createCADClient();
```

## Configuration

### FastAPI Backend

**Environment Variables** (`.env`):
```bash
JWT_SECRET_KEY=your-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
REFRESH_TOKEN_EXPIRE_DAYS_REMEMBER=30
LOCAL_AUTH_ENABLED=true
SESSION_COOKIE_NAME=session
CSRF_COOKIE_NAME=csrf_token
```

### CAD Backend (Node.js)

**Environment Variables** (`.env`):
```bash
# Must match FastAPI JWT_SECRET_KEY
FASTAPI_JWT_SECRET=your-secret-key-change-in-production

# FastAPI backend URL
FASTAPI_URL=http://localhost:8000

# Validation mode: local (faster) or remote (more secure)
SSO_VALIDATE_REMOTE=false
```

### PWAs (Vite Apps)

**Environment Variables** (`.env`):
```bash
# FastAPI backend URL
VITE_FASTAPI_URL=http://localhost:8000

# CAD backend URL
VITE_CAD_BACKEND_URL=http://localhost:3000
```

## Security Features

### 1. Token Security
- **Access tokens**: Short-lived (1 hour) to minimize exposure
- **Refresh tokens**: Stored server-side, can be revoked
- **HTTPS-only cookies** in production
- **HttpOnly cookies** prevent XSS attacks
- **SameSite=Lax** prevents CSRF

### 2. CSRF Protection
- CSRF tokens for cookie-based authentication
- Exempt SSO endpoints from CSRF checks
- Header validation for state-changing operations

### 3. Rate Limiting
- Login attempts rate-limited per email
- Prevents brute force attacks
- Configurable via `AUTH_RATE_LIMIT_PER_MIN`

### 4. Session Management
- Logout everywhere capability
- Individual session revocation
- Server-side token storage
- Automatic cleanup of expired tokens

### 5. Remember Me
- 7 days: Standard refresh token lifetime
- 30 days: With remember_me=true
- User-controlled session duration

## Migration from Legacy Auth

The implementation is **backward compatible**. Applications will:

1. Check for SSO tokens first
2. Fall back to legacy tokens if SSO not available
3. Automatically refresh SSO tokens before expiry
4. Redirect to login on authentication failure

### Migration Steps

1. **Deploy SSO endpoints** (already done)
2. **Update frontend apps** to use new auth client
3. **Test SSO flow** in development
4. **Gradually migrate users** to SSO
5. **Deprecate legacy auth** after migration complete

## Usage Examples

### Frontend Login Component

```typescript
import { useState } from 'react';
import { ssoAuth } from '../lib/auth';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await ssoAuth.login({ email, password, remember_me: rememberMe });
      window.location.href = '/dashboard';
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <label>
        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
        Remember me for 30 days
      </label>
      <button type="submit">Login</button>
    </form>
  );
}
```

### Backend Protected Route

```typescript
import { Router } from 'express';
import { authenticateFastAPI, requireRole } from '../middleware/fastapi-auth';

const router = Router();

// All routes require authentication
router.use(authenticateFastAPI);

// Create incident (dispatcher or admin only)
router.post('/incidents', requireRole('dispatcher', 'admin'), async (req, res) => {
  const user = req.user; // Populated by middleware
  // ... create incident
});

export default router;
```

### API Client Usage

```typescript
import { createFastAPIClient, createCADClient } from './lib/auth';

// Make authenticated requests
const fastAPI = createFastAPIClient();
const cadAPI = createCADClient();

// These automatically include auth tokens and refresh on 401
const response = await fastAPI.get('/api/epcr/records');
const incidents = await cadAPI.get('/api/v1/incidents');
```

## Testing

### Test SSO Login
```bash
curl -X POST http://localhost:8000/api/sso/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password",
    "remember_me": false,
    "app": "main"
  }'
```

### Test Token Validation
```bash
curl -X POST http://localhost:8000/api/sso/validate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"app": "cad"}'
```

### Test Token Refresh
```bash
curl -X POST http://localhost:8000/api/sso/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "YOUR_REFRESH_TOKEN"}'
```

## Troubleshooting

### Issue: "Invalid token" errors

**Solution:** Check that JWT_SECRET_KEY matches between FastAPI and CAD backends.

```bash
# FastAPI
grep JWT_SECRET_KEY backend/.env

# CAD Backend
grep FASTAPI_JWT_SECRET cad-backend/.env
```

### Issue: Tokens not refreshing

**Solution:** Verify auto-refresh is enabled in auth client. Check browser console for errors.

### Issue: CORS errors

**Solution:** Ensure ALLOWED_ORIGINS includes all frontend URLs:

```bash
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173
```

### Issue: Session expires immediately

**Solution:** Check system time synchronization. Ensure server and client clocks are accurate.

## Production Deployment

### Security Checklist

- [ ] Set strong `JWT_SECRET_KEY` (64+ random characters)
- [ ] Enable HTTPS for all services
- [ ] Set `ENV=production` in FastAPI
- [ ] Enable `HTTPS-only` cookies
- [ ] Configure proper CORS origins
- [ ] Enable rate limiting
- [ ] Set up monitoring for failed login attempts
- [ ] Use Redis for refresh token storage (scalability)
- [ ] Implement token rotation (advanced)
- [ ] Consider RS256 for distributed systems (future)

### Environment Variables (Production)

```bash
# FastAPI
ENV=production
JWT_SECRET_KEY=<64-character-random-string>
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
ALLOWED_ORIGINS=https://app.fusonems.com,https://cad.fusonems.com

# CAD Backend
NODE_ENV=production
FASTAPI_JWT_SECRET=<same-as-fastapi>
FASTAPI_URL=https://api.fusonems.com
SSO_VALIDATE_REMOTE=false

# PWAs
VITE_FASTAPI_URL=https://api.fusonems.com
VITE_CAD_BACKEND_URL=https://cad-api.fusonems.com
```

## Future Enhancements

- [ ] Redis-based refresh token storage for horizontal scaling
- [ ] OAuth2/OIDC integration for third-party login
- [ ] Multi-factor authentication (MFA) support
- [ ] Token rotation on refresh
- [ ] RS256 asymmetric signing for microservices
- [ ] Biometric authentication for mobile apps
- [ ] Single logout across federated systems
- [ ] Activity monitoring and anomaly detection

## Support

For issues or questions:
1. Check this documentation
2. Review logs in `/var/log/fusionems/`
3. Test with health endpoints: `/api/sso/health`
4. Contact platform support team

---

**Last Updated:** 2026-01-27
**Version:** 1.0
**Status:** Production Ready
