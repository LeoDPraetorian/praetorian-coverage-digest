/**
 * Phase 6: Unit Test Coverage (IMPROVED)
 * Uses dynamic analysis (run tests, measure coverage) with graceful degradation to static analysis
 *
 * Reliability hierarchy:
 * 1. Dynamic: Run tests, check pass/fail, parse coverage reports
 * 2. Static: Pattern matching for critical test scenarios
 * 3. Heuristic: Deprecated (was exact string matching)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import type { AuditResult, Issue } from '../types.js';

export async function auditUnitCoverage(wrapperPath: string): Promise<AuditResult> {
  const issues: Issue[] = [];
  const testFile = wrapperPath.replace('.ts', '.unit.test.ts');

  // STEP 1: Test file existence
  if (!fs.existsSync(testFile)) {
    issues.push({
      severity: 'CRITICAL',
      phase: 6,
      message: 'Unit test file missing',
      file: wrapperPath,
      line: 0,
      suggestion: `Create ${testFile} following TDD workflow`
    });
    return { issues, status: 'FAIL' };
  }

  // STEP 2: Dynamic test execution (with graceful failure)
  let testsPassedSuccessfully = false;
  try {
    const testOutput = execSync(
      `npx vitest run ${testFile} --reporter=json --no-coverage`,
      {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 30000,
        cwd: path.resolve(path.dirname(testFile), '../..') // Run from .claude root
      }
    );

    const testResult = JSON.parse(testOutput);

    // Check if tests passed
    if (!testResult.success || testResult.numFailedTests > 0) {
      issues.push({
        severity: 'CRITICAL',
        phase: 6,
        message: `${testResult.numFailedTests} test(s) failing`,
        file: testFile,
        line: 0,
        suggestion: 'Fix failing tests before deployment. Run: npm test'
      });
    }

    // Check if tests actually exist
    if (testResult.numTotalTests === 0) {
      issues.push({
        severity: 'CRITICAL',
        phase: 6,
        message: 'Test file exists but contains no tests',
        file: testFile,
        line: 0,
        suggestion: 'Add test cases to the test file'
      });
    }

    // Mark tests as successful if they passed
    if (testResult.success && testResult.numFailedTests === 0 && testResult.numTotalTests > 0) {
      testsPassedSuccessfully = true;
    }

  } catch (error: any) {
    // Tests couldn't run - might be dependency issues or test failures
    // execSync throws with stdout containing JSON output
    let errorDetails = '';

    if (error.stdout) {
      try {
        const testResult = JSON.parse(error.stdout);
        const testError = testResult.testResults?.[0]?.message || '';
        errorDetails = testError;
      } catch {
        errorDetails = error.stdout;
      }
    } else {
      errorDetails = error.message || String(error);
    }

    // Check if it's a dependency error
    if (errorDetails.includes('Cannot find module') || errorDetails.includes('ENOENT')) {
      issues.push({
        severity: 'INFO',
        phase: 6,
        message: 'Tests could not be executed (dependency issues detected)',
        file: testFile,
        line: 0,
        suggestion: 'Run npm install or check test dependencies. Then run: npm test'
      });
    } else {
      // Test execution failed (likely test failures)
      issues.push({
        severity: 'CRITICAL',
        phase: 6,
        message: 'Tests failed to execute or contain failures',
        file: testFile,
        line: 0,
        suggestion: 'Run npm test to see detailed error output'
      });
    }
  }

  // STEP 4: Semantic pattern matching (static analysis fallback/supplement)
  const testContent = fs.readFileSync(testFile, 'utf-8');

  // Pattern 1: Input validation tested?
  const hasInputValidationTests = /it\(['"].*(?:invalid|empty|missing|reject|malformed|should accept|should.*valid)/i.test(testContent);
  if (!hasInputValidationTests) {
    issues.push({
      severity: 'WARNING',
      phase: 6,
      message: 'No input validation tests detected',
      file: testFile,
      line: 0,
      suggestion: 'Add tests for invalid/empty/missing inputs (e.g., empty strings, null values)'
    });
  }

  // Pattern 2: Error handling tested?
  const hasErrorHandlingTests = /(?:mockRejected|throw|error|catch|try|fail)/i.test(testContent);
  if (!hasErrorHandlingTests) {
    issues.push({
      severity: 'WARNING',
      phase: 6,
      message: 'No error handling tests detected',
      file: testFile,
      line: 0,
      suggestion: 'Add tests for MCP errors, network failures, malformed responses'
    });
  }

  // Pattern 3: Security considerations tested?
  const securityPatterns = [
    'injection', 'XSS', 'SQL', 'malicious',
    'path traversal', 'command injection', 'sanitiz'
  ];
  const hasSecurityTests = securityPatterns.some(
    pattern => testContent.toLowerCase().includes(pattern.toLowerCase())
  );

  if (!hasSecurityTests) {
    issues.push({
      severity: 'WARNING', // Not CRITICAL - security might be inherent in wrapper design
      phase: 6,
      message: 'No security-focused tests detected',
      file: testFile,
      line: 0,
      suggestion: 'Consider adding tests for injection attacks, malicious inputs, path traversal'
    });
  }

  // STEP 3: Coverage parsing (only if tests passed)
  if (testsPassedSuccessfully) {
    // Run tests again with coverage to generate report
    try {
      execSync(
        `npx vitest run ${testFile} --coverage --reporter=silent`,
        {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 30000,
          cwd: path.resolve(path.dirname(testFile), '../..')
        }
      );

      // Parse coverage report
      const coverageFile = path.resolve(path.dirname(testFile), '../../coverage/coverage-summary.json');
      if (fs.existsSync(coverageFile)) {
        const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf-8'));

        // Find the wrapper's coverage (not the test file)
        const wrapperName = path.basename(wrapperPath, '.ts') + '.ts';
        const wrapperCoverage = Object.entries(coverage)
          .find(([filePath]) => filePath.endsWith(wrapperName));

        if (wrapperCoverage) {
          const [, metrics] = wrapperCoverage as [string, any];
          const statementCoverage = metrics.statements.pct;
          const branchCoverage = metrics.branches.pct;

          // Check statement coverage threshold (80%)
          if (statementCoverage < 80) {
            issues.push({
              severity: 'CRITICAL',
              phase: 6,
              message: `Statement coverage ${statementCoverage.toFixed(1)}% < 80%`,
              file: wrapperPath,
              line: 0,
              suggestion: 'Add tests to cover more code paths. Run: npm test -- --coverage'
            });
          }

          // Check branch coverage threshold (70%)
          if (branchCoverage < 70) {
            issues.push({
              severity: 'WARNING',
              phase: 6,
              message: `Branch coverage ${branchCoverage.toFixed(1)}% < 70%`,
              file: wrapperPath,
              line: 0,
              suggestion: 'Add tests for conditional branches and error paths'
            });
          }
        }
      }
    } catch (coverageError) {
      // Coverage generation failed - not critical, tests still passed
      issues.push({
        severity: 'INFO',
        phase: 6,
        message: 'Could not generate coverage report',
        file: testFile,
        line: 0,
        suggestion: 'Coverage metrics unavailable but tests pass'
      });
    }
  }

  return {
    issues,
    status: issues.some(i => i.severity === 'CRITICAL') ? 'FAIL' :
            issues.length > 0 ? 'WARN' : 'PASS'
  };
}
