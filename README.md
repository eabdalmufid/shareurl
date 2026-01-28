# ShareURL - Modern URL Shortener with File Sharing 🚀

A simple, lightweight, and modern URL shortener application with file upload/sharing capabilities and a beautiful responsive web UI. Perfect for portfolio projects!

## ✨ Features

### URL Shortening
- 🎨 **Modern & Clean Design** - Beautiful gradient UI with smooth animations
- 📱 **Fully Responsive** - Works perfectly on mobile, tablet, and desktop
- ⚡ **Lightning Fast** - Instant URL shortening with JSON-based database
- 🎯 **Random Short Codes** - Generates secure random strings for each URL
- ✏️ **Custom Short Codes** - Optionally create custom short URLs (e.g., mylink)
- 🔒 **URL Validation** - Ensures all URLs are valid before shortening
- 📊 **Click Tracking** - Track how many times your short URLs are used

### File Sharing
- 📁 **File Upload** - Upload and share files via unique URLs
- 🔗 **File URLs** - Access files via `domain.com/f/{random_string}` format
- 📎 **Drag & Drop** - Easy drag-and-drop file upload interface
- 💾 **File Types** - Supports images, PDFs, text files, office documents, and more
- 📏 **Size Limit** - Maximum file size of 10MB
- 📈 **Download Tracking** - Track how many times your files are downloaded

### Admin Dashboard
- 🎛️ **Dedicated Dashboard** - Separate admin interface at `/dash`
- 🔍 **Real-Time Search** - Search through URLs and files instantly
- 📄 **Pagination** - Navigate through all items with 5 per page
- 🗑️ **Content Management** - Delete URLs and files with one click
- 📱 **Mobile-First Design** - Touch-friendly controls and responsive layout
- 🔐 **Password Protected** - Secure admin access with configurable password

### Security Features
- 🛡️ **Security Hardened** - Protected against XSS, SSRF, DoS, and injection attacks
- 🔐 **File Type Validation** - Whitelist-based file type checking (MIME type + extension)
- 🚫 **Malicious File Protection** - Blocks executable files and double extensions
- 🔒 **Path Traversal Prevention** - Secure file handling prevents directory traversal
- ⏱️ **Rate Limited** - Prevents abuse with intelligent rate limiting
- 📋 **One-Click Copy** - Easy copying of shortened URLs and file links
- 🎯 **Recent URLs with Pagination** - View recent URLs with 5 per page
- 👨‍💼 **Admin Panel** - Admin-only delete functionality for URLs and files

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/eabdalmufid/shareurl.git
cd shareurl
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Configure admin password:
```bash
# Create a .env file or set environment variable
echo "ADMIN_PASSWORD=your-secure-password" > .env
# Default password is 'admin123' if not configured
```

4. Start the server:
```bash
npm start
```

5. Open your browser and visit:
```
http://localhost:5002
```

## 📖 How to Use

### Shorten a URL:
1. Enter your long URL in the input field
2. Optionally, enter a custom code (e.g., "mylink") or leave empty for a random code
3. Click the "Shorten" button
4. Your short URL will be generated instantly
5. Click "Copy" to copy the shortened URL to your clipboard

### Upload and Share Files:
1. Click the file upload area or drag and drop a file
2. Select a file (max 10MB)
3. Supported file types:
   - Images: JPG, PNG, GIF, WebP
   - Documents: PDF, TXT, CSV, JSON
   - Office: DOC, DOCX, XLS, XLSX
   - Archives: ZIP
4. Click "Upload File"
5. Your file URL will be generated with format: `domain.com/f/{random_code}`
6. Click "Copy" to share the file link

### Recent Items Section:
- View recent shortened URLs and uploaded files (5 items per page)
- Use pagination controls to navigate through all items
- Click on any short URL to visit the original destination
- Click on any file link to download/view the file

### Admin Dashboard:
- Access the admin dashboard at `/dash` (e.g., `http://localhost:5002/dash`)
- Login with your admin password (default: `admin123`)
- **Search Functionality**: Search through URLs and files in real-time
- **Pagination**: Navigate through all items with 5 items per page
- **Delete Management**: Delete any malicious, inappropriate, or unwanted content
- **Mobile-First Design**: Touch-friendly controls and responsive layout
- **Separate Sections**: View and manage URLs and files independently
- **Note:** Change the default admin password in production via the `ADMIN_PASSWORD` environment variable

## 🛠️ Technology Stack

- **Backend:** Node.js + Express
- **Frontend:** Vanilla JavaScript (no frameworks)
- **Database:** JSON file storage
- **Styling:** Modern CSS with CSS Variables
- **Design:** Mobile-first responsive design
- **Security:** Helmet.js, express-rate-limit, validator.js

## 🔐 Security Features

This application implements multiple security layers to protect against cyber attacks:

### Protection Against Common Attacks

1. **XSS (Cross-Site Scripting)**
   - Input sanitization and validation
   - Content Security Policy headers
   - Output encoding

2. **SSRF (Server-Side Request Forgery)**
   - Blocks localhost and private IP addresses
   - Validates URL protocols
   - Prevents internal network access

3. **DoS/DDoS (Denial of Service)**
   - Rate limiting (100 requests/15 min globally)
   - Strict rate limiting for URL creation (10/min)
   - Strict rate limiting for file uploads (5/min)
   - Request size limits (10KB max for JSON)
   - File size limits (10MB max)
   - Database size limits

4. **Injection Attacks**
   - Input validation with validator.js
   - No SQL database (JSON-based)
   - Safe data handling

5. **Path Traversal**
   - Short code validation
   - File code validation
   - Blocks dangerous characters
   - Restricted file system access
   - Path resolution validation

6. **Malicious File Upload**
   - Whitelist-based file type validation (MIME type + extension)
   - Blocks executable files (.exe, .sh, .bat, etc.)
   - Blocks files with double extensions
   - Random secure filename generation
   - File size limits
   - Content-Type validation on download

### Security Headers

- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security
- X-XSS-Protection
- X-Download-Options

### File Upload Security

- **Whitelist Approach**: Only allow safe file types
- **MIME Type Validation**: Verify file content type
- **Extension Validation**: Check file extensions
- **Double Extension Block**: Prevent files like `file.pdf.exe`
- **Filename Sanitization**: Generate secure random filenames using crypto
- **Size Limits**: Maximum 10MB per file
- **Rate Limiting**: 5 uploads per minute per IP
- **Path Validation**: Prevent directory traversal
- **Secure Storage**: Files stored outside web root with controlled access

For detailed security information, see [SECURITY.md](SECURITY.md)

### Security Audit

Run security audit anytime:
```bash
npm run audit
```

Fix vulnerabilities automatically:
```bash
npm run audit-fix
```

## 📁 Project Structure

```
shareurl/
├── public/
│   ├── index.html      # Main HTML file
│   ├── style.css       # Responsive CSS styles
│   ├── script.js       # Frontend JavaScript
│   ├── dash.html       # Admin Dashboard HTML
│   └── dash.js         # Dashboard JavaScript
├── uploads/            # Uploaded files storage (auto-generated)
├── server.js           # Express server & API
├── urls.json           # JSON database (auto-generated)
├── package.json        # Dependencies
└── README.md          # Documentation
```

## 🔧 API Endpoints

### Admin Dashboard
```
GET /dash
# Access the admin dashboard interface
# Requires admin password to login
```

### Create Short URL
```
POST /api/shorten
Content-Type: application/json

{
  "url": "https://example.com/very-long-url",
  "customCode": "mylink"  // Optional: custom short code
}
```

### Upload File
```
POST /api/upload
Content-Type: multipart/form-data

FormData:
  file: <file>
```

### Get All URLs
```
GET /api/urls
```

### Get All Files
```
GET /api/files
```

### Get Stats
```
GET /api/stats/:shortCode
```

### Get File Stats
```
GET /api/filestats/:fileCode
```

### Delete Short URL (Admin Only)
```
DELETE /api/urls/:shortCode?key=admin123
```

### Delete File (Admin Only)
```
DELETE /api/files/:fileCode?key=admin123
```

### Redirect
```
GET /:shortCode
```

### Access File
```
GET /f/:fileCode
```

## 🎨 Design Features

- Gradient backgrounds and modern color palette
- Smooth animations and transitions
- Card-based layout for better organization
- Icon integration for visual appeal
- Mobile-first responsive breakpoints
- Clean typography and spacing

## 📱 Responsive Breakpoints

- **Mobile:** < 640px
- **Tablet:** 641px - 1024px
- **Desktop:** > 1025px

## 🔐 Security Features

- URL validation before processing
- Rate limiting to prevent abuse
- Input sanitization against XSS
- SSRF protection (blocks private IPs)
- Path traversal prevention
- HTTP security headers
- Request size limits
- Error handling without information disclosure

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## 📄 License

MIT License - feel free to use this project for your portfolio!

## 👨‍💻 Author

Built with ❤️ by [Affidev](https://github.com/eabdalmufid)

---

**Note:** This is a demonstration project. For production use, consider adding:
- Database (MongoDB, PostgreSQL, etc.)
- User authentication
- File encryption
- Virus scanning for uploaded files
- CDN for file delivery
- Analytics dashboard
- Automated file cleanup
- And more advanced features