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
  
  // Initialize Socket.IO with universal access configuration
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
    serveClient: true
  });

  // Handle Socket.IO connections
  io.on('connection', (socket) => {
    const clientIp = socket.handshake.address;
    console.log(`Client connected - ID: ${socket.id}, IP: ${clientIp}`);
    connectedClients.add(socket.id);
    console.log('Total connected clients:', connectedClients.size);

    // Send initial timer state to new connection
    socket.emit('time-sync', globalTimer);

    socket.on('timer-control', (action) => {
      console.log('Timer control received:', action);

      switch (action.type) {
        case 'START':
          globalTimer.isRunning = true;
          globalTimer.isPaused = false;
          if (timerInterval) clearInterval(timerInterval);
          timerInterval = setInterval(() => {
            if (globalTimer.isRunning && !globalTimer.isPaused && globalTimer.time > 0) {
              globalTimer.time--;
              io.emit('time-sync', globalTimer); // Broadcast to all clients
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

      // Broadcast updated state to all clients
      io.emit('time-sync', globalTimer);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      connectedClients.delete(socket.id);
      console.log('Total connected clients:', connectedClients.size);
    });
  });

  // Enable CORS for all routes with all origins
  expressApp.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['*']
  }));

  // Additional headers for better cross-origin support
  expressApp.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', '*');
    next();
  });

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
