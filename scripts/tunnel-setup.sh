#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

TUNNEL_NAME="mail-maker"
API_HOSTNAME="mail-maker-api.volevant.com"
WEB_HOSTNAME="mail-maker.volevant.com"
MAILPIT_HOSTNAME="mail-maker-mailpit.volevant.com"
CONFIG_FILE="$HOME/.cloudflared/mail-maker.yml"

export PATH="$HOME/bin:$PATH"

echo -e "${BLUE}🔧 Mail Maker — Cloudflare Tunnel Setup${NC}"
echo ""

# 1. Verify cloudflared is available
if ! command -v cloudflared >/dev/null 2>&1; then
    echo -e "${RED}✗ cloudflared not found in PATH${NC}"
    echo -e "${YELLOW}Install it: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/${NC}"
    exit 1
fi
echo -e "${GREEN}✓ cloudflared found: $(cloudflared --version 2>&1 | head -1)${NC}"

# 2. Check if already logged in (cert.pem exists)
if [ ! -f "$HOME/.cloudflared/cert.pem" ]; then
    echo ""
    echo -e "${YELLOW}You need to log in to Cloudflare first.${NC}"
    echo -e "${YELLOW}A browser window will open — authorise the volevant.com zone.${NC}"
    echo ""
    cloudflared tunnel login
fi
echo -e "${GREEN}✓ Cloudflare credentials present${NC}"

# 3. Check if tunnel already exists
echo ""
echo -e "${BLUE}Checking for existing tunnel '${TUNNEL_NAME}'...${NC}"
if cloudflared tunnel list 2>/dev/null | grep -q "^[a-z0-9-]\{36\}.*${TUNNEL_NAME}"; then
    echo -e "${YELLOW}⚠ Tunnel '${TUNNEL_NAME}' already exists — skipping creation${NC}"
else
    echo -e "${YELLOW}Creating tunnel '${TUNNEL_NAME}'...${NC}"
    cloudflared tunnel create "$TUNNEL_NAME"
    echo -e "${GREEN}✓ Tunnel created${NC}"
fi

# 4. Extract the tunnel UUID
TUNNEL_UUID=$(cloudflared tunnel list 2>/dev/null | awk -v name="$TUNNEL_NAME" '$0 ~ name {print $1}' | head -1)
if [ -z "$TUNNEL_UUID" ]; then
    echo -e "${RED}✗ Could not determine tunnel UUID${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Tunnel UUID: ${BLUE}${TUNNEL_UUID}${NC}"

CREDS_FILE="$HOME/.cloudflared/${TUNNEL_UUID}.json"
if [ ! -f "$CREDS_FILE" ]; then
    echo -e "${RED}✗ Credentials file not found: ${CREDS_FILE}${NC}"
    exit 1
fi

# 5. Create DNS routes (idempotent — safe to re-run)
echo ""
echo -e "${BLUE}Creating DNS routes...${NC}"
cloudflared tunnel route dns --overwrite-dns "$TUNNEL_NAME" "$API_HOSTNAME" \
    && echo -e "${GREEN}✓ ${API_HOSTNAME}${NC}" \
    || echo -e "${YELLOW}⚠ Could not create DNS for ${API_HOSTNAME} (may already exist)${NC}"

cloudflared tunnel route dns --overwrite-dns "$TUNNEL_NAME" "$WEB_HOSTNAME" \
    && echo -e "${GREEN}✓ ${WEB_HOSTNAME}${NC}" \
    || echo -e "${YELLOW}⚠ Could not create DNS for ${WEB_HOSTNAME} (may already exist)${NC}"

cloudflared tunnel route dns --overwrite-dns "$TUNNEL_NAME" "$MAILPIT_HOSTNAME" \
    && echo -e "${GREEN}✓ ${MAILPIT_HOSTNAME}${NC}" \
    || echo -e "${YELLOW}⚠ Could not create DNS for ${MAILPIT_HOSTNAME} (may already exist)${NC}"

# 6. Write config file
echo ""
echo -e "${BLUE}Writing config to ${CONFIG_FILE}...${NC}"
cat > "$CONFIG_FILE" <<EOF
tunnel: ${TUNNEL_UUID}
credentials-file: ${CREDS_FILE}

ingress:
  - hostname: ${API_HOSTNAME}
    service: http://localhost:3001

  - hostname: ${WEB_HOSTNAME}
    service: http://localhost:3000

  - hostname: ${MAILPIT_HOSTNAME}
    service: http://localhost:8025

  # Catch-all rule (required)
  - service: http_status:404
EOF
echo -e "${GREEN}✓ Config written${NC}"

# 7. Summary
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅  Setup complete! Your permanent tunnel URLs are:${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}🌐 Web Frontend:${NC}  https://${WEB_HOSTNAME}"
echo -e "${BLUE}🔌 API Backend:${NC}   https://${API_HOSTNAME}"
echo -e "${BLUE}📧 Mailpit UI:${NC}    https://${MAILPIT_HOSTNAME}"
echo ""
echo -e "${YELLOW}Run tunnels any time with: npm run tunnel${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
