require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const config = require('./config/config');
const { runMigrations } = require('./src/db/migrations');
const { logger } = require('./src/utils/logger');

const waClient = require('./src/core/whatsapp-client');
const queueEngine = require('./src/core/queue-engine');
const scheduler = require('./src/core/scheduler');

const authRoutes = require('./src/routes/auth.routes');
const contactRoutes = require('./src/routes/contact.routes');
const messageRoutes = require('./src/routes/message.routes');
const campaignRoutes = require('./src/routes/campaign.routes');
const logRoutes = require('./src/routes/log.routes');
const settingRoutes = require('./src/routes/setting.routes');
const { errorHandler } = require('./src/middleware/error-handler');

// Ensure dirs
[config.uploadPath, config.logPath, path.dirname(config.dbPath)].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// DB
runMigrations();
logger.info('Database migrations complete');

// Express
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'src/web')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/settings', settingRoutes);

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/web/index.html'));
});

// Error handler
app.use(errorHandler);

// Socket.io
io.on('connection', (socket) => {
  logger.info('Panel client connected');
  // Send current state on connect
  socket.emit('wa:state', { state: waClient.getState() });
});

// Inject io into modules
waClient.setIo(io);
queueEngine.setIo(io);

// Start services
queueEngine.start();
scheduler.start();

// Try to restore WA session on startup
waClient.initialize().catch((err) => {
  logger.warn('Initial WA connect failed (will retry)', { error: err.message });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  queueEngine.stop();
  await waClient.destroy();
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection', { error: err?.message, stack: err?.stack });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err?.message, stack: err?.stack });
});

server.listen(config.port, () => {
  logger.info(`🚀 Server running at http://localhost:${config.port}`);
});
