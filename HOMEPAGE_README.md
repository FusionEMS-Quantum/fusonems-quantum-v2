# FusionEMS Quantum Marketing Homepage

Enterprise-grade marketing website for FusionEMS Quantum, featuring a compliance-first hero section, multi-portal architecture showcase, and secure demo request flow.

## 🎯 Strategic Objectives

- **Establish Legitimacy**: Position as enterprise EMS operating system, not SaaS tool
- **Reduce Risk**: Surface compliance signals (NEMSIS, HIPAA) immediately
- **Drive Conversion**: Primary CTA "Request a Demo" prominently placed
- **Zero Hype**: Removed excitement language, focused on authority and clarity

## 📁 Project Structure

```
/root/fusonems-quantum-v2/
├── public/assets/               # Logo assets
│   ├── logo-icon.svg           # 512x512 icon
│   ├── logo-header.svg         # 180x48 header logo
│   ├── logo-full.svg           # 400x120 full wordmark
│   └── logo-social.svg         # 1200x630 Open Graph
├── src/
│   ├── app/
│   │   ├── page.tsx            # Homepage (hero + modules)
│   │   ├── layout.tsx          # Root layout with metadata
│   │   ├── globals.css         # Enterprise design system
│   │   ├── demo/
│   │   │   └── page.tsx        # Demo request form
│   │   ├── billing/
│   │   │   └── page.tsx        # Patient billing portal
│   │   ├── portals/
│   │   │   └── page.tsx        # Platform architecture showcase
│   │   └── api/
│   │       ├── demo-request/
│   │       │   └── route.ts    # Demo request API
│   │       └── billing/
│   │           └── lookup/
│   │               └── route.ts # Billing lookup API
│   └── components/
│       ├── Logo.tsx            # Logo component
│       └── marketing/
│           └── TrustBadge.tsx  # Compliance badges
└── backend/services/marketing/
    ├── __init__.py
    └── routes.py               # FastAPI endpoints
```

## 🚀 Quick Start

### Frontend (Next.js)

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

### Backend (FastAPI)

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Add marketing routes to main.py
# Include the marketing router in your FastAPI app

# Run backend
uvicorn main:app --reload --port 8000
```

## 🎨 Design System

### Color Palette

- **Charcoal**: `#2D3748` (base/primary)
- **Orange**: `#FF6B35` (accent/energy)
- **Red**: `#E63946` (critical/alert)
- **White**: `#ffffff` (text primary)
- **Gray**: `#718096` (text muted)

### Typography

- **Eyebrow**: 11px, uppercase, letter-spacing 1.5px
- **Headline**: 56px (desktop) / 36px (mobile), font-weight 900
- **Subheadline**: 18px (desktop) / 16px (mobile), line-height 1.6
- **CTA**: 14px, font-weight 700, uppercase

### Components

#### Logo Component

```tsx
import Logo from '@/components/Logo'

// Header usage
<Logo variant="header" height={48} />

// Hero usage
<Logo variant="full" width={300} />

// Favicon usage
<Logo variant="icon" width={32} height={32} />
```

#### TrustBadge Component

```tsx
import TrustBadge from '@/components/marketing/TrustBadge'

<TrustBadge icon="shield" text="NEMSIS-Compliant" />
<TrustBadge icon="lock" text="HIPAA-Aligned" />
<TrustBadge icon="activity" text="99.9% Uptime SLA" />
<TrustBadge icon="headset" text="24/7 Support" />
```

## 📄 Pages

### 1. Homepage (`/`)

**Hero Section:**
- Eyebrow: "Enterprise EMS Operating System"
- Headline: "The Regulated EMS Operating System"
- Subheadline: Platform description
- Primary CTA: "Request a Demo"
- Secondary CTA: "Pay a Medical Bill"
- Trust indicators

**Content Sections:**
1. Unified Platform Modules (CAD, ePCR, Billing, etc.)
2. Architecture link
3. Enterprise Performance stats
4. Customer testimonials
5. Final CTA with email signup

### 2. Portals Architecture (`/portals`)

Comprehensive 13-portal showcase:

**I. Internal EMS Portals (7)**
- CAD, Medical Transport, Fire, HEMS, Pilot, Compliance/QA-QI, Administration

**II. External Facility Portals (2)**
- TransportLink (with "EXPLICITLY NOT" section)
- Provider Portal

**III. Public Portals (2)**
- Patient Portal, Payment Portal

**IV. External Systems (1)**
- CareFusion (external, independent)

**V. Platform Gateway**
- SSO, role resolution

### 3. Demo Request (`/demo`)

**Form Fields:**
- Name, Email, Organization, Phone
- Role (dropdown: EMS Chief, Operations Director, etc.)
- Challenges (optional textarea)

**Features:**
- Client-side validation
- Backend integration (`/api/demo-request`)
- Email notifications (Postmark)
- Success state
- HIPAA notice

### 4. Billing Portal (`/billing`)

**Features:**
- Account lookup (account number + ZIP)
- PCI-DSS compliance badges
- Secure payment gateway ready
- Support contact information

## 🔌 API Endpoints

### Frontend (Next.js API Routes)

#### POST `/api/demo-request`

Request:
```json
{
  "name": "John Smith",
  "email": "john@ems.org",
  "organization": "Metropolitan EMS",
  "phone": "(555) 123-4567",
  "role": "ems-chief",
  "challenges": "Looking to modernize CAD system"
}
```

Response:
```json
{
  "success": true,
  "message": "Demo request received successfully",
  "requestId": "DR-1234567890"
}
```

#### POST `/api/billing/lookup`

Request:
```json
{
  "accountNumber": "12345",
  "zipCode": "12345"
}
```

Response:
```json
{
  "success": true,
  "account": {
    "accountNumber": "12345",
    "balance": 250.00,
    "patientName": "John Doe",
    "serviceDate": "2024-01-15"
  }
}
```

### Backend (FastAPI)

#### POST `/api/v1/demo-requests`

Receives and stores demo requests from website.

#### POST `/api/v1/billing/lookup`

Looks up billing account by account number and ZIP code.

#### GET `/api/v1/health/marketing`

Health check endpoint.

## 🔒 Security

### HIPAA Compliance

- All patient data encrypted in transit (HTTPS)
- No PHI stored in frontend
- Backend enforces strict access controls
- Audit logs for all transactions

### Payment Security

- PCI-DSS compliant payment gateway
- Tokenization for credit card data
- No card numbers stored in database
- Stripe integration ready

### Authentication

- JWT-based authentication
- Role-based access control (RBAC)
- Multi-factor authentication (MFA) for admin
- Session management with secure cookies

## 📊 SEO & Metadata

```tsx
// Configured in src/app/layout.tsx
title: "FusionEMS Quantum | The Regulated EMS Operating System"
description: "Enterprise EMS operating system unifying CAD, ePCR, billing, compliance, and operational automation."
keywords: "EMS software, CAD system, ePCR, NEMSIS, HIPAA"

// Open Graph
og:image: "/assets/logo-social.svg"
og:type: "website"

// Twitter Card
twitter:card: "summary_large_image"
```

## ♿ Accessibility (WCAG 2.1 AA)

- ✅ Color contrast: 7:1 ratio (white on charcoal)
- ✅ Keyboard navigation: All CTAs focusable
- ✅ Screen readers: Proper heading hierarchy, aria-labels
- ✅ Reduced motion: `prefers-reduced-motion` support
- ✅ Focus indicators: Visible outlines on interactive elements

## 📱 Responsive Design

**Breakpoints:**
- Desktop: ≥1024px
- Tablet: 768px - 1023px
- Mobile: <768px

**Key Responsive Features:**
- Mobile-first approach
- Fluid typography
- Touch-friendly CTAs (44px minimum)
- Stacked layouts on mobile
- Optimized images for different viewports

## 🧪 Testing Checklist

### Visual QA
- [ ] Logo renders correctly on all pages
- [ ] Color palette matches brand (charcoal/orange/red)
- [ ] Typography hierarchy clear
- [ ] CTAs visually distinct

### Functional QA
- [ ] Demo request form submits successfully
- [ ] Billing lookup works
- [ ] Email notifications sent (if configured)
- [ ] Navigation links work
- [ ] Mobile menu functional

### Cross-Browser
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (macOS and iOS)
- [ ] Samsung Internet (Android)

### Performance
- [ ] Lighthouse score >90
- [ ] LCP <2.5s on 3G
- [ ] No layout shift (CLS <0.1)
- [ ] Images optimized

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Color contrast passes WCAG AA
- [ ] Reduced motion respected

## 🚢 Deployment

### Environment Variables

Production `.env`:

```bash
NEXT_PUBLIC_BACKEND_URL=https://api.fusionems.com
BACKEND_URL=https://api.fusionems.com
POSTMARK_API_KEY=your_production_key
POSTMARK_FROM_EMAIL=noreply@fusionems.com
DEMO_NOTIFICATION_EMAIL=sales@fusionems.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_APP_URL=https://fusionems.com
```

### Build & Deploy

```bash
# Build frontend
npm run build

# Test production build locally
npm start

# Deploy to Vercel/Netlify/Custom
# Follow platform-specific deployment guides
```

### Backend Integration

Ensure marketing routes are registered in FastAPI:

```python
# backend/main.py
from services.marketing import router as marketing_router

app.include_router(marketing_router)
```

## 📈 Analytics & Tracking (Optional)

Track key metrics:

1. **Hero Visibility**: Intersection Observer when 50% visible
2. **CTA Clicks**: "Request a Demo", "Pay a Medical Bill"
3. **Scroll Depth**: 25%, 50%, 75%, 100%
4. **Form Submissions**: Demo requests, billing lookups
5. **Time on Page**: Engagement duration

## 🛠️ Maintenance

### Regular Updates

- Monitor demo request submissions
- Review and respond to inquiries within 24 hours
- Update testimonials and stats quarterly
- Refresh trust badges as certifications renew
- Keep logo assets version-controlled

### Performance Monitoring

- Run Lighthouse audits monthly
- Monitor Core Web Vitals
- Track conversion rates
- A/B test headline variants

## 📞 Support

For questions or issues:

- **Sales**: sales@fusionems.com
- **Billing**: billing@fusionems.com
- **Support**: 1-800-555-0123
- **Technical**: support@fusionems.com

## 📝 License

Proprietary - FusionEMS Quantum Platform
Copyright © 2024 FusionEMS. All rights reserved.
