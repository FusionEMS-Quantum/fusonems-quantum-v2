#!/bin/bash
echo "🚀 FusoNEMS CAD - Starting All Services"
echo "======================================="
echo ""
echo "Starting backend..."
cd /root/fusonems-quantum-v2/cad-backend && npm start &
sleep 3
echo "Starting CrewLink PWA..."
cd /root/fusonems-quantum-v2/crewlink-pwa && npm run dev -- --host 0.0.0.0 &
sleep 2
echo "Starting MDT PWA..."
cd /root/fusonems-quantum-v2/mdt-pwa && npm run dev -- --host 0.0.0.0 &
sleep 2
echo "Starting CAD Dashboard..."
cd /root/fusonems-quantum-v2/cad-dashboard && npm run dev -- --host 0.0.0.0 &
sleep 2
echo ""
echo "✅ All services started!"
echo ""
IP=$(curl -s ifconfig.me)
echo "Access at:"
echo "  Backend:       http://$IP:3000"
echo "  CrewLink PWA:  http://$IP:3001"
echo "  MDT PWA:       http://$IP:3002"
echo "  CAD Dashboard: http://$IP:3003"
echo ""
echo "Press Ctrl+C to stop all services"
wait
