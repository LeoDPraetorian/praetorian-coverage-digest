/**
 * Phase 5: Reference Validation
 * Validates that wrappers use current (non-deprecated) tool references
 */

import * as fs from 'fs';
import type { AuditResult, Issue } from '../types.js';

// Known deprecated patterns
const DEPRECATED_PATTERNS: Record<string, string> = {
  'mcp-code-write': 'mcp-manager (npm run create/update)',
  'mcp-code-compliance': 'mcp-manager (npm run audit)',
  'mcp-code-audit': 'mcp-manager (npm run audit --all)',
  'mcp-code-fix': 'mcp-manager (npm run fix)',
  'mcp-code-test': 'mcp-manager (npm run test)',
};

export async function auditPhase5(wrapperPath: string): Promise<AuditResult> {
  const issues: Issue[] = [];

  if (!fs.existsSync(wrapperPath)) {
    return { issues: [], status: 'SKIP' };
  }

  const content = fs.readFileSync(wrapperPath, 'utf-8');
  const lines = content.split('\n');

  // Check for deprecated references
  for (const [oldRef, newRef] of Object.entries(DEPRECATED_PATTERNS)) {
    lines.forEach((line, index) => {
      if (line.includes(oldRef)) {
        issues.push({
          severity: 'WARNING',
          phase: 5,
          message: `Deprecated reference: ${oldRef}`,
          file: wrapperPath,
          line: index + 1,
          suggestion: `Replace with: ${newRef}`
        });
      }
    });
  }

  return {
    issues,
    status: issues.some(i => i.severity === 'CRITICAL') ? 'FAIL' :
            issues.length > 0 ? 'WARN' : 'PASS'
  };
}
