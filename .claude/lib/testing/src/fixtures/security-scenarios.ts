/**
 * Security Test Scenarios for MCP Wrappers
 *
 * Comprehensive security test cases covering OWASP Top 10 and common injection attacks.
 * Used across all MCP wrapper tests to ensure consistent security validation.
 */

export interface SecurityTestCase {
  input: string;
  type: string;
  description: string;
  shouldBlock: boolean;
  expectedError?: RegExp;
}

/**
 * Path traversal attack vectors
 */
export const PathTraversalScenarios: SecurityTestCase[] = [
  {
    input: '../../../etc/passwd',
    type: 'Path Traversal',
    description: 'Unix path traversal to /etc/passwd',
    shouldBlock: true,
    expectedError: /traversal|\.\.|\.\./i,
  },
  {
    input: '..\\..\\..\\windows\\system32\\config\\sam',
    type: 'Path Traversal',
    description: 'Windows path traversal to SAM',
    shouldBlock: true,
    expectedError: /traversal|\.\.|\.\./i,
  },
  {
    input: 'valid/../../../etc/shadow',
    type: 'Path Traversal',
    description: 'Path traversal hidden in middle',
    shouldBlock: true,
    expectedError: /traversal|\.\.|\.\./i,
  },
];

/**
 * Command injection attack vectors
 */
export const CommandInjectionScenarios: SecurityTestCase[] = [
  {
    input: '; rm -rf /',
    type: 'Command Injection',
    description: 'Semicolon command separator',
    shouldBlock: true,
    expectedError: /invalid characters|special|;/i,
  },
  {
    input: '| cat /etc/passwd',
    type: 'Command Injection',
    description: 'Pipe command separator',
    shouldBlock: true,
    expectedError: /invalid characters|special|\|/i,
  },
  {
    input: '&& whoami',
    type: 'Command Injection',
    description: 'AND command separator',
    shouldBlock: true,
    expectedError: /invalid characters|special|&/i,
  },
  {
    input: '`whoami`',
    type: 'Command Injection',
    description: 'Backtick command substitution',
    shouldBlock: true,
    expectedError: /invalid characters|special|`/i,
  },
  {
    input: '$(whoami)',
    type: 'Command Injection',
    description: 'Dollar command substitution',
    shouldBlock: true,
    expectedError: /invalid characters|special|\$|\(/i,
  },
];

/**
 * XSS attack vectors
 */
export const XSSScenarios: SecurityTestCase[] = [
  {
    input: '<script>alert(1)</script>',
    type: 'XSS',
    description: 'Basic script tag',
    shouldBlock: true,
    expectedError: /invalid characters|special|</i,
  },
  {
    input: '<img src=x onerror=alert(1)>',
    type: 'XSS',
    description: 'Image tag with onerror',
    shouldBlock: true,
    expectedError: /invalid characters|special|</i,
  },
];

/**
 * Control character injection vectors
 */
export const ControlCharacterScenarios: SecurityTestCase[] = [
  {
    input: 'test\x00null',
    type: 'Control Character',
    description: 'Null byte injection',
    shouldBlock: true,
    expectedError: /control characters|invalid/i,
  },
  {
    input: 'test\u0001start',
    type: 'Control Character',
    description: 'Start of heading control char',
    shouldBlock: true,
    expectedError: /control characters|invalid/i,
  },
];

/**
 * Get all security scenarios
 */
export function getAllSecurityScenarios(): SecurityTestCase[] {
  return [
    ...PathTraversalScenarios,
    ...CommandInjectionScenarios,
    ...XSSScenarios,
    ...ControlCharacterScenarios,
  ];
}

/**
 * Test helper: Run security scenarios against a wrapper function
 *
 * Usage:
 * ```typescript
 * const results = await testSecurityScenarios(
 *   PathTraversalScenarios,
 *   (input) => wrapper.execute({ field: input })
 * );
 * expect(results.passed).toBe(results.total);
 * ```
 */
export async function testSecurityScenarios(
  scenarios: SecurityTestCase[],
  executeFn: (input: string) => Promise<any>
): Promise<{
  passed: number;
  failed: number;
  total: number;
  results: Array<{ scenario: SecurityTestCase; passed: boolean; error?: string }>;
}> {
  const results: Array<{ scenario: SecurityTestCase; passed: boolean; error?: string }> = [];
  let passed = 0;
  let failed = 0;

  for (const scenario of scenarios) {
    try {
      await executeFn(scenario.input);

      // Input was accepted
      if (scenario.shouldBlock) {
        results.push({ scenario, passed: false, error: 'Input was not blocked' });
        failed++;
      } else {
        results.push({ scenario, passed: true });
        passed++;
      }
    } catch (error: any) {
      // Input was rejected
      if (scenario.shouldBlock) {
        const errorMessage = error.message || JSON.stringify(error);
        const matchesExpected = scenario.expectedError?.test(errorMessage);

        if (matchesExpected || !scenario.expectedError) {
          results.push({ scenario, passed: true });
          passed++;
        } else {
          results.push({
            scenario,
            passed: false,
            error: `Wrong error. Expected: ${scenario.expectedError}, Got: ${errorMessage.substring(0, 100)}`,
          });
          failed++;
        }
      } else {
        results.push({ scenario, passed: false, error: 'Should not have been blocked' });
        failed++;
      }
    }
  }

  return { passed, failed, total: scenarios.length, results };
}
