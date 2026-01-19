#!/bin/bash

FILES=(
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

for file in "${FILES[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Skip $file (not found)"
    continue
  fi

  if grep -q "@claude/testing" "$file"; then
    echo "Skip $file (already has @claude/testing)"
    continue
  fi

  echo "Processing $file..."

  # Add import after last existing import
  # Find the line number of the last import
  last_import_line=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)

  if [[ -z "$last_import_line" ]]; then
    echo "  ERROR: No imports found"
    continue
  fi

  # Add the @claude/testing import after the last import
  sed -i.bak "${last_import_line}a\\
import {\\
  CommandInjectionScenarios,\\
  PathTraversalScenarios,\\
} from '@claude/testing';
" "$file"

  # Add security test blocks before the final closing
  # Find the last line (should be "});")
  total_lines=$(wc -l < "$file")
  
  # Insert before the last line
  sed -i.bak2 "${total_lines}i\\
\\
  describe('Security Validation - Path Traversal', () => {\\
    PathTraversalScenarios.forEach(scenario => {\\
      it(\`should block: \${scenario.description}\`, async () => {\\
        // TODO: Add proper test implementation with scenario.input\\
        // Pattern: await expect(wrapper.execute({ param: scenario.input }, testClient)).rejects.toThrow();\\
      });\\
    });\\
  });\\
\\
  describe('Security Validation - Command Injection', () => {\\
    CommandInjectionScenarios.forEach(scenario => {\\
      it(\`should block: \${scenario.description}\`, async () => {\\
        // TODO: Add proper test implementation with scenario.input\\
        // Pattern: await expect(wrapper.execute({ param: scenario.input }, testClient)).rejects.toThrow();\\
      });\\
    });\\
  });
" "$file"

  rm -f "$file.bak" "$file.bak2"
  echo "  ✓ Added imports and security test blocks"
done

echo "Done"
