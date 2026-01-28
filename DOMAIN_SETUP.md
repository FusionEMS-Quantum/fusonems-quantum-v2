# 🌐 Your FusoNEMS CAD Apps are Live!

## ✅ Domain Configuration Complete

### Your Apps Are Now Accessible At:

**Main CAD Dashboard:**
- http://fusionemsquantum.com
- http://www.fusionemsquantum.com
→ Proxies to port 3003 (Next.js)

**CrewLink PWA:**
- http://crew.fusionemsquantum.com
→ Proxies to port 3001 (Vite)

**MDT PWA:**
- http://mdt.fusionemsquantum.com
→ Proxies to port 3002 (Vite)

**Backend API:**
- http://api.fusionemsquantum.com
→ Proxies to port 3000 (when running)

---

## 🔧 DNS Setup Required

For subdomains to work, add these DNS records in your domain registrar:

**A Records:**
```
fusionemsquantum.com        → 157.245.6.217
www.fusionemsquantum.com    → 157.245.6.217
crew.fusionemsquantum.com   → 157.245.6.217
mdt.fusionemsquantum.com    → 157.245.6.217
api.fusionemsquantum.com    → 157.245.6.217
```

Or use a **wildcard:**
```
*.fusionemsquantum.com → 157.245.6.217
```

---

## 📱 Test Your Apps

1. **Main Dashboard:** http://fusionemsquantum.com
2. **CrewLink:** http://crew.fusionemsquantum.com
3. **MDT:** http://mdt.fusionemsquantum.com

---

## 🔒 Add HTTPS (Optional)

Install SSL with Let's Encrypt:

```bash
apt-get install certbot python3-certbot-nginx
certbot --nginx -d fusionemsquantum.com -d www.fusionemsquantum.com -d crew.fusionemsquantum.com -d mdt.fusionemsquantum.com -d api.fusionemsquantum.com
```

---

## 📊 Running Services

- ✅ CAD Dashboard (port 3003) - Next.js
- ✅ CrewLink PWA (port 3001) - Vite
- ✅ MDT PWA (port 3002) - Vite
- ✅ Nginx - Reverse proxy
- ✅ PostgreSQL - Database
- ✅ Redis - Cache

---

## 🎉 SUCCESS!

Your FusoNEMS CAD system is now live on your domain!

**Main URL:** http://fusionemsquantum.com
