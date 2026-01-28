#!/bin/bash

echo "🚀 FusoNEMS CAD - DigitalOcean Deployment Script"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}Please run as root (use sudo)${NC}"
   exit 1
fi

echo -e "${YELLOW}Step 1: Starting PostgreSQL...${NC}"
systemctl start postgresql
systemctl enable postgresql
sleep 2
echo -e "${GREEN}✓ PostgreSQL started${NC}"

echo ""
echo -e "${YELLOW}Step 2: Starting Redis...${NC}"
systemctl start redis-server
systemctl enable redis-server
redis-cli ping > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Redis started${NC}"
else
    echo -e "${RED}✗ Redis failed to start${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Setting up database...${NC}"
sudo -u postgres psql << 'EOSQL'
-- Create database if not exists
SELECT 'CREATE DATABASE fusonems_cad' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fusonems_cad')\gexec

-- Create user if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'fusonems') THEN
    CREATE USER fusonems WITH PASSWORD 'fusonems_password';
  END IF;
END
$$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE fusonems_cad TO fusonems;

-- Connect to database
\c fusonems_cad

-- Create PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO fusonems;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fusonems;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fusonems;

EOSQL

echo -e "${GREEN}✓ Database configured${NC}"

echo ""
echo -e "${YELLOW}Step 4: Running migrations...${NC}"
cd /root/fusonems-quantum-v2/cad-backend
export DATABASE_URL="postgresql://fusonems:fusonems_password@localhost:5432/fusonems_cad"
npx knex migrate:latest --knexfile knexfile.ts

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migrations completed${NC}"
else
    echo -e "${RED}✗ Migrations failed${NC}"
    echo "Try running manually: cd cad-backend && npx knex migrate:latest"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Services Status:${NC}"
systemctl status postgresql | grep "Active:"
systemctl status redis-server | grep "Active:"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Start backend:"
echo "   cd /root/fusonems-quantum-v2/cad-backend && npm start"
echo ""
echo "2. In separate terminals, start frontend apps:"
echo "   cd /root/fusonems-quantum-v2/crewlink-pwa && npm run dev"
echo "   cd /root/fusonems-quantum-v2/mdt-pwa && npm run dev"
echo "   cd /root/fusonems-quantum-v2/cad-dashboard && npm run dev"
echo ""
echo -e "${YELLOW}Access URLs (replace YOUR_DROPLET_IP):${NC}"
echo "   Backend:       http://YOUR_DROPLET_IP:3000"
echo "   CrewLink PWA:  http://YOUR_DROPLET_IP:3001"
echo "   MDT PWA:       http://YOUR_DROPLET_IP:3002"
echo "   CAD Dashboard: http://YOUR_DROPLET_IP:3003"
echo ""
echo -e "${YELLOW}To allow external access, configure firewall:${NC}"
echo "   ufw allow 3000/tcp"
echo "   ufw allow 3001/tcp"
echo "   ufw allow 3002/tcp"
echo "   ufw allow 3003/tcp"
echo ""
