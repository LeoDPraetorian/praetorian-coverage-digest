/**
 * Phase 10: TypeScript Validation Audit
 *
 * Runs TypeScript compiler to detect type errors in MCP wrappers:
 * - Validates wrapper compiles without errors
 * - Reports type errors with file, line, and column
 * - Checks for strict null checks violations
 * - Detects missing type annotations
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import type { AuditResult, Issue } from '../types.js';

/**
 * Parse TypeScript error output into structured issues
 * Format: path/to/file.ts(line,col): error TS1234: message
 */
function parseTypeScriptErrors(output: string, wrapperPath: string): Issue[] {
  const issues: Issue[] = [];
  const lines = output.split('\n');

  // Match TypeScript error format: file(line,col): error TSxxxx: message
  const errorRegex = /^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+(TS\d+):\s*(.+)$/;

  for (const line of lines) {
    const match = line.match(errorRegex);
    if (match) {
      const [, filePath, lineNum, , errorType, tsCode, message] = match;

      // Only include errors from this specific wrapper file
      const normalizedPath = path.normalize(filePath);
      const normalizedWrapperPath = path.normalize(wrapperPath);

      if (normalizedPath.includes(path.basename(normalizedWrapperPath))) {
        issues.push({
          severity: errorType === 'error' ? 'CRITICAL' : 'WARNING',
          phase: 10,
          message: `${tsCode}: ${message}`,
          file: wrapperPath,
          line: parseInt(lineNum, 10),
          suggestion: getTypescriptSuggestion(tsCode, message),
        });
      }
    }
  }

  return issues;
}

/**
 * Get helpful suggestions based on TypeScript error codes
 */
function getTypescriptSuggestion(tsCode: string, message: string): string {
  const suggestions: Record<string, string> = {
    // Common errors
    'TS2304': 'Import the missing type or declare it in a .d.ts file',
    'TS2339': 'Check property name spelling or add type assertion',
    'TS2345': 'Ensure argument types match parameter types',
    'TS2322': 'Check type assignment compatibility',
    'TS2531': 'Add null check (optional chaining ?. or nullish coalescing ??)',
    'TS2532': 'Add undefined check before accessing property',
    'TS2533': 'Add null/undefined check for the value',
    'TS2571': 'Add proper type annotation for the variable',
    'TS7006': 'Add explicit type annotation for the parameter',
    'TS7053': 'Use proper index signature or type the object',
    'TS18046': 'Value is of type unknown - add type guard or assertion',
    'TS18047': 'Value is possibly null - add null check',
    'TS18048': 'Value is possibly undefined - add undefined check',

    // Import/Module errors
    'TS2307': 'Check import path is correct and file exists',
    'TS2305': 'Check export name spelling or add named export',
    'TS1259': 'Use type-only import: import type { X } from ...',

    // Async errors
    'TS2705': 'Return type should be Promise<T> for async functions',
    'TS1064': 'Add async keyword to function or remove await',
  };

  return suggestions[tsCode] || `Fix TypeScript error: ${message}`;
}

/**
 * Find the nearest tsconfig.json for the wrapper
 */
function findTsConfig(wrapperPath: string): string | null {
  let dir = path.dirname(wrapperPath);
  const root = path.parse(dir).root;

  while (dir !== root) {
    const tsConfigPath = path.join(dir, 'tsconfig.json');
    try {
      if (fs.existsSync(tsConfigPath) && fs.statSync(tsConfigPath).isFile()) {
        return tsConfigPath;
      }
    } catch {
      // tsconfig.json not found at this level, continue searching
    }
    dir = path.dirname(dir);
  }

  return null;
}

export async function auditPhase10(wrapperPath: string): Promise<AuditResult> {
  const issues: Issue[] = [];

  // Find tsconfig.json
  const tsConfigPath = findTsConfig(wrapperPath);

  if (!tsConfigPath) {
    issues.push({
      severity: 'CRITICAL',
      phase: 10,
      message: 'No tsconfig.json found in service directory',
      file: wrapperPath,
      line: 0,
      suggestion: 'Run "npm run create -- <service> <tool>" to generate tsconfig.json, or create manually with shared dependency includes',
    });
  }

  try {
    // Run tsc --noEmit on the wrapper file
    const tscCommand = tsConfigPath
      ? `npx tsc --noEmit --project "${tsConfigPath}" 2>&1`
      : `npx tsc --noEmit --strict "${wrapperPath}" 2>&1`;

    // Execute TypeScript compiler
    execSync(tscCommand, {
      encoding: 'utf-8',
      cwd: path.dirname(wrapperPath),
      timeout: 30000, // 30 second timeout
    });

    // If we get here, compilation succeeded (no errors)
  } catch (error: any) {
    // tsc returns non-zero exit code when there are errors
    if (error.stdout || error.stderr) {
      const output = (error.stdout || '') + (error.stderr || '');
      const typeErrors = parseTypeScriptErrors(output, wrapperPath);
      issues.push(...typeErrors);
    } else if (error.message) {
      // Other error (timeout, not found, etc.)
      issues.push({
        severity: 'CRITICAL',
        phase: 10,
        message: `TypeScript validation failed: ${error.message}`,
        file: wrapperPath,
        line: 0,
        suggestion: 'Ensure TypeScript is installed (npm install -D typescript)',
      });
    }
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
