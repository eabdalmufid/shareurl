const express = require('express');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'urls.json');

// Security Middleware - Helmet for HTTP headers security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting to prevent DoS attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for URL shortening (more strict)
const shortenLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 URL shortenings per minute
  message: { error: 'Too many URL shortening requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use(limiter);
app.use('/api/shorten', shortenLimiter);

// Body parsing middleware with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Static files
app.use(express.static('public'));

// Initialize database
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ urls: [], counter: 0 }, null, 2));
  }
}

// Read database
function readDB() {
  const data = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(data);
}

// Write database
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Generate short code
function generateShortCode(counter) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  let num = counter;
  
  if (num === 0) return chars[0];
  
  while (num > 0) {
    code = chars[num % chars.length] + code;
    num = Math.floor(num / chars.length);
  }
  
  return code || chars[0];
}

// Sanitize input to prevent XSS and injection attacks
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  // Remove any potential script tags and dangerous characters
  return validator.escape(input.trim());
}

// Validate URL with enhanced security checks
function isValidURL(string) {
  try {
    // First sanitize the input
    const sanitized = string.trim();
    
    // Check URL format using validator library
    if (!validator.isURL(sanitized, {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true,
      allow_underscores: false,
      disallow_auth: true // Prevent URLs with credentials
    })) {
      return false;
    }
    
    // Additional check with native URL parser
    const url = new URL(sanitized);
    
    // Block localhost and private IP addresses for security
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.')
    ) {
      return false;
    }
    
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// API: Create short URL
app.post('/api/shorten', (req, res) => {
  let { url } = req.body;
  
  // Input validation
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  // Check if input is a string
  if (typeof url !== 'string') {
    return res.status(400).json({ error: 'Invalid URL format' });
  }
  
  // Trim and limit URL length to prevent abuse
  url = url.trim();
  if (url.length > 2048) {
    return res.status(400).json({ error: 'URL too long. Maximum 2048 characters allowed.' });
  }
  
  if (url.length < 10) {
    return res.status(400).json({ error: 'URL too short. Please provide a valid URL.' });
  }
  
  // Validate URL with security checks
  if (!isValidURL(url)) {
    return res.status(400).json({ error: 'Invalid URL format. Please include http:// or https:// and use a public URL.' });
  }
  
  try {
    const db = readDB();
    
    // Check database size limit to prevent abuse
    if (db.urls.length >= 10000) {
      return res.status(429).json({ error: 'Database limit reached. Please contact administrator.' });
    }
    
    // Check if URL already exists
    const existing = db.urls.find(item => item.originalUrl === url);
    if (existing) {
      return res.json({
        shortUrl: `${req.protocol}://${req.get('host')}/${existing.shortCode}`,
        shortCode: existing.shortCode,
        originalUrl: existing.originalUrl
      });
    }
    
    // Create new short URL
    db.counter += 1;
    const shortCode = generateShortCode(db.counter);
    
    const newUrl = {
      id: db.counter,
      shortCode,
      originalUrl: url,
      createdAt: new Date().toISOString(),
      clicks: 0
    };
    
    db.urls.push(newUrl);
    writeDB(db);
    
    res.json({
      shortUrl: `${req.protocol}://${req.get('host')}/${shortCode}`,
      shortCode,
      originalUrl: url
    });
  } catch (error) {
    console.error('Error creating short URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Get all URLs
app.get('/api/urls', (req, res) => {
  try {
    const db = readDB();
    res.json(db.urls);
  } catch (error) {
    console.error('Error fetching URLs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Get stats for a short code
app.get('/api/stats/:shortCode', (req, res) => {
  try {
    const db = readDB();
    const url = db.urls.find(item => item.shortCode === req.params.shortCode);
    
    if (!url) {
      return res.status(404).json({ error: 'Short URL not found' });
    }
    
    res.json(url);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Redirect short URL
app.get('/:shortCode', (req, res) => {
  try {
    // Validate short code format to prevent path traversal attacks
    const shortCode = req.params.shortCode;
    
    // Check for dangerous patterns
    if (!shortCode || 
        shortCode.includes('..') || 
        shortCode.includes('/') || 
        shortCode.includes('\\') ||
        shortCode.length > 20) {
      return res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
    }
    
    const db = readDB();
    const url = db.urls.find(item => item.shortCode === shortCode);
    
    if (!url) {
      return res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
    }
    
    // Increment click counter safely
    url.clicks += 1;
    writeDB(db);
    
    // Use 302 redirect (temporary) for better security
    res.redirect(302, url.originalUrl);
  } catch (error) {
    console.error('Error redirecting:', error);
    res.status(500).send('Internal server error');
  }
});

// Initialize and start server
initDB();

app.listen(PORT, () => {
  console.log(`🚀 Short URL server running on http://localhost:${PORT}`);
});
