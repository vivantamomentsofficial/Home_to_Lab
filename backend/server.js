require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const shareRouter = require('./routes/share');
const adminRouter = require('./routes/admin');
const authRouter = require('./routes/auth');

// Fail fast if required environment variables are missing
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('[CRITICAL] Missing required SUPABASE_URL or SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// CORS setup: Strict whitelist without wildcard subdomains
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://hometolab.vercel.app',
  'https://hometolab.com',
  'https://www.hometolab.com',
  'https://home-to-lab.vercel.app',
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like server-to-server, mobile apps, curl)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      if (process.env.NODE_ENV !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return callback(null, true);
      }

      return callback(new Error('Blocked by CORS policy.'));
    },
  })
);

// General Middlewares
app.use(morgan('dev'));
app.use(express.json());

// Serving Supabase Configuration Variables (Secure Proxy without hardcoded fallbacks)
app.get('/api/config', (req, res) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Supabase configuration is missing from server environment.' });
  }
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  });
});


// Mounting Router Modules
app.use('/api/share', shareRouter);
app.use('/api/admin', adminRouter);
app.use('/api/auth', authRouter);

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
