require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const { nanoid } = require('nanoid');
const multer = require('multer');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5002;
const DB_FILE = path.join(__dirname, 'urls.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Configuration constants
const MAX_DATABASE_SIZE = 10000;
const MAX_URL_LENGTH = 2048;
const MIN_URL_LENGTH = 10;
const MAX_SHORTCODE_LENGTH = 20;
const MAX_REQUEST_SIZE = '10kb';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_COUNT = 5000;

// Allowed file types (whitelist approach for security)
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.pdf', '.txt', '.csv', '.zip',
  '.json', '.doc', '.docx', '.xls', '.xlsx'
];

// Trust proxy - required for proper rate limiting behind reverse proxies
// Set to 1 to trust the first proxy (recommended for most deployments)
app.set('trust proxy', 1);

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

// Rate limiting for file uploads (strict)
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 file uploads per minute
  message: { error: 'Too many file uploads, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use(limiter);
app.use('/api/shorten', shortenLimiter);
app.use('/api/upload', uploadLimiter);

// Body parsing middleware with size limits
app.use(express.json({ limit: MAX_REQUEST_SIZE }));
app.use(express.urlencoded({ extended: true, limit: MAX_REQUEST_SIZE }));

// Static files
app.use(express.static('public'));

// Initialize uploads directory
function initUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true, mode: 0o755 });
  }
}

// Configure multer for file uploads with security
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    // Generate secure random filename with original extension
    const fileExt = path.extname(file.originalname).toLowerCase();
    const randomName = crypto.randomBytes(16).toString('hex');
    cb(null, randomName + fileExt);
  }
});

// File filter for security
const fileFilter = function (req, file, cb) {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error('File type not allowed. Only images, PDFs, text files, and office documents are permitted.'), false);
  }
  
  // Check file extension
  const fileExt = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
    return cb(new Error('File extension not allowed.'), false);
  }
  
  // Additional security: check for double extensions
  const baseName = path.basename(file.originalname, fileExt);
  if (baseName.includes('.')) {
    return cb(new Error('Files with double extensions are not allowed.'), false);
  }
  
  cb(null, true);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1 // Only allow one file per request
  },
  fileFilter: fileFilter
});

// Initialize database
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ urls: [], files: [], counter: 0 }, null, 2));
  } else {
    // Migrate old database if needed
    const db = readDB();
    if (!db.files) {
      db.files = [];
      writeDB(db);
    }
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

// Generate random short code using nanoid
function generateShortCode() {
  // Generate a 8-character ID using nanoid (URL-safe characters)
  return nanoid(8);
}

// Validate custom short code
function isValidShortCode(code) {
  if (!code || typeof code !== 'string') return false;
  
  // Check length (3-20 characters)
  if (code.length < 3 || code.length > MAX_SHORTCODE_LENGTH) return false;
  
  // Only allow alphanumeric characters, hyphens, and underscores (shortid compatible)
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(code)) return false;
  
  // Prevent dangerous patterns
  if (code.includes('..') || code.includes('/') || code.includes('\\')) return false;
  
  return true;
}

// Sanitize input to prevent XSS and injection attacks
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  // Remove any potential script tags and dangerous characters
  return validator.escape(input.trim());
}

// Check if IP is in private range
function isPrivateIP(hostname) {
  const patterns = [
    /^localhost$/i,
    /^127\.\d+\.\d+\.\d+$/,
    /^0\.0\.0\.0$/,
    /^192\.168\.\d+\.\d+$/,
    /^10\.\d+\.\d+\.\d+$/,
    /^172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+$/  // 172.16.0.0 - 172.31.255.255
  ];
  
  return patterns.some(pattern => pattern.test(hostname));
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
    if (isPrivateIP(url.hostname.toLowerCase())) {
      return false;
    }
    
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// API: Create short URL
app.post('/api/shorten', (req, res) => {
  let { url, customCode } = req.body;
  
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
  if (url.length > MAX_URL_LENGTH) {
    return res.status(400).json({ error: `URL too long. Maximum ${MAX_URL_LENGTH} characters allowed.` });
  }
  
  if (url.length < MIN_URL_LENGTH) {
    return res.status(400).json({ error: 'URL too short. Please provide a valid URL.' });
  }
  
  // Validate URL with security checks
  if (!isValidURL(url)) {
    return res.status(400).json({ error: 'Invalid URL format. Please include http:// or https:// and use a public URL.' });
  }
  
  // Validate custom code if provided
  if (customCode && customCode.trim()) {
    customCode = customCode.trim();
    if (!isValidShortCode(customCode)) {
      return res.status(400).json({ error: 'Invalid custom code. Use 3-20 alphanumeric characters, hyphens, or underscores.' });
    }
  } else {
    customCode = null;
  }
  
  try {
    const db = readDB();
    
    // Check database size limit to prevent abuse
    if (db.urls.length >= MAX_DATABASE_SIZE) {
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
    
    // Generate or use custom short code
    let shortCode;
    if (customCode) {
      // Check if custom code already exists
      const codeExists = db.urls.find(item => item.shortCode === customCode);
      if (codeExists) {
        return res.status(409).json({ error: 'Custom code already in use. Please choose another.' });
      }
      shortCode = customCode;
    } else {
      // Generate unique short code using nanoid
      // nanoid generates virtually unique IDs, but we still check for safety
      shortCode = generateShortCode();
      let attempts = 0;
      while (db.urls.find(item => item.shortCode === shortCode) && attempts < 5) {
        shortCode = generateShortCode();
        attempts++;
      }
      
      // Final check to ensure uniqueness
      if (db.urls.find(item => item.shortCode === shortCode)) {
        return res.status(500).json({ error: 'Unable to generate unique short code. Please try again.' });
      }
    }
    
    // Create new short URL
    db.counter = (db.counter || 0) + 1;
    
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

// API: Delete a short URL (Admin only with query key)
app.delete('/api/urls/:shortCode', (req, res) => {
  try {
    const { shortCode } = req.params;
    const { key } = req.query;
    
    // Check admin key from query parameter
    if (!key || key !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }
    
    // Validate short code format
    if (!shortCode || !isValidShortCode(shortCode)) {
      return res.status(400).json({ error: 'Invalid short code' });
    }
    
    const db = readDB();
    const urlIndex = db.urls.findIndex(item => item.shortCode === shortCode);
    
    if (urlIndex === -1) {
      return res.status(404).json({ error: 'Short URL not found' });
    }
    
    // Remove the URL from the database
    db.urls.splice(urlIndex, 1);
    writeDB(db);
    
    res.json({ message: 'Short URL deleted successfully' });
  } catch (error) {
    console.error('Error deleting URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Upload file
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const db = readDB();
    
    // Check database size limit
    if (db.files && db.files.length >= MAX_FILES_COUNT) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(429).json({ error: 'File storage limit reached. Please contact administrator.' });
    }
    
    // Generate unique file code
    let fileCode = nanoid(8);
    let attempts = 0;
    while (db.files && db.files.find(item => item.fileCode === fileCode) && attempts < 5) {
      fileCode = nanoid(8);
      attempts++;
    }
    
    if (db.files && db.files.find(item => item.fileCode === fileCode)) {
      fs.unlinkSync(req.file.path);
      return res.status(500).json({ error: 'Unable to generate unique file code. Please try again.' });
    }
    
    // Store file metadata
    db.counter = (db.counter || 0) + 1;
    
    const fileData = {
      id: db.counter,
      fileCode,
      originalName: path.basename(req.file.originalname),
      fileName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      createdAt: new Date().toISOString(),
      downloads: 0
    };
    
    if (!db.files) {
      db.files = [];
    }
    db.files.push(fileData);
    writeDB(db);
    
    res.json({
      fileUrl: `${req.protocol}://${req.get('host')}/f/${fileCode}`,
      fileCode,
      originalName: fileData.originalName,
      size: fileData.size
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    
    // Clean up file if it was uploaded
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    // Handle multer errors
    if (error.message.includes('File type not allowed') || 
        error.message.includes('File extension not allowed') ||
        error.message.includes('double extensions')) {
      return res.status(400).json({ error: error.message });
    }
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.` });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Get all files
app.get('/api/files', (req, res) => {
  try {
    const db = readDB();
    res.json(db.files || []);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Get file stats
app.get('/api/filestats/:fileCode', (req, res) => {
  try {
    const db = readDB();
    const file = db.files && db.files.find(item => item.fileCode === req.params.fileCode);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.json(file);
  } catch (error) {
    console.error('Error fetching file stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Delete a file (Admin only)
app.delete('/api/files/:fileCode', (req, res) => {
  try {
    const { fileCode } = req.params;
    const { key } = req.query;
    
    // Check admin key
    if (!key || key !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }
    
    const db = readDB();
    const fileIndex = db.files && db.files.findIndex(item => item.fileCode === fileCode);
    
    if (!db.files || fileIndex === -1) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Delete physical file
    const filePath = path.join(UPLOAD_DIR, db.files[fileIndex].fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Remove from database
    db.files.splice(fileIndex, 1);
    writeDB(db);
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve uploaded file
app.get('/f/:fileCode', (req, res) => {
  try {
    const fileCode = req.params.fileCode;
    
    // Validate file code format (similar to short code validation)
    if (!fileCode || 
        fileCode.includes('..') || 
        fileCode.includes('/') || 
        fileCode.includes('\\') ||
        fileCode.length > MAX_SHORTCODE_LENGTH) {
      return res.status(404).send('File not found');
    }
    
    const db = readDB();
    const fileData = db.files && db.files.find(item => item.fileCode === fileCode);
    
    if (!fileData) {
      return res.status(404).send('File not found');
    }
    
    const filePath = path.join(UPLOAD_DIR, fileData.fileName);
    
    // Security check: ensure file path is within upload directory
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadDir = path.resolve(UPLOAD_DIR);
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      return res.status(403).send('Access denied');
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }
    
    // Increment download counter
    fileData.downloads += 1;
    writeDB(db);
    
    // Set security headers for file download
    res.setHeader('Content-Type', fileData.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileData.originalName)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Send file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).send('Internal server error');
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
        shortCode.length > MAX_SHORTCODE_LENGTH) {
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
initUploadDir();

app.listen(PORT, () => {
  console.log(`🚀 ShareURL server running on http://localhost:${PORT}`);
  console.log(`📁 File uploads enabled at /f/{code}`);
});
