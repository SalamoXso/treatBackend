const express = require('express');
const cors = require('cors');
const http = require('http');
const axios = require('axios');
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
// Updated authentication middleware
app.use((req, res, next) => {
  if (req.path === '/dropTreat' && req.method === 'POST') {
    console.log('\n=== INCOMING REQUEST ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    const receivedKey = req.body?.key || req.headers['x-api-key'];
    const expectedKey = process.env.API_KEY || 'JCvQYz4imo6ibtQVxsVwmoSKDTXNCDD';
    
    console.log(`Key Comparison: "${receivedKey}" === "${expectedKey}" -> ${receivedKey === expectedKey}`);
    console.log(`Key Lengths: ${receivedKey?.length} vs ${expectedKey.length}`);
    
    if (!receivedKey) {
      return res.status(400).json({ 
        error: 'Missing API key',
        received: req.body,
        headers: req.headers
      });
    }
    
    if (receivedKey !== expectedKey) {
      return res.status(403).json({
        error: 'Invalid API key',
        expectedLength: expectedKey.length,
        receivedLength: receivedKey.length,
        receivedKey: receivedKey,
        charCodes: receivedKey.split('').map(c => c.charCodeAt(0))
      });
    }
  }
  next();
});

// Treat Drop Endpoint
// In your /dropTreat endpoint:
app.post('/dropTreat', async (req, res) => {
  try {
    const source = req.body?.source || 'system'; // Fixed undefined source
    
    // WebSocket notification
    io.emit('treatDropped', { 
      message: 'Treat dispensed!',
      source: source,
      timestamp: new Date().toISOString()
    });

    // HA Webhook with error handling
    try {
      await axios.post(
        `${process.env.HA_URL}/api/webhook/treat_dispensed`,
        { source: source }, // Send source to HA
        { 
          headers: { 
            Authorization: `Bearer ${process.env.HA_TOKEN}`,
            'Content-Type': 'application/json'
          },
          timeout: 3000 // 3-second timeout
        }
      );
    } catch (haError) {
      console.error('HA Webhook failed:', haError.message);
      // Continue even if HA fails
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Treat drop failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      tip: "Include {'source':'your_source'} in request body"
    });
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
  // In your server.js authentication middleware:
console.log("Expected API Key:", process.env.API_KEY || 'JCvQYz4imo6ibtQVxsVwmoSKDTXNCDD');
});
