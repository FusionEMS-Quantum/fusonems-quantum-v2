#!/bin/bash
echo "🚀 FusoNEMS CAD - DigitalOcean Setup"
echo "===================================="

service postgresql start
sleep 2
service redis-server start
sleep 1

echo "Creating database..."
sudo -u postgres psql -c "CREATE DATABASE fusonems_cad;" 2>/dev/null
sudo -u postgres psql -c "CREATE USER fusonems WITH PASSWORD 'fusonems_password';" 2>/dev/null
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE fusonems_cad TO fusonems;"
sudo -u postgres psql fusonems_cad -c "CREATE EXTENSION IF NOT EXISTS postgis;"
sudo -u postgres psql fusonems_cad -c "GRANT ALL ON SCHEMA public TO fusonems;"

echo "Running migrations..."
cd /root/fusonems-quantum-v2/cad-backend
npx knex migrate:latest

echo ""
echo "✅ Setup Complete!"
echo ""
echo "Get your Droplet IP:"
echo "  curl -s ifconfig.me"
echo ""
echo "Start backend:"
echo "  cd /root/fusonems-quantum-v2/cad-backend && npm start"
