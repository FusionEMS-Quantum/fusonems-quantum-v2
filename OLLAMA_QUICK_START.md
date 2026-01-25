# FusionEMS Self-Hosted AI on Your Existing Droplet

## Quick Start (5 minutes)

You already have a backend droplet. This adds Ollama AI alongside it — no disruption to your FastAPI service.

### Step 1: SSH into Your Droplet

```bash
ssh root@your-droplet-ip
```

### Step 2: Run the Installation Script

```bash
cd /root/fusonems-quantum-v2
chmod +x install_ollama.sh
./install_ollama.sh
```

**What it does:**
- ✅ Installs Docker (if not already installed)
- ✅ Creates persistent volume for AI models
- ✅ Starts Ollama container (isolated, doesn't affect FastAPI)
- ✅ Downloads 3 AI models (~20GB total, takes 10-20 min)
- ✅ Configures port 11434 (internal only, secure)
- ✅ Allocates 6GB RAM, 3 CPUs (leaves room for your backend)

### Step 3: Test the Connection

```bash
curl http://127.0.0.1:11434/api/tags
```

Should return:
```json
{
  "models": [
    { "name": "mistral:latest", ... },
    { "name": "neural-chat:latest", ... },
    { "name": "dolphin-mixtral:latest", ... }
  ]
}
```

### Step 4: Update FusionEMS Config

```python
# /root/fusonems-quantum-v2/backend/services/ai/self_hosted_ai.py

class SelfHostedAIConfig:
    OLLAMA_SERVER_URL = "http://127.0.0.1:11434"  # ← Update this
    DEFAULT_NARRATIVE_MODEL = "mistral"
    DEFAULT_CODING_MODEL = "dolphin-mixtral"
    DEFAULT_QA_MODEL = "neural-chat"
```

### Step 5: Restart Your Backend

```bash
cd /root/fusonems-quantum-v2
docker-compose down
docker-compose up -d
```

Done! Your FusionEMS ePCR now has unlimited AI with zero API costs.

---

## Storage & Performance

### Disk Space Usage

```
Models on your droplet:
- Mistral: 4GB
- Neural-Chat: 3.3GB
- Dolphin-Mixtral: 13GB
─────────────────
Total: ~20GB

Where stored:
/var/lib/docker/volumes/ollama-models/_data

Check space:
docker system df
```

### Performance Impact on Your Backend

```
Your Droplet Resources:

Before Ollama:
- Available RAM: 8GB
- Available CPU: All cores

After Ollama:
- Allocated to Ollama: 6GB RAM, 3 CPU cores
- Remaining for FastAPI: 2GB RAM, remaining cores
- Impact: Minimal (your backend gets 2GB, usually enough)

If FastAPI is memory-constrained:
- Reduce Ollama to 4GB: edit install_ollama.sh, change --memory="6g" to --memory="4g"
- Or upgrade droplet to $24/month (16GB RAM)
```

### Typical Response Times

```
From your backend (same droplet):

Narrative generation (Mistral):
  First request: 3-5s (model loading)
  Subsequent: 8-12s (actual inference)

Field suggestions (Neural-Chat):
  2-3 seconds

QA scoring:
  <100ms (mostly rule-based)

OCR (TensorFlow Lite, on mobile):
  150-300ms (no network call)
```

---

## Monitoring & Troubleshooting

### Check Ollama Status

```bash
# Is container running?
docker ps | grep ollama

# View logs
docker logs ollama

# Real-time stats
docker stats ollama

# Check API health
curl http://127.0.0.1:11434/api/status
```

### If Ollama is Using Too Much Memory

```bash
# Current usage
docker stats ollama

# Reduce allocation (edit install_ollama.sh)
# Change: --memory="6g" to --memory="4g"
# Then: docker restart ollama

# Or stop it temporarily
docker stop ollama
```

### If Models Didn't Download Fully

```bash
# Resume download
docker exec ollama ollama pull mistral
docker exec ollama ollama pull neural-chat
docker exec ollama ollama pull dolphin-mixtral

# Check what's installed
docker exec ollama ollama list
```

### If Backend Can't Connect to Ollama

```bash
# Test from inside your backend container
docker exec -it fusonems_backend_1 curl http://127.0.0.1:11434/api/tags

# If that fails, check if containers can communicate
docker network ls
docker network inspect bridge  # default network
```

---

## Costs & ROI

### Your DigitalOcean Droplet

```
Before (just FastAPI backend):
- $12/month (8GB, 160GB SSD)

After (FastAPI + Ollama AI):
- $12/month (same droplet!)
- No additional cost
- Unlimited AI inference

vs API-based systems:
- Narrative generation: $0 vs $0.03-0.12 per call
- Field suggestions: $0 vs $0.01 per call
- QA scoring: $0 vs $0.005 per call
- OCR: $0 vs $0.02 per image

ROI for 50 charts/day:
- Queries per day: ~200 (narrative, suggestions, QA, OCR)
- API cost per day: $5-15
- Self-hosted cost per day: $0.40 (droplet amortized)
- Monthly savings: $140-450
- Annual savings: $1,680-5,400
```

---

## Advanced: Using Different Droplet Sizes

### Current Setup ($12/month, 8GB)

**Recommended for:**
- Small agencies (1-2 ambulances)
- 10-20 charts/day
- Casual usage

**Resources:**
- 8GB RAM total
- 2GB available for FastAPI
- 6GB for Ollama

### If You Need More Power ($24/month, 16GB)

```bash
# Upgrade via DigitalOcean console
# Then update Ollama allocation:

docker run -d \
  --name ollama \
  -p 127.0.0.1:11434:11434 \
  -v ollama-models:/root/.ollama \
  --memory="12g"  # ← Increased from 6g
  --cpus="4"      # ← Increased from 3
  ollama/ollama
```

### If You Have Enterprise Needs ($48/month, 32GB)

- Run multiple Ollama instances (one per model)
- Use Kubernetes for load balancing
- Run backup Ollama on second droplet
- 100% uptime SLA

---

## Security Notes

### Ollama API (127.0.0.1:11434)

- ✅ Bound to localhost only (not exposed to internet)
- ✅ Only accessible from your backend FastAPI
- ✅ No authentication needed (internal network)

### If You Ever Need Remote Ollama Access

```bash
# Add SSH tunnel (don't expose Ollama directly!)
ssh -L 11434:127.0.0.1:11434 root@your-droplet-ip
# Then connect to: http://127.0.0.1:11434 from local

# Or use Docker registry/secrets for secure API key
```

---

## Next Steps

1. ✅ Run install script (5 min)
2. ✅ Test connection (1 min)
3. ✅ Update FusionEMS config (1 min)
4. ✅ Restart backend (1 min)
5. ✅ Test narrative generation via API (5 min)

**Total setup time: ~30 minutes (mostly waiting for model downloads)**

---

## Example: Calling Ollama from Your Backend

```python
# In your ePCR routes
from services.ai.self_hosted_ai import OllamaNarrativeEngine

@router.post("/patients/{patient_id}/generate_narrative")
def generate_narrative(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    
    # Call local Ollama (no API cost!)
    result = OllamaNarrativeEngine.generate_narrative(
        patient_data={
            'first_name': patient.first_name,
            'last_name': patient.last_name,
            'age': patient.age,
        },
        vitals=patient.vitals,
        medications=patient.medications,
        procedures=patient.procedures,
        model='mistral',
    )
    
    # Result includes: narrative, generation_time, cost ($0.00)
    return result
```

---

**That's it! You now have unlimited AI on your existing droplet with zero additional cost.** 🚀

Any questions? Run `docker logs ollama` to debug or reach out.
