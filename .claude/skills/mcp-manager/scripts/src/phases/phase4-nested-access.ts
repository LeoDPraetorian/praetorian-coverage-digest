/**
 * Phase 4: Nested Access Safety Audit
 * Validates that filtering logic safely accesses nested fields
 */

import * as fs from 'fs';
import type { AuditResult, Issue } from '../types.js';

export async function auditPhase4(wrapperPath: string): Promise<AuditResult> {
  const issues: Issue[] = [];

  if (!fs.existsSync(wrapperPath)) {
    return { issues: [], status: 'SKIP' };
  }

  const content = fs.readFileSync(wrapperPath, 'utf-8');
  const lines = content.split('\n');

  // Detect: rawData.field.nestedField without null check
  const unsafePattern = /rawData\.(\w+)\.(\w+)/g;

  lines.forEach((line, index) => {
    const matches = line.matchAll(unsafePattern);

    for (const match of matches) {
      // Check if there's a null check within 3 lines above
      const contextLines = lines.slice(Math.max(0, index - 3), index + 1).join('\n');

      if (!contextLines.includes('?') && !contextLines.includes('if')) {
        issues.push({
          severity: 'WARNING',
          phase: 4,
          message: `Unsafe nested access: rawData.${match[1]}.${match[2]}`,
          file: wrapperPath,
          line: index + 1,
          suggestion: `Add null check: rawData.${match[1]}?.${match[2]}`
        });
      }
    }
  });

  return {
    issues,
    status: issues.some(i => i.severity === 'CRITICAL') ? 'FAIL' :
            issues.length > 0 ? 'WARN' : 'PASS'
  };
}
