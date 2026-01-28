#!/bin/bash
echo "🚀 FusoNEMS CAD - DigitalOcean Setup"
echo "===================================="

# Start services
echo "Starting PostgreSQL..."
service postgresql start
sleep 2

echo "Starting Redis..."
service redis-server start
sleep 1

# Setup database
echo "Creating database..."
sudo -u postgres psql << 'EOSQL'
CREATE DATABASE fusonems_cad;
CREATE USER fusonems WITH PASSWORD 'fusonems_password';
GRANT ALL PRIVILEGES ON DATABASE fusonems_cad TO fusonems;
\c fusonems_cad
CREATE EXTENSION postgis;
GRANT ALL ON SCHEMA public TO fusonems;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fusonems;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fusonems;
EOSQL

# Run migrations
echo "Running migrations..."
cd /root/fusonems-quantum-v2/cad-backend
npx knex migrate:latest

echo ""
echo "✅ Setup Complete!"
echo ""
echo "Start apps:"
echo "  cd cad-backend && npm start &"
echo "  cd crewlink-pwa && npm run dev -- --host 0.0.0.0 &"
echo "  cd mdt-pwa && npm run dev -- --host 0.0.0.0 &"
echo "  cd cad-dashboard && npm run dev -- --host 0.0.0.0 &"
