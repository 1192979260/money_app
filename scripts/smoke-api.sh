#!/usr/bin/env bash
set -euo pipefail

API_BASE="${1:-http://127.0.0.1:3000}"
API_BASE="${API_BASE%/}"

echo "[smoke] API_BASE=${API_BASE}"

AUTH_JSON="$(curl -fsS -X POST "${API_BASE}/v1/auth/guest" \
  -H 'content-type: application/json' \
  -d '{"deviceId":"smoke-check-device"}')"
TOKEN="$(echo "${AUTH_JSON}" | node -pe "JSON.parse(fs.readFileSync(0,'utf8')).token")"

if [ -z "${TOKEN}" ] || [ "${TOKEN}" = "undefined" ]; then
  echo "[smoke] auth failed: token missing"
  exit 1
fi
echo "[smoke] auth/guest OK"

curl -fsS -X POST "${API_BASE}/v1/chat-ledger/start" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'content-type: application/json' \
  -d '{}' >/dev/null
echo "[smoke] chat-ledger/start OK"

curl -fsS -X GET "${API_BASE}/v1/ledger" \
  -H "Authorization: Bearer ${TOKEN}" >/dev/null
echo "[smoke] ledger OK"

echo "[smoke] ALL OK"
