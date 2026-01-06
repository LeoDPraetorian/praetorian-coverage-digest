/**
 * MCP Wrapper Test Example
 *
 * Demonstrates proper test isolation for MCP wrapper functions that
 * interact with external MCP servers via child_process.spawn().
 *
 * Key Patterns:
 * - Mock MCP SDK, not wrapper functions
 * - Use @claude/testing library for consistency
 * - Include cleanup in afterEach
 * - Use explicit timeout configuration
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMCPMock, LinearResponses } from '@claude/testing';

// Mock MCP SDK at module level (BEFORE imports)
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn(),
}));

// NOW safe to import wrapper and client
import { getIssue } from '../wrappers/linear/get-issue';
import { mcpClient } from '../config/lib/mcp-client';

// Mock the MCP client facade
vi.mock('../config/lib/mcp-client');

describe('MCP Wrapper: getIssue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();  // CRITICAL: Clean up timers BEFORE async cleanup
  });

  it('should fetch issue without spawning real MCP server', async () => {
    // Arrange: Setup mock response using @claude/testing
    const mockResponse = LinearResponses.issue({
      id: 'ISS-123',
      title: 'Test Issue',
      state: { name: 'In Progress' },
    });

    const mcpMock = createMCPMock({
      toolName: 'get-issue',
      response: mockResponse,
    });

    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);

    // Act: Call wrapper (should NOT spawn real process)
    const result = await getIssue({ issueId: 'ISS-123' });

    // Assert: Verify mock was called, not real MCP
    expect(mcpClient.callMCPTool).toHaveBeenCalledWith(
      'linear',
      'get-issue',
      { issueId: 'ISS-123' }
    );

    expect(result).toEqual({
      success: true,
      data: {
        id: 'ISS-123',
        title: 'Test Issue',
        state: 'In Progress',
      },
    });
  });

  it('should handle MCP server errors gracefully', async () => {
    // Arrange: Mock MCP server error
    const mcpMock = createMCPMock({
      toolName: 'get-issue',
      error: new Error('MCP server connection failed'),
    });

    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);

    // Act & Assert: Wrapper should handle error
    await expect(getIssue({ issueId: 'INVALID' })).rejects.toThrow(
      'MCP server connection failed'
    );
  });

  it('should validate input parameters', async () => {
    // Act & Assert: Wrapper should validate before calling MCP
    await expect(getIssue({ issueId: '' })).rejects.toThrow(
      'issueId is required'
    );

    // Verify MCP never called with invalid input
    expect(mcpClient.callMCPTool).not.toHaveBeenCalled();
  });

  it('should handle timeout scenarios', async () => {
    // Arrange: Mock slow MCP response
    const mcpMock = createMCPMock({
      toolName: 'get-issue',
      delay: 10000,  // 10s delay
      response: LinearResponses.issue({ id: 'ISS-123' }),
    });

    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);

    // Use fake timers for controlled timeout testing
    vi.useFakeTimers();

    // Act: Start request
    const promise = getIssue({ issueId: 'ISS-123' });

    // Fast-forward time
    await vi.advanceTimersByTimeAsync(5000);  // 5s timeout

    // Assert: Should timeout before 10s delay completes
    await expect(promise).rejects.toThrow('Request timeout');

    // Cleanup
    vi.useRealTimers();
  });
});

/**
 * Integration Test Example
 *
 * Tests with REAL MCP server (only for behavioral validation)
 * MUST be named *.integration.test.ts
 */

// FILE: get-issue.integration.test.ts
/*
import { describe, it, expect } from 'vitest';
import { getIssue } from '../wrappers/linear/get-issue';
import { isMCPAvailable } from '../config/lib/mcp-client';

describe('MCP Wrapper: getIssue (Integration)', () => {
  it('should fetch real issue from Linear MCP server', async () => {
    // Skip if MCP server not available
    if (!isMCPAvailable('linear')) {
      console.log('Skipping integration test - Linear MCP not available');
      return;
    }

    // Act: Call with REAL MCP server
    const result = await getIssue({ issueId: 'ISS-123' });

    // Assert: Verify real response structure
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('id');
    expect(result.data).toHaveProperty('title');
  }, 60000);  // 60s timeout for real MCP
});
*/

/**
 * Anti-Patterns (DO NOT DO THIS)
 */

// ❌ BAD: Mocking wrapper function instead of SDK
/*
vi.mock('../wrappers/linear/get-issue', () => ({
  getIssue: vi.fn().mockResolvedValue({ success: true }),
}));
// Problem: This tests nothing - you're mocking the thing you're testing!
*/

// ❌ BAD: No cleanup in afterEach
/*
describe('Test', () => {
  it('test', async () => {
    vi.useFakeTimers();
    // ... test logic ...
    // Problem: Timers not cleaned up, affects other tests
  });
});
*/

// ❌ BAD: Mock after import
/*
import { getIssue } from '../wrappers/linear/get-issue';
vi.mock('@modelcontextprotocol/sdk/client/index.js');
// Problem: Import happens BEFORE mock, SDK already loaded
*/

// ❌ BAD: No timeout configuration
/*
it('should fetch issue', async () => {
  const result = await getIssue({ issueId: 'ISS-123' });
  // Problem: If unmocked, this hangs for 30+ minutes
});
// Fix: Set testTimeout in vitest.config.ts
*/
