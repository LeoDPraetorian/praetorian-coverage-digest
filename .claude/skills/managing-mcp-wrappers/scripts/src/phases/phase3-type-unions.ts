/**
 * Phase 3: Type Unions Audit
 * Validates that complex wrappers handle type variance
 */

import * as fs from 'fs';
import type { AuditResult, Issue } from '../types.js';

export async function auditPhase3(wrapperPath: string): Promise<AuditResult> {
  const issues: Issue[] = [];

  if (!fs.existsSync(wrapperPath)) {
    return { issues: [], status: 'SKIP' };
  }

  const content = fs.readFileSync(wrapperPath, 'utf-8');

  const unionCount = (content.match(/z\.union/g) || []).length;
  const fieldCount = (content.match(/z\.(string|number|boolean|object|array)\(\)/g) || []).length;

  // Red Flag: Complex API (5+ fields) with zero unions
  if (unionCount === 0 && fieldCount >= 5) {
    issues.push({
      severity: 'INFO',
      phase: 3,
      message: `No type unions in wrapper with ${fieldCount} fields`,
      file: wrapperPath,
      line: 0,
      suggestion: 'Complex APIs often have type variance. Run schema discovery.'
    });
  }

  return {
    issues,
    status: issues.some(i => i.severity === 'CRITICAL') ? 'FAIL' :
            issues.length > 0 ? 'WARN' : 'PASS'
  };
}
