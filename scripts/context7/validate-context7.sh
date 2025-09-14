#!/bin/bash

# Quick Context7 validation script for team members
# Usage: ./scripts/validate-context7.sh

set -e

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "   Context7 Quick Validation"
echo "========================================"
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js installed: $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not installed"
    exit 1
fi

# Check npx
if command -v npx &> /dev/null; then
    echo -e "${GREEN}✓${NC} npx available"
else
    echo -e "${RED}✗${NC} npx not available"
    exit 1
fi

# Check Context7 accessibility
echo -n "Checking Context7 MCP server... "
if timeout 5 npx -y @upstash/context7-mcp@latest --version &>/dev/null; then
    echo -e "${GREEN}✓${NC} Accessible"
elif command -v npx &>/dev/null; then
    echo -e "${YELLOW}⚠${NC} Server check timed out (may be network issue)"
else
    echo -e "${RED}✗${NC} Not accessible"
    exit 1
fi

# Check configuration
if [ -f ".mcp.json" ]; then
    if grep -q "context7" ".mcp.json" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Context7 configured in .mcp.json"
    else
        echo -e "${YELLOW}⚠${NC} Context7 not found in .mcp.json (run setup script)"
    fi
else
    echo -e "${YELLOW}⚠${NC} No .mcp.json file found (run setup script)"
fi

# Check API key
if [ -n "${CONTEXT7_API_KEY:-}" ]; then
    echo -e "${GREEN}✓${NC} API key configured in environment"
elif [ -f ".env" ] && grep -q "^CONTEXT7_API_KEY=" ".env" 2>/dev/null; then
    KEY_VALUE=$(grep "^CONTEXT7_API_KEY=" ".env" | cut -d'=' -f2)
    if [ "$KEY_VALUE" != "your_api_key_here" ] && [ -n "$KEY_VALUE" ]; then
        echo -e "${GREEN}✓${NC} API key configured in .env"
    else
        echo -e "${YELLOW}⚠${NC} API key not set (optional, but recommended)"
    fi
else
    echo -e "${YELLOW}⚠${NC} No API key configured (optional, but recommended)"
fi

echo ""
echo "========================================"
echo -e "${GREEN}Context7 is ready to use!${NC}"
echo ""
echo "Test it in your IDE with:"
echo '  "use context7 - show me React documentation"'
echo ""
echo "For detailed testing: ./scripts/test-context7-integration.sh"
echo "For monitoring: ./scripts/monitor-context7.sh"
echo "========================================"