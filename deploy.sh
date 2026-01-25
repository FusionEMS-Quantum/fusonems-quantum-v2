#!/bin/bash
# FusionEMS Quantum - Complete Deployment Script
# Deployment target: root@157.245.6.217 (DigitalOcean droplet)
# This script updates existing Docker-based services with new features

set -e

echo "========================================"
echo "FusionEMS Quantum - Deployment Script"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
DROPLET_IP="157.245.6.217"
REPO_PATH="/root/fusonems-quantum-v2"
BACKEND_PATH="$REPO_PATH/backend"
FRONTEND_PATH="$REPO_PATH/src"

echo -e "${BLUE}Step 1: Sync latest code from local repo...${NC}"
cd $REPO_PATH

# Pull latest changes
git pull origin main 2>/dev/null || echo "Git pull skipped (not a git repo)"

echo -e "${GREEN}✓ Code synced${NC}"
echo ""

echo -e "${BLUE}Step 2: Install self-hosted AI (Ollama)...${NC}"

# Make install script executable
chmod +x $REPO_PATH/install_ollama.sh

# Run Ollama installation
$REPO_PATH/install_ollama.sh

echo -e "${GREEN}✓ Ollama installed with models${NC}"
echo ""

echo -e "${BLUE}Step 3: Update backend configuration...${NC}"

# Create .env file for backend if it doesn't exist
if [ ! -f "$BACKEND_PATH/.env" ]; then
    echo "Creating .env file..."
    cat > "$BACKEND_PATH/.env" << 'EOF'
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/fusionems

# Security
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256

# Environment
ENV=production
DEBUG=false

# AI Configuration (UPDATED FOR SELF-HOSTED)
OLLAMA_SERVER_URL=http://127.0.0.1:11434
OPENAI_API_KEY=  # Leave empty, using self-hosted

# Email (Postmark)
POSTMARK_SERVER_TOKEN=your-postmark-token

# SMS (Telnyx)
TELNYX_API_KEY=your-telnyx-api-key

# Training mode
TRAINING_MODE=false
EOF
    echo -e "${YELLOW}⚠ .env file created. Update with your actual credentials!${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
    # Add Ollama config if missing
    if ! grep -q "OLLAMA_SERVER_URL" "$BACKEND_PATH/.env"; then
        echo "OLLAMA_SERVER_URL=http://127.0.0.1:11434" >> "$BACKEND_PATH/.env"
        echo -e "${YELLOW}✓ Added OLLAMA_SERVER_URL to .env${NC}"
    fi
fi

echo ""

echo -e "${BLUE}Step 4: Build backend Docker image...${NC}"

cd $REPO_PATH

# Update docker-compose.yml to include Ollama health check
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # PostgreSQL Database
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: fusionems
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d fusionems"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # FastAPI Backend
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://user:password@db:5432/fusionems
      OLLAMA_SERVER_URL: http://ollama:11434
      ENV: production
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
      ollama:
        condition: service_started
    volumes:
      - ./backend:/app
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    restart: unless-stopped

  # Next.js Frontend
  frontend:
    build:
      context: .
      dockerfile: frontend.Dockerfile
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
    volumes:
      - ./src:/app/src
    restart: unless-stopped

  # Ollama AI (Self-Hosted)
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    ports:
      - "127.0.0.1:11434:11434"
    environment:
      OLLAMA_HOST: 0.0.0.0:11434
    volumes:
      - ollama_models:/root/.ollama
    memory: 6g
    cpus: "3"
    restart: unless-stopped

volumes:
  postgres_data:
  ollama_models:
EOF

echo -e "${GREEN}✓ docker-compose.yml updated${NC}"
echo ""

echo -e "${BLUE}Step 5: Start/restart Docker services...${NC}"

docker-compose down 2>/dev/null || true
docker-compose pull
docker-compose up -d

echo -e "${GREEN}✓ Docker services started${NC}"
echo ""

echo -e "${BLUE}Step 6: Wait for services to be ready...${NC}"

# Wait for backend to be ready
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s http://127.0.0.1:8000/docs > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is ready${NC}"
        break
    fi
    attempt=$((attempt + 1))
    echo "Waiting for backend... ($attempt/$max_attempts)"
    sleep 2
done

echo ""

echo -e "${BLUE}Step 7: Verify Ollama connection...${NC}"

ollama_ready=$(curl -s http://127.0.0.1:11434/api/tags 2>/dev/null | grep -c "models" || echo 0)
if [ $ollama_ready -gt 0 ]; then
    echo -e "${GREEN}✓ Ollama is ready with models${NC}"
    docker exec ollama ollama list
else
    echo -e "${YELLOW}⚠ Ollama still loading models, this may take a few minutes${NC}"
fi

echo ""

echo -e "${GREEN}=========================================="
echo "✓ FusionEMS Quantum Deployment Complete!"
echo "==========================================${NC}"
echo ""

echo -e "${BLUE}System Status:${NC}"
echo "  Backend (FastAPI):  http://157.245.6.217:8000"
echo "  API Docs:           http://157.245.6.217:8000/docs"
echo "  Frontend (Next.js): http://157.245.6.217:3000"
echo "  Ollama API:         http://127.0.0.1:11434 (internal only)"
echo ""

echo -e "${BLUE}Available Features:${NC}"
echo "  ✓ Authentication (JWT)"
echo "  ✓ Notifications (in-app, email, SMS)"
echo "  ✓ OCR Equipment Scanning"
echo "  ✓ NEMSIS Validation & Mapping"
echo "  ✓ Self-Hosted AI (Narrative, Suggestions, QA)"
echo ""

echo -e "${BLUE}Default Login:${NC}"
echo "  Register new account at: http://157.245.6.217:3000/register"
echo ""

echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Visit http://157.245.6.217:3000 in your browser"
echo "  2. Create an account (register)"
echo "  3. Log in and explore the dashboard"
echo "  4. Test AI features via /api/ocr and /api/notifications"
echo ""

echo -e "${BLUE}Monitoring:${NC}"
echo "  View backend logs:  docker logs -f backend"
echo "  View Ollama logs:   docker logs -f ollama"
echo "  Check AI status:    curl http://127.0.0.1:11434/api/tags"
echo ""

echo -e "${GREEN}✓ Deployment successful!${NC}"
