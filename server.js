const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');
const cors = require('cors');

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Global timer state
let globalTimer = {
  time: 24 * 60 * 60,
  isRunning: false,
  isPaused: false
};

let timerInterval;
let connectedClients = new Set();

app.prepare().then(() => {
  const expressApp = express();
  const server = createServer(expressApp);
  
  // Initialize Socket.IO with optimized settings for high concurrency
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["*"]
    },
    allowEIO3: true,
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    allowUpgrades: true,
    cookie: false,
    serveClient: true,
    // Performance optimizations
    perMessageDeflate: {
      threshold: 2048, // Only compress data above this size
      zlibInflateOptions: {
        chunkSize: 10 * 1024 // Optimize memory usage
      }
    },
    maxHttpBufferSize: 1e6, // 1 MB
    // Connection throttling
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: true,
    },
    // Batch client updates
    volatile: true
  });

  // Batch timer updates
  let pendingUpdates = new Set();
  const BATCH_INTERVAL = 1000; // Send updates every second

  const broadcastTimerUpdate = () => {
    if (pendingUpdates.size > 0) {
      io.volatile.emit('time-sync', globalTimer);
      pendingUpdates.clear();
    }
  };

  setInterval(broadcastTimerUpdate, BATCH_INTERVAL);

  // Handle Socket.IO connections
  io.on('connection', (socket) => {
    const clientIp = socket.handshake.address;
    
    // Rate limiting per IP
    const rateLimiter = {
      timestamp: Date.now(),
      count: 0
    };

    connectedClients.add(socket.id);

    // Send initial timer state to new connection
    socket.emit('time-sync', globalTimer);

    socket.on('timer-control', (action) => {
      // Rate limiting check (5 actions per 5 seconds)
      const now = Date.now();
      if (now - rateLimiter.timestamp > 5000) {
        rateLimiter.count = 0;
        rateLimiter.timestamp = now;
      }
      if (rateLimiter.count >= 5) {
        return;
      }
      rateLimiter.count++;

      switch (action.type) {
        case 'START':
          globalTimer.isRunning = true;
          globalTimer.isPaused = false;
          if (timerInterval) clearInterval(timerInterval);
          timerInterval = setInterval(() => {
            if (globalTimer.isRunning && !globalTimer.isPaused && globalTimer.time > 0) {
              globalTimer.time--;
              pendingUpdates.add(globalTimer);
            }
          }, 1000);
          break;
        case 'PAUSE':
          globalTimer.isPaused = true;
          break;
        case 'RESUME':
          globalTimer.isPaused = false;
          break;
        case 'STOP':
          globalTimer.isRunning = false;
          globalTimer.isPaused = false;
          globalTimer.time = 24 * 60 * 60;
          if (timerInterval) {
            clearInterval(timerInterval);
          }
          break;
      }

      pendingUpdates.add(globalTimer);
    });

    socket.on('disconnect', () => {
      connectedClients.delete(socket.id);
    });
  });

  // Enable CORS with optimized settings
  expressApp.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['*'],
    maxAge: 86400 // Cache preflight requests for 24 hours
  }));

  // Compression middleware
  expressApp.use(require('compression')());

  // Handle Next.js requests
  expressApp.all('*', (req, res) => {
    return handle(req, res);
  });

  // Listen on all network interfaces
  server.listen(port, '0.0.0.0', (err) => {
    if (err) throw err;
    console.log(`> Server running on port ${port}`);
    console.log('> Server is accessible from:');
    console.log(`> Local: http://localhost:${port}`);
    console.log(`> Network: Access through your network IP on port ${port}`);
  });

  // Cleanup on server shutdown
  process.on('SIGTERM', () => {
    if (timerInterval) clearInterval(timerInterval);
  });
}); 
