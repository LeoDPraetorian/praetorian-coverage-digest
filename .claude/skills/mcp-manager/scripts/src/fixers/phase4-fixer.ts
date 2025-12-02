/**
 * Phase 4 Fixer: Nested Access Safety
 * Auto-fixes unsafe nested property access with optional chaining
 */

import * as fs from 'fs';

export interface FixResult {
  fixed: boolean;
  changes: string[];
}

export function fixPhase4(wrapperPath: string, dryRun: boolean): FixResult {
  const changes: string[] = [];

  if (!fs.existsSync(wrapperPath)) {
    return { fixed: false, changes: [] };
  }

  let content = fs.readFileSync(wrapperPath, 'utf-8');
  const lines = content.split('\n');
  let modified = false;

  // Pattern: rawData.field.nestedField without null check
  const unsafePattern = /rawData\.(\w+)\.(\w+)/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for unsafe access pattern
    const matches = [...line.matchAll(unsafePattern)];

    for (const match of matches) {
      const fullMatch = match[0];
      const field1 = match[1];
      const field2 = match[2];

      // Skip if already using optional chaining
      if (line.includes(`rawData.${field1}?.${field2}`)) {
        continue;
      }

      // Skip if within null check context
      const contextLines = lines.slice(Math.max(0, i - 3), i + 1).join('\n');
      if (contextLines.includes(`rawData.${field1} ?`) ||
          contextLines.includes(`if (rawData.${field1})`)) {
        continue;
      }

      // Apply fix: add optional chaining
      const safePath = `rawData.${field1}?.${field2}`;
      const newLine = line.replace(fullMatch, safePath);

      if (newLine !== line) {
        changes.push(`Line ${i + 1}: Added optional chaining: ${fullMatch} → ${safePath}`);
        lines[i] = newLine;
        modified = true;
      }
    }
  }

  if (modified && !dryRun) {
    fs.writeFileSync(wrapperPath, lines.join('\n'));
  }

  return {
    fixed: modified,
    changes
  };
}
