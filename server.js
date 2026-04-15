const express = require('express');
const cors    = require('cors');
const path    = require('path');
const http    = require('http');
const { Server } = require('socket.io');
const db      = require('./database');

const app  = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));   // serves index.html

// ── Socket.IO ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  
  // Send current state on connection
  socket.emit('stateUpdate', db.getState());

  // Handle updates from clients via WebSocket
  socket.on('updateState', (state) => {
    try {
      db.saveState(state);
      // Broadcast to EVERYONE ELSE only (not the sender) to avoid local flicker
      socket.broadcast.emit('stateUpdate', state);
    } catch (err) {
      console.error('[Socket] Update failed:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// ── API Routes ───────────────────────────────────────────────────────────────

app.get('/api/state', (req, res) => {
  try {
    res.json({ success: true, data: db.getState() });
  } catch (err) {
    console.error('GET /api/state:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/state', (req, res) => {
  try {
    db.saveState(req.body);
    // Broadcast update to all clients
    io.emit('stateUpdate', req.body);
    res.json({ success: true, savedAt: new Date().toISOString() });
  } catch (err) {
    console.error('POST /api/state:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/reset', (req, res) => {
  try {
    db.resetState(true);
    // Broadcast reset to all clients
    io.emit('stateUpdate', { 
      ok1: 0, repair1: 0, ng1: 0, 
      ok2: 0, repair2: 0, ng2: 0, 
      defectData: {}, repairData: {}, hourlyData: {} 
    });
    res.json({ success: true, message: 'Data direset dan diarsipkan' });
  } catch (err) {
    console.error('POST /api/reset:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    res.json({ success: true, data: db.getHistory(limit) });
  } catch (err) {
    console.error('GET /api/history:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'QC Gate Server running', ts: new Date().toISOString() });
});

// ── Initialise DB then start listener ────────────────────────────────────────
db.init().then(() => {
  server.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════╗');
    console.log(`║  QC Gate Production Server (vWS)     ║`);
    console.log(`║  http://localhost:${PORT}               ║`);
    console.log('╚══════════════════════════════════════╝\n');
  });
}).catch(err => {
  console.error('Failed to initialise database:', err);
  process.exit(1);
});

