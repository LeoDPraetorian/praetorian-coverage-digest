/**
 * Error Scenario Fixtures for MCP Wrappers
 *
 * Provides common error scenarios that should be tested across all MCP wrappers.
 * Covers network errors, server errors, validation errors, and edge cases.
 */

export interface ErrorScenario {
  name: string;
  error: Error;
  description: string;
  expectedBehavior: string;
}

/**
 * Network error scenarios
 */
export const NetworkErrorScenarios: ErrorScenario[] = [
  {
    name: 'Timeout',
    error: new Error('ETIMEDOUT'),
    description: 'Network request times out',
    expectedBehavior: 'Should propagate timeout error with clear message',
  },
  {
    name: 'Connection Refused',
    error: new Error('ECONNREFUSED'),
    description: 'Cannot connect to MCP server',
    expectedBehavior: 'Should propagate connection error',
  },
  {
    name: 'DNS Failure',
    error: new Error('ENOTFOUND'),
    description: 'DNS lookup fails',
    expectedBehavior: 'Should propagate DNS error',
  },
  {
    name: 'Network Unreachable',
    error: new Error('ENETUNREACH'),
    description: 'Network is unreachable',
    expectedBehavior: 'Should propagate network error',
  },
];

/**
 * MCP server error scenarios
 */
export const ServerErrorScenarios: ErrorScenario[] = [
  {
    name: 'Rate Limit',
    error: new Error('Rate limited due to too many requests'),
    description: '429 rate limit exceeded',
    expectedBehavior: 'Should propagate rate limit error with helpful message',
  },
  {
    name: 'Internal Server Error',
    error: new Error('MCP server internal error'),
    description: '500 internal server error',
    expectedBehavior: 'Should propagate server error',
  },
  {
    name: 'Service Unavailable',
    error: new Error('Service temporarily unavailable'),
    description: '503 service unavailable',
    expectedBehavior: 'Should propagate service unavailable error',
  },
  {
    name: 'Bad Gateway',
    error: new Error('Bad gateway'),
    description: '502 bad gateway',
    expectedBehavior: 'Should propagate gateway error',
  },
];

/**
 * Authentication error scenarios
 */
export const AuthErrorScenarios: ErrorScenario[] = [
  {
    name: 'Unauthorized',
    error: new Error('Authentication required'),
    description: '401 unauthorized',
    expectedBehavior: 'Should propagate auth error with clear message',
  },
  {
    name: 'Forbidden',
    error: new Error('Access forbidden'),
    description: '403 forbidden',
    expectedBehavior: 'Should propagate forbidden error',
  },
  {
    name: 'Invalid API Key',
    error: new Error('Invalid API key'),
    description: 'API key is invalid or expired',
    expectedBehavior: 'Should propagate API key error',
  },
];

/**
 * Resource error scenarios
 */
export const ResourceErrorScenarios: ErrorScenario[] = [
  {
    name: 'Not Found',
    error: new Error('Resource not found'),
    description: '404 resource not found',
    expectedBehavior: 'Should propagate not found error',
  },
  {
    name: 'Gone',
    error: new Error('Resource no longer available'),
    description: '410 gone',
    expectedBehavior: 'Should propagate gone error',
  },
];

/**
 * Validation error scenarios
 */
export const ValidationErrorScenarios: ErrorScenario[] = [
  {
    name: 'Bad Request',
    error: new Error('Bad request: Invalid parameters'),
    description: '400 bad request',
    expectedBehavior: 'Should propagate validation error',
  },
  {
    name: 'Invalid Format',
    error: new Error('Invalid response format from MCP server'),
    description: 'Response doesn\'t match expected format',
    expectedBehavior: 'Should fail Zod output validation',
  },
];

/**
 * Get all error scenarios
 */
export function getAllErrorScenarios(): ErrorScenario[] {
  return [
    ...NetworkErrorScenarios,
    ...ServerErrorScenarios,
    ...AuthErrorScenarios,
    ...ResourceErrorScenarios,
    ...ValidationErrorScenarios,
  ];
}

/**
 * Test helper: Run error scenarios against a wrapper
 *
 * Usage:
 * ```typescript
 * import { vi } from 'vitest';
 * import { testErrorScenarios, NetworkErrorScenarios } from '@claude/testing';
 *
 * const results = await testErrorScenarios(
 *   NetworkErrorScenarios,
 *   (error) => {
 *     mcpMock.mockRejectedValue(error);
 *     return wrapper.execute({ input: 'test' });
 *   }
 * );
 * ```
 */
export async function testErrorScenarios(
  scenarios: ErrorScenario[],
  executeFn: (error: Error) => Promise<any>
): Promise<{
  passed: number;
  failed: number;
  total: number;
  results: Array<{ scenario: ErrorScenario; passed: boolean; error?: string }>;
}> {
  const results: Array<{ scenario: ErrorScenario; passed: boolean; error?: string }> = [];
  let passed = 0;
  let failed = 0;

  for (const scenario of scenarios) {
    try {
      await executeFn(scenario.error);

      // Should have thrown error
      results.push({
        scenario,
        passed: false,
        error: 'Should have thrown error but succeeded',
      });
      failed++;
    } catch (error: any) {
      // Verify error was propagated correctly
      const errorMessage = error.message || JSON.stringify(error);

      // Check if error message contains key parts from original error
      const originalMessage = scenario.error.message.toLowerCase();
      const actualMessage = errorMessage.toLowerCase();

      if (actualMessage.includes(originalMessage) ||
          actualMessage.includes(scenario.name.toLowerCase())) {
        results.push({ scenario, passed: true });
        passed++;
      } else {
        results.push({
          scenario,
          passed: false,
          error: `Error not propagated correctly. Expected: ${originalMessage}, Got: ${actualMessage.substring(0, 100)}`,
        });
        failed++;
      }
    }
  }

  return { passed, failed, total: scenarios.length, results };
}

/**
 * Edge case test data
 */
export const EdgeCaseData = {
  /**
   * Empty values
   */
  empty: {
    string: '',
    array: [],
    object: {},
    null: null,
    undefined: undefined,
  },

  /**
   * Boundary values
   */
  boundary: {
    minString: 'a',
    maxString: 'a'.repeat(256),
    minNumber: 1,
    maxNumber: Number.MAX_SAFE_INTEGER,
    minPage: 1,
    maxPage: 10,
  },

  /**
   * Special characters
   */
  special: {
    unicode: '你好世界🌍',
    emoji: '🔥💯✨',
    whitespace: '   \t\n   ',
    quotes: 'test"with\'quotes',
    newlines: 'line1\nline2\rline3',
  },

  /**
   * Large data
   */
  large: {
    longString: 'A'.repeat(10000),
    longArray: Array.from({ length: 1000 }, (_, i) => i),
    deepObject: { a: { b: { c: { d: { e: { f: 'deep' } } } } } },
  },
};
