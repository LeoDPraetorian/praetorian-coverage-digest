/**
 * Unit Tests for unarchive-issue Wrapper
 *
 * Tests wrapper logic in isolation using mocked GraphQL client.
 * Validates filtering, token reduction, schema validation, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMCPMock,
  MCPErrors,
  testSecurityScenarios,
  ControlCharacterScenarios,
} from '@claude/testing';

// Mock the client and GraphQL modules BEFORE importing
vi.mock('./client.js', () => ({
  createLinearClient: vi.fn(),
}));

vi.mock('./graphql-helpers.js', () => ({
  executeGraphQL: vi.fn(),
}));

// Import the wrapper to test
import { unarchiveIssue } from './unarchive-issue';
import { createLinearClient } from './client.js';
import { executeGraphQL } from './graphql-helpers.js';

describe('unarchiveIssue - Unit Tests', () => {
  const mockClient = {};

  // Sample response for mocking (GraphQL response structure)
  const sampleResponse = {
    issueUnarchive: {
      success: true,
      entity: {
        id: 'issue-123',
        identifier: 'CHARIOT-1516',
        archivedAt: null,
      },
    },
  };

  beforeEach(() => {
    vi.mocked(createLinearClient).mockResolvedValue(mockClient as any);
    vi.mocked(executeGraphQL).mockResolvedValue(sampleResponse as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Category 1: Wrapper Logic Tests (Mocked)
  // ==========================================================================

  describe('Filtering logic', () => {
    it('should filter response to essential fields only', async () => {
      const result = await unarchiveIssue.execute({ id: 'issue-123' });

      // Verify success wrapper
      expect(result.success).toBe(true);
      expect(result.entity).toBeDefined();

      // Verify filtered fields
      expect(result.entity.id).toBe('issue-123');
      expect(result.entity.identifier).toBe('CHARIOT-1516');
      expect(result.entity.archivedAt).toBeNull();
    });

    it('should pass id parameter to GraphQL', async () => {
      await unarchiveIssue.execute({ id: 'issue-456' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('issueUnarchive'),
        { id: 'issue-456' }
      );
    });

    it('should include estimatedTokens in output', async () => {
      const result = await unarchiveIssue.execute({ id: 'issue-123' });

      expect(result.estimatedTokens).toBeDefined();
      expect(typeof result.estimatedTokens).toBe('number');
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Category 2: Error Handling Tests
  // ==========================================================================

  describe('GraphQL errors', () => {
    it('should handle rate limit errors', async () => {
      vi.mocked(executeGraphQL).mockRejectedValue(MCPErrors.rateLimit());

      await expect(
        unarchiveIssue.execute({ id: 'issue-123' })
      ).rejects.toThrow(/rate limit/i);
    });

    it('should handle server errors', async () => {
      vi.mocked(executeGraphQL).mockRejectedValue(MCPErrors.serverError());

      await expect(
        unarchiveIssue.execute({ id: 'issue-123' })
      ).rejects.toThrow(/server.*error/i);
    });

    it('should handle network timeout', async () => {
      vi.mocked(executeGraphQL).mockRejectedValue(MCPErrors.timeout());

      await expect(
        unarchiveIssue.execute({ id: 'issue-123' })
      ).rejects.toThrow(/ETIMEDOUT/);
    });

    it('should throw when response missing success field', async () => {
      vi.mocked(executeGraphQL).mockResolvedValue({
        issueUnarchive: { entity: { id: 'issue-123' } },
      } as any);

      await expect(
        unarchiveIssue.execute({ id: 'issue-123' })
      ).rejects.toThrow();
    });

    it('should throw when success is false', async () => {
      vi.mocked(executeGraphQL).mockResolvedValue({
        issueUnarchive: {
          success: false,
          entity: null,
        },
      } as any);

      await expect(
        unarchiveIssue.execute({ id: 'issue-123' })
      ).rejects.toThrow(/Failed to unarchive issue/);
    });
  });

  describe('Malformed responses', () => {
    it('should handle response missing entity', async () => {
      vi.mocked(executeGraphQL).mockResolvedValue({
        issueUnarchive: {
          success: true,
          entity: null,
        },
      } as any);

      await expect(
        unarchiveIssue.execute({ id: 'issue-123' })
      ).rejects.toThrow(/Failed to unarchive issue/);
    });

    it('should handle unexpected null response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValue(null as any);

      await expect(
        unarchiveIssue.execute({ id: 'issue-123' })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Category 3: Input Validation Tests
  // ==========================================================================

  describe('Input validation', () => {
    it('should require id', async () => {
      await expect(
        unarchiveIssue.execute({} as any)
      ).rejects.toThrow();
    });

    it('should reject empty id', async () => {
      await expect(
        unarchiveIssue.execute({ id: '' })
      ).rejects.toThrow();
    });

    it('should accept valid UUIDs', async () => {
      await unarchiveIssue.execute({ id: 'eee0788c-9b67-4b3c-8a08-c9cd4224403e' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('issueUnarchive'),
        { id: 'eee0788c-9b67-4b3c-8a08-c9cd4224403e' }
      );
    });

    it('should accept issue identifiers like CHARIOT-123', async () => {
      await unarchiveIssue.execute({ id: 'CHARIOT-123' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('issueUnarchive'),
        { id: 'CHARIOT-123' }
      );
    });
  });

  // ==========================================================================
  // Category 4: Security Tests (Automated)
  // ==========================================================================

  describe('Security', () => {
    it('should block control characters in id', async () => {
      await expect(
        unarchiveIssue.execute({ id: 'issue\x00id' })
      ).rejects.toThrow(/control characters/i);
    });

    it('should block path traversal in id', async () => {
      await expect(
        unarchiveIssue.execute({ id: '../../../etc/passwd' })
      ).rejects.toThrow(/traversal/i);
    });

    it('should block command injection in id', async () => {
      await expect(
        unarchiveIssue.execute({ id: '; rm -rf /' })
      ).rejects.toThrow(/invalid characters/i);
    });

    it('should allow valid issue IDs', async () => {
      const result = await unarchiveIssue.execute({
        id: 'issue-abc123',
      });

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // Category 5: Performance Tests
  // ==========================================================================

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      const start = Date.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await unarchiveIssue.execute({ id: 'issue-123' });
      }

      const avgTime = (Date.now() - start) / iterations;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  // ==========================================================================
  // Category 6: Edge Case Tests
  // ==========================================================================

  describe('Edge Case Tests', () => {
    it('edge case: should handle UUID format', async () => {
      await unarchiveIssue.execute({ id: 'eee0788c-9b67-4b3c-8a08-c9cd4224403e' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('issueUnarchive'),
        { id: 'eee0788c-9b67-4b3c-8a08-c9cd4224403e' }
      );
    });

    it('edge case: should handle Linear identifier format', async () => {
      await unarchiveIssue.execute({ id: 'CHARIOT-1516' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('issueUnarchive'),
        { id: 'CHARIOT-1516' }
      );
    });

    it('edge case: should handle hyphenated IDs', async () => {
      await unarchiveIssue.execute({ id: 'issue-abc-123-def' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('issueUnarchive'),
        { id: 'issue-abc-123-def' }
      );
    });
  });
});
