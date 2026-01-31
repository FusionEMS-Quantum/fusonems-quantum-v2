#!/usr/bin/env bash
# Add the local SSH private key to GitHub DEPLOY_KEY secret.
# Prereq: gh auth login (one-time)
# Usage: ./scripts/add-deploy-secret.sh

set -e
KEY_FILE="${1:-$HOME/.ssh/id_ed25519}"
if [ ! -f "$KEY_FILE" ]; then
  echo "Key not found: $KEY_FILE"
  exit 1
fi
gh secret set DEPLOY_KEY < "$KEY_FILE"
echo "DEPLOY_KEY secret updated from $KEY_FILE"
