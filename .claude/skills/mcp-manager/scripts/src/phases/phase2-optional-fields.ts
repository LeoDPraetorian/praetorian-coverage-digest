/**
 * Phase 2: Optional Fields Audit
 * Validates that Zod schemas use .optional() for nullable fields
 */

import * as fs from 'fs';
import type { AuditResult, Issue } from '../types.js';

export async function auditPhase2(wrapperPath: string): Promise<AuditResult> {
  const issues: Issue[] = [];

  if (!fs.existsSync(wrapperPath)) {
    return { issues: [], status: 'SKIP' };
  }

  const content = fs.readFileSync(wrapperPath, 'utf-8');

  // Count .optional() usage
  const optionalCount = (content.match(/\.optional\(\)/g) || []).length;

  // Count total fields (rough heuristic)
  const fieldCount = (content.match(/z\.(string|number|boolean|object|array)\(\)/g) || []).length;

  // Red Flag: Zero optionals with 3+ fields
  if (optionalCount === 0 && fieldCount >= 3) {
    issues.push({
      severity: 'WARNING',
      phase: 2,
      message: `Zero optional fields found (${fieldCount} total fields)`,
      file: wrapperPath,
      line: 0,
      suggestion: 'Real APIs rarely have 100% required fields. Run schema discovery.'
    });
  }

  // Check for common issues
  if (content.includes('z.object') && !content.includes('.optional()')) {
    issues.push({
      severity: 'INFO',
      phase: 2,
      message: 'No .optional() usage detected in schemas',
      file: wrapperPath,
      line: 0,
      suggestion: 'Verify all fields are truly required by testing with real MCP responses'
    });
  }

  return {
    issues,
    status: issues.some(i => i.severity === 'CRITICAL') ? 'FAIL' :
            issues.length > 0 ? 'WARN' : 'PASS'
  };
}
