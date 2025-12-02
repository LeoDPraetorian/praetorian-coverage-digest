/**
 * Phase 9: Security Validation Audit
 *
 * Static security analysis for MCP wrappers:
 * - Detects dangerous patterns (eval, Function constructor)
 * - Checks for hardcoded credentials
 * - Verifies security imports are present
 * - Validates input sanitization patterns
 */

import * as fs from 'fs';
import type { AuditResult, Issue } from '../types.js';

/**
 * Dangerous patterns that should never appear in wrapper code
 */
const DANGEROUS_PATTERNS = [
  {
    pattern: /\beval\s*\(/,
    name: 'eval()',
    severity: 'CRITICAL' as const,
    message: 'eval() usage detected - allows arbitrary code execution',
    suggestion: 'Remove eval() and use safe alternatives like JSON.parse()',
  },
  {
    pattern: /new\s+Function\s*\(/,
    name: 'new Function()',
    severity: 'CRITICAL' as const,
    message: 'Function constructor detected - allows arbitrary code execution',
    suggestion: 'Remove Function constructor and use explicit function definitions',
  },
  {
    pattern: /child_process/,
    name: 'child_process',
    severity: 'WARNING' as const,
    message: 'child_process module imported - potential command injection risk',
    suggestion: 'Ensure all shell commands use proper input sanitization',
  },
  {
    pattern: /exec\s*\(|execSync\s*\(/,
    name: 'exec/execSync',
    severity: 'WARNING' as const,
    message: 'Shell execution detected - ensure inputs are sanitized',
    suggestion: 'Use execFile() instead of exec() and validate all inputs',
  },
];

/**
 * Credential patterns that may indicate hardcoded secrets
 */
const CREDENTIAL_PATTERNS = [
  {
    pattern: /['"][A-Za-z0-9_-]{20,}['"]/,
    name: 'Long string literal',
    context: /api[_-]?key|secret|token|password|credential/i,
  },
  {
    pattern: /Bearer\s+[A-Za-z0-9._-]+/,
    name: 'Bearer token',
  },
  {
    pattern: /sk-[A-Za-z0-9]{32,}/,
    name: 'OpenAI-style API key',
  },
  {
    pattern: /ghp_[A-Za-z0-9]{36}/,
    name: 'GitHub personal access token',
  },
];

/**
 * Expected security imports for properly secured wrappers
 */
const SECURITY_IMPORTS = [
  {
    pattern: /from\s+['"].*sanitize/,
    name: 'sanitize import',
    message: 'No sanitization helpers imported',
    suggestion: "Import sanitization helpers: import { validators } from '../config/lib/sanitize.js'",
  },
];

/**
 * Input validation patterns that should be present
 */
const VALIDATION_PATTERNS = [
  {
    pattern: /\.refine\s*\(|\.superRefine\s*\(|validateNo|validators\./,
    name: 'Security refinement',
    message: 'No security validation refinements detected on string inputs',
    suggestion: 'Add security validation using validators or refine() with validateNo* functions',
  },
  {
    pattern: /z\.string\(\)[^}]*(?:\.refine|\.superRefine|\.regex)/,
    name: 'String validation',
    message: 'String fields may lack validation',
    suggestion: 'Ensure all string fields have length limits and security validation',
  },
];

export async function auditPhase9(wrapperPath: string): Promise<AuditResult> {
  const issues: Issue[] = [];

  if (!fs.existsSync(wrapperPath)) {
    issues.push({
      severity: 'CRITICAL',
      phase: 9,
      message: 'Wrapper file not found',
      file: wrapperPath,
      line: 0,
      suggestion: 'Ensure wrapper file exists at specified path',
    });
    return { issues, status: 'FAIL' };
  }

  const content = fs.readFileSync(wrapperPath, 'utf-8');
  const lines = content.split('\n');

  // Check 1: Dangerous patterns
  for (const { pattern, name, severity, message, suggestion } of DANGEROUS_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      const lineNumber = findLineNumber(lines, pattern);
      issues.push({
        severity,
        phase: 9,
        message: `${message} (found: ${name})`,
        file: wrapperPath,
        line: lineNumber,
        suggestion,
      });
    }
  }

  // Check 2: Hardcoded credentials
  for (const { pattern, name, context } of CREDENTIAL_PATTERNS) {
    const matches = content.matchAll(new RegExp(pattern, 'g'));
    for (const match of matches) {
      // If context is provided, only flag if context matches nearby
      if (context) {
        const surroundingContext = content.substring(
          Math.max(0, match.index! - 100),
          Math.min(content.length, match.index! + match[0].length + 100)
        );
        if (!context.test(surroundingContext)) {
          continue; // Skip if context doesn't match
        }
      }

      const lineNumber = findLineNumber(lines, pattern);
      issues.push({
        severity: 'CRITICAL',
        phase: 9,
        message: `Potential hardcoded credential detected (${name})`,
        file: wrapperPath,
        line: lineNumber,
        suggestion: 'Move credentials to credentials.json or environment variables',
      });
    }
  }

  // Check 3: Security imports (only warn if string inputs exist)
  const hasStringInputs = /z\.string\s*\(/.test(content);
  if (hasStringInputs) {
    let hasSecurityImport = false;
    for (const { pattern } of SECURITY_IMPORTS) {
      if (pattern.test(content)) {
        hasSecurityImport = true;
        break;
      }
    }

    if (!hasSecurityImport) {
      issues.push({
        severity: 'WARNING',
        phase: 9,
        message: 'Wrapper has string inputs but no security imports',
        file: wrapperPath,
        line: 1,
        suggestion: "Add: import { validators } from '../config/lib/sanitize.js'",
      });
    }

    // Check 4: Input validation patterns
    let hasValidation = false;
    for (const { pattern } of VALIDATION_PATTERNS) {
      if (pattern.test(content)) {
        hasValidation = true;
        break;
      }
    }

    if (!hasValidation) {
      issues.push({
        severity: 'WARNING',
        phase: 9,
        message: 'String inputs may lack security validation',
        file: wrapperPath,
        line: 0,
        suggestion: 'Add .refine(validators.*, "error message") to string schema fields',
      });
    }
  }

  // Check 5: Timeout configuration (new security feature)
  if (!content.includes('timeoutMs') && !content.includes('timeout')) {
    // This is informational - the default timeout is applied by callMCPTool
    issues.push({
      severity: 'INFO',
      phase: 9,
      message: 'No custom timeout configured (using default 30s)',
      file: wrapperPath,
      line: 0,
      suggestion: 'Default 30s timeout is applied. Override with { timeoutMs: 60000 } if needed.',
    });
  }

  return {
    issues,
    status: issues.some(i => i.severity === 'CRITICAL')
      ? 'FAIL'
      : issues.some(i => i.severity === 'WARNING')
        ? 'WARN'
        : 'PASS',
  };
}

/**
 * Find line number where pattern first matches
 */
function findLineNumber(lines: string[], pattern: RegExp): number {
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      return i + 1;
    }
  }
  return 0;
}
