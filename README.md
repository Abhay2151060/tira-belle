# TIRA Belle • Artisan Tiramisu & Counter POS

> **Little Layers • Big Love**  
> Complete Physical Dessert Studio Counter POS, Dynamic Customer Loyalty Engine, and Public Storefront.

---

## 📌 Overview

**TIRA Belle** is a production-grade, zero-dependency commercial web application designed specifically for artisan dessert businesses, tiramisu counters, and boutique bakeries. It provides an end-to-end operational suite that functions seamlessly both online and on in-store offline hardware.

### Key Features

1. **Artisan Public Storefront (`index.html`)**
   - High-conversion responsive design featuring handcrafted 150g single-serve cups and 350g sharing tubs.
   - Interactive tasting notes, brand storytelling, and direct WhatsApp / counter ordering.
   - Live Customer Loyalty Checker with real-time visual stamp card.
   - Enterprise Technical SEO: Schema.org `Bakery` & `Product` structured data, Open Graph, and Twitter Cards.

2. **Counter Sales & POS Management (`admin.html`)**
   - Instant POS order entry for rapid physical counter service.
   - Supports Cash and UPI/Online payment reconciliation.
   - Dynamic real-time revenue analytics (Today, Yesterday, All Time).
   - Printable 80mm thermal receipt generator.
   - Collapsible desktop sidebar with persistent layout memory and full mobile navigation drawer.

3. **Dynamic Customer Loyalty Engine (`js/db.js`)**
   - Configurable purchase threshold (default: Buy 5 Cups, Get 1 Free 150g Cup).
   - Multi-cycle loyalty progress tracking with automatic reward eligibility detection.
   - In-store reward redemption verification and audit logging.
   - One-click customer directory CSV export.

4. **In-Store QR Standee Generator**
   - Auto-generates counter QR codes routing customers directly to `tracker.html` for checking their stamp balance on their own smartphones.

5. **Security Hardening**
   - Cryptographic credential storage via SHA-256 with cryptographic salt (no plaintext passwords).
   - Failed login attempt rate-limiting and automatic lockout protection.
   - 30-minute inactivity session expiration.
   - Strict XSS escaping (`escapeHtml`) on all dynamic customer and order rendering.
   - Content Security Policy (CSP), frame protection (`X-Frame-Options: DENY`), and `noindex` headers on administrative endpoints.

---

## 🛠️ Technology Stack

- **Frontend:** Semantic HTML5, CSS3 Custom Properties (Vanilla CSS with custom design system), Vanilla JavaScript (ES6+).
- **Icons & QR:** Modular Lucide SVG Icons, qrcode.js.
- **Persistence:** Local client-side storage engine (`localStorage`) with full JSON backup & restoration.
- **PWA Ready:** Web App Manifest (`manifest.json`) and Service Worker (`sw.js`).
- **Security:** Web Crypto API (SHA-256), rate limiting, and HTTP security headers.
- **Testing:** Automated unit testing suite in Python & JavaScript.
- **CI/CD:** GitHub Actions workflow (`.github/workflows/ci.yml`).

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- Any modern web browser (Chrome, Edge, Safari, Firefox).
- (Optional for local server) Python 3.x, Node.js, or any static HTTP server.

### Running Locally

#### Option 1: Double Click (Windows)
Double-click `Start-Tira-Belle.bat` in the project root. This launches the local server and opens the browser automatically.

#### Option 2: Python Command Line
```powershell
# Navigate to the project directory
cd "C:\Users\HP\OneDrive\Desktop\Tira Belle"

# Start the local server
python -m http.server 8000
```
Open [http://localhost:8000](http://localhost:8000) in your web browser.

---

## 🔒 Security Configuration

### Default Credentials
- **Username:** `admin`
- **Initial Password:** `tirabelle123`
- **Initial Quick PIN:** `1234`

> ⚠️ **IMPORTANT FOR PRODUCTION:**  
> Upon first deployment, navigate to **Admin Panel > Settings > Security Credentials** to set a unique, strong password and 4-digit PIN. Passwords and PINs are automatically hashed with SHA-256 before storage.

---

## 🧪 Automated Testing

Run the automated test suite to verify business rules, loyalty calculations, and cryptographic hashing:

```powershell
python tests/test_backend.py -v
```

All 9 tests will execute and confirm:
- SHA-256 credential hashing with cryptographic salt.
- XSS prevention and HTML entity sanitization.
- Loyalty reward eligibility edge cases across multiple cycles (0 cups, 3/5, 5/5, 7/5 with 1 claimed).
- Dynamic threshold recalculations.
- POS financial math and Cash/Online collection splits.

---

## 🌐 Production Deployment

TIRA Belle is 100% static-ready and can be deployed with HTTPS in under 2 minutes:

### Deploying to Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project root.
3. The included `vercel.json` will automatically configure security headers, CSP, caching, and clean URLs.

### Deploying to Cloudflare Pages / Netlify
1. Connect your GitHub repository to Cloudflare Pages or Netlify.
2. Set Build Command to blank / None.
3. Set Output Directory to root (`/` or `.`).
4. The included `_headers` file automatically applies production HTTP security headers.

---

## 💾 Backup & Data Restoration

- **Exporting Data:** In **Admin Panel > Settings**, click **Download Database Backup** to download a complete timestamped JSON file.
- **Restoring Data:** Click **Upload Backup File** to restore customer records, products, and sales history onto any new machine or device.

---

## 👥 Ownership & Business Contacts

- **Yash Chauhan:** +91-9373484198
- **Tejas Chauhan:** +91-8484870543
- **UPI ID:** `9373484198@upi`

---

© 2026 TIRA Belle • Handcrafted with love by Yash Chauhan & Tejas Chauhan. All rights reserved.
