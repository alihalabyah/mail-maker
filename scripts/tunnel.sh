#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Mail Maker with Cloudflare Tunnels...${NC}"

# Kill existing tunnels and stop web frontend
echo -e "${YELLOW}Cleaning up...${NC}"
pkill -f "cloudflared" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Ensure cloudflared is in PATH
export PATH="$HOME/bin:$PATH"

# Check Docker services
echo -e "${BLUE}Checking Docker services...${NC}"
if ! docker ps | grep -q "mail-maker-mailpit-1"; then
    echo -e "${RED}✗ Mailpit container not running. Start it with: docker-compose up -d${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Mailpit is running on port 8025${NC}"

# Check if API is running, start if needed
if lsof -i :3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API Backend is running on port 3001${NC}"
else
    echo -e "${YELLOW}Starting API Backend...${NC}"
    cd apps/api
    npm run dev > /tmp/api-backend.log 2>&1 &
    cd ../..
    echo -e "${GREEN}✓ API Backend starting...${NC}"
    sleep 5
fi

# Start tunnels first (before web frontend)
echo -e "${BLUE}Creating Cloudflare Tunnels...${NC}"

# API tunnel
echo -e "${YELLOW}Creating tunnel for API (port 3001)...${NC}"
cloudflared tunnel --url http://127.0.0.1:3001 --loglevel info > /tmp/api-tunnel.log 2>&1 &
API_TUNNEL_PID=$!

echo -e "${YELLOW}Waiting for API tunnel URL...${NC}"
for i in {1..15}; do
    sleep 2
    API_URL=$(grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/api-tunnel.log 2>/dev/null | head -1)
    if [ -n "$API_URL" ]; then
        break
    fi
done

if [ -z "$API_URL" ]; then
    echo -e "${RED}Failed to create API tunnel${NC}"
    tail -20 /tmp/api-tunnel.log
    exit 1
fi
echo -e "${GREEN}✓ API Tunnel: ${BLUE}$API_URL${NC}"

# Mailpit tunnel
echo -e "${YELLOW}Creating tunnel for Mailpit (port 8025)...${NC}"
cloudflared tunnel --url http://127.0.0.1:8025 --loglevel info > /tmp/mailpit-tunnel.log 2>&1 &
MAILPIT_TUNNEL_PID=$!

echo -e "${YELLOW}Waiting for Mailpit tunnel URL...${NC}"
for i in {1..15}; do
    sleep 2
    MAILPIT_URL=$(grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/mailpit-tunnel.log 2>/dev/null | head -1)
    if [ -n "$MAILPIT_URL" ]; then
        break
    fi
done

if [ -z "$MAILPIT_URL" ]; then
    echo -e "${RED}Failed to create Mailpit tunnel${NC}"
    tail -20 /tmp/mailpit-tunnel.log
    exit 1
fi
echo -e "${GREEN}✓ Mailpit Tunnel: ${BLUE}$MAILPIT_URL${NC}"

# Update .env.local for web app
echo -e "${YELLOW}Configuring frontend...${NC}"
WEB_ENV_FILE="apps/web/.env.local"
mkdir -p apps/web
echo "NEXT_PUBLIC_API_URL=$API_URL" > "$WEB_ENV_FILE"
echo -e "${GREEN}✓ Frontend configured to use API tunnel${NC}"

# Start Web frontend (after env is configured)
echo -e "${YELLOW}Starting Web Frontend...${NC}"
cd apps/web
npm run dev > /tmp/web-frontend.log 2>&1 &
WEB_PID=$!
cd ../..
echo -e "${GREEN}✓ Web Frontend starting (PID: $WEB_PID)...${NC}"
sleep 8

# Web tunnel
echo -e "${YELLOW}Creating tunnel for Web (port 3000)...${NC}"
cloudflared tunnel --url http://127.0.0.1:3000 --loglevel info > /tmp/web-tunnel.log 2>&1 &
WEB_TUNNEL_PID=$!

echo -e "${YELLOW}Waiting for Web tunnel URL...${NC}"
for i in {1..15}; do
    sleep 2
    WEB_URL=$(grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/web-tunnel.log 2>/dev/null | head -1)
    if [ -n "$WEB_URL" ]; then
        break
    fi
done

if [ -z "$WEB_URL" ]; then
    echo -e "${RED}Failed to create Web tunnel${NC}"
    tail -20 /tmp/web-tunnel.log
    exit 1
fi
echo -e "${GREEN}✓ Web Tunnel: ${BLUE}$WEB_URL${NC}"

# Save tunnel info
cat > /tmp/mail-maker-tunnels.json <<EOF
{
  "webUrl": "$WEB_URL",
  "apiUrl": "$API_URL",
  "mailpitUrl": "$MAILPIT_URL",
  "webPid": $WEB_TUNNEL_PID,
  "apiPid": $API_TUNNEL_PID,
  "mailpitPid": $MAILPIT_TUNNEL_PID,
  "startedAt": "$(date -Iseconds)"
}
EOF

# Test access
echo ""
echo -e "${BLUE}Testing access...${NC}"
sleep 3

LOCAL_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/templates 2>/dev/null || echo "failed")
echo -e "${GREEN}✓ Local (127.0.0.1:3000): ${BLUE}HTTP $LOCAL_TEST${NC}"

# Note: WSL can't resolve tunnel URLs, but they work in Windows browser
echo -e "${YELLOW}⚠️  Tunnel URLs work in Windows browser (WSL DNS limitation)${NC}"

# Final output
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Mail Maker is ready!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}🌐 Web Frontend:${NC} ${WEB_URL}"
echo -e "${BLUE}   └─ Templates:${NC}   ${WEB_URL}/templates"
echo ""
echo -e "${BLUE}🔌 API Backend:${NC}  ${API_URL}"
echo -e "${BLUE}📧 Mailpit UI:${NC}   ${MAILPIT_URL}"
echo ""
echo -e "${YELLOW}⚠️  Open these URLs in your Windows browser (Chrome/Edge/Firefox)${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all tunnels${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping all services...${NC}"
    kill $API_TUNNEL_PID 2>/dev/null || true
    kill $WEB_TUNNEL_PID 2>/dev/null || true
    kill $MAILPIT_TUNNEL_PID 2>/dev/null || true
    echo -e "${GREEN}✓ Tunnels stopped${NC}"
    echo -e "${YELLOW}Note: API and Web frontend are still running${NC}"
    exit 0
}

# Trap SIGINT and SIGTERM
trap cleanup SIGINT SIGTERM

# Keep script running
wait
