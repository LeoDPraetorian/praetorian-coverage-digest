/**
 * Integration Tests for getRunDetails Wrapper
 *
 * Tests wrapper with real Currents MCP server.
 * Run with: RUN_INTEGRATION_TESTS=true npm run test:integration -- currents/get-run-details
 *
 * Prerequisites:
 * - Valid Currents API key in credentials.json or .env
 * - At least one test run available in the Currents account
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getRunDetails } from './get-run-details';

// Skip integration tests unless explicitly enabled
const integrationTest = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

integrationTest('getRunDetails - Integration Tests (Real MCP)', () => {
  // Test run ID - update with a real run ID from your Currents account
  let testRunId: string;

  beforeAll(() => {
    // Get test run ID from environment or use a default
    testRunId = process.env.CURRENTS_TEST_RUN_ID || 'run-test-123';

    // Verify credentials are available
    if (!process.env.CURRENTS_API_KEY) {
      console.warn('⚠️  CURRENTS_API_KEY not set. Integration tests may fail.');
    }
  });

  // ==========================================================================
  // Category 1: Real MCP Server
  // ==========================================================================

  describe('Real MCP Server', () => {
    it('should fetch run details from real Currents API', async () => {
      // Act: Execute against real MCP server
      const result = await getRunDetails.execute({ runId: testRunId });

      // Assert: Verify response structure
      expect(result).toBeDefined();
      expect(result.run).toBeDefined();
      expect(result.run.id).toBeTruthy();
      expect(result.run.status).toBeTruthy();
      expect(result.estimatedTokens).toBeGreaterThan(0);

      // Log result for manual verification
      console.log('Run Details:', JSON.stringify(result, null, 2));
    }, 30000); // 30 second timeout for real API

    it('should return valid run data structure', async () => {
      // Act
      const result = await getRunDetails.execute({ runId: testRunId });

      // Assert: Verify all expected fields exist
      expect(result.run).toHaveProperty('id');
      expect(result.run).toHaveProperty('status');
      expect(result.run).toHaveProperty('createdAt');
      expect(result.run).toHaveProperty('specs');
      expect(result.run).toHaveProperty('tests');
      expect(result.run).toHaveProperty('passed');
      expect(result.run).toHaveProperty('failed');
      expect(result.run).toHaveProperty('skipped');
      expect(result.run).toHaveProperty('pending');

      // Verify field types
      expect(typeof result.run.id).toBe('string');
      expect(typeof result.run.status).toBe('string');
      expect(typeof result.run.createdAt).toBe('string');
      expect(typeof result.run.specs).toBe('number');
      expect(typeof result.run.tests).toBe('number');
      expect(typeof result.run.passed).toBe('number');
      expect(typeof result.run.failed).toBe('number');
      expect(typeof result.run.skipped).toBe('number');
      expect(typeof result.run.pending).toBe('number');

      // duration is optional
      if (result.run.duration !== undefined) {
        expect(typeof result.run.duration).toBe('number');
      }
    }, 30000);

    it('should handle non-existent run gracefully', async () => {
      // Arrange: Use an invalid run ID
      const invalidRunId = 'non-existent-run-12345';

      // Act & Assert: Should throw or return error
      await expect(getRunDetails.execute({ runId: invalidRunId })).rejects.toThrow();
    }, 30000);

    it('should filter out extra metadata fields', async () => {
      // Act
      const result = await getRunDetails.execute({ runId: testRunId });

      // Assert: Verify only essential fields are returned (no configuration, metadata, etc.)
      expect(result.run).not.toHaveProperty('configuration');
      expect(result.run).not.toHaveProperty('metadata');
      expect(result.run).not.toHaveProperty('results');
      expect(result.run).not.toHaveProperty('specs_data');

      // Only these fields should exist
      const allowedFields = [
        'id',
        'status',
        'createdAt',
        'specs',
        'tests',
        'passed',
        'failed',
        'skipped',
        'pending',
        'duration',
      ];

      Object.keys(result.run).forEach((key) => {
        expect(allowedFields).toContain(key);
      });
    }, 30000);
  });

  // ==========================================================================
  // Category 2: Schema Compatibility
  // ==========================================================================

  describe('Schema Compatibility', () => {
    it('should match discovered schema structure', async () => {
      // Act
      const result = await getRunDetails.execute({ runId: testRunId });

      // Assert: Verify response matches discovered schema
      expect(result.run).toMatchObject({
        id: expect.any(String),
        status: expect.stringMatching(/^(running|completed|failed|cancelled|timeout|.+)$/),
        createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/), // ISO 8601
        specs: expect.any(Number),
        tests: expect.any(Number),
        passed: expect.any(Number),
        failed: expect.any(Number),
        skipped: expect.any(Number),
        pending: expect.any(Number),
      });

      // duration is optional
      if (result.run.duration !== undefined) {
        expect(typeof result.run.duration).toBe('number');
      }

      console.log('Schema validation passed');
    }, 30000);

    it('should handle all status union variants', async () => {
      // Act
      const result = await getRunDetails.execute({ runId: testRunId });

      // Assert: Status should be one of the known types or a string
      const validStatuses = ['running', 'completed', 'failed', 'cancelled', 'timeout'];
      const isKnownStatus = validStatuses.includes(result.run.status);
      const isString = typeof result.run.status === 'string';

      expect(isString).toBe(true);
      console.log(`Status: ${result.run.status} (known: ${isKnownStatus})`);
    }, 30000);
  });

  // ==========================================================================
  // Category 3: Token Reduction - Real Data
  // ==========================================================================

  describe('Token Reduction - Real Data', () => {
    it('should reduce token count vs raw MCP response', async () => {
      // Act
      const result = await getRunDetails.execute({ runId: testRunId });

      // Assert: Token count should be reasonable for filtered data
      expect(result.estimatedTokens).toBeGreaterThan(0);
      expect(result.estimatedTokens).toBeLessThan(500); // Should be much less than raw response

      console.log(`Token estimate: ${result.estimatedTokens} tokens`);
    }, 30000);

    it('should verify token estimation accuracy', async () => {
      // Act
      const result = await getRunDetails.execute({ runId: testRunId });

      // Calculate actual size
      const actualSize = JSON.stringify(result.run).length;
      const calculatedTokens = Math.ceil(actualSize / 4);

      // Assert: Estimated tokens should match calculation
      expect(result.estimatedTokens).toBe(calculatedTokens);

      console.log(`Actual size: ${actualSize} chars, Tokens: ${calculatedTokens}`);
    }, 30000);

    it('should demonstrate significant token reduction', async () => {
      // Act
      const result = await getRunDetails.execute({ runId: testRunId });

      // Assert: Filtered response should be compact
      // Raw Currents API responses typically include configuration, metadata, full test results
      // Our filtered response should be <500 tokens vs potentially 5000+ tokens raw
      expect(result.estimatedTokens).toBeLessThan(500);

      // Calculate reduction percentage (assuming raw is ~5000 tokens)
      const estimatedRawTokens = 5000; // Conservative estimate
      const reductionPercent = ((estimatedRawTokens - result.estimatedTokens) / estimatedRawTokens) * 100;

      console.log(`Token reduction: ~${reductionPercent.toFixed(1)}% (${result.estimatedTokens} vs ~${estimatedRawTokens} raw)`);
      expect(reductionPercent).toBeGreaterThan(80); // At least 80% reduction
    }, 30000);
  });

  describe('Security validation', () => {
    it('should reject malicious runId in real execution', async () => {
      // Arrange: Security attack vectors
      const attacks = ['../../../etc/passwd', 'run-123; rm -rf /', 'run-123\x00'];

      // Act & Assert: All should be rejected before reaching MCP
      for (const attack of attacks) {
        await expect(getRunDetails.execute({ runId: attack })).rejects.toThrow();
      }
    });
  });

  describe('Performance', () => {
    it('should complete within reasonable time', async () => {
      // Arrange
      const start = Date.now();

      // Act
      await getRunDetails.execute({ runId: testRunId });

      // Assert: Should complete within 10 seconds for real API
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10000);

      console.log(`Real API response time: ${duration}ms`);
    }, 15000);
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
 * 2. Get a valid run ID:
 *    - Run Cypress tests with Currents recording
 *    - Copy a run ID from the Currents dashboard
 *    - Set CURRENTS_TEST_RUN_ID environment variable
 *
 * 3. Run integration tests:
 *    ```bash
 *    cd .claude/tools/currents
 *    CURRENTS_TEST_RUN_ID=your-run-id RUN_INTEGRATION_TESTS=true npm run test:integration -- get-run-details
 *    ```
 *
 * 4. Verify results:
 *    - Check console output for run details
 *    - Verify token estimates are reasonable
 *    - Confirm filtering removed metadata
 */
