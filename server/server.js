const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

const { connectDB } = require('./config/db');
const socketHandler = require('./socket/socketHandler');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const channelRoutes = require('./routes/channelRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const aiRoutes = require('./routes/aiRoutes');

// Initialize app & server
const app = express();
const server = http.createServer(app);

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

// Socket.io initialization
const io = new Server(server, {
  cors: {
    origin: [clientUrl, 'http://127.0.0.1:5173', 'http://localhost:5174'],
    credentials: true,
  },
});

// Pass Socket.io to socketHandler
socketHandler(io);

// Make io accessible in req if needed
app.set('io', io);

// Middleware
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // limit each IP to 150 requests per windowMs
  message: { success: false, message: 'Too many requests, please try again later.' }
});

// Apply rate limiting to all /api routes
app.use('/api', apiLimiter);

app.use(
  cors({
    origin: [clientUrl, 'http://127.0.0.1:5173', 'http://localhost:5174'],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/ai', aiRoutes);

// Centralized error handler
app.use(errorHandler);

const User = require('./models/User');
const { seedData } = require('./seed');

const PORT = process.env.PORT || 5000;

// Start Server after connecting to Database
const startServer = async () => {
  await connectDB();
  
  // Auto-seed if database is empty
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    console.log('[Server] No users detected. Automatically seeding demo data...');
    await seedData();
  }

  server.listen(PORT, () => {
    console.log(`[Server] SyncSpace backend listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
};

startServer();
