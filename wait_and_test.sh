#!/bin/bash
API_URL="https://ca-servicedesk-api.wittysand-864c0963.uaenorth.azurecontainerapps.io"

echo "Waiting for GitHub Actions to complete..."
while true; do
  STATUS=$(gh run list --limit 1 | grep "feat: ticket verification" | awk '{print $1}')
  if [ "$STATUS" == "✓" ] || [ "$STATUS" == "X" ]; then
    break
  fi
  sleep 15
done

if [ "$STATUS" == "X" ]; then
  echo "GitHub Action failed! Cannot test API."
  exit 1
fi
echo "GitHub Action completed successfully."
sleep 15

# Get tokens
BOB_TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" -d '{"email":"bob@test.com","password":"Password123!"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)
CHARLIE_TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" -d '{"email":"charlie@test.com","password":"Password123!"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Create tickets since none exist
echo "Creating IT Dept Ticket..."
IT_ASSET_ID=$(curl -s -X GET "$API_URL/api/assets" -H "Authorization: Bearer $BOB_TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
IT_TICKET_RESP=$(curl -s -X POST "$API_URL/api/tickets" -H "Authorization: Bearer $BOB_TOKEN" -H "Content-Type: application/json" -d "{\"title\":\"IT Issue\",\"description\":\"Fix it\",\"assetId\":\"$IT_ASSET_ID\",\"priority\":\"Medium\"}")
IT_TICKET_ID=$(echo "$IT_TICKET_RESP" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

echo "Creating Ops Dept Ticket..."
OPS_ASSET_ID=$(curl -s -X GET "$API_URL/api/assets" -H "Authorization: Bearer $CHARLIE_TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
OPS_TICKET_RESP=$(curl -s -X POST "$API_URL/api/tickets" -H "Authorization: Bearer $CHARLIE_TOKEN" -H "Content-Type: application/json" -d "{\"title\":\"Ops Issue\",\"description\":\"Fix ops\",\"assetId\":\"$OPS_ASSET_ID\",\"priority\":\"Medium\"}")
OPS_TICKET_ID=$(echo "$OPS_TICKET_RESP" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

echo -e "\n--- TESTING BOB (IT Agent) CROSS-DEPT CLAIM ---"
echo "Attempting to claim Ops Dept ticket ($OPS_TICKET_ID)..."
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST "$API_URL/api/tickets/$OPS_TICKET_ID/claim" -H "Authorization: Bearer $BOB_TOKEN" -H "Content-Type: application/json" -d '{"resolutionNote":"Fixed"}'

echo -e "\n--- TESTING BOB (IT Agent) OWN DEPT CLAIM ---"
echo "Attempting to claim IT Dept ticket ($IT_TICKET_ID)..."
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST "$API_URL/api/tickets/$IT_TICKET_ID/claim" -H "Authorization: Bearer $BOB_TOKEN" -H "Content-Type: application/json" -d '{"resolutionNote":"Fixed IT issue"}'
