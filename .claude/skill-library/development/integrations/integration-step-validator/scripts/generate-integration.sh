#!/bin/bash
# generate-integration.sh - Scaffolds new Chariot integration from templates
# Usage: ./generate-integration.sh <integration-name>

set -euo pipefail

INTEGRATION_NAME="$1"
INTEGRATION_PASCAL=$(echo "$INTEGRATION_NAME" | sed 's/-\([a-z]\)/\U\1/g;s/^./\U&/')
INTEGRATION_SNAKE=$(echo "$INTEGRATION_NAME" | tr '-' '_')

echo "🚀 Generating integration: $INTEGRATION_NAME"
echo ""
echo "Names generated:"
echo "  - Pascal: $INTEGRATION_PASCAL"
echo "  - Snake:  $INTEGRATION_SNAKE"
echo "  - Kebab:  $INTEGRATION_NAME"
echo ""

# Create backend capability file
echo "Creating backend capability..."
mkdir -p modules/chariot/backend/pkg/capabilities
cat > "modules/chariot/backend/pkg/capabilities/${INTEGRATION_SNAKE}.go" << 'EOF'
// AUTO-GENERATED - Customize this file
package capabilities

func (c *INTEGRATION_PASCAL) Name() string {
	return "INTEGRATION_NAME"
}
EOF

sed -i '' "s/INTEGRATION_PASCAL/${INTEGRATION_PASCAL}/g" "modules/chariot/backend/pkg/capabilities/${INTEGRATION_SNAKE}.go"
sed -i '' "s/INTEGRATION_NAME/${INTEGRATION_NAME}/g" "modules/chariot/backend/pkg/capabilities/${INTEGRATION_SNAKE}.go"

# Create test file
echo "Creating test file..."
touch "modules/chariot/backend/pkg/capabilities/${INTEGRATION_SNAKE}_test.go"

# Create frontend card
echo "Creating frontend card..."
mkdir -p modules/chariot/ui/src/sections/settings/integrations
touch "modules/chariot/ui/src/sections/settings/integrations/${INTEGRATION_PASCAL}Card.tsx"

echo ""
echo "✅ Generated files:"
echo "  - backend/pkg/capabilities/${INTEGRATION_SNAKE}.go"
echo "  - backend/pkg/capabilities/${INTEGRATION_SNAKE}_test.go"
echo "  - ui/src/sections/settings/integrations/${INTEGRATION_PASCAL}Card.tsx"
echo ""
echo "📝 Next steps:"
echo "1. Copy templates from references/integration-templates.md"
echo "2. Add enum to ui/src/types/integrations.ts"
echo "3. Implement API client logic"
echo "4. Run: ./scripts/validate-integration.sh $INTEGRATION_NAME"
