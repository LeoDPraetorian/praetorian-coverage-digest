/**
 * Phase 2 Fixer: Optional Fields
 * Auto-adds .optional() to Zod schema fields that are likely nullable
 */

import * as fs from 'fs';
import type { Issue } from '../types.js';

export interface FixResult {
  fixed: boolean;
  changes: string[];
}

export function fixPhase2(wrapperPath: string, dryRun: boolean): FixResult {
  const changes: string[] = [];

  if (!fs.existsSync(wrapperPath)) {
    return { fixed: false, changes: [] };
  }

  let content = fs.readFileSync(wrapperPath, 'utf-8');
  const originalContent = content;

  // Pattern: Find z.string(), z.number(), z.boolean() NOT followed by .optional() or .nullable()
  // Only in schema definitions (after z.object({ )
  const schemaPattern = /z\.(string|number|boolean)\(\)(?!\.(?:optional|nullable|default))/g;

  // Count potential fixes
  const matches = content.match(schemaPattern);
  if (!matches || matches.length === 0) {
    return { fixed: false, changes: [] };
  }

  // Only auto-fix fields with names suggesting optionality
  const lines = content.split('\n');
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip if not in a schema definition
    if (!line.includes('z.') || line.includes('.optional()') || line.includes('.nullable()')) {
      continue;
    }

    // Check for field names suggesting optionality
    const optionalIndicators = [
      'optional', 'maybe', 'default', 'fallback',
      'description', 'metadata', 'extra', 'additional',
      'nullable', 'empty', 'blank'
    ];

    for (const indicator of optionalIndicators) {
      if (line.toLowerCase().includes(indicator) && line.match(/z\.(string|number|boolean)\(\)/)) {
        const newLine = line.replace(
          /z\.(string|number|boolean)\(\)/,
          'z.$1().optional()'
        );
        if (newLine !== line) {
          changes.push(`Line ${i + 1}: Added .optional() to field with "${indicator}" in name`);
          lines[i] = newLine;
          modified = true;
        }
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
