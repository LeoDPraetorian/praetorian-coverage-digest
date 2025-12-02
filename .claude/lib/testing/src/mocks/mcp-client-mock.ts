/**
 * Universal MCP Client Mock Factory for Vitest
 *
 * Provides mocking utilities for testing MCP wrappers without calling real servers.
 * Used by all MCP wrapper unit tests for isolation and speed.
 */

import { vi, type Mock } from 'vitest';

export type MockResponse = any;
export type MockError = Error | string;

/**
 * Create a Vitest mock for the MCP client
 *
 * Usage:
 * ```typescript
 * import { vi } from 'vitest';
 * import { createMCPMock } from '@claude/testing';
 * import * as mcpClient from '../config/lib/mcp-client';
 *
 * // Mock the module
 * vi.mock('../config/lib/mcp-client');
 *
 * // Create mock
 * const mcpMock = createMCPMock();
 * vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
 *
 * // Configure mock responses
 * mcpMock.mockResolvedValue({ libraries: [] });
 *
 * // Your test code here
 * const result = await wrapper.execute({ input: 'test' });
 *
 * expect(mcpMock).toHaveBeenCalledTimes(1);
 * ```
 */
export function createMCPMock(): Mock<[string, string, any], Promise<any>> {
  return vi.fn<[string, string, any], Promise<any>>();
}

/**
 * Create a mock that simulates realistic MCP server behavior
 *
 * Useful for testing how wrappers handle different MCP response patterns.
 *
 * Usage:
 * ```typescript
 * const mcpMock = createMCPServerMock({
 *   delay: 100,              // 100ms network delay
 *   rateLimit: { calls: 10, perMinute: 60 },
 *   failureRate: 0.1         // 10% random failures
 * });
 * ```
 */
export function createMCPServerMock(config: {
  delay?: number;
  rateLimit?: { calls: number; perMinute: number };
  failureRate?: number; // 0-1, probability of random failures
}) {
  let callCount = 0;
  const startTime = Date.now();

  return vi.fn<[string, string, any], Promise<any>>(async (mcpName, toolName, params) => {
    callCount++;

    // Simulate rate limiting
    if (config.rateLimit) {
      const elapsed = (Date.now() - startTime) / 60000; // minutes
      const rate = callCount / (elapsed || 1);

      if (rate > config.rateLimit.perMinute) {
        throw new Error(
          'Rate limited due to too many requests. You can create a free API key at https://context7.com/dashboard for higher rate limits.'
        );
      }
    }

    // Simulate random failures
    if (config.failureRate && Math.random() < config.failureRate) {
      throw new Error('MCP server internal error');
    }

    // Simulate network delay
    if (config.delay) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }

    // Return empty response by default
    return {};
  });
}

/**
 * Error factory for common MCP server errors
 */
export const MCPErrors = {
  rateLimit: () => new Error('Rate limited due to too many requests'),
  serverError: () => new Error('MCP server internal error'),
  timeout: () => new Error('ETIMEDOUT'),
  notFound: (resource: string) => new Error(`Resource not found: ${resource}`),
  unauthorized: () => new Error('Authentication required'),
  invalidResponse: () => new Error('Invalid response format from MCP server'),
  networkError: () => new Error('Network error: ECONNREFUSED'),
  badRequest: (message: string) => new Error(`Bad request: ${message}`),
};

/**
 * Helper to setup MCP mock with common patterns
 *
 * Usage:
 * ```typescript
 * const mcpMock = setupMCPMock({
 *   'context7': {
 *     'resolve-library-id': { libraries: [] },
 *     'get-library-docs': { documentation: 'Test docs', libraryId: '/test' }
 *   },
 *   'linear': {
 *     'get-issue': { id: '1', identifier: 'TEST-1', title: 'Test Issue' }
 *   }
 * });
 * ```
 */
export function setupMCPMock(
  responses: Record<string, Record<string, any>>
): Mock<[string, string, any], Promise<any>> {
  return vi.fn<[string, string, any], Promise<any>>((mcpName, toolName, params) => {
    const mcpResponses = responses[mcpName];
    if (!mcpResponses) {
      throw new Error(`No mock configured for MCP: ${mcpName}`);
    }

    const response = mcpResponses[toolName];
    if (!response) {
      throw new Error(`No mock configured for tool: ${mcpName}.${toolName}`);
    }

    // If response is a function, call it with params
    if (typeof response === 'function') {
      return Promise.resolve(response(params));
    }

    return Promise.resolve(response);
  });
}

/**
 * Spy on MCP calls without mocking responses
 *
 * Useful for integration tests where you want to verify calls but not mock responses.
 *
 * Usage:
 * ```typescript
 * const spy = spyOnMCPCalls();
 *
 * // Run your code
 * await wrapper.execute({ input: 'test' });
 *
 * // Verify calls
 * expect(spy).toHaveBeenCalledWith('context7', 'resolve-library-id', expect.any(Object));
 * expect(spy).toHaveBeenCalledTimes(1);
 *
 * // Get call history
 * const calls = spy.mock.calls;
 * ```
 */
export function spyOnMCPCalls(): Mock<[string, string, any], Promise<any>> {
  return vi.fn<[string, string, any], Promise<any>>();
}
