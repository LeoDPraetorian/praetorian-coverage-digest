#!/bin/bash
# Launch Claude Code with MCP selection prompt
# Usage: ./scripts/launch-claude.sh

set -e

# Get the git root directory
REPO_ROOT=$(git rev-parse --show-toplevel)
SETTINGS_FILE="$REPO_ROOT/.claude/settings.json"
SETTINGS_LOCAL_FILE="$REPO_ROOT/.claude/settings.local.json"

# Run MCP manager to configure servers in global config
mcp-manager mcp

# Extract enabled servers from ~/.claude.json and update project settings
if [ -f ~/.claude.json ]; then
    echo ""
    echo "📝 Updating project-level MCP configuration..."
    
    # Get enabled servers from global config
    ENABLED_SERVERS=$(jq -r '.mcpServers | keys | map(select(. | test("^(atlassian|chariot|chrome-devtools|context7|currents|nebula|playwright|praetorian-cli)$"))) | @json' ~/.claude.json)
    
    # Update BOTH settings files to ensure consistency
    # CRITICAL: Set enableAllProjectMcpServers to false, otherwise it ignores enabledMcpjsonServers
    
    UPDATED_FILES=()
    
    # Update settings.json if it exists
    if [ -f "$SETTINGS_FILE" ]; then
        jq --argjson servers "$ENABLED_SERVERS" \
           '.enableAllProjectMcpServers = false | .enabledMcpjsonServers = $servers' \
           "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
        UPDATED_FILES+=("settings.json")
    fi
    
    # Update settings.local.json if it exists
    if [ -f "$SETTINGS_LOCAL_FILE" ]; then
        jq --argjson servers "$ENABLED_SERVERS" \
           '.enableAllProjectMcpServers = false | .enabledMcpjsonServers = $servers' \
           "$SETTINGS_LOCAL_FILE" > "$SETTINGS_LOCAL_FILE.tmp" && mv "$SETTINGS_LOCAL_FILE.tmp" "$SETTINGS_LOCAL_FILE"
        UPDATED_FILES+=("settings.local.json")
    fi
    
    if [ ${#UPDATED_FILES[@]} -gt 0 ]; then
        echo "✅ Project MCP configuration synced!"
        echo "   Updated: ${UPDATED_FILES[*]}"
        echo "   Enabled servers: $(echo $ENABLED_SERVERS | jq -r 'join(", ")')"
    else
        echo "⚠️  Warning: No settings files found"
    fi
fi

echo ""
echo "✅ MCP configuration complete!"
echo "🚀 Launching Claude Code..."
echo ""

# Launch Claude Code
claude
