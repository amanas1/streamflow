
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  maxHttpBufferSize: 1e7, // 10MB limit for media payloads
  pingTimeout: 5000,
  pingInterval: 10000
});

/**
 * PRODUCTION BLIND RELAY REGISTRY (RAM ONLY)
 * Map: userId -> { socketId, profile }
 * This map is wiped on any process restart or crash.
 */
const activeRegistry = new Map();

function syncGlobalPresence() {
  const activeUsers = Array.from(activeRegistry.values()).map(u => u.profile);
  io.emit('presence:list', activeUsers);
}

io.on('connection', (socket) => {
  let boundUserId = null;

  socket.on('presence:join', (profile) => {
    if (!profile || !profile.id) return;
    boundUserId = profile.id;
    activeRegistry.set(boundUserId, {
      socketId: socket.id,
      profile: { ...profile, status: 'online' }
    });
    syncGlobalPresence();
  });

  // Pure Binary/JSON Relay - Server does not possess E2EE keys
  socket.on('relay:payload', ({ to, payload }) => {
    const target = activeRegistry.get(to);
    if (target) {
      io.to(target.socketId).emit('relay:payload', {
        from: boundUserId,
        payload 
      });
    }
  });

  // WebRTC Signaling Relay
  socket.on('signal:exchange', ({ to, signal, type }) => {
    const target = activeRegistry.get(to);
    if (target) {
      io.to(target.socketId).emit('signal:exchange', {
        from: boundUserId,
        signal,
        type
      });
    }
  });

  socket.on('disconnect', () => {
    if (boundUserId) {
      activeRegistry.delete(boundUserId);
      syncGlobalPresence();
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  // Silent production start
});
