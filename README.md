# Short URL - Modern URL Shortener 🚀

A simple, lightweight, and modern URL shortener application with a beautiful responsive web UI. Perfect for portfolio projects!

## ✨ Features

- 🎨 **Modern & Clean Design** - Beautiful gradient UI with smooth animations
- 📱 **Fully Responsive** - Works perfectly on mobile, tablet, and desktop
- ⚡ **Lightning Fast** - Instant URL shortening with JSON-based database
- 🎯 **Random Short Codes** - Generates secure random strings for each URL
- ✏️ **Custom Short Codes** - Optionally create custom short URLs (e.g., mylink)
- 🔒 **URL Validation** - Ensures all URLs are valid before shortening
- 🛡️ **Security Hardened** - Protected against XSS, SSRF, DoS, and injection attacks
- 📊 **Click Tracking** - Track how many times your short URLs are used
- 📋 **One-Click Copy** - Easy copying of shortened URLs
- 🎯 **Recent URLs** - View your 5 most recent shortened URLs
- ⏱️ **Rate Limited** - Prevents abuse with intelligent rate limiting

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/eabdalmufid/shorturl.git
cd shorturl
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and visit:
```
http://localhost:5002
```

## 📖 How to Use

1. **Shorten a URL:**
   - Enter your long URL in the input field
   - Optionally, enter a custom code (e.g., "mylink") or leave empty for a random code
   - Click the "Shorten" button
   - Your short URL will be generated instantly

2. **Copy Short URL:**
   - Click the "Copy" button next to your shortened URL
   - The URL is now in your clipboard

3. **View Recent URLs:**
   - Scroll down to see your 5 most recent shortened URLs
   - Click on any short URL to visit the original destination

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
   - Request size limits (10KB max)
   - Database size limits

4. **Injection Attacks**
   - Input validation with validator.js
   - No SQL database (JSON-based)
   - Safe data handling

5. **Path Traversal**
   - Short code validation
   - Blocks dangerous characters
   - Restricted file system access

### Security Headers

- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security
- X-XSS-Protection

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
shorturl/
├── public/
│   ├── index.html      # Main HTML file
│   ├── style.css       # Responsive CSS styles
│   └── script.js       # Frontend JavaScript
├── server.js           # Express server & API
├── urls.json           # JSON database (auto-generated)
├── package.json        # Dependencies
└── README.md          # Documentation
```

## 🔧 API Endpoints

### Create Short URL
```
POST /api/shorten
Content-Type: application/json

{
  "url": "https://example.com/very-long-url",
  "customCode": "mylink"  // Optional: custom short code
}
```

### Get All URLs
```
GET /api/urls
```

### Get Stats
```
GET /api/stats/:shortCode
```

### Redirect
```
GET /:shortCode
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

**Note:** This is a simple demonstration project. For production use, consider adding:
- Database (MongoDB, PostgreSQL, etc.)
- User authentication
- Custom short codes
- Analytics dashboard
- Rate limiting
- And more advanced features