const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const apiRoutes = require('./routes/apiRoutes');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for dev/runtime
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'NyayaSetu MERN Stack Backend API',
    version: '1.0.0',
    description: 'Real-time data collection engine for citizen grievances, inquiries, and subscriptions.',
    endpoints: {
      contact: 'POST /api/contact, GET /api/contact',
      submissions: 'POST /api/submissions, GET /api/submissions, GET /api/submissions/:trackingCode',
      newsletter: 'POST /api/newsletter, GET /api/newsletter',
      tracker: 'GET /api/tracker/:trackingCode, POST /api/tracker/:trackingCode/milestone',
      stats: 'GET /api/stats',
      health: 'GET /api/health',
    },
    documentation: 'https://github.com/mohitraj8503/Nyaya-Setu',
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 NyayaSetu MERN Backend running on http://localhost:${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📊 Stats Dashboard API: http://localhost:${PORT}/api/stats`);
});

module.exports = { app, server };
