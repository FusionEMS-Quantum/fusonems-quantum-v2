#!/bin/zsh
set -e

if [ -z "$DO_API_TOKEN" ] || [ -z "$DO_APP_ID" ]; then
  echo "Missing DO_API_TOKEN or DO_APP_ID"
  exit 1
fi

curl -sS -X POST "https://api.digitalocean.com/v2/apps/${DO_APP_ID}/deployments" \
  -H "Authorization: Bearer ${DO_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"force_build":true}'
