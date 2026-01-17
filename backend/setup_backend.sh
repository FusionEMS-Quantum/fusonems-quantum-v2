#!/bin/zsh
setopt NO_BANG_HIST
# ==========================================================
# 🚑 FusonEMS Quantum Backend Scaffolding Script
# ==========================================================
# This script provides basic scaffolding for development.
# Database engines are centralized in backend/core/database.py
# and should not be created ad-hoc.
# ==========================================================

echo "🔍 Initializing FusonEMS Quantum Backend Setup..."

cd "$(dirname "$0")" || exit
mkdir -p core db services/cad utils

# --- Virtual Environment ---
if [ ! -d "venv" ]; then
  echo "⚙️  Creating virtual environment..."
  python3 -m venv venv
fi
source venv/bin/activate

# --- Install Dependencies ---
echo "📦 Installing dependencies..."
if [ -f "requirements.txt" ]; then
  pip install -r requirements.txt
else
  echo "⚠️  requirements.txt not found, skipping dependency installation"
fi

# --- Run Server ---
echo "🚀 Starting FusonEMS Quantum Backend..."
uvicorn main:app --reload --host 127.0.0.1 --port 8000
