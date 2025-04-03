const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket'],
  allowEIO3: true
});

const PORT = 3000;

// Middleware: Ensure proper request body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// Debugging Middleware: Log all requests
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path}`, req.body);
  next();
});

// API Key Middleware
// Updated API Key Middleware
app.use((req, res, next) => {
  if (req.path === '/dropTreat' && req.method === 'POST') {
    // Check all possible key locations
    const providedKey = req.body?.key || 
                      req.body?.api_key ||
                      req.body?.token ||
                      req.headers['x-api-key'] ||
                      req.headers['authorization']?.replace('Bearer ', '') ||
                      req.headers['x-auth-token'];

    if (!providedKey) {
      console.error("Missing API key");
      return res.status(400).json({ error: 'Missing API key' });
    }

    if (providedKey !== 'JCvVqYz4imo6ibtQVxsVwmoSKDTXNCDD') {
      console.error("Invalid API key provided:", providedKey);
      return res.status(403).json({ error: 'Invalid API key' });
    }
  }
  next();
});

// Treat Drop Endpoint
app.post('/dropTreat', (req, res) => {
  try {
    const source = req.body.source || 'unknown';
    console.log(`Treat drop requested from: ${source}`);
    
    // Emit event to WebSocket clients
    io.emit('treatDropped', { 
      message: 'A treat has been dropped!',
      source: source,
      timestamp: new Date().toISOString()
    });
    
    res.status(200).json({ success: true, message: 'Treat drop signal sent' });
  } catch (error) {
    console.error('Error processing treat drop:', error);
    res.status(500).json({ success: false, message: 'Failed to process treat drop' });
  }
});

// WebSocket Connection Handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});