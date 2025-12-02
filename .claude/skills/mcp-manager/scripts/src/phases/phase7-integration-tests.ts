/**
 * Phase 7: Integration Test Coverage
 * Validates integration test file exists and tests real MCP server (recommended, not required)
 */

import * as fs from 'fs';
import type { AuditResult, Issue } from '../types.js';

export async function auditIntegrationCoverage(wrapperPath: string): Promise<AuditResult> {
  const issues: Issue[] = [];
  const integrationFile = wrapperPath.replace('.ts', '.integration.test.ts');

  // 1. Integration test file (recommended, not required)
  if (!fs.existsSync(integrationFile)) {
    issues.push({
      severity: 'WARNING',
      phase: 7,
      message: 'Integration test file missing (recommended)',
      file: wrapperPath,
      line: 0,
      suggestion: `Create ${integrationFile} for pre-deploy validation with real MCP`
    });
    return { issues, status: 'WARN' };
  }

  // 2. Real MCP server tests
  const testContent = fs.readFileSync(integrationFile, 'utf-8');
  if (!testContent.includes('Real MCP')) {
    issues.push({
      severity: 'WARNING',
      phase: 7,
      message: 'No real MCP server tests detected',
      file: integrationFile,
      line: 0,
      suggestion: 'Add tests that call actual MCP server'
    });
  }

  // 3. Integration test categories
  const requiredCategories = [
    'Real MCP Server',
    'Schema Compatibility',
    'Token Reduction - Real Data',
    'Performance'
  ];

  for (const category of requiredCategories) {
    if (!testContent.includes(category)) {
      issues.push({
        severity: 'INFO',
        phase: 7,
        message: `Recommended category missing: ${category}`,
        file: integrationFile,
        line: 0,
        suggestion: 'Add for comprehensive pre-deploy validation'
      });
    }
  }

  return {
    issues,
    status: issues.some(i => i.severity === 'CRITICAL') ? 'FAIL' :
            issues.length > 0 ? 'WARN' : 'PASS'
  };
}
