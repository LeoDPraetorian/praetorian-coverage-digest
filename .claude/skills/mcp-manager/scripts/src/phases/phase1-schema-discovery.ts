/**
 * Phase 1: Schema Discovery Audit
 * Validates that MCP wrappers have documented schema discovery results
 */

import * as fs from 'fs';
import type { AuditResult, Issue } from '../types.js';

export async function auditPhase1(wrapperPath: string): Promise<AuditResult> {
  const issues: Issue[] = [];

  if (!fs.existsSync(wrapperPath)) {
    issues.push({
      severity: 'CRITICAL',
      phase: 1,
      message: 'Wrapper file not found',
      file: wrapperPath,
      line: 0,
      suggestion: 'Ensure wrapper file exists at specified path'
    });
    return { issues, status: 'FAIL' };
  }

  const content = fs.readFileSync(wrapperPath, 'utf-8');

  // Red Flag 1: No schema discovery comments
  if (!content.includes('Schema Discovery Results') && !content.includes('schema discovery')) {
    issues.push({
      severity: 'WARNING',
      phase: 1,
      message: 'No schema discovery comments found',
      file: wrapperPath,
      line: 0,
      suggestion: 'Run schema discovery with 3+ test cases and document findings'
    });
  }

  // Red Flag 2: No response format documentation
  if (!content.includes('Response Format') && !content.includes('response format')) {
    issues.push({
      severity: 'INFO',
      phase: 1,
      message: 'Response format not documented',
      file: wrapperPath,
      line: 0,
      suggestion: 'Document which response format(s) the MCP returns'
    });
  }

  return {
    issues,
    status: issues.some(i => i.severity === 'CRITICAL') ? 'FAIL' :
            issues.length > 0 ? 'WARN' : 'PASS'
  };
}
