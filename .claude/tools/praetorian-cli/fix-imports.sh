#!/bin/bash
# Fix duplicate MCP client - update all wrappers to use shared client

WRAPPERS=(
  "aegis-list.ts"
  "assets-get.ts"
  "assets-list.ts"
  "attributes-get.ts"
  "attributes-list.ts"
  "capabilities-list.ts"
  "integrations-list.ts"
  "jobs-get.ts"
  "jobs-list.ts"
  "keys-list.ts"
  "preseeds-list.ts"
  "risks-get.ts"
  "risks-list.ts"
  "search-by-query.ts"
  "seeds-list.ts"
)

for file in "${WRAPPERS[@]}"; do
  echo "Updating $file..."

  # Update import path
  sed -i '' "s|from './lib/mcp-client.js'|from '../config/lib/mcp-client.js'|g" "$file"

  # Find all callMCPTool calls and update to 3-param signature
  # Pattern: callMCPTool('tool-name', params) -> callMCPTool('praetorian-cli', 'tool-name', params)
  sed -i '' "s|await callMCPTool(|await callMCPTool('praetorian-cli', |g" "$file"

  echo "✓ Updated $file"
done

echo ""
echo "✅ All wrappers updated!"
echo "Next: Delete lib/mcp-client.ts"
