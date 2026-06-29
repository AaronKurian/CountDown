const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const next = require("next");
const cors = require("cors");
const compression = require("compression");
const { getToken } = require("next-auth/jwt");

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

const DEFAULT_TARGET_TIME = process.env.DEFAULT_TARGET_TIME || null;
const MAX_ANNOUNCEMENTS = 10;
const MAX_ANNOUNCEMENT_LENGTH = 240;

const parseTargetTime = (value) => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
};

const calculateRemainingTime = (targetTime) => {
  if (!targetTime) return 0;
  const diffInSeconds = Math.floor((new Date(targetTime).getTime() - Date.now()) / 1000);
  return Math.max(0, diffInSeconds);
};

const countdownState = {
  targetTime: parseTargetTime(DEFAULT_TARGET_TIME),
  time: calculateRemainingTime(parseTargetTime(DEFAULT_TARGET_TIME)),
  isRunning: false,
  isPaused: false,
  announcements: [],
};

const getPublicState = () => ({
  ...countdownState,
  time: calculateRemainingTime(countdownState.targetTime),
});

const getAllowedOrigins = () => {
  const origins = [
    process.env.NEXTAUTH_URL,
  ].filter(Boolean);

  return new Set(origins.map((origin) => origin.replace(/\/$/, "")));
};

const isAllowedOrigin = (origin, allowedOrigins) => {
  if (!origin) return true;
  return allowedOrigins.has(origin.replace(/\/$/, ""));
};

const parseCookies = (cookieHeader = "") =>
  cookieHeader.split(";").reduce((cookies, cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    if (!name || rest.length === 0) return cookies;
    cookies[name] = decodeURIComponent(rest.join("="));
    return cookies;
  }, {});

const isAdminSocket = async (socket) => {
  if (!process.env.NEXTAUTH_SECRET) return false;

  const token = await getToken({
    req: {
      headers: socket.request.headers,
      cookies: parseCookies(socket.request.headers.cookie),
    },
    secret: process.env.NEXTAUTH_SECRET,
  });

  return token?.role === "admin";
};

app.prepare().then(() => {
  const expressApp = express();
  const server = createServer(expressApp);
  const allowedOrigins = getAllowedOrigins();

  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin, allowedOrigins)) {
          callback(null, true);
          return;
        }
        callback(new Error("Socket origin is not allowed"));
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    allowUpgrades: true,
    cookie: false,
    serveClient: false,
    perMessageDeflate: {
      threshold: 2048,
      zlibInflateOptions: {
        chunkSize: 10 * 1024,
      },
    },
    maxHttpBufferSize: 1e6,
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
  });

  const emitState = () => {
    const state = getPublicState();
    countdownState.time = state.time;
    io.volatile.emit("state-sync", state);
  };

  setInterval(() => {
    if (countdownState.isRunning && !countdownState.isPaused) {
      emitState();
    }
  }, 1000);

  io.on("connection", (socket) => {
    const rateLimiter = {
      timestamp: Date.now(),
      count: 0,
    };

    socket.emit("state-sync", getPublicState());

    const canRunAdminAction = async (ack) => {
      const now = Date.now();
      if (now - rateLimiter.timestamp > 5000) {
        rateLimiter.count = 0;
        rateLimiter.timestamp = now;
      }

      if (rateLimiter.count >= 10) {
        ack?.({ ok: false, error: "Too many requests" });
        return false;
      }

      rateLimiter.count += 1;

      if (!(await isAdminSocket(socket))) {
        ack?.({ ok: false, error: "Unauthorized" });
        return false;
      }

      return true;
    };

    socket.on("admin:set-target", async ({ targetTime } = {}, ack) => {
      if (!(await canRunAdminAction(ack))) return;

      const parsedTargetTime = parseTargetTime(targetTime);
      if (!parsedTargetTime) {
        ack?.({ ok: false, error: "Invalid target time" });
        return;
      }

      countdownState.targetTime = parsedTargetTime;
      countdownState.time = calculateRemainingTime(parsedTargetTime);
      countdownState.isRunning = false;
      countdownState.isPaused = false;
      emitState();
      ack?.({ ok: true, state: getPublicState() });
    });

    socket.on("admin:timer-control", async ({ type } = {}, ack) => {
      if (!(await canRunAdminAction(ack))) return;

      switch (type) {
        case "START":
          if (!countdownState.targetTime) {
            ack?.({ ok: false, error: "Set a target time before starting" });
            return;
          }
          countdownState.isRunning = true;
          countdownState.isPaused = false;
          break;
        case "PAUSE":
          countdownState.isPaused = true;
          break;
        case "RESUME":
          countdownState.isPaused = false;
          break;
        case "STOP":
          countdownState.isRunning = false;
          countdownState.isPaused = false;
          break;
        default:
          ack?.({ ok: false, error: "Invalid timer action" });
          return;
      }

      countdownState.time = calculateRemainingTime(countdownState.targetTime);
      emitState();
      ack?.({ ok: true, state: getPublicState() });
    });

    socket.on("admin:announcement", async ({ action, id, text } = {}, ack) => {
      if (!(await canRunAdminAction(ack))) return;

      if (action === "add") {
        const announcementText = String(text || "").trim().slice(0, MAX_ANNOUNCEMENT_LENGTH);
        if (!announcementText) {
          ack?.({ ok: false, error: "Announcement text is required" });
          return;
        }

        countdownState.announcements = [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            text: announcementText,
            timestamp: new Date().toISOString(),
          },
          ...countdownState.announcements,
        ].slice(0, MAX_ANNOUNCEMENTS);
      } else if (action === "remove" && id) {
        countdownState.announcements = countdownState.announcements.filter(
          (announcement) => announcement.id !== id
        );
      } else if (action === "clear") {
        countdownState.announcements = [];
      } else {
        ack?.({ ok: false, error: "Invalid announcement action" });
        return;
      }

      emitState();
      ack?.({ ok: true, state: getPublicState() });
    });
  });

  expressApp.disable("x-powered-by");

  expressApp.use(
    cors({
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin, allowedOrigins)) {
          callback(null, true);
          return;
        }
        callback(new Error("Origin is not allowed"));
      },
      methods: ["GET", "POST", "OPTIONS"],
      credentials: true,
      maxAge: 86400,
    })
  );

  expressApp.use(compression());

  const requestCounts = new Map();
  const RATE_LIMIT_WINDOW = 60 * 1000;
  const MAX_REQUESTS_PER_WINDOW = 300;

  expressApp.use((req, res, nextMiddleware) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    for (const [ip, data] of requestCounts.entries()) {
      if (now - data.resetTime > RATE_LIMIT_WINDOW) {
        requestCounts.delete(ip);
      }
    }

    const clientData = requestCounts.get(clientIP);
    if (!clientData || now - clientData.resetTime > RATE_LIMIT_WINDOW) {
      requestCounts.set(clientIP, { count: 1, resetTime: now });
      nextMiddleware();
      return;
    }

    clientData.count += 1;
    if (clientData.count > MAX_REQUESTS_PER_WINDOW) {
      res.status(429).json({
        error: "Too Many Requests",
        retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - clientData.resetTime)) / 1000),
      });
      return;
    }

    nextMiddleware();
  });

  expressApp.all("*", (req, res) => handle(req, res));

  server.listen(port, "0.0.0.0", (err) => {
    if (err) throw err;
    console.log(`> Server running on port ${port}`);
    console.log(`> Local: http://localhost:${port}`);
  });
});
