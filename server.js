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
      // Broadcast to ALL clients (including sender) so UI stays in sync with DB.
      // The sender's applyReceivedState will be a no-op if safety-locked,
      // but other devices will receive the update in real-time.
      io.emit('stateUpdate', state);
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
    // Fetch the actual reset state from DB and broadcast it to ensure
    // all clients (including caller) receive a complete zeroed state.
    const freshState = db.getState();
    io.emit('stateUpdate', freshState);
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

