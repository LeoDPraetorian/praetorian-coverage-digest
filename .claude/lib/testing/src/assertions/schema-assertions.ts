/**
 * Schema Assertion Helpers for Zod Validation Testing
 *
 * Provides utilities to test Zod schema validation in MCP wrappers.
 */

import { z } from 'zod';

/**
 * Assert that a Zod schema accepts valid input
 */
export function assertSchemaAccepts<T extends z.ZodType>(
  schema: T,
  validInputs: unknown[]
): { passed: number; failed: number; results: Array<{ input: unknown; passed: boolean; error?: string }> } {
  const results: Array<{ input: unknown; passed: boolean; error?: string }> = [];
  let passed = 0;
  let failed = 0;

  for (const input of validInputs) {
    try {
      schema.parse(input);
      results.push({ input, passed: true });
      passed++;
    } catch (error: any) {
      results.push({
        input,
        passed: false,
        error: `Should accept but rejected: ${error.message}`,
      });
      failed++;
    }
  }

  return { passed, failed, results };
}

/**
 * Assert that a Zod schema rejects invalid input
 */
export function assertSchemaRejects<T extends z.ZodType>(
  schema: T,
  invalidInputs: unknown[]
): { passed: number; failed: number; results: Array<{ input: unknown; passed: boolean; error?: string }> } {
  const results: Array<{ input: unknown; passed: boolean; error?: string }> = [];
  let passed = 0;
  let failed = 0;

  for (const input of invalidInputs) {
    try {
      schema.parse(input);
      results.push({
        input,
        passed: false,
        error: 'Should reject but accepted',
      });
      failed++;
    } catch (error: any) {
      results.push({ input, passed: true });
      passed++;
    }
  }

  return { passed, failed, results };
}

/**
 * Test schema with both valid and invalid inputs
 */
export function testSchema<T extends z.ZodType>(
  schema: T,
  testCases: {
    valid: unknown[];
    invalid: unknown[];
  }
): {
  validTests: ReturnType<typeof assertSchemaAccepts>;
  invalidTests: ReturnType<typeof assertSchemaRejects>;
  totalPassed: number;
  totalFailed: number;
} {
  const validTests = assertSchemaAccepts(schema, testCases.valid);
  const invalidTests = assertSchemaRejects(schema, testCases.invalid);

  return {
    validTests,
    invalidTests,
    totalPassed: validTests.passed + invalidTests.passed,
    totalFailed: validTests.failed + invalidTests.failed,
  };
}

/**
 * Generate test cases for string schema
 */
export function generateStringTests(config: {
  minLength?: number;
  maxLength?: number;
  allowEmpty?: boolean;
  pattern?: RegExp;
}): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];

  // Valid cases
  if (config.allowEmpty || !config.minLength || config.minLength === 0) {
    valid.push('');
  }

  valid.push('valid');
  if (config.minLength) {
    valid.push('a'.repeat(config.minLength));
  }
  if (config.maxLength) {
    valid.push('a'.repeat(config.maxLength));
  }

  // Invalid cases
  if (!config.allowEmpty && config.minLength && config.minLength > 0) {
    invalid.push('');
  }
  if (config.minLength && config.minLength > 1) {
    invalid.push('a'.repeat(config.minLength - 1));
  }
  if (config.maxLength) {
    invalid.push('a'.repeat(config.maxLength + 1));
  }

  return { valid, invalid };
}

/**
 * Generate test cases for number schema
 */
export function generateNumberTests(config: {
  min?: number;
  max?: number;
  int?: boolean;
}): { valid: number[]; invalid: number[] } {
  const valid: number[] = [];
  const invalid: number[] = [];

  // Valid cases
  if (config.min !== undefined) {
    valid.push(config.min);
    valid.push(config.min + 1);
  }
  if (config.max !== undefined) {
    valid.push(config.max);
    valid.push(config.max - 1);
  }
  if (config.min === undefined && config.max === undefined) {
    valid.push(0, 1, 100);
  }

  // Invalid cases
  if (config.min !== undefined) {
    invalid.push(config.min - 1);
  }
  if (config.max !== undefined) {
    invalid.push(config.max + 1);
  }
  if (config.int) {
    invalid.push(1.5, 2.7);
  }

  return { valid, invalid };
}

/**
 * Helper to extract Zod error messages
 */
export function extractZodErrors(error: z.ZodError): Array<{ path: string; message: string }> {
  return error.errors.map(err => ({
    path: err.path.join('.'),
    message: err.message,
  }));
}

/**
 * Assert wrapper input schema validation
 *
 * Usage:
 * ```typescript
 * await assertWrapperInputValidation(
 *   wrapper,
 *   { valid: [{ name: 'test' }], invalid: [{ name: '' }] }
 * );
 * ```
 */
export async function assertWrapperInputValidation<T>(
  wrapper: { execute: (input: any) => Promise<T> },
  testCases: {
    valid: unknown[];
    invalid: unknown[];
  }
): Promise<{
  validTests: { passed: number; failed: number };
  invalidTests: { passed: number; failed: number };
}> {
  // Test valid inputs
  let validPassed = 0;
  let validFailed = 0;

  for (const input of testCases.valid) {
    try {
      await wrapper.execute(input);
      validPassed++;
    } catch (error) {
      validFailed++;
    }
  }

  // Test invalid inputs
  let invalidPassed = 0;
  let invalidFailed = 0;

  for (const input of testCases.invalid) {
    try {
      await wrapper.execute(input);
      invalidFailed++; // Should have thrown
    } catch (error) {
      invalidPassed++; // Correctly rejected
    }
  }

  return {
    validTests: { passed: validPassed, failed: validFailed },
    invalidTests: { passed: invalidPassed, failed: invalidFailed },
  };
}
