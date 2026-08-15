require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const shareRouter = require('./routes/share');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS setup: Allow connections from local dev port 5173 or Vercel origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://hometolab.vercel.app',
  'https://hometolab.com',
  'https://home-to-lab.vercel.app',
];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      
      const isAllowed = allowedOrigins.some((o) => origin.startsWith(o)) || origin.endsWith('.vercel.app');
      if (isAllowed || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy.'));
    },
    credentials: true,
  })
);

// General Middlewares
app.use(morgan('dev'));
app.use(express.json());

// Serving Supabase Configuration Variables (Secure Fallback Proxy)
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || 'https://gxccllaqtdiuvnrialta.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'sb_publishable_RX7bF4fL5BYUdwUx3vGl3Q_xSe5A-ny',
  });
});

// Mounting Router Modules
app.use('/api/share', shareRouter);
app.use('/api/admin', adminRouter);

// Default status probe
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Serve frontend in production (optional, if building mono-bundle)
const fs = require('fs');
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('CloudVault API Service is running...');
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error occurred.',
  });
});

app.listen(PORT, () => {
  console.log(`[CloudVault Server] Listening on port ${PORT}`);
});
