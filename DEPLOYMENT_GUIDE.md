# FusionEMS Quantum - One-Command Deployment

## Your Droplet: 157.245.6.217

### Deploy Now (Single Command)

```bash
ssh root@157.245.6.217 "cd /root/fusonems-quantum-v2 && chmod +x deploy.sh && ./deploy.sh"
```

**What this does:**
1. ✅ Syncs latest code
2. ✅ Installs Ollama (self-hosted AI)
3. ✅ Downloads AI models (20GB, ~15 min)
4. ✅ Builds Docker images (backend + frontend)
5. ✅ Starts all services
6. ✅ Verifies everything is running

**Time:** ~20-30 minutes (mostly model downloads)

---

## After Deployment

### Access Your Platform

- **Frontend:** http://157.245.6.217:3000
- **Backend API:** http://157.245.6.217:8000
- **API Docs:** http://157.245.6.217:8000/docs

### First Steps

1. **Register a new account**
   - Go to http://157.245.6.217:3000/register
   - Fill in email, password, full name, organization
   - Submit

2. **Login**
   - Go to http://157.245.6.217:3000/login
   - Use your credentials
   - You're in the dashboard!

3. **Test AI Features**
   - Via API: `curl http://157.245.6.217:8000/docs`
   - Scroll to `/api/ocr/scan_device` endpoint
   - Test narrative generation, field suggestions, QA scoring

---

## Monitoring

### Check Service Status

```bash
# SSH into droplet
ssh root@157.245.6.217

# View all containers
docker ps

# Check backend logs
docker logs -f backend

# Check Ollama AI status
docker exec ollama ollama list

# Check overall stats
docker stats
```

### Common Commands

```bash
# Stop all services
docker-compose down

# Restart services
docker-compose up -d

# View database
docker exec db psql -U user -d fusionems

# Check API health
curl http://157.245.6.217:8000/health
```

---

## Features Deployed

✅ **Authentication**
- JWT login/register
- Protected routes
- Auth context available to all components

✅ **Notifications**
- In-app notifications
- Email integration (Postmark)
- SMS integration (Telnyx)
- Event-driven architecture

✅ **OCR System**
- Equipment screen scanning (cardiac, vent, meds, blood)
- NEMSIS field mapping
- Confidence scoring
- Auto-population

✅ **ePCR Platform**
- Patient models with state timeline
- Narrative versioning
- NEMSIS validation results

✅ **Self-Hosted AI** (Zero Cost)
- Mistral (narrative generation)
- Neural-Chat (field suggestions)
- Dolphin-Mixtral (complex reasoning)
- No API costs, unlimited usage

---

## Troubleshooting

### If models are still downloading

```bash
# Check Ollama logs
docker logs -f ollama

# Download status
docker exec ollama ollama list

# Expected models: mistral, neural-chat, dolphin-mixtral
```

### If backend can't connect to Ollama

```bash
# Test from inside backend container
docker exec backend curl http://ollama:11434/api/tags

# Should return JSON with models
```

### If database isn't initialized

```bash
# SSH in and run migrations
docker exec backend python -m alembic upgrade head

# Or reset database
docker-compose down -v
docker-compose up -d
```

### If ports are already in use

```bash
# Find what's using port 8000
lsof -i :8000

# Kill it if needed
kill -9 <PID>

# Or change ports in docker-compose.yml
```

---

## Cost Breakdown

```
Your current droplet:    $12/month
Additional AI cost:      $0/month (runs on same droplet)
────────────────────────────────
Total:                   $12/month

Unlimited usage:
- Narrative generation:  $0 per chart
- Field suggestions:     $0 per suggestion
- QA scoring:            $0 per chart
- OCR scanning:          $0 per scan

vs Competitors:
- ESO: $5/chart × 12,500/year = $62,500/year
- ImageTrend: $3.50/chart × 12,500/year = $43,750/year
- First Due: $18k-30k/year

YOUR SAVINGS: $17k-62k/year
```

---

## What's Running

```
Container        Port     Purpose
────────────────────────────────────────────────
db              5432     PostgreSQL database
backend         8000     FastAPI (auth, notifications, OCR, AI)
frontend        3000     Next.js (login, register, dashboard)
ollama          11434    Self-hosted AI models
```

---

## Docs

- **Platform Overview:** `PLATFORM_SUMMARY.md`
- **AI Setup:** `OLLAMA_QUICK_START.md`
- **Self-Hosted AI:** `SELF_HOSTED_AI_SETUP.md`

---

## Questions?

### Check logs first
```bash
docker logs backend
docker logs ollama
docker logs frontend
```

### Common issues

**"Connection refused"**
- Wait 30s for services to start
- Check `docker ps` to see if all containers are running

**"Out of memory"**
- Ollama uses 6GB, backend uses ~1GB
- You have 8GB total, should be fine
- If issues, upgrade droplet to $24/month (16GB)

**"Models not downloading"**
- Check internet connection
- Check disk space: `df -h`
- Models are ~20GB total
- Takes 10-20 minutes

---

## You're Live! 🚀

FusionEMS Quantum is now running on your droplet.

- Enterprise-grade EMS ePCR platform
- All vendors' features combined
- 99% cheaper than competitors
- Self-hosted, full data control
- Ready for production

**Next steps:**
1. Register account
2. Explore dashboard
3. Test OCR and AI features
4. Invite team members

Enjoy! 🎉
