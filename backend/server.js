const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173", "http://localhost:3001", "http://localhost:3002"],
    methods: ["GET", "POST"]
  }
});

// Check for Google API Key
if (!process.env.GOOGLE_API_KEY) {
  console.warn("WARNING: GOOGLE_API_KEY not found in .env. AI features will use fallbacks.");
}

// Connect to Database
connectDB();

// Middleware
app.use(helmet());
app.use(cors({ 
  origin: ["http://localhost:3000", "http://localhost:5173", "http://localhost:3001", "http://localhost:3002"], 
  credentials: true 
}));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/clinician', require('./routes/clinicianRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/intakes', require('./routes/intakeRoutes'));

// Socket.IO for real-time notifications
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

const PORT = process.env.PORT || 8001;
httpServer.listen(PORT, () => {
  console.log(`Healthcare Server running on port ${PORT}`);
});
