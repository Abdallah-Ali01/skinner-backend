# HTTPS Setup Guide for Skinner Backend

## Overview

To enable HTTPS, you need:
1. A domain name pointing to your server
2. SSL/TLS certificate (free with Let's Encrypt)
3. Nginx as reverse proxy
4. Configure your Node.js app to work behind proxy

---

## Prerequisites

- **Domain Name:** You need a domain (e.g., `api.skinner.com` or `skinner-api.yourdomain.com`)
- **DNS Setup:** Domain must point to your VPS IP: `187.127.227.63`
- **Server Access:** SSH access to `root@srv1634946.hstgr.cloud`

---

## Option 1: Using Nginx + Let's Encrypt (Recommended)

This is the most common and recommended approach for production.

### Step 1: Point Your Domain to VPS

In your domain registrar (e.g., Namecheap, GoDaddy, Cloudflare):

**Add A Record:**
```
Type: A
Name: api (or @ for root domain)
Value: 187.127.227.63
TTL: 3600
```

**Example:**
- `api.yourdomain.com` → `187.127.227.63`
- Or `skinner-api.yourdomain.com` → `187.127.227.63`

Wait 5-10 minutes for DNS propagation.

**Verify DNS:**
```bash
nslookup api.yourdomain.com
# Should return 187.127.227.63
```

---

### Step 2: Install Nginx

SSH into your VPS:
```bash
ssh root@srv1634946.hstgr.cloud
```

Install Nginx:
```bash
sudo apt update
sudo apt install nginx -y
```

Check Nginx status:
```bash
sudo systemctl status nginx
```

---

### Step 3: Configure Nginx as Reverse Proxy

Create Nginx configuration for your API:

```bash
sudo nano /etc/nginx/sites-available/skinner-backend
```

Add this configuration (replace `api.yourdomain.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect all HTTP to HTTPS (will be enabled after SSL setup)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/skinner-backend /etc/nginx/sites-enabled/
```

Test Nginx configuration:
```bash
sudo nginx -t
```

Reload Nginx:
```bash
sudo systemctl reload nginx
```

**Test HTTP access:**
```bash
curl http://api.yourdomain.com/
```

---

### Step 4: Install Certbot (Let's Encrypt)

Install Certbot:
```bash
sudo apt install certbot python3-certbot-nginx -y
```

---

### Step 5: Obtain SSL Certificate

Run Certbot:
```bash
sudo certbot --nginx -d api.yourdomain.com
```

**Follow the prompts:**
1. Enter your email address
2. Agree to Terms of Service (Y)
3. Choose whether to share email (Y/N)
4. Certbot will automatically configure HTTPS

**Certbot will:**
- Obtain SSL certificate from Let's Encrypt
- Automatically configure Nginx for HTTPS
- Set up HTTP to HTTPS redirect
- Configure auto-renewal

---

### Step 6: Verify HTTPS

Test your HTTPS endpoint:
```bash
curl https://api.yourdomain.com/
```

**Your API is now accessible via:**
- ✅ `https://api.yourdomain.com` (HTTPS - secure)
- ❌ `http://api.yourdomain.com` (redirects to HTTPS)

---

### Step 7: Configure Auto-Renewal

Certbot automatically sets up renewal. Test it:
```bash
sudo certbot renew --dry-run
```

If successful, certificates will auto-renew before expiration.

---

### Step 8: Update Firewall (if enabled)

Allow HTTPS traffic:
```bash
sudo ufw allow 'Nginx Full'
sudo ufw status
```

---

## Option 2: Using Cloudflare (Easiest)

If you use Cloudflare for DNS, you get free SSL automatically.

### Step 1: Add Domain to Cloudflare
1. Go to [Cloudflare](https://cloudflare.com)
2. Add your domain
3. Update nameservers at your registrar

### Step 2: Add DNS Record
```
Type: A
Name: api
Content: 187.127.227.63
Proxy status: Proxied (orange cloud)
```

### Step 3: Enable SSL
1. Go to SSL/TLS settings
2. Choose "Full" or "Full (strict)" mode
3. Enable "Always Use HTTPS"

### Step 4: Configure Nginx (Same as Option 1, Steps 2-3)

**Done!** Cloudflare handles SSL termination automatically.

---

## Option 3: Direct HTTPS in Node.js (Not Recommended for Production)

Only use this for development/testing.

### Install SSL Certificate Files

You need:
- `server.key` (private key)
- `server.cert` (certificate)

### Update server.js

```javascript
const https = require('https');
const fs = require('fs');
const app = require('./src/app');

const options = {
  key: fs.readFileSync('/path/to/server.key'),
  cert: fs.readFileSync('/path/to/server.cert')
};

const PORT = process.env.PORT || 5000;

https.createServer(options, app).listen(PORT, () => {
  console.log(`HTTPS Server running on port ${PORT}`);
});
```

**Not recommended because:**
- Node.js must run on port 443 (requires root)
- No automatic certificate renewal
- Less secure than Nginx
- No load balancing or caching

---

## Recommended Architecture

```
Internet
   ↓
Cloudflare (Optional - CDN + DDoS protection)
   ↓
Nginx (Port 80/443) - SSL Termination + Reverse Proxy
   ↓
Node.js Backend (Port 5000) - Your Express App
   ↓
PostgreSQL Database
```

---

## Complete Setup Script

Save this as `setup-https.sh` and run it:

```bash
#!/bin/bash

# Replace with your actual domain
DOMAIN="api.yourdomain.com"
EMAIL="your-email@example.com"

echo "Setting up HTTPS for $DOMAIN..."

# Update system
sudo apt update

# Install Nginx
sudo apt install nginx -y

# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Create Nginx config
cat > /etc/nginx/sites-available/skinner-backend << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/skinner-backend /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Obtain SSL certificate
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

# Test auto-renewal
sudo certbot renew --dry-run

echo "HTTPS setup complete!"
echo "Your API is now available at: https://$DOMAIN"
```

**Run it:**
```bash
chmod +x setup-https.sh
sudo ./setup-https.sh
```

---

## Testing Your HTTPS Setup

### 1. Test SSL Certificate
```bash
curl -I https://api.yourdomain.com
```

### 2. Test API Endpoint
```bash
curl https://api.yourdomain.com/api/doctor/date-availability?start_date=2026-06-01&end_date=2026-06-30 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Check SSL Grade
Visit: https://www.ssllabs.com/ssltest/analyze.html?d=api.yourdomain.com

### 4. Verify Certificate
```bash
openssl s_client -connect api.yourdomain.com:443 -servername api.yourdomain.com
```

---

## Troubleshooting

### Issue: "Connection Refused"
**Solution:**
```bash
# Check if Nginx is running
sudo systemctl status nginx

# Check if Node.js is running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Issue: "502 Bad Gateway"
**Solution:**
```bash
# Node.js backend is not running
pm2 restart skinner-backend

# Check if port 5000 is listening
sudo netstat -tlnp | grep 5000
```

### Issue: "Certificate Not Valid"
**Solution:**
```bash
# Renew certificate manually
sudo certbot renew --force-renewal

# Reload Nginx
sudo systemctl reload nginx
```

### Issue: "DNS Not Resolving"
**Solution:**
```bash
# Check DNS propagation
nslookup api.yourdomain.com

# Wait 5-10 minutes for DNS to propagate
# Or use Cloudflare for faster propagation
```

---

## Security Best Practices

### 1. Enable HTTP/2
Already enabled by Certbot automatically.

### 2. Add Security Headers

Edit Nginx config:
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 3. Rate Limiting

Add to Nginx config:
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

server {
    location / {
        limit_req zone=api_limit burst=20 nodelay;
        # ... rest of config
    }
}
```

### 4. Hide Nginx Version
```bash
sudo nano /etc/nginx/nginx.conf
```

Add inside `http` block:
```nginx
server_tokens off;
```

---

## Update Frontend

After HTTPS is enabled, update your frontend to use HTTPS:

**Before:**
```javascript
const API_URL = 'http://187.127.227.63:5000';
```

**After:**
```javascript
const API_URL = 'https://api.yourdomain.com';
```

---

## Maintenance

### Check Certificate Expiry
```bash
sudo certbot certificates
```

### Manual Renewal
```bash
sudo certbot renew
sudo systemctl reload nginx
```

### View Nginx Logs
```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

---

## Cost

- **Domain Name:** $10-15/year (required)
- **SSL Certificate:** FREE (Let's Encrypt)
- **Nginx:** FREE (open source)
- **Cloudflare:** FREE (optional, for CDN + DDoS protection)

**Total:** ~$10-15/year (just domain cost)

---

## Quick Start Checklist

- [ ] Purchase/have a domain name
- [ ] Point domain to VPS IP (187.127.227.63)
- [ ] Wait for DNS propagation (5-10 min)
- [ ] SSH into VPS
- [ ] Install Nginx
- [ ] Configure Nginx reverse proxy
- [ ] Install Certbot
- [ ] Obtain SSL certificate
- [ ] Test HTTPS endpoint
- [ ] Update frontend to use HTTPS URL
- [ ] Configure firewall (if enabled)
- [ ] Add security headers
- [ ] Test auto-renewal

---

## Need Help?

If you don't have a domain yet, I recommend:
- **Namecheap** - Cheap domains, easy DNS management
- **Cloudflare** - Free DNS + CDN + SSL
- **Google Domains** - Simple interface

**Recommended domain:**
- `skinner-api.com`
- `api.skinner-health.com`
- Or use a subdomain of your existing domain

---

**Next Step:** Get a domain name, then follow Option 1 (Nginx + Let's Encrypt) for production-ready HTTPS setup.
