#!/usr/bin/env bash
set -e

echo "=============================="
echo "STOP & CLEAN"
echo "=============================="
docker compose down -v || true

echo "=============================="
echo "WRITE .env"
echo "=============================="
cat > .env <<'EOF'
ENV=development
DATABASE_URL=postgresql+psycopg2://postgres:postgres@db:5432/postgres
KEYCLOAK_BASE_URL=http://keycloak:8080
KEYCLOAK_REALM=fusionems
KEYCLOAK_CLIENT_ID=fusionems-api
KEYCLOAK_CLIENT_SECRET=dev-secret
EOF

echo "=============================="
echo "FIX Pydantic Settings"
echo "=============================="
cat > backend/core/config.py <<'EOF'
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    model_config = {"extra": "allow", "env_file": ".env"}

    env: str = Field("development", env="ENV")
    database_url: str = Field(..., env="DATABASE_URL")

    keycloak_base_url: str = Field(..., env="KEYCLOAK_BASE_URL")
    keycloak_realm: str = Field(..., env="KEYCLOAK_REALM")
    keycloak_client_id: str = Field(..., env="KEYCLOAK_CLIENT_ID")
    keycloak_client_secret: str = Field(..., env="KEYCLOAK_CLIENT_SECRET")

settings = Settings()

def validate_settings_runtime():
    return True
EOF

echo "=============================="
echo "WRITE BACKEND Dockerfile"
echo "=============================="
cat > Dockerfile <<'EOF'
FROM python:3.11-slim

WORKDIR /app
ENV PYTHONPATH=/app
ENV ENV=development

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./backend

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
EOF

echo "=============================="
echo "ENSURE docker-compose backend env"
echo "=============================="
if ! grep -q "env_file:" docker-compose.yml; then
  sed -i '/backend:/a\ \ \ \ env_file:\n\ \ \ \ \ - .env' docker-compose.yml
fi

echo "=============================="
echo "REBUILD & START"
echo "=============================="
docker compose build --no-cache
docker compose up -d

echo "=============================="
echo "WAIT FOR BACKEND"
echo "=============================="
sleep 10
docker compose logs backend --tail=50

echo "=============================="
echo "RUN MIGRATIONS"
echo "=============================="
docker compose exec backend alembic upgrade head

echo "=============================="
echo "DONE"
echo "=============================="
