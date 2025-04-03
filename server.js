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

app.use(cors());
app.use(express.json());

// Add API key middleware
app.use((req, res, next) => {
  if (req.path === '/dropTreat' && req.method === 'POST') {
    const apiKey = req.body.key;
    if (apiKey !== 'JCvVqYz4imo6ibtQVxsVwmoSKDTXNCDD') {
      return res.status(403).json({ error: 'Invalid API key' });
    }
  }
  next();
});

// Modified treat drop endpoint
app.post('/dropTreat', async (req, res) => {
  try {
    const source = req.body.source || 'unknown';
    console.log(`Treat drop requested from: ${source}`);
    
    // Broadcast to all connected clients
    io.emit('treatDropped', { 
      message: 'A treat has been dropped!',
      source: source,
      timestamp: new Date().toISOString()
    });
    
    res.status(200).json({
      success: true,
      message: 'Treat drop signal sent'
    });
  } catch (error) {
    console.error('Error processing treat drop:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process treat drop'
    });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});