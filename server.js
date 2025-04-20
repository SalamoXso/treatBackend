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

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// Debugging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Key Middleware
app.use((req, res, next) => {
  if (req.path === '/dropTreat' && req.method === 'POST') {
    const receivedKey = req.body?.key || req.headers['x-api-key'];
    const expectedKey = process.env.API_KEY || 'JCvQYz4imo6ibtQVxsVwmoSKDTXNCDD';
    
    if (!receivedKey || receivedKey !== expectedKey) {
      return res.status(403).json({ error: 'Invalid API key' });
    }
  }
  next();
});

// Treat Drop Endpoint
app.post('/dropTreat', async (req, res) => {
  try {
    const source = req.body?.source || 'system';
    const entityId = 'switch.sonoff_s40lite'; // Confirm this in HA

    // 1. Turn ON the plug
    await callHAService('switch.turn_on', {
      entity_id: entityId
    });

    // 2. Wait 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. Turn OFF the plug
    await callHAService('switch.turn_off', {
      entity_id: entityId
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Treat drop failed:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

// Helper function for HA service calls
async function callHAService(service, data) {
  try {
    const response = await axios.post(
      `${process.env.HA_URL}/api/services/${service.replace('.', '/')}`,
      data,
      {
        headers: {
          'Authorization': `Bearer ${process.env.HA_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );
    return response.data;
  } catch (error) {
    console.error(`HA Service ${service} failed:`, error.response?.data || error.message);
    throw error;
  }
}

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
