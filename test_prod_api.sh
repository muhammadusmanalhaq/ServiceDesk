#!/bin/bash
API_URL="https://ca-servicedesk-api.wittysand-864c0963.uaenorth.azurecontainerapps.io"

echo "Logging in as Alice (Admin)..."
ALICE_TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" -d '{"email":"alice@test.com","password":"Password123!"}' | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

echo "Logging in as Bob (IT Agent)..."
BOB_TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" -d '{"email":"bob@test.com","password":"Password123!"}' | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

echo "Logging in as Charlie (Ops Manager)..."
CHARLIE_TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" -d '{"email":"charlie@test.com","password":"Password123!"}' | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

echo "Creating IT Dept Ticket..."
IT_ASSET_ID=$(curl -s -X GET "$API_URL/api/assets" -H "Authorization: Bearer $BOB_TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
IT_TICKET_RESP=$(curl -s -X POST "$API_URL/api/tickets" -H "Authorization: Bearer $BOB_TOKEN" -H "Content-Type: application/json" -d "{\"title\":\"IT Issue\",\"description\":\"Fix it\",\"assetId\":\"$IT_ASSET_ID\",\"priority\":\"Medium\"}")
IT_TICKET_ID=$(echo "$IT_TICKET_RESP" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

echo "Creating Ops Dept Ticket..."
OPS_ASSET_ID=$(curl -s -X GET "$API_URL/api/assets" -H "Authorization: Bearer $CHARLIE_TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
OPS_TICKET_RESP=$(curl -s -X POST "$API_URL/api/tickets" -H "Authorization: Bearer $CHARLIE_TOKEN" -H "Content-Type: application/json" -d "{\"title\":\"Ops Issue\",\"description\":\"Fix ops\",\"assetId\":\"$OPS_ASSET_ID\",\"priority\":\"Medium\"}")
OPS_TICKET_ID=$(echo "$OPS_TICKET_RESP" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

echo "IT Ticket ID: $IT_TICKET_ID"
echo "Ops Ticket ID: $OPS_TICKET_ID"

echo -e "\n--- TESTING BOB (IT Agent) CROSS-DEPT CLAIM ---"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST "$API_URL/api/tickets/$OPS_TICKET_ID/claim" -H "Authorization: Bearer $BOB_TOKEN" -H "Content-Type: application/json" -d '{"resolutionNote":"Fixed"}'

echo -e "\n--- TESTING BOB (IT Agent) OWN DEPT CLAIM ---"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST "$API_URL/api/tickets/$IT_TICKET_ID/claim" -H "Authorization: Bearer $BOB_TOKEN" -H "Content-Type: application/json" -d '{"resolutionNote":"Fixed IT issue"}'

echo -e "\n--- TESTING CHARLIE (Ops Manager) CROSS-DEPT VERIFY ---"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST "$API_URL/api/tickets/$IT_TICKET_ID/verify" -H "Authorization: Bearer $CHARLIE_TOKEN" -H "Content-Type: application/json" -d '{"accept":true}'

echo -e "\n--- TESTING ALICE (Admin) OWN DEPT (ALL DEPTS) VERIFY ---"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST "$API_URL/api/tickets/$IT_TICKET_ID/verify" -H "Authorization: Bearer $ALICE_TOKEN" -H "Content-Type: application/json" -d '{"accept":true}'
