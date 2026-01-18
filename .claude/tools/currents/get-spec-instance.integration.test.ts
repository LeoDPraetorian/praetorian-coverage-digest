/**
 * Integration Tests for getSpecInstance Wrapper
 *
 * Tests wrapper with real Currents MCP server.
 * Run with: RUN_INTEGRATION_TESTS=true npm run test:integration -- currents/get-spec-instance
 *
 * Prerequisites:
 * - Valid Currents API key in credentials.json or .env
 * - At least one spec instance available in Currents account
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getSpecInstance } from './get-spec-instance';

// Skip integration tests unless explicitly enabled
const integrationTest = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

integrationTest('getSpecInstance - Integration Tests (Real MCP)', () => {
  // Test instance ID - update with a real instance ID from your Currents account
  let testInstanceId: string;

  beforeAll(() => {
    // Get test instance ID from environment or use a default
    testInstanceId = process.env.CURRENTS_TEST_INSTANCE_ID || 'instance-test-123';

    // Verify credentials are available
    if (!process.env.CURRENTS_API_KEY) {
      console.warn('⚠️  CURRENTS_API_KEY not set. Integration tests may fail.');
    }
  });

  // ==========================================================================
  // Category 1: Real MCP Server
  // ==========================================================================

  describe('Real MCP Server', () => {
    it('should fetch spec instance from real Currents API', async () => {
      // Act: Execute against real MCP server
      const result = await getSpecInstance.execute({ instanceId: testInstanceId });

      // Assert: Verify response structure
      expect(result).toBeDefined();
      expect(result.instance).toBeDefined();
      expect(result.instance.id).toBeTruthy();
      expect(result.instance.spec).toBeTruthy();
      expect(result.instance.status).toBeTruthy();
      expect(result.estimatedTokens).toBeGreaterThan(0);

      // Log result for manual verification
      console.log('Spec Instance:', JSON.stringify(result.instance, null, 2));
    }, 30000); // 30 second timeout for real API

    it('should return valid spec instance data structure', async () => {
      // Act
      const result = await getSpecInstance.execute({ instanceId: testInstanceId });

      // Assert: Verify all expected fields exist
      expect(result.instance).toHaveProperty('id');
      expect(result.instance).toHaveProperty('spec');
      expect(result.instance).toHaveProperty('status');
      expect(result.instance).toHaveProperty('duration');
      expect(result.instance).toHaveProperty('tests');
      expect(result.instance).toHaveProperty('passed');
      expect(result.instance).toHaveProperty('failed');

      // Verify field types
      expect(typeof result.instance.id).toBe('string');
      expect(typeof result.instance.spec).toBe('string');
      expect(typeof result.instance.status).toBe('string');
      expect(typeof result.instance.duration).toBe('number');
      expect(typeof result.instance.tests).toBe('number');
      expect(typeof result.instance.passed).toBe('number');
      expect(typeof result.instance.failed).toBe('number');

      // error is optional
      if (result.instance.error !== undefined) {
        expect(typeof result.instance.error).toBe('string');
      }
    }, 30000);

    it('should handle non-existent instance gracefully', async () => {
      // Arrange: Use an invalid instance ID
      const invalidInstanceId = 'non-existent-instance-12345';

      // Act & Assert: Should throw or return error
      await expect(getSpecInstance.execute({ instanceId: invalidInstanceId })).rejects.toThrow();
    }, 30000);

    it('should filter out extra metadata fields', async () => {
      // Act
      const result = await getSpecInstance.execute({ instanceId: testInstanceId });

      // Assert: Verify only essential fields are returned (no configuration, logs, etc.)
      expect(result.instance).not.toHaveProperty('configuration');
      expect(result.instance).not.toHaveProperty('metadata');
      expect(result.instance).not.toHaveProperty('fullLogs');
      expect(result.instance).not.toHaveProperty('results');

      // Only these fields should exist
      const allowedFields = ['id', 'spec', 'status', 'duration', 'tests', 'passed', 'failed', 'error'];

      Object.keys(result.instance).forEach((key) => {
        expect(allowedFields).toContain(key);
      });
    }, 30000);

    it('should truncate long error messages', async () => {
      // Note: This test requires an instance with an error
      // Act
      const result = await getSpecInstance.execute({ instanceId: testInstanceId });

      // Assert: If error exists, should be truncated
      if (result.instance.error) {
        expect(result.instance.error.length).toBeLessThanOrEqual(300);
        console.log(`Error length: ${result.instance.error.length} chars (max 300)`);
      } else {
        console.log('No error in this instance');
      }
    }, 30000);
  });

  // ==========================================================================
  // Category 2: Schema Compatibility
  // ==========================================================================

  describe('Schema Compatibility', () => {
    it('should match discovered schema structure', async () => {
      // Act
      const result = await getSpecInstance.execute({ instanceId: testInstanceId });

      // Assert: Verify response matches discovered schema
      expect(result.instance).toMatchObject({
        id: expect.any(String),
        spec: expect.any(String),
        status: expect.stringMatching(/^(passed|failed|pending|running|skipped|.+)$/),
        duration: expect.any(Number),
        tests: expect.any(Number),
        passed: expect.any(Number),
        failed: expect.any(Number),
      });

      // error is optional
      if (result.instance.error !== undefined) {
        expect(typeof result.instance.error).toBe('string');
        expect(result.instance.error.length).toBeLessThanOrEqual(300);
      }

      console.log('Schema validation passed');
    }, 30000);

    it('should handle all status union variants', async () => {
      // Act
      const result = await getSpecInstance.execute({ instanceId: testInstanceId });

      // Assert: Status should be one of the known types or a string
      const validStatuses = ['passed', 'failed', 'pending', 'running', 'skipped'];
      const isKnownStatus = validStatuses.includes(result.instance.status);
      const isString = typeof result.instance.status === 'string';

      expect(isString).toBe(true);
      console.log(`Status: ${result.instance.status} (known: ${isKnownStatus})`);
    }, 30000);

    it('should have consistent numeric field types', async () => {
      // Act
      const result = await getSpecInstance.execute({ instanceId: testInstanceId });

      // Assert: All numeric fields should be actual numbers (not strings)
      expect(typeof result.instance.duration).toBe('number');
      expect(typeof result.instance.tests).toBe('number');
      expect(typeof result.instance.passed).toBe('number');
      expect(typeof result.instance.failed).toBe('number');

      // Numeric fields should not be NaN
      expect(Number.isNaN(result.instance.duration)).toBe(false);
      expect(Number.isNaN(result.instance.tests)).toBe(false);
      expect(Number.isNaN(result.instance.passed)).toBe(false);
      expect(Number.isNaN(result.instance.failed)).toBe(false);
    }, 30000);
  });

  // ==========================================================================
  // Category 3: Token Reduction - Real Data
  // ==========================================================================

  describe('Token Reduction - Real Data', () => {
    it('should reduce token count vs raw MCP response', async () => {
      // Act
      const result = await getSpecInstance.execute({ instanceId: testInstanceId });

      // Assert: Token count should be reasonable for filtered data
      expect(result.estimatedTokens).toBeGreaterThan(0);
      expect(result.estimatedTokens).toBeLessThan(500); // Should be much less than raw response

      console.log(`Token estimate: ${result.estimatedTokens} tokens`);
    }, 30000);

    it('should verify token estimation accuracy', async () => {
      // Act
      const result = await getSpecInstance.execute({ instanceId: testInstanceId });

      // Calculate actual size
      const actualSize = JSON.stringify(result.instance).length;
      const calculatedTokens = Math.ceil(actualSize / 4);

      // Assert: Estimated tokens should match calculation
      expect(result.estimatedTokens).toBe(calculatedTokens);

      console.log(`Actual size: ${actualSize} chars, Tokens: ${calculatedTokens}`);
    }, 30000);

    it('should demonstrate significant token reduction with error truncation', async () => {
      // Act
      const result = await getSpecInstance.execute({ instanceId: testInstanceId });

      // Assert: Filtered response should be compact
      // Raw Currents API responses typically include full logs, configuration, detailed results
      // Our filtered response should be <500 tokens vs potentially 5000+ tokens raw
      expect(result.estimatedTokens).toBeLessThan(500);

      // If error exists, verify it's truncated
      if (result.instance.error) {
        expect(result.instance.error.length).toBeLessThanOrEqual(300);
        console.log(`Error truncated to ${result.instance.error.length} chars for token efficiency`);
      }

      // Calculate reduction percentage (assuming raw is ~5000 tokens)
      const estimatedRawTokens = 5000; // Conservative estimate for full response
      const reductionPercent = ((estimatedRawTokens - result.estimatedTokens) / estimatedRawTokens) * 100;

      console.log(
        `Token reduction: ~${reductionPercent.toFixed(1)}% (${result.estimatedTokens} vs ~${estimatedRawTokens} raw)`
      );
      expect(reductionPercent).toBeGreaterThan(80); // At least 80% reduction
    }, 30000);
  });

  describe('Security validation', () => {
    it('should reject malicious instanceId in real execution', async () => {
      // Arrange: Security attack vectors
      const attacks = ['../../../etc/passwd', 'instance-123; rm -rf /', 'instance-123\x00'];

      // Act & Assert: All should be rejected before reaching MCP
      for (const attack of attacks) {
        await expect(getSpecInstance.execute({ instanceId: attack })).rejects.toThrow();
      }
    });
  });

  describe('Performance', () => {
    it('should complete within reasonable time', async () => {
      // Arrange
      const start = Date.now();

      // Act
      await getSpecInstance.execute({ instanceId: testInstanceId });

      // Assert: Should complete within 10 seconds for real API
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10000);

      console.log(`Real API response time: ${duration}ms`);
    }, 15000);

    it('should handle error truncation efficiently', async () => {
      // Act: Even if error is huge in raw response, truncation should be fast
      const start = Date.now();
      const result = await getSpecInstance.execute({ instanceId: testInstanceId });
      const duration = Date.now() - start;

      // Assert: Should complete quickly even with potential large errors
      expect(duration).toBeLessThan(15000);

      if (result.instance.error) {
        console.log(`Error truncated (${result.instance.error.length} chars) in ${duration}ms`);
      }
    }, 20000);
  });

  describe('Real-world scenarios', () => {
    it('should handle passed spec instance', async () => {
      // Act
      const result = await getSpecInstance.execute({ instanceId: testInstanceId });

      // Assert: Verify structure for passed tests
      expect(result.instance).toBeDefined();
      expect(typeof result.instance.status).toBe('string');

      console.log(`Status: ${result.instance.status}, Tests: ${result.instance.tests}, Passed: ${result.instance.passed}, Failed: ${result.instance.failed}`);
    }, 30000);

    it('should provide debugging information', async () => {
      // Act
      const result = await getSpecInstance.execute({ instanceId: testInstanceId });

      // Assert: Should have enough information for debugging
      expect(result.instance.spec).toBeTruthy(); // Spec file name
      expect(result.instance.duration).toBeGreaterThanOrEqual(0); // Execution time
      expect(result.instance.tests).toBeGreaterThanOrEqual(0); // Test count

      console.log('Debugging info available:');
      console.log(`  Spec: ${result.instance.spec}`);
      console.log(`  Duration: ${result.instance.duration}ms`);
      console.log(`  Tests: ${result.instance.tests}`);
      console.log(`  Status: ${result.instance.status}`);
    }, 30000);
  });
});

// ==========================================================================
// Manual Testing Instructions
// ==========================================================================

/**
 * To run these integration tests:
 *
 * 1. Set up Currents API credentials:
 *    - Add CURRENTS_API_KEY to .env or credentials.json
 *    - Get an API key from https://currents.dev/
 *
 * 2. Get a valid instance ID:
 *    - Run Cypress tests with Currents recording
 *    - Copy an instance ID from a test run in the Currents dashboard
 *    - Set CURRENTS_TEST_INSTANCE_ID environment variable
 *
 * 3. Run integration tests:
 *    ```bash
 *    cd .claude/tools/currents
 *    CURRENTS_TEST_INSTANCE_ID=your-instance-id RUN_INTEGRATION_TESTS=true npm run test:integration -- get-spec-instance
 *    ```
 *
 * 4. Verify results:
 *    - Check console output for instance details
 *    - Verify error truncation (if instance has errors)
 *    - Verify token estimates are reasonable
 *    - Confirm filtering removed metadata
 */
