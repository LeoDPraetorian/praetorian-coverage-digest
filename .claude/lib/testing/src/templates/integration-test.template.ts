/**
 * Integration Test Template for MCP Wrappers
 *
 * This template provides a complete integration test structure for MCP wrappers.
 * Integration tests call the REAL MCP server to validate end-to-end functionality.
 *
 * Copy and customize for your specific wrapper.
 *
 * Replace placeholders:
 * - {WRAPPER_NAME} - Name of the wrapper (e.g., resolveLibraryId)
 * - {MCP_NAME} - Name of the MCP server (e.g., context7)
 * - {TOOL_NAME} - Name of the MCP tool (e.g., resolve-library-id)
 * - {INPUT_FIELD} - Main input field name (e.g., libraryName)
 * - {VALID_INPUT} - Known valid input value (e.g., 'react')
 * - {INVALID_INPUT} - Known invalid input value (e.g., 'nonexistent-library-xyz')
 *
 * When to Use Integration Tests:
 * - Validate MCP server is responding correctly
 * - Test real-world scenarios with actual data
 * - Verify schema matches MCP server responses
 * - Test critical user workflows end-to-end
 * - Validate token reduction and filtering on real data
 *
 * Complementary to Unit Tests:
 * - Unit tests (mocked): Fast, test wrapper logic only
 * - Integration tests (real): Slow, test end-to-end with MCP server
 */

import { describe, it, expect } from 'vitest';
import {
  assertSchemaAccepts,
  assertSchemaRejects,
  EdgeCaseData,
} from '@claude/testing';

// Import the wrapper to test
import { {WRAPPER_NAME} } from './{WRAPPER_NAME}';

// Import schemas for validation
import { InputSchema, OutputSchema } from './{WRAPPER_NAME}';

describe('{WRAPPER_NAME} - Integration Tests', () => {
  // ==========================================================================
  // Category 1: Happy Path Tests (Real MCP Server)
  // ==========================================================================

  describe('Happy path - Real MCP server', () => {
    it('should successfully call MCP server with valid input', async () => {
      // Arrange: Valid input that MCP server will accept
      const input = {
        {INPUT_FIELD}: '{VALID_INPUT}',
      };

      // Act: Call real MCP server
      const result = await {WRAPPER_NAME}.execute(input);

      // Assert: Verify response structure
      expect(result).toBeDefined();
      // TODO: Add specific assertions for expected response structure
      // expect(result.items).toBeInstanceOf(Array);
      // expect(result.items.length).toBeGreaterThan(0);
    }, 10000); // 10s timeout for real MCP calls

    it('should return filtered response with reduced tokens', async () => {
      // Arrange
      const input = { {INPUT_FIELD}: '{VALID_INPUT}' };

      // Act
      const result = await {WRAPPER_NAME}.execute(input);

      // Assert: Verify token reduction
      const resultSize = JSON.stringify(result).length;
      // TODO: Define expected token reduction threshold
      // expect(resultSize).toBeLessThan(expectedMaxSize);

      // Verify required fields present
      // TODO: Add assertions for filtered output
      // expect(result).toHaveProperty('requiredField');
    }, 10000);

    it('should handle optional parameters correctly', async () => {
      // Arrange: Test with all optional parameters
      const input = {
        {INPUT_FIELD}: '{VALID_INPUT}',
        // TODO: Add optional parameters
        // optionalParam: 'value',
      };

      // Act
      const result = await {WRAPPER_NAME}.execute(input);

      // Assert: Verify optional parameters applied
      expect(result).toBeDefined();
      // TODO: Add specific assertions for optional parameter effects
    }, 10000);
  });

  // ==========================================================================
  // Category 2: Error Handling (Real MCP Server)
  // ==========================================================================

  describe('Error handling - Real MCP server', () => {
    it('should handle not found errors gracefully', async () => {
      // Arrange: Input that will result in 404
      const input = {
        {INPUT_FIELD}: '{INVALID_INPUT}',
      };

      // Act & Assert: Should reject with clear error
      await expect({WRAPPER_NAME}.execute(input)).rejects.toThrow();
      // TODO: Verify error message format
      // await expect(...).rejects.toThrow(/not found/i);
    }, 10000);

    it('should propagate MCP server errors', async () => {
      // Arrange: Input that might cause server error
      // Note: This is challenging with real server - may need specific test data
      const input = {
        {INPUT_FIELD}: '', // Empty might trigger validation error
      };

      // Act & Assert
      await expect({WRAPPER_NAME}.execute(input)).rejects.toThrow();
    }, 10000);

    it('should timeout for slow MCP responses', async () => {
      // Arrange: Input that might be slow (if applicable)
      const input = {
        {INPUT_FIELD}: '{VALID_INPUT}',
        // TODO: Add parameters that might cause slow response
      };

      // Act & Assert: Verify reasonable timeout
      // This test validates wrapper doesn't hang indefinitely
      const start = Date.now();
      try {
        await {WRAPPER_NAME}.execute(input);
      } catch (error) {
        // Error is OK, we're testing timeout behavior
      }
      const duration = Date.now() - start;

      // Should complete within reasonable time (even if error)
      expect(duration).toBeLessThan(30000); // 30s max
    });
  });

  // ==========================================================================
  // Category 3: Schema Validation (Real MCP Server)
  // ==========================================================================

  describe('Schema validation with real data', () => {
    it('should validate input schema accepts valid inputs', () => {
      // Test input schema with valid values
      const validInputs = [
        { {INPUT_FIELD}: '{VALID_INPUT}' },
        // TODO: Add more valid input examples
      ];

      const results = assertSchemaAccepts(InputSchema, validInputs);

      expect(results.failed).toBe(0);
      expect(results.passed).toBe(validInputs.length);
    });

    it('should validate input schema rejects invalid inputs', () => {
      // Test input schema with invalid values
      const invalidInputs = [
        { {INPUT_FIELD}: '' },                    // Empty
        { {INPUT_FIELD}: '../../../etc/passwd' }, // Path traversal
        { {INPUT_FIELD}: '<script>alert(1)</script>' }, // XSS
        // TODO: Add more invalid input examples specific to your wrapper
      ];

      const results = assertSchemaRejects(InputSchema, invalidInputs);

      expect(results.failed).toBe(0);
      expect(results.passed).toBe(invalidInputs.length);
    });

    it('should validate output matches schema for real responses', async () => {
      // Arrange
      const input = { {INPUT_FIELD}: '{VALID_INPUT}' };

      // Act: Get real MCP response
      const result = await {WRAPPER_NAME}.execute(input);

      // Assert: Validate against output schema
      const parseResult = OutputSchema.safeParse(result);

      expect(parseResult.success).toBe(true);
      if (!parseResult.success) {
        console.error('Schema validation errors:', parseResult.error.errors);
      }
    }, 10000);
  });

  // ==========================================================================
  // Category 4: Edge Cases (Real MCP Server)
  // ==========================================================================

  describe('Edge cases with real MCP server', () => {
    it('should handle boundary input values', async () => {
      // Test minimum/maximum valid values
      const testCases = [
        { {INPUT_FIELD}: EdgeCaseData.boundary.minString },
        { {INPUT_FIELD}: EdgeCaseData.special.unicode },
        // TODO: Add more boundary cases specific to your wrapper
      ];

      for (const testCase of testCases) {
        // Should not throw, may return empty results
        const result = await {WRAPPER_NAME}.execute(testCase);
        expect(result).toBeDefined();
      }
    }, 30000); // Longer timeout for multiple calls

    it('should handle empty results gracefully', async () => {
      // Arrange: Input likely to return no results
      const input = {
        {INPUT_FIELD}: '{INVALID_INPUT}',
      };

      // Act: May throw or return empty
      try {
        const result = await {WRAPPER_NAME}.execute(input);

        // If successful, verify empty result structure
        // TODO: Add assertions for empty result handling
        // expect(result.items).toEqual([]);
      } catch (error) {
        // Not found is also acceptable
        expect(error).toBeDefined();
      }
    }, 10000);
  });

  // ==========================================================================
  // Category 5: Performance & Token Reduction (Real MCP Server)
  // ==========================================================================

  describe('Performance with real MCP server', () => {
    it('should achieve target token reduction', async () => {
      // Arrange
      const input = { {INPUT_FIELD}: '{VALID_INPUT}' };

      // Act
      const result = await {WRAPPER_NAME}.execute(input);

      // Assert: Calculate token reduction
      const resultSize = JSON.stringify(result).length;
      const estimatedTokens = resultSize / 4; // Rough estimate

      console.log(`Response size: ${resultSize} chars (~${estimatedTokens} tokens)`);

      // TODO: Define target token threshold based on requirements
      // expect(estimatedTokens).toBeLessThan(TARGET_TOKENS);

      // Verify essential data preserved
      expect(result).toBeDefined();
      // TODO: Add assertions that critical data not filtered out
    }, 10000);

    it('should complete within acceptable time', async () => {
      // Arrange
      const input = { {INPUT_FIELD}: '{VALID_INPUT}' };

      // Act: Measure execution time
      const start = Date.now();
      await {WRAPPER_NAME}.execute(input);
      const duration = Date.now() - start;

      // Assert: Should complete in reasonable time
      console.log(`Execution time: ${duration}ms`);

      // TODO: Define acceptable response time threshold
      expect(duration).toBeLessThan(5000); // 5s for MCP call
    }, 10000);

    it('should handle concurrent requests', async () => {
      // Arrange: Multiple concurrent requests
      const requests = Array.from({ length: 5 }, () =>
        {WRAPPER_NAME}.execute({ {INPUT_FIELD}: '{VALID_INPUT}' })
      );

      // Act: Execute concurrently
      const start = Date.now();
      const results = await Promise.all(requests);
      const duration = Date.now() - start;

      // Assert: All should succeed
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
      });

      console.log(`5 concurrent requests completed in ${duration}ms`);

      // Should handle concurrency without excessive slowdown
      expect(duration).toBeLessThan(15000); // 15s for 5 concurrent
    }, 20000);
  });

  // ==========================================================================
  // Category 6: End-to-End Workflows (Real MCP Server)
  // ==========================================================================

  describe('End-to-end workflows', () => {
    it('should complete typical user workflow', async () => {
      // This test validates a complete user workflow
      // TODO: Customize based on typical usage pattern

      // Step 1: Initial query
      const step1Result = await {WRAPPER_NAME}.execute({
        {INPUT_FIELD}: '{VALID_INPUT}',
      });

      expect(step1Result).toBeDefined();

      // Step 2: Follow-up query with different parameters (if applicable)
      // TODO: Add workflow steps specific to your wrapper

      // Step 3: Verify workflow completion
      // TODO: Add final workflow validation
    }, 30000); // Longer timeout for multi-step workflow
  });
});
