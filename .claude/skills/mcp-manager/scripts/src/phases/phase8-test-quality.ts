/**
 * Phase 8: Test Quality
 * Validates test patterns, security automation, response format coverage, edge cases
 */

import * as fs from 'fs';
import type { AuditResult, Issue } from '../types.js';

export async function auditTestQuality(wrapperPath: string): Promise<AuditResult> {
  const issues: Issue[] = [];
  const testFile = wrapperPath.replace('.ts', '.unit.test.ts');

  if (!fs.existsSync(testFile)) {
    // Already flagged in Phase 6
    return { issues: [], status: 'SKIP' };
  }

  const testContent = fs.readFileSync(testFile, 'utf-8');

  // 1. Factory mock pattern (prevents module loading errors)
  if (!testContent.match(/vi\.mock\([^)]+,\s*\(\)\s*=>\s*\(/)) {
    issues.push({
      severity: 'CRITICAL',
      phase: 8,
      message: 'Factory mock pattern not used',
      file: testFile,
      line: 0,
      suggestion: 'vi.mock() must use factory function: () => ({ ... })'
    });
  }

  // 2. Security testing automation
  if (!testContent.includes('testSecurityScenarios') &&
      !testContent.includes('getAllSecurityScenarios')) {
    issues.push({
      severity: 'CRITICAL',
      phase: 8,
      message: 'Security testing not automated',
      file: testFile,
      line: 0,
      suggestion: 'Use testSecurityScenarios() from @claude/testing'
    });
  }

  // 3. Response format testing (MANDATORY after production bug)
  const hasFormatTests = [
    'direct array format',
    'tuple format',
    'object format'
  ].every(format => testContent.toLowerCase().includes(format.toLowerCase()));

  if (!hasFormatTests) {
    issues.push({
      severity: 'CRITICAL',
      phase: 8,
      message: 'Response format tests missing',
      file: testFile,
      line: 0,
      suggestion: 'Test all 3 formats (direct array, tuple, object) to prevent forEach bugs'
    });
  }

  // 4. Edge case coverage
  if (!testContent.toLowerCase().includes('edge case')) {
    issues.push({
      severity: 'WARNING',
      phase: 8,
      message: 'No edge case tests detected',
      file: testFile,
      line: 0,
      suggestion: 'Add tests for null, undefined, empty arrays, large datasets'
    });
  }

  // 5. Performance benchmarks
  if (!testContent.toLowerCase().includes('performance')) {
    issues.push({
      severity: 'INFO',
      phase: 8,
      message: 'No performance tests',
      file: testFile,
      line: 0,
      suggestion: 'Add tests to verify wrapper overhead < 10ms'
    });
  }

  // 6. Test isolation (beforeEach/afterEach)
  if (!testContent.includes('beforeEach')) {
    issues.push({
      severity: 'WARNING',
      phase: 8,
      message: 'Tests may not be isolated',
      file: testFile,
      line: 0,
      suggestion: 'Use beforeEach to reset mocks between tests'
    });
  }

  return {
    issues,
    status: issues.some(i => i.severity === 'CRITICAL') ? 'FAIL' :
            issues.length > 0 ? 'WARN' : 'PASS'
  };
}
