/**
 * FastAPI SSO Authentication Middleware
 * 
 * Validates JWT tokens issued by the main FastAPI backend for SSO.
 * This allows CAD backend to accept tokens from the central auth system.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';

interface JWTPayload {
  sub: string;
  org: number;
  role: string;
  email: string;
  name: string;
  apps: string[];
  mfa: boolean;
  device_trusted: boolean;
  on_shift: boolean;
  exp: number;
  iat: number;
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    org_id: number;
    role: string;
    email: string;
    name: string;
    apps: string[];
  };
}

/**
 * Configuration for FastAPI SSO
 */
const SSO_CONFIG = {
  jwtSecret: process.env.FASTAPI_JWT_SECRET || process.env.JWT_SECRET || 'change-this-secret-key',
  fastapiUrl: process.env.FASTAPI_URL || 'http://localhost:8000',
  validateRemote: process.env.SSO_VALIDATE_REMOTE === 'true',
  algorithm: 'HS256' as const,
};

/**
 * Validate JWT token locally using shared secret
 */
function validateTokenLocally(token: string): JWTPayload | null {
  try {
    const payload = jwt.verify(token, SSO_CONFIG.jwtSecret, {
      algorithms: [SSO_CONFIG.algorithm],
    }) as JWTPayload;

    // Check if token has expired
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('JWT validation error:', error);
    return null;
  }
}

/**
 * Validate JWT token remotely against FastAPI backend
 */
async function validateTokenRemotely(token: string): Promise<any> {
  try {
    const response = await axios.post(
      `${SSO_CONFIG.fastapiUrl}/api/sso/validate`,
      { app: 'cad' },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 5000,
      }
    );

    if (response.data.valid) {
      return response.data.user;
    }

    return null;
  } catch (error) {
    console.error('Remote token validation error:', error);
    return null;
  }
}

/**
 * Extract token from request
 */
function extractToken(req: Request): string | null {
  // Try Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try session cookie
  const sessionCookie = req.cookies?.session;
  if (sessionCookie) {
    return sessionCookie;
  }

  return null;
}

/**
 * FastAPI SSO Authentication Middleware
 * 
 * Usage:
 * 
 * import { authenticateFastAPI } from './middleware/fastapi-auth';
 * 
 * // Require authentication for all routes
 * app.use('/api', authenticateFastAPI);
 * 
 * // Or for specific routes
 * router.get('/incidents', authenticateFastAPI, IncidentsController.list);
 */
export async function authenticateFastAPI(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'No valid authentication token provided',
    });
    return;
  }

  try {
    let userData: any;

    // Validate token remotely or locally based on configuration
    if (SSO_CONFIG.validateRemote) {
      userData = await validateTokenRemotely(token);
    } else {
      const payload = validateTokenLocally(token);
      if (payload) {
        // Check if CAD app is in allowed apps
        if (!payload.apps.includes('cad') && !payload.apps.includes('main')) {
          res.status(403).json({
            error: 'Access denied',
            message: 'Token does not have CAD application access',
          });
          return;
        }

        userData = {
          id: payload.sub,
          org_id: payload.org,
          role: payload.role,
          email: payload.email,
          name: payload.name,
          apps: payload.apps,
        };
      }
    }

    if (!userData) {
      res.status(401).json({
        error: 'Invalid token',
        message: 'Token validation failed',
      });
      return;
    }

    // Attach user data to request
    req.user = userData;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred during authentication',
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require authentication
 */
export async function optionalAuthFastAPI(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);

  if (token) {
    try {
      const payload = validateTokenLocally(token);
      if (payload && (payload.apps.includes('cad') || payload.apps.includes('main'))) {
        req.user = {
          id: payload.sub,
          org_id: payload.org,
          role: payload.role,
          email: payload.email,
          name: payload.name,
          apps: payload.apps,
        };
      }
    } catch (error) {
      // Ignore errors for optional auth
      console.warn('Optional auth failed:', error);
    }
  }

  next();
}

/**
 * Role-based authorization middleware
 * 
 * Usage:
 * router.post('/incidents', authenticateFastAPI, requireRole('admin', 'dispatcher'), ...);
 */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        message: `Requires one of: ${roles.join(', ')}`,
      });
      return;
    }

    next();
  };
}

/**
 * Organization context middleware
 * Ensures user belongs to the specified organization
 */
export function requireOrganization(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'User not authenticated',
    });
    return;
  }

  const orgId = req.params.org_id || req.query.org_id || req.body.org_id;

  if (orgId && parseInt(orgId as string) !== req.user.org_id) {
    res.status(403).json({
      error: 'Access denied',
      message: 'User does not belong to this organization',
    });
    return;
  }

  next();
}

export default authenticateFastAPI;
