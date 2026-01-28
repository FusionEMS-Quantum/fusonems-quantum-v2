# FusionEMS Quantum Homepage - Deployment Guide

## 🎯 Overview

This guide covers the complete deployment of the FusionEMS Quantum marketing homepage, including frontend (Next.js) and backend (FastAPI) integration.

## 📋 Prerequisites

### Frontend Requirements
- Node.js 18+ and npm
- Next.js 14+
- Tailwind CSS configured

### Backend Requirements
- Python 3.11+
- FastAPI
- PostgreSQL (or SQLite for development)
- Postmark account (for emails)

## 🚀 Step-by-Step Deployment

### 1. Frontend Setup

#### Install Dependencies

```bash
cd /root/fusonems-quantum-v2
npm install
```

#### Configure Environment Variables

Create `.env.local`:

```bash
# Copy example
cp .env.example .env.local

# Edit with your values
nano .env.local
```

Required variables:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
BACKEND_URL=http://localhost:8000
POSTMARK_API_KEY=your_postmark_key
POSTMARK_FROM_EMAIL=noreply@fusionems.com
DEMO_NOTIFICATION_EMAIL=sales@fusionems.com
```

#### Build Frontend

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

### 2. Backend Setup

#### Install Python Dependencies

```bash
cd /root/fusonems-quantum-v2/backend
pip install fastapi pydantic sqlalchemy python-multipart
```

#### Verify Marketing Routes

The marketing router has been added to `backend/main.py`:

```python
from services.marketing.routes import router as marketing_router
app.include_router(marketing_router)
```

#### Run Backend

```bash
cd /root/fusonems-quantum-v2/backend
uvicorn main:app --reload --port 8000
```

### 3. Verify Integration

#### Test Demo Request Flow

```bash
# Test API endpoint
curl -X POST http://localhost:8000/api/v1/demo-requests \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "organization": "Test EMS",
    "phone": "555-1234",
    "role": "ems-chief",
    "timestamp": "2024-01-20T12:00:00Z",
    "status": "pending",
    "source": "website"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Demo request received",
  "request_id": "DR-1234567890"
}
```

#### Test Billing Lookup

```bash
curl -X POST http://localhost:8000/api/v1/billing/lookup \
  -H "Content-Type: application/json" \
  -d '{
    "account_number": "12345",
    "zip_code": "12345"
  }'
```

#### Test Frontend Pages

Open browser and verify:

1. **Homepage**: http://localhost:3000
   - Hero section visible
   - Professional logo displays
   - Trust badges render
   - CTAs functional

2. **Portals Page**: http://localhost:3000/portals
   - 13 portals display correctly
   - Sections organized properly

3. **Demo Page**: http://localhost:3000/demo
   - Form renders
   - Validation works
   - Submit triggers API call

4. **Billing Page**: http://localhost:3000/billing
   - Account lookup form displays
   - Security badges visible

### 4. Email Configuration (Postmark)

#### Setup Postmark

1. Create account at https://postmarkapp.com
2. Create server and get API key
3. Verify sender domain

#### Configure Email Templates

In `/src/app/api/demo-request/route.ts`, emails are sent for:

**To Sales Team:**
- Subject: "New Demo Request: [Organization]"
- Contains: Name, Email, Organization, Phone, Role, Challenges

**To Requestor:**
- Subject: "Your FusionEMS Quantum Demo Request"
- Contains: Confirmation, next steps, contact info

#### Test Email Delivery

```bash
# Set environment variable
export POSTMARK_API_KEY=your_key_here

# Submit demo request via frontend
# Check Postmark dashboard for delivery
```

### 5. Production Deployment

#### Frontend Deployment (Vercel/Netlify)

**Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Deploy production
vercel --prod
```

**Netlify:**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy

# Set environment variables in Netlify dashboard
# Deploy production
netlify deploy --prod
```

#### Backend Deployment (DigitalOcean/AWS/Heroku)

**DigitalOcean App Platform:**

1. Create `do-app.yaml`:
```yaml
name: fusionems-backend
services:
  - name: api
    source_dir: /backend
    run_command: uvicorn main:app --host 0.0.0.0 --port 8080
    environment_slug: python
    instance_size_slug: basic-xxs
    envs:
      - key: DATABASE_URL
        value: ${db.DATABASE_URL}
      - key: POSTMARK_API_KEY
        value: ${POSTMARK_API_KEY}
```

2. Deploy:
```bash
doctl apps create --spec do-app.yaml
```

**Docker Deployment:**

```bash
# Build
docker build -t fusionems-frontend .
docker build -t fusionems-backend -f backend/Dockerfile backend/

# Run
docker-compose up -d
```

### 6. DNS & SSL Configuration

#### Point Domain

Add DNS records:
```
A     @              -> Your server IP
CNAME www            -> yourdomain.com
A     api            -> Backend server IP
```

#### SSL Certificate

**Frontend (Vercel/Netlify):**
- Automatic SSL via platform

**Backend (Let's Encrypt):**
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.fusionems.com
```

### 7. Monitoring & Analytics

#### Setup Application Monitoring

**Sentry (Error Tracking):**
```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

**Google Analytics:**

Add to `.env.local`:
```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Create `src/lib/analytics.ts`:
```tsx
export const pageview = (url: string) => {
  window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!, {
    page_path: url,
  })
}
```

#### Backend Monitoring

**Health Check Endpoint:**
```bash
curl http://localhost:8000/api/v1/health/marketing
```

Expected:
```json
{
  "status": "healthy",
  "service": "marketing-api",
  "timestamp": "2024-01-20T12:00:00Z"
}
```

### 8. Performance Optimization

#### Frontend

**Image Optimization:**
- SVG logos already optimized
- Use Next.js `Image` component for PNGs

**Code Splitting:**
```tsx
// Lazy load demo form
const DemoForm = dynamic(() => import('@/components/DemoForm'), {
  loading: () => <p>Loading...</p>
})
```

**Static Generation:**
```tsx
// In page.tsx
export const dynamic = 'force-static'
```

#### Backend

**Database Connection Pooling:**
```python
# In core/database.py
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True
)
```

**Caching:**
```python
from functools import lru_cache

@lru_cache(maxsize=128)
def get_organization_data(org_id: int):
    # Cache organization lookups
    pass
```

### 9. Security Hardening

#### Frontend

**Content Security Policy:**

Add to `next.config.ts`:
```ts
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  }
]
```

**Rate Limiting:**

Install:
```bash
npm install express-rate-limit
```

#### Backend

**CORS Configuration:**
```python
# In backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://fusionems.com"],
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)
```

**Rate Limiting:**
```bash
pip install slowapi
```

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/demo-requests")
@limiter.limit("5/minute")
async def create_demo_request(...):
    ...
```

### 10. Testing Checklist

#### Pre-Deployment Tests

- [ ] All pages load without errors
- [ ] Logo displays correctly on all pages
- [ ] Demo form submits successfully
- [ ] Email notifications sent
- [ ] Billing lookup works
- [ ] Mobile responsive design verified
- [ ] Cross-browser testing passed
- [ ] Accessibility (WCAG AA) validated
- [ ] Lighthouse score >90
- [ ] SSL certificate valid
- [ ] API endpoints accessible
- [ ] Error handling works
- [ ] Loading states display

#### Post-Deployment Verification

```bash
# Test production endpoints
curl https://fusionems.com
curl https://fusionems.com/portals
curl https://fusionems.com/demo
curl https://fusionems.com/billing

# Test API
curl https://api.fusionems.com/api/v1/health/marketing
```

### 11. Rollback Plan

#### Frontend Rollback

**Vercel:**
```bash
# List deployments
vercel list

# Rollback to previous
vercel rollback [deployment-url]
```

**Netlify:**
- Use Netlify dashboard to select previous deployment
- Click "Publish deploy"

#### Backend Rollback

**Git Tag Previous Version:**
```bash
# Tag current stable version
git tag -a v1.0-stable -m "Stable homepage release"
git push origin v1.0-stable

# Rollback if needed
git checkout v1.0-stable
docker build -t fusionems-backend:rollback .
docker-compose up -d
```

### 12. Post-Launch Monitoring

#### Key Metrics to Track

**First 24 Hours:**
- Page load times
- Error rates
- Demo request submissions
- Email delivery success rate
- API response times

**First Week:**
- Conversion rate (visitors → demo requests)
- Bounce rate
- Average time on page
- Mobile vs desktop traffic
- Geographic distribution

**Dashboard Setup:**

Create monitoring dashboard with:
- Google Analytics real-time view
- Backend API logs
- Error tracking (Sentry)
- Uptime monitoring (UptimeRobot)

### 13. Backup & Recovery

#### Database Backups

```bash
# Automated daily backups
0 2 * * * pg_dump -U postgres fusionems_db > /backups/fusionems_$(date +\%Y\%m\%d).sql
```

#### Code Repository

```bash
# Ensure git remote is set
git remote -v

# Push all changes
git push origin main

# Tag release
git tag -a v2.0-homepage -m "Marketing homepage launch"
git push --tags
```

## 🔧 Troubleshooting

### Common Issues

**Issue: Demo form not submitting**
- Check browser console for errors
- Verify API endpoint URL in `.env.local`
- Check CORS settings on backend
- Verify network tab for failed requests

**Issue: Emails not sending**
- Verify Postmark API key
- Check sender domain verification
- Review Postmark activity log
- Test with curl command

**Issue: Logo not displaying**
- Verify SVG files exist in `/public/assets/`
- Check browser network tab for 404s
- Clear Next.js cache: `rm -rf .next`
- Rebuild: `npm run build`

**Issue: Backend API 500 errors**
- Check backend logs: `docker logs [container-id]`
- Verify database connection
- Check environment variables
- Review FastAPI error traceback

## 📞 Support Contacts

**Development Team:**
- Frontend: frontend@fusionems.com
- Backend: backend@fusionems.com
- DevOps: devops@fusionems.com

**Emergency Hotline:**
- Phone: 1-800-555-0199
- Slack: #fusionems-deploy

## ✅ Deployment Completion Checklist

- [ ] Frontend deployed and accessible
- [ ] Backend API deployed and responsive
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Email service (Postmark) configured
- [ ] SSL certificates installed
- [ ] DNS records updated
- [ ] Monitoring dashboards active
- [ ] Error tracking configured
- [ ] Backup systems running
- [ ] Team notified of deployment
- [ ] Documentation updated
- [ ] Rollback plan tested
- [ ] Performance benchmarks met
- [ ] Security scan passed

## 🎉 Post-Deployment

1. Announce launch to team
2. Monitor for first 48 hours
3. Schedule retrospective meeting
4. Document lessons learned
5. Plan future iterations

---

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Version:** v2.0-homepage  
**Status:** ✅ Production Ready
