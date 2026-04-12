#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Permanent tunnel config — URLs never change
TUNNEL_CONFIG="$HOME/.cloudflared/mail-maker.yml"
API_URL="https://mail-maker-api.volevant.com"
WEB_URL="https://mail-maker.volevant.com"
MAILPIT_URL="https://mail-maker-mailpit.volevant.com"

export PATH="$HOME/bin:$PATH"

echo -e "${BLUE}🚀 Starting Mail Maker Cloudflare Tunnels...${NC}"

is_port_open() {
    local port="$1"

    if command -v ss >/dev/null 2>&1; then
        if ss -ltn 2>/dev/null | grep -q ":${port} "; then
            return 0
        fi
    fi

    if command -v lsof >/dev/null 2>&1; then
        if lsof -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; then
            return 0
        fi
    fi

    (echo >/dev/tcp/127.0.0.1/"${port}") >/dev/null 2>&1
}

# Require setup to have been run first
if [ ! -f "$TUNNEL_CONFIG" ]; then
    echo -e "${RED}✗ Tunnel not configured.${NC}"
    echo -e "${YELLOW}Run once: npm run tunnel:setup${NC}"
    exit 1
fi

# Kill any existing cloudflared processes
echo -e "${YELLOW}Cleaning up existing tunnels...${NC}"
pkill -f "cloudflared" 2>/dev/null || true
sleep 1

# Check Docker services
echo -e "${BLUE}Checking services...${NC}"
if ! docker ps | grep -q "mail-maker-mailpit-1"; then
    echo -e "${RED}✗ Mailpit container not running. Start it with: docker-compose up -d${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Mailpit running (port 8025)${NC}"

# Check API backend
if is_port_open 3001; then
    echo -e "${GREEN}✓ API Backend running (port 3001)${NC}"
else
    echo -e "${RED}✗ API Backend is not running on port 3001${NC}"
    echo -e "${YELLOW}Start it first: npm run dev${NC}"
    exit 1
fi

# Write frontend env so it connects through the tunnel
echo ""
echo -e "${YELLOW}Configuring frontend to use API tunnel URL...${NC}"
echo "NEXT_PUBLIC_API_URL=$API_URL" > apps/web/.env.local
echo -e "${GREEN}✓ apps/web/.env.local → NEXT_PUBLIC_API_URL=$API_URL${NC}"

# Note on frontend — it can be started before or after tunnel
if is_port_open 3000; then
    echo -e "${GREEN}✓ Web Frontend running (port 3000)${NC}"
    echo -e "${YELLOW}  ↳ Restart the frontend to pick up the new env: Ctrl+C → npm run dev${NC}"
else
    echo -e "${YELLOW}ℹ Web Frontend not running yet — start it when ready: npm run dev${NC}"
fi

# Start the named tunnel (all three services, single process)
echo ""
echo -e "${BLUE}Starting permanent Cloudflare tunnel...${NC}"
cloudflared tunnel --config "$TUNNEL_CONFIG" run 2>&1 &
TUNNEL_PID=$!

# Wait briefly for connection to establish
echo -e "${YELLOW}Waiting for tunnel to connect...${NC}"
sleep 6

# Verify tunnel process is still alive
if ! kill -0 $TUNNEL_PID 2>/dev/null; then
    echo -e "${RED}✗ Tunnel process exited unexpectedly${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Tunnel connected${NC}"

# Save tunnel info for other scripts/tooling
cat > /tmp/mail-maker-tunnels.json <<EOF
{
  "webUrl": "$WEB_URL",
  "apiUrl": "$API_URL",
  "mailpitUrl": "$MAILPIT_URL",
  "tunnelPid": $TUNNEL_PID,
  "startedAt": "$(date -Iseconds)"
}
EOF

# Summary
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Mail Maker tunnels are active!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}🌐 Web Frontend:${NC}  ${WEB_URL}"
echo -e "${BLUE}   └─ Templates:${NC}  ${WEB_URL}/templates"
echo ""
echo -e "${BLUE}🔌 API Backend:${NC}   ${API_URL}"
echo -e "${BLUE}📧 Mailpit UI:${NC}    ${MAILPIT_URL}"
echo ""
echo -e "${YELLOW}⚠️  Open URLs in Windows browser (WSL DNS limitation)${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop tunnels${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"

# Cleanup handler
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping tunnels...${NC}"
    kill $TUNNEL_PID 2>/dev/null || true
    echo -e "${GREEN}✓ Tunnels stopped${NC}"
    echo -e "${YELLOW}Note: local services (API, web, Mailpit) are still running${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM
wait
