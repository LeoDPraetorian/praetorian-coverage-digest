/**
 * Unit Tests for getSpecFilesPerformance Wrapper
 *
 * Tests with mocked MCP server.
 * Run with: npx vitest run get-spec-files-performance.unit.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createMCPMock,
  testSecurityScenarios,
  getAllSecurityScenarios,
  MCPErrors,
} from '@claude/testing';

// Mock the MCP client module BEFORE importing the wrapper
vi.mock('../config/lib/mcp-client', () => ({
  callMCPTool: vi.fn(),
}));

import { getSpecFilesPerformance } from './get-spec-files-performance';
import * as mcpClient from '../config/lib/mcp-client';

// Get the mocked function
const mcpMock = vi.mocked(mcpClient.callMCPTool);

describe('getSpecFilesPerformance - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Filtering logic', () => {
    it('should filter spec files to essential fields only', async () => {
      // Arrange: Mock response with extra fields
      mcpMock.mockResolvedValue({
        specFiles: [
          {
            name: 'spec1.cy.ts',
            avgDuration: 1500,
            failureRate: 0.1,
            flakeRate: 0.05,
            overallExecutions: 100,
            // Extra fields that should be filtered out
            fullHistory: [{ date: '2025-01-01', duration: 1400 }],
            configuration: { browser: 'chrome' },
            metadata: { author: 'test' },
          },
        ],
      });

      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'avgDuration',
      });

      // Assert: Only essential fields present
      expect(result.specFiles).toHaveLength(1);
      expect(result.specFiles[0]).toEqual({
        name: 'spec1.cy.ts',
        avgDuration: 1500,
        failureRate: 0.1,
        flakeRate: 0.05,
        overallExecutions: 100,
      });
      expect(result.specFiles[0]).not.toHaveProperty('fullHistory');
      expect(result.specFiles[0]).not.toHaveProperty('configuration');
      expect(result.specFiles[0]).not.toHaveProperty('metadata');
    });

    it('should handle empty spec files array', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ specFiles: [] });

      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: 'project-empty',
        order: 'avgDuration',
      });

      // Assert
      expect(result.specFiles).toEqual([]);
      expect(result.totalSpecs).toBe(0);
      expect(result.hasMore).toBe(false);
      expect(result.estimatedTokens).toBe(1); // Empty array "[]" = 2 chars = 1 token
    });

    it('should handle missing specFiles field', async () => {
      // Arrange: Response without specFiles
      mcpMock.mockResolvedValue({});

      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'avgDuration',
      });

      // Assert
      expect(result.specFiles).toEqual([]);
      expect(result.totalSpecs).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle null response', async () => {
      // Arrange
      mcpMock.mockResolvedValue(null);

      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'avgDuration',
      });

      // Assert
      expect(result.specFiles).toEqual([]);
      expect(result.totalSpecs).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle string numbers in response', async () => {
      // Arrange: MCP returns strings instead of numbers
      mcpMock.mockResolvedValue({
        specFiles: [
          {
            name: 'spec1.cy.ts',
            avgDuration: '1500',
            failureRate: '0.1',
            flakeRate: '0.05',
            overallExecutions: '100',
          },
        ],
      });

      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'avgDuration',
      });

      // Assert: Coerced to numbers
      expect(result.specFiles[0].avgDuration).toBe(1500);
      expect(result.specFiles[0].failureRate).toBe(0.1);
      expect(result.specFiles[0].flakeRate).toBe(0.05);
      expect(result.specFiles[0].overallExecutions).toBe(100);
    });

    it('should handle missing optional fields with defaults', async () => {
      // Arrange: Spec file with missing optional fields
      mcpMock.mockResolvedValue({
        specFiles: [{ name: 'spec1.cy.ts' }],
      });

      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'avgDuration',
      });

      // Assert: Defaults applied
      expect(result.specFiles[0]).toEqual({
        name: 'spec1.cy.ts',
        avgDuration: 0,
        failureRate: 0,
        flakeRate: 0,
        overallExecutions: 0,
      });
    });
  });

  describe('Pagination', () => {
    it('should respect limit parameter', async () => {
      // Arrange: 10 spec files, limit 5
      const specFiles = Array.from({ length: 10 }, (_, i) => ({
        name: `spec${i}.cy.ts`,
        avgDuration: 1000 + i * 100,
        failureRate: 0.1,
        flakeRate: 0.05,
        overallExecutions: 50,
      }));
      mcpMock.mockResolvedValue({ specFiles });

      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'avgDuration',
        limit: 5,
      });

      // Assert
      expect(result.specFiles).toHaveLength(5);
      expect(result.totalSpecs).toBe(10);
      expect(result.hasMore).toBe(true);
    });

    it('should handle page parameter', async () => {
      // Arrange
      mcpMock.mockResolvedValue({
        specFiles: [{ name: 'spec1.cy.ts', avgDuration: 1000, failureRate: 0.1, flakeRate: 0.05, overallExecutions: 50 }],
      });

      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'avgDuration',
        page: 2,
      });

      // Assert
      expect(result.page).toBe(2);
    });

    it('should set hasMore to false when no more results', async () => {
      // Arrange: Fewer results than limit
      const specFiles = Array.from({ length: 3 }, (_, i) => ({
        name: `spec${i}.cy.ts`,
        avgDuration: 1000,
        failureRate: 0.1,
        flakeRate: 0.05,
        overallExecutions: 50,
      }));
      mcpMock.mockResolvedValue({ specFiles });

      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'avgDuration',
        limit: 10,
      });

      // Assert
      expect(result.hasMore).toBe(false);
      expect(result.totalSpecs).toBe(3);
    });

    it('should handle maximum limit (50)', async () => {
      // Arrange: 100 spec files
      const specFiles = Array.from({ length: 100 }, (_, i) => ({
        name: `spec${i}.cy.ts`,
        avgDuration: 1000,
        failureRate: 0.1,
        flakeRate: 0.05,
        overallExecutions: 50,
      }));
      mcpMock.mockResolvedValue({ specFiles });

      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'avgDuration',
        limit: 50,
      });

      // Assert
      expect(result.specFiles).toHaveLength(50);
      expect(result.totalSpecs).toBe(100);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('Token estimation', () => {
    it('should calculate tokens based on JSON size', async () => {
      // Arrange
      const specFiles = [
        { name: 'spec1.cy.ts', avgDuration: 1000, failureRate: 0.1, flakeRate: 0.05, overallExecutions: 50 },
        { name: 'spec2.cy.ts', avgDuration: 2000, failureRate: 0.2, flakeRate: 0.1, overallExecutions: 100 },
      ];
      mcpMock.mockResolvedValue({ specFiles });

      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'avgDuration',
      });

      // Assert: 4 chars per token
      const expectedTokens = Math.ceil(JSON.stringify(result.specFiles).length / 4);
      expect(result.estimatedTokens).toBe(expectedTokens);
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });

    it('should calculate minimal tokens for empty list', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ specFiles: [] });

      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'avgDuration',
      });

      // Assert: Empty array "[]" = 2 chars = 1 token
      expect(result.estimatedTokens).toBe(1);
    });
  });

  describe('Response format handling', () => {
    it('should handle object format', async () => {
      // Arrange: Standard format
      mcpMock.mockResolvedValue({
        specFiles: [{ name: 'spec1.cy.ts', avgDuration: 1000, failureRate: 0.1, flakeRate: 0.05, overallExecutions: 50 }],
      });

      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'avgDuration',
      });

      // Assert
      expect(result.specFiles).toBeDefined();
      expect(Array.isArray(result.specFiles)).toBe(true);
    });

    it('should handle direct array format (forEach bug prevention)', async () => {
      // Arrange: Array format that would break forEach
      mcpMock.mockResolvedValue([
        { name: 'spec1.cy.ts', avgDuration: 1000, failureRate: 0.1, flakeRate: 0.05, overallExecutions: 50 },
      ]);

      // Act & Assert: Should not crash when trying to access properties
      const result = await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'avgDuration',
      });
      expect(result.specFiles).toBeDefined();
      expect(Array.isArray(result.specFiles)).toBe(true);
      // Verify defaults applied when response is array (not expected format)
      expect(result.specFiles).toEqual([]);
    });

    it('should handle tuple format (forEach bug prevention)', async () => {
      // Arrange: Tuple format [data, metadata]
      mcpMock.mockResolvedValue([
        { specFiles: [{ name: 'spec1.cy.ts', avgDuration: 1000, failureRate: 0.1, flakeRate: 0.05, overallExecutions: 50 }] },
        { cursor: 'next-page' },
      ]);

      // Act & Assert: Should not crash when accessing tuple
      const result = await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'avgDuration',
      });
      expect(result.specFiles).toBeDefined();
      expect(Array.isArray(result.specFiles)).toBe(true);
      // Verify defaults applied when response is tuple (not expected format)
      expect(result.specFiles).toEqual([]);
    });
  });

  describe('Error handling', () => {
    it('should handle MCP rate limit errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(new Error('Rate limit exceeded'));

      // Act & Assert
      await expect(
        getSpecFilesPerformance.execute({ projectId: 'project-123', order: 'avgDuration' })
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle MCP timeout errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(new Error('Request timeout'));

      // Act & Assert
      await expect(
        getSpecFilesPerformance.execute({ projectId: 'project-123', order: 'avgDuration' })
      ).rejects.toThrow('Request timeout');
    });

    it('should handle MCP server errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(new Error('Internal server error'));

      // Act & Assert
      await expect(
        getSpecFilesPerformance.execute({ projectId: 'project-123', order: 'avgDuration' })
      ).rejects.toThrow('Internal server error');
    });
  });

  describe('Input validation', () => {
    it('should require projectId', async () => {
      // Act & Assert
      await expect(
        getSpecFilesPerformance.execute({ projectId: '', order: 'avgDuration' })
      ).rejects.toThrow();
    });

    it('should validate order enum', async () => {
      // Act & Assert
      await expect(
        getSpecFilesPerformance.execute({ projectId: 'project-123', order: 'invalidOrder' as any })
      ).rejects.toThrow();
    });

    it('should validate orderDirection enum', async () => {
      // Act & Assert
      await expect(
        getSpecFilesPerformance.execute({
          projectId: 'project-123',
          order: 'avgDuration',
          orderDirection: 'invalid' as any,
        })
      ).rejects.toThrow();
    });

    it('should validate limit range', async () => {
      // Act & Assert: Too high
      await expect(
        getSpecFilesPerformance.execute({ projectId: 'project-123', order: 'avgDuration', limit: 100 })
      ).rejects.toThrow();

      // Act & Assert: Too low
      await expect(
        getSpecFilesPerformance.execute({ projectId: 'project-123', order: 'avgDuration', limit: 0 })
      ).rejects.toThrow();
    });

    it('should validate page is non-negative', async () => {
      // Act & Assert
      await expect(
        getSpecFilesPerformance.execute({ projectId: 'project-123', order: 'avgDuration', page: -1 })
      ).rejects.toThrow();
    });

    it('should accept valid optional parameters', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ specFiles: [] });

      // Act
      await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'avgDuration',
        orderDirection: 'asc',
        from: '2025-01-01',
        to: '2025-01-31',
        authors: ['author1', 'author2'],
        branches: ['main', 'develop'],
        tags: ['tag1'],
        specNameFilter: 'login',
        page: 0,
        limit: 20,
      });

      // Assert: No errors thrown
      expect(mcpMock).toHaveBeenCalled();
    });
  });

  describe('Security validation', () => {
    it('should reject path traversal in projectId', async () => {
      // Act & Assert
      await expect(
        getSpecFilesPerformance.execute({ projectId: '../../../etc/passwd', order: 'avgDuration' })
      ).rejects.toThrow('path traversal');
    });

    it('should reject command injection in projectId', async () => {
      // Act & Assert
      await expect(
        getSpecFilesPerformance.execute({ projectId: 'project-123; rm -rf /', order: 'avgDuration' })
      ).rejects.toThrow('command injection');
    });

    it('should reject control characters in projectId', async () => {
      // Act & Assert
      await expect(
        getSpecFilesPerformance.execute({ projectId: 'project-123\x00', order: 'avgDuration' })
      ).rejects.toThrow('control characters');
    });

    it('should reject path traversal in from', async () => {
      // Act & Assert
      await expect(
        getSpecFilesPerformance.execute({
          projectId: 'project-123',
          order: 'avgDuration',
          from: '../../../etc/passwd',
        })
      ).rejects.toThrow('path traversal');
    });

    it('should reject path traversal in to', async () => {
      // Act & Assert
      await expect(
        getSpecFilesPerformance.execute({
          projectId: 'project-123',
          order: 'avgDuration',
          to: '../../../etc/passwd',
        })
      ).rejects.toThrow('path traversal');
    });

    it('should reject path traversal in specNameFilter', async () => {
      // Act & Assert
      await expect(
        getSpecFilesPerformance.execute({
          projectId: 'project-123',
          order: 'avgDuration',
          specNameFilter: '../../../etc/passwd',
        })
      ).rejects.toThrow('path traversal');
    });

    it('should reject path traversal in authors array', async () => {
      // Act & Assert
      await expect(
        getSpecFilesPerformance.execute({
          projectId: 'project-123',
          order: 'avgDuration',
          authors: ['valid', '../../../etc/passwd'],
        })
      ).rejects.toThrow('path traversal');
    });

    it('should reject command injection in branches array', async () => {
      // Act & Assert
      await expect(
        getSpecFilesPerformance.execute({
          projectId: 'project-123',
          order: 'avgDuration',
          branches: ['main', 'branch; rm -rf /'],
        })
      ).rejects.toThrow('command injection');
    });

    it('should reject control characters in tags array', async () => {
      // Act & Assert
      await expect(
        getSpecFilesPerformance.execute({
          projectId: 'project-123',
          order: 'avgDuration',
          tags: ['tag1', 'tag2\x00'],
        })
      ).rejects.toThrow('control characters');
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      // Arrange
      mcpMock.mockResolvedValue({
        specFiles: [{ name: 'spec1.cy.ts', avgDuration: 1000, failureRate: 0.1, flakeRate: 0.05, overallExecutions: 50 }],
      });

      // Act: Measure execution time
      const start = performance.now();
      await getSpecFilesPerformance.execute({ projectId: 'project-123', order: 'avgDuration' });
      const end = performance.now();

      // Assert: Wrapper overhead should be minimal (<1ms excluding MCP call)
      const overhead = end - start;
      console.log(`Wrapper execution time: ${overhead.toFixed(2)}ms`);
      expect(overhead).toBeLessThan(100); // Very generous bound for testing
    });

    it('should handle filtering large datasets efficiently', async () => {
      // Arrange: 50 spec files
      const specFiles = Array.from({ length: 50 }, (_, i) => ({
        name: `spec${i}.cy.ts`,
        avgDuration: 1000 + i * 100,
        failureRate: 0.1,
        flakeRate: 0.05,
        overallExecutions: 50 + i * 10,
      }));
      mcpMock.mockResolvedValue({ specFiles });

      // Act: Measure filtering time
      const start = performance.now();
      await getSpecFilesPerformance.execute({ projectId: 'project-123', order: 'avgDuration', limit: 50 });
      const end = performance.now();

      // Assert: Should complete quickly
      const duration = end - start;
      console.log(`Filter time for 50 specs: ${duration.toFixed(0)}ms`);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Sorting and filtering parameters', () => {
    it('should pass all filter parameters to MCP', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ specFiles: [] });

      // Act
      await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'failureRate',
        orderDirection: 'desc',
        from: '2025-01-01',
        to: '2025-01-31',
        authors: ['author1'],
        branches: ['main'],
        tags: ['release'],
        specNameFilter: 'login',
        page: 1,
        limit: 25,
      });

      // Assert: MCP called with all parameters (3rd argument is the params object)
      expect(mcpMock).toHaveBeenCalledWith(
        'currents',
        'currents-get-spec-files-performance',
        expect.objectContaining({
          projectId: 'project-123',
          order: 'failureRate',
          orderDirection: 'desc',
          from: '2025-01-01',
          to: '2025-01-31',
          authors: ['author1'],
          branches: ['main'],
          tags: ['release'],
          specNameFilter: 'login',
          page: 1,
          limit: 25,
        })
      );
    });

    it('should apply default values for optional parameters', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ specFiles: [] });

      // Act
      await getSpecFilesPerformance.execute({ projectId: 'project-123', order: 'avgDuration' });

      // Assert: Defaults applied (3rd argument is the params object)
      expect(mcpMock).toHaveBeenCalledWith(
        'currents',
        'currents-get-spec-files-performance',
        expect.objectContaining({
          orderDirection: 'desc',
          authors: [],
          branches: [],
          tags: [],
          page: 0,
          limit: 50,
        })
      );
    });
  });

  // ==========================================================================
  // Category: Edge Case Tests
  // ==========================================================================

  describe('Edge case handling', () => {
    it('should handle null spec file values gracefully', async () => {
      // Arrange: MCP returns spec files with null values
      mcpMock.mockResolvedValue({
        specFiles: [
          {
            name: 'spec1.cy.ts',
            avgDuration: null,
            failureRate: null,
            flakeRate: null,
            overallExecutions: null,
          },
        ],
      });

      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'avgDuration',
      });

      // Assert: Null values coerced to 0
      expect(result.specFiles[0].avgDuration).toBe(0);
      expect(result.specFiles[0].failureRate).toBe(0);
      expect(result.specFiles[0].flakeRate).toBe(0);
      expect(result.specFiles[0].overallExecutions).toBe(0);
    });

    it('should handle undefined spec file values gracefully', async () => {
      // Arrange: MCP returns spec files with undefined values
      mcpMock.mockResolvedValue({
        specFiles: [
          {
            name: 'spec1.cy.ts',
            avgDuration: undefined,
            failureRate: undefined,
            flakeRate: undefined,
            overallExecutions: undefined,
          },
        ],
      });

      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'avgDuration',
      });

      // Assert: Undefined values coerced to 0
      expect(result.specFiles[0].avgDuration).toBe(0);
      expect(result.specFiles[0].failureRate).toBe(0);
      expect(result.specFiles[0].flakeRate).toBe(0);
      expect(result.specFiles[0].overallExecutions).toBe(0);
    });

    it('should handle empty arrays in filter parameters', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ specFiles: [] });

      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'avgDuration',
        authors: [],
        branches: [],
        tags: [],
      });

      // Assert: Empty arrays accepted without error
      expect(result.specFiles).toEqual([]);
      expect(mcpMock).toHaveBeenCalled();
    });

    it('should handle large datasets efficiently', async () => {
      // Arrange: MCP returns maximum dataset (edge case for memory/performance)
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        name: `spec${i}.cy.ts`,
        avgDuration: Math.random() * 10000,
        failureRate: Math.random(),
        flakeRate: Math.random(),
        overallExecutions: Math.floor(Math.random() * 1000),
      }));
      mcpMock.mockResolvedValue({ specFiles: largeDataset });

      // Act
      const start = performance.now();
      const result = await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'avgDuration',
        limit: 50,
      });
      const duration = performance.now() - start;

      // Assert: Should handle large datasets and respect limit
      expect(result.specFiles).toHaveLength(50);
      expect(result.totalSpecs).toBe(1000);
      expect(duration).toBeLessThan(100); // Should be fast
    });

    it('should handle boundary value for failureRate (0 and 1)', async () => {
      // Arrange: Edge case values at boundaries
      mcpMock.mockResolvedValue({
        specFiles: [
          { name: 'perfect.cy.ts', avgDuration: 1000, failureRate: 0, flakeRate: 0, overallExecutions: 100 },
          { name: 'always-fails.cy.ts', avgDuration: 1000, failureRate: 1, flakeRate: 0, overallExecutions: 100 },
          { name: 'always-flaky.cy.ts', avgDuration: 1000, failureRate: 0, flakeRate: 1, overallExecutions: 100 },
        ],
      });

      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'failureRate',
      });

      // Assert: Boundary values preserved
      expect(result.specFiles[0].failureRate).toBe(0);
      expect(result.specFiles[1].failureRate).toBe(1);
      expect(result.specFiles[2].flakeRate).toBe(1);
    });

    it('should handle spec file with very long name (edge case)', async () => {
      // Arrange: Very long spec file path
      const longName = 'a'.repeat(500) + '.cy.ts';
      mcpMock.mockResolvedValue({
        specFiles: [
          {
            name: longName,
            avgDuration: 1000,
            failureRate: 0.1,
            flakeRate: 0.05,
            overallExecutions: 50,
          },
        ],
      });

      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'avgDuration',
      });

      // Assert: Long names preserved
      expect(result.specFiles[0].name).toBe(longName);
      expect(result.specFiles[0].name.length).toBeGreaterThan(500);
    });

    it('should handle zero duration (instant spec)', async () => {
      // Arrange: Edge case of instant test
      mcpMock.mockResolvedValue({
        specFiles: [
          {
            name: 'instant.cy.ts',
            avgDuration: 0,
            failureRate: 0,
            flakeRate: 0,
            overallExecutions: 0,
          },
        ],
      });

      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'avgDuration',
      });

      // Assert: Zero values preserved
      expect(result.specFiles[0].avgDuration).toBe(0);
      expect(result.specFiles[0].overallExecutions).toBe(0);
    });

    it('should handle NaN values in response', async () => {
      // Arrange: MCP returns NaN values (edge case)
      mcpMock.mockResolvedValue({
        specFiles: [
          {
            name: 'spec1.cy.ts',
            avgDuration: NaN,
            failureRate: NaN,
            flakeRate: NaN,
            overallExecutions: NaN,
          },
        ],
      });

      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'avgDuration',
      });

      // Assert: NaN coerced to 0 via Number() || 0 pattern
      expect(result.specFiles[0].avgDuration).toBe(0);
      expect(result.specFiles[0].failureRate).toBe(0);
    });

    it('should handle negative values (invalid but possible)', async () => {
      // Arrange: MCP returns negative values (edge case from corrupted data)
      mcpMock.mockResolvedValue({
        specFiles: [
          {
            name: 'spec1.cy.ts',
            avgDuration: -1000,
            failureRate: -0.5,
            flakeRate: -0.1,
            overallExecutions: -50,
          },
        ],
      });

      // Act
      const result = await getSpecFilesPerformance.execute({
        projectId: 'project-123',
        order: 'avgDuration',
      });

      // Assert: Negative values passed through (validation is at API level)
      expect(result.specFiles[0].avgDuration).toBe(-1000);
      expect(result.specFiles[0].failureRate).toBe(-0.5);
    });
  });
});
