"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = exports.io = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
const config_1 = require("./config");
const database_1 = require("./config/database");
const redis_1 = require("redis");
const routes_1 = __importDefault(require("./routes"));
const sockets_1 = require("./sockets");
const app = (0, express_1.default)();
exports.app = app;
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: { origin: config_1.config.socketIo.corsOrigin },
});
exports.io = io;
// Redis client
const redisClient = (0, redis_1.createClient)({ url: config_1.config.redis.url });
exports.redisClient = redisClient;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// API routes
app.use('/api/v1', routes_1.default);
// Socket.io handlers
(0, sockets_1.setupSocketHandlers)(io);
// Error handling middleware
app.use((err, req, res, next) => {
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
        await database_1.db.raw('SELECT 1');
        console.log('✓ Database connected');
        // Start HTTP server
        server.listen(config_1.config.port, () => {
            console.log(`✓ CAD Backend running on port ${config_1.config.port}`);
            console.log(`✓ Environment: ${config_1.config.env}`);
            console.log(`✓ Socket.IO enabled`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server.js.map