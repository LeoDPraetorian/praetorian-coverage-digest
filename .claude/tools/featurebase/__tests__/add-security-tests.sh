#!/bin/bash

# Script to add @claude/testing security scenarios to test files

# List of test files to update (excluding ones already done)
TEST_FILES=(
  "create-changelog.unit.test.ts"
  "create-comment.unit.test.ts"
  "create-custom-field.unit.test.ts"
  "delete-comment.unit.test.ts"
  "delete-user.unit.test.ts"
  "identify-user.unit.test.ts"
  "list-articles.unit.test.ts"
  "list-changelog.unit.test.ts"
  "list-comments.unit.test.ts"
  "list-custom-fields.unit.test.ts"
  "list-posts.unit.test.ts"
  "list-users.unit.test.ts"
  "update-changelog.unit.test.ts"
  "update-comment.unit.test.ts"
)

IMPORT_TEXT="import {
  CommandInjectionScenarios,
  PathTraversalScenarios,
} from '@claude/testing';"

SECURITY_TESTS="
  describe('Security Validation - Path Traversal', () => {
    PathTraversalScenarios.forEach(scenario => {
      it(\`should block: \${scenario.description}\`, async () => {
        // Test implementation varies by wrapper - manual review needed
      });
    });
  });

  describe('Security Validation - Command Injection', () => {
    CommandInjectionScenarios.forEach(scenario => {
      it(\`should block: \${scenario.description}\`, async () => {
        // Test implementation varies by wrapper - manual review needed
      });
    });
  });
"

for file in "${TEST_FILES[@]}"; do
  echo "Processing $file..."

  # Check if file exists
  if [[ ! -f "$file" ]]; then
    echo "  File not found, skipping"
    continue
  fi

  # Check if already has @claude/testing
  if grep -q "@claude/testing" "$file"; then
    echo "  Already has @claude/testing, skipping"
    continue
  fi

  echo "  Would add @claude/testing import and security tests"
done

echo "Done. Manual editing required for each file."
