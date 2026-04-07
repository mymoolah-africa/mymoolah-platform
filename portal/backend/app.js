'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');

const app = express();

app.set('trust proxy', 1);

// Banking-grade security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
}));

// CORS
const allowedOrigins = (process.env.PORTAL_FRONTEND_URL || 'http://localhost:3003').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (origin.endsWith('.app.github.dev') || origin.endsWith('.preview.app.github.dev')) return cb(null, true);
    cb(new Error('CORS policy violation'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

// Rate limiting -- general (reads)
const generalLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: { success: false, error: 'Too many requests. Please try again later.', timestamp: new Date().toISOString() },
});

app.use(generalLimit);

// Body parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Request ID middleware
app.use((req, res, next) => {
  req.requestId = req.get('X-Request-ID') || crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Request logging with PII redaction
app.use((req, res, next) => {
  const ts = new Date().toISOString();
  const ip = req.ip ? req.ip.replace(/^::ffff:/, '') : 'unknown';
  const redactedIp = ip.length > 6 ? ip.substring(0, ip.lastIndexOf('.')) + '.***' : '***';
  console.log(`${ts} [${req.requestId}] ${req.method} ${req.path} - ${redactedIp}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'MyMoolah Portal Backend is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// API routes
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/admin/auth', authRoutes);

// 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    timestamp: new Date().toISOString()
  });
});

// Global error handler -- never expose internal details
app.use((error, req, res, _next) => {
  console.error(`[${req.requestId || 'no-id'}] Global error:`, error.message);

  if (error.name === 'ValidationError' || error.message === 'CORS policy violation') {
    return res.status(400).json({
      success: false,
      error: 'Invalid request.',
      timestamp: new Date().toISOString()
    });
  }

  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication required.',
      timestamp: new Date().toISOString()
    });
  }

  res.status(500).json({
    success: false,
    error: 'An internal error occurred. Please try again.',
    timestamp: new Date().toISOString()
  });
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;
