#!/usr/bin/env bash
set -u
PROJECT_DIR="/Users/prashanbastiansz/Downloads/church-portal-starter"
cd "$PROJECT_DIR" || exit 1

# Ensure dev server running; start if needed and detect which port it bound to
if ! curl -sS --head http://localhost:3001/api/notices >/dev/null 2>&1 && ! curl -sS --head http://localhost:3000/api/notices >/dev/null 2>&1; then
  nohup npm run dev > /tmp/next-dev.log 2>&1 &
  sleep 1
  tail -n +1 /tmp/next-dev.log | sed -n '1,120p'
fi

# Determine base URL from next log if available, otherwise try common ports
if [ -f /tmp/next-dev.log ]; then
  BASE_URL=$(grep -Eo "http://localhost:[0-9]+" /tmp/next-dev.log | tail -n1 || true)
fi
BASE_URL=${BASE_URL:-http://localhost:3001}
# If BASE_URL is just the host without scheme (guard), ensure it starts with http
case "$BASE_URL" in
  http:*) ;;
  *) BASE_URL="http://$BASE_URL" ;;
esac

# Also prefer port 3000 if reachable (Next often binds to 3000)
if curl -sS --head http://localhost:3000/api/notices >/dev/null 2>&1; then
  BASE_URL=http://localhost:3000
fi

echo "Using BASE_URL=$BASE_URL"

# Prepare payloads
cat > /tmp/login1.json <<'JSON'
{"email":"admin1@example.com","password":"Admin@123"}
JSON
cat > /tmp/notice.json <<'JSON'
{"title":"E2E Test Notice","bodyHtml":"<p>Testing publish flow</p>","weekOf":"2025-12-07T00:00:00.000Z"}
JSON

# 1) Login Admin1
echo "== LOGIN admin1 =="
curl -s -c /tmp/cookie_admin1 -X POST -H "Content-Type: application/json" -d @/tmp/login1.json "$BASE_URL/api/auth/login" -w "\nLOGIN1_STATUS:%{http_code}\n" -o /tmp/login1_resp.json || true
cat /tmp/login1_resp.json || true

# 2) Create notice as admin1
echo "\n== CREATE notice (submit) =="
curl -s -b /tmp/cookie_admin1 -X POST -H "Content-Type: application/json" -d @/tmp/notice.json "$BASE_URL/api/admin/notices" -w "\nCREATE_STATUS:%{http_code}\n" -o /tmp/create_resp.json || true
cat /tmp/create_resp.json || true

# 3) Login Admin2
cat > /tmp/login2.json <<'JSON'
{"email":"admin2@example.com","password":"Admin@123"}
JSON

echo "\n== LOGIN admin2 =="
curl -s -c /tmp/cookie_admin2 -X POST -H "Content-Type: application/json" -d @/tmp/login2.json "$BASE_URL/api/auth/login" -w "\nLOGIN2_STATUS:%{http_code}\n" -o /tmp/login2_resp.json || true
cat /tmp/login2_resp.json || true

# Extract created ID
ID=$(jq -r '.id // empty' /tmp/create_resp.json || true)
echo "created id: $ID"
if [ -z "$ID" ]; then echo "Failed to get created id; dumping approvals list:"; curl -s http://localhost:3001/api/approvals | sed -n '1,200p'; exit 1; fi

# 4) Approve as admin2 (approver1)
printf '{"resourceType":"notice","resourceId":%s,"comment":"Approver1 OK"}' "$ID" > /tmp/approve1_payload.json
curl -s -b /tmp/cookie_admin2 -X POST -H "Content-Type: application/json" -d @/tmp/approve1_payload.json "$BASE_URL/api/approvals/approve" -w "\nAPPROVE1_STATUS:%{http_code}\n" -o /tmp/approve1_resp.json || true

echo "\n-- approve1 response --"
cat /tmp/approve1_resp.json || true

# 5) Login Staff
cat > /tmp/login_staff.json <<'JSON'
{"email":"staff@example.com","password":"Staff@123"}
JSON

echo "\n== LOGIN staff =="
curl -s -c /tmp/cookie_staff -X POST -H "Content-Type: application/json" -d @/tmp/login_staff.json "$BASE_URL/api/auth/login" -w "\nLOGIN_STAFF_STATUS:%{http_code}\n" -o /tmp/login_staff_resp.json || true
cat /tmp/login_staff_resp.json || true

# 6) Approve as staff (approver2)
printf '{"resourceType":"notice","resourceId":%s,"comment":"Approver2 OK"}' "$ID" > /tmp/approve2_payload.json
curl -s -b /tmp/cookie_staff -X POST -H "Content-Type: application/json" -d @/tmp/approve2_payload.json "$BASE_URL/api/approvals/approve" -w "\nAPPROVE2_STATUS:%{http_code}\n" -o /tmp/approve2_resp.json || true

echo "\n-- approve2 response --"
cat /tmp/approve2_resp.json || true

# 7) Fetch notices
echo "\n== FETCH /api/notices =="
curl -s "$BASE_URL/api/notices" | jq . -C || cat /tmp/create_resp.json

# Show approval entries
echo "\n== approvals list =="
curl -s "$BASE_URL/api/approvals" | jq . -C || true

# Print next-dev log tail
echo "\n== /tmp/next-dev.log tail =="
tail -n 120 /tmp/next-dev.log || true
