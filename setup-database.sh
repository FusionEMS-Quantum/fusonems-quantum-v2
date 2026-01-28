#!/bin/bash

echo "🚀 FusoNEMS CAD System - Database Setup"
echo "========================================"

# Start PostgreSQL
echo "Starting PostgreSQL..."
service postgresql start

# Wait for PostgreSQL to start
sleep 3

# Create database and user
echo "Creating database and user..."
sudo -u postgres psql << EOF
CREATE DATABASE fusonems_cad;
CREATE USER fusonems WITH PASSWORD 'fusonems_password';
GRANT ALL PRIVILEGES ON DATABASE fusonems_cad TO fusonems;
\c fusonems_cad
CREATE EXTENSION postgis;
GRANT ALL ON SCHEMA public TO fusonems;
EOF

echo "✅ Database setup complete!"

# Run migrations
echo "Running database migrations..."
cd /root/fusonems-quantum-v2/cad-backend
npx knex migrate:latest

echo "✅ Migrations complete!"

# Start Redis
echo "Starting Redis..."
service redis-server start

echo "✅ Redis started!"

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Backend: cd cad-backend && npm start"
echo "2. CrewLink: cd crewlink-pwa && npm run dev (port 3001)"
echo "3. MDT: cd mdt-pwa && npm run dev (port 3002)"
echo "4. CAD Dashboard: cd cad-dashboard && npm run dev (port 3003)"
