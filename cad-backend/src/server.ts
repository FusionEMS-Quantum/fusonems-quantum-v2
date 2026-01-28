import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Server } from 'socket.io';
import http from 'http';
import { config } from './config';
import { db } from './config/database';
import { createClient } from 'redis';
import apiRoutes from './routes';
import { setupSocketHandlers } from './sockets';

const app: Express = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: config.socketIo.corsOrigin },
});

// Redis client
const redisClient = createClient({ url: config.redis.url });

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1', apiRoutes);

// Socket.io handlers
setupSocketHandlers(io);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
async function startServer() {
  try {
    // Connect to Redis
    await redisClient.connect();
    console.log('✓ Redis connected');
    
    // Test database connection
    await db.raw('SELECT 1');
    console.log('✓ Database connected');
    
    // Start HTTP server
    server.listen(config.port, () => {
      console.log(`✓ CAD Backend running on port ${config.port}`);
      console.log(`✓ Environment: ${config.env}`);
      console.log(`✓ Socket.IO enabled`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { app, io, redisClient };
