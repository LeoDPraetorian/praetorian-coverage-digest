/**
 * Tests for MCP Client Infrastructure
 *
 * Tests the shared MCP client functionality including:
 * - Timeout handling
 * - Error propagation
 * - Connection management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the MCP SDK before importing
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    callTool: vi.fn(),
    close: vi.fn(),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn(),
}));


vi.mock('../../../lib/find-project-root.js', () => ({
  resolveProjectPath: vi.fn().mockReturnValue('/mock/path'),
  findProjectRoot: vi.fn().mockReturnValue('/mock/project/root'),
}));

// Mock the secrets provider to return credentials successfully
vi.mock('./secrets-provider.js', () => ({
  getDefaultSecretsProvider: vi.fn(() => ({
    name: 'mock-provider',
    getSecret: vi.fn().mockResolvedValue({ ok: true, value: 'mock-api-key' }),
  })),
}));

import {
  callMCPTool,
  getMCPServerConfig,
  DEFAULT_MCP_TIMEOUT_MS,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY_MS,
  DEFAULT_RETRYABLE_ERRORS,
  DEFAULT_MAX_RESPONSE_BYTES,
  ResponseTooLargeError,
  MCPCallOptions
} from './mcp-client';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('MCP Client', () => {
  let mockClient: {
    connect: ReturnType<typeof vi.fn>;
    callTool: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();


    // Set up mock client instance
    mockClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      callTool: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"result": "success"}' }],
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(Client).mockImplementation(() => mockClient as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Timeout Configuration', () => {
    it('should export default timeout constant', () => {
      expect(DEFAULT_MCP_TIMEOUT_MS).toBe(30_000);
    });

    it('should use default timeout when not specified', async () => {
      await callMCPTool('context7', 'get-library-docs', { id: 'test' });

      expect(mockClient.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.callTool).toHaveBeenCalledTimes(1);
    });

    it('should accept custom timeout option', async () => {
      await callMCPTool('context7', 'get-library-docs', { id: 'test' }, { timeoutMs: 60000 });

      expect(mockClient.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.callTool).toHaveBeenCalledTimes(1);
    });
  });

  describe('Timeout Behavior', () => {
    it('should timeout on slow connect', async () => {
      // Mock a slow connection (takes longer than timeout)
      mockClient.connect.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 200))
      );

      await expect(
        callMCPTool('context7', 'test-tool', {}, { timeoutMs: 50, maxRetries: 0 })
      ).rejects.toThrow(/timed out/);
    });

    it('should timeout on slow tool call', async () => {
      // Fast connect, slow tool call
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.callTool.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          content: [{ type: 'text', text: '{}' }],
        }), 200))
      );

      await expect(
        callMCPTool('context7', 'test-tool', {}, { timeoutMs: 50, maxRetries: 0 })
      ).rejects.toThrow(/timed out/);
    });

    it('should include timeout duration in error message', async () => {
      mockClient.connect.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 200))
      );

      await expect(
        callMCPTool('context7', 'test-tool', {}, { timeoutMs: 50, maxRetries: 0 })
      ).rejects.toThrow(/50ms/);
    });

    it('should include operation name in timeout error', async () => {
      mockClient.connect.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 200))
      );

      await expect(
        callMCPTool('context7', 'test-tool', {}, { timeoutMs: 50, maxRetries: 0 })
      ).rejects.toThrow(/connect to context7/);
    });

    it('should succeed when operation completes before timeout', async () => {
      // Fast operations
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: '{"data": "success"}' }],
      });

      const result = await callMCPTool('context7', 'test-tool', {}, { timeoutMs: 1000 });

      expect(result).toEqual({ data: 'success' });
    });
  });

  describe('Connection Cleanup', () => {
    it('should close connection after successful call', async () => {
      await callMCPTool('context7', 'test-tool', {});

      expect(mockClient.close).toHaveBeenCalledTimes(1);
    });

    it('should close connection after timeout error', async () => {
      mockClient.connect.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 200))
      );

      try {
        await callMCPTool('context7', 'test-tool', {}, { timeoutMs: 50, maxRetries: 0 });
      } catch {
        // Expected to throw
      }

      // close should be called in finally block
      expect(mockClient.close).toHaveBeenCalledTimes(1);
    });

    it('should handle close errors gracefully', async () => {
      mockClient.close.mockRejectedValue(new Error('Close failed'));

      // Should not throw even if close fails
      const result = await callMCPTool('context7', 'test-tool', {});

      expect(result).toEqual({ result: 'success' });
    });
  });

  describe('Response Parsing', () => {
    it('should parse JSON responses', async () => {
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: '{"id": 123, "name": "test"}' }],
      });

      const result = await callMCPTool('context7', 'test-tool', {});

      expect(result).toEqual({ id: 123, name: 'test' });
    });

    it('should return plain text for non-JSON responses', async () => {
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: 'Plain text response' }],
      });

      const result = await callMCPTool('context7', 'test-tool', {});

      expect(result).toBe('Plain text response');
    });

    it('should throw on empty content', async () => {
      mockClient.callTool.mockResolvedValue({
        content: [],
      });

      await expect(
        callMCPTool('context7', 'test-tool', {})
      ).rejects.toThrow(/returned no content/);
    });

    it('should throw on non-text content type', async () => {
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'image', data: 'base64...' }],
      });

      await expect(
        callMCPTool('context7', 'test-tool', {})
      ).rejects.toThrow(/non-text content/);
    });
  });

  describe('Error Handling', () => {
    it('should include MCP name in error message', async () => {
      mockClient.connect.mockRejectedValue(new Error('Connection refused'));

      await expect(
        callMCPTool('linear', 'get-issue', { id: '123' })
      ).rejects.toThrow(/MCP: linear/);
    });

    it('should include tool name in error message', async () => {
      mockClient.connect.mockRejectedValue(new Error('Connection refused'));

      await expect(
        callMCPTool('linear', 'get-issue', { id: '123' })
      ).rejects.toThrow(/Tool: get-issue/);
    });

    it('should include params in error message', async () => {
      mockClient.connect.mockRejectedValue(new Error('Connection refused'));

      await expect(
        callMCPTool('linear', 'get-issue', { issueId: 'ENG-123' })
      ).rejects.toThrow(/issueId.*ENG-123/);
    });
  });

  describe('Retry Configuration', () => {
    it('should export default retry constants', () => {
      expect(DEFAULT_MAX_RETRIES).toBe(3);
      expect(DEFAULT_RETRY_DELAY_MS).toBe(1000);
      expect(DEFAULT_RETRYABLE_ERRORS).toContain('ETIMEDOUT');
      expect(DEFAULT_RETRYABLE_ERRORS).toContain('ECONNREFUSED');
      expect(DEFAULT_RETRYABLE_ERRORS).toContain('ECONNRESET');
      expect(DEFAULT_RETRYABLE_ERRORS).toContain('timed out');
    });
  });

  describe('Retry Behavior', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      // Enable debug logging for retry attempts
      process.env.MCP_DEBUG = '1';
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      delete process.env.MCP_DEBUG;
    });

    it('should retry on timed out error', async () => {
      let callCount = 0;
      mockClient.connect.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('MCP operation timed out'));
        }
        return Promise.resolve(undefined);
      });
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: '{"success": true}' }],
      });

      const result = await callMCPTool('context7', 'test-tool', {}, {
        maxRetries: 3,
        retryDelayMs: 10, // Fast for testing
      });

      expect(result).toEqual({ success: true });
      expect(callCount).toBe(3);
    });

    it('should retry on ECONNREFUSED error', async () => {
      let callCount = 0;
      mockClient.connect.mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          return Promise.reject(new Error('ECONNREFUSED: Connection refused'));
        }
        return Promise.resolve(undefined);
      });
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: '{"success": true}' }],
      });

      const result = await callMCPTool('context7', 'test-tool', {}, {
        maxRetries: 3,
        retryDelayMs: 10,
      });

      expect(result).toEqual({ success: true });
      expect(callCount).toBe(2);
    });

    it('should retry on ECONNRESET error', async () => {
      let callCount = 0;
      mockClient.connect.mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          return Promise.reject(new Error('ECONNRESET: Connection reset'));
        }
        return Promise.resolve(undefined);
      });
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: '{"success": true}' }],
      });

      const result = await callMCPTool('context7', 'test-tool', {}, {
        maxRetries: 3,
        retryDelayMs: 10,
      });

      expect(result).toEqual({ success: true });
      expect(callCount).toBe(2);
    });

    it('should NOT retry on authentication error', async () => {
      let callCount = 0;
      mockClient.connect.mockImplementation(() => {
        callCount++;
        return Promise.reject(new Error('Authentication failed: Invalid API key'));
      });

      await expect(
        callMCPTool('context7', 'test-tool', {}, {
          maxRetries: 3,
          retryDelayMs: 10,
        })
      ).rejects.toThrow(/Authentication failed/);

      expect(callCount).toBe(1); // No retries for auth errors
    });

    it('should NOT retry on validation error', async () => {
      let callCount = 0;
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.callTool.mockImplementation(() => {
        callCount++;
        return Promise.reject(new Error('Validation error: Missing required field'));
      });

      await expect(
        callMCPTool('context7', 'test-tool', {}, {
          maxRetries: 3,
          retryDelayMs: 10,
        })
      ).rejects.toThrow(/Validation error/);

      expect(callCount).toBe(1); // No retries for validation errors
    });

    it('should stop after maxRetries attempts', async () => {
      let callCount = 0;
      mockClient.connect.mockImplementation(() => {
        callCount++;
        return Promise.reject(new Error('ETIMEDOUT: Connection timed out'));
      });

      await expect(
        callMCPTool('context7', 'test-tool', {}, {
          maxRetries: 2,
          retryDelayMs: 10,
        })
      ).rejects.toThrow(/ETIMEDOUT/);

      expect(callCount).toBe(3); // Initial + 2 retries
    });

    it('should succeed if retry succeeds', async () => {
      let callCount = 0;
      mockClient.connect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('ECONNREFUSED'));
        }
        return Promise.resolve(undefined);
      });
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: '{"recovered": true}' }],
      });

      const result = await callMCPTool('context7', 'test-tool', {}, {
        maxRetries: 3,
        retryDelayMs: 10,
      });

      expect(result).toEqual({ recovered: true });
    });

    it('should include retry count in final error message', async () => {
      mockClient.connect.mockRejectedValue(new Error('ECONNRESET'));

      await expect(
        callMCPTool('context7', 'test-tool', {}, {
          maxRetries: 2,
          retryDelayMs: 10,
        })
      ).rejects.toThrow(/Retries: 2\/2/);
    });

    it('should respect custom maxRetries option', async () => {
      let callCount = 0;
      mockClient.connect.mockImplementation(() => {
        callCount++;
        return Promise.reject(new Error('timed out'));
      });

      await expect(
        callMCPTool('context7', 'test-tool', {}, {
          maxRetries: 5,
          retryDelayMs: 10,
        })
      ).rejects.toThrow();

      expect(callCount).toBe(6); // Initial + 5 retries
    });

    it('should log retry attempts', async () => {
      let callCount = 0;
      mockClient.connect.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('timed out'));
        }
        return Promise.resolve(undefined);
      });
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: '{}' }],
      });

      await callMCPTool('context7', 'test-tool', {}, {
        maxRetries: 3,
        retryDelayMs: 10,
      });

      // Check that retry logs were output via mcpLog.info (which uses console.log in debug mode)
      const retryCalls = consoleSpy.mock.calls.filter(
        call => call.some(arg => typeof arg === 'string' && arg.includes('Retry'))
      );
      expect(retryCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('should not retry when maxRetries is 0', async () => {
      let callCount = 0;
      mockClient.connect.mockImplementation(() => {
        callCount++;
        return Promise.reject(new Error('timed out'));
      });

      await expect(
        callMCPTool('context7', 'test-tool', {}, {
          maxRetries: 0,
          retryDelayMs: 10,
        })
      ).rejects.toThrow();

      expect(callCount).toBe(1); // Only initial attempt, no retries
    });

    it('should respect custom retryableErrors option', async () => {
      let callCount = 0;
      mockClient.connect.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('CUSTOM_ERROR: Something custom'));
        }
        return Promise.resolve(undefined);
      });
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: '{}' }],
      });

      // Should retry on custom error when specified
      await callMCPTool('context7', 'test-tool', {}, {
        maxRetries: 3,
        retryDelayMs: 10,
        retryableErrors: ['CUSTOM_ERROR'],
      });

      expect(callCount).toBe(3);
    });
  });

  describe('Response Size Limits', () => {
    it('should export default max response bytes constant', () => {
      expect(DEFAULT_MAX_RESPONSE_BYTES).toBe(1_000_000);
    });

    it('should accept responses under maxResponseBytes', async () => {
      const smallResponse = JSON.stringify({ data: 'small' });
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: smallResponse }],
      });

      const result = await callMCPTool('context7', 'test-tool', {}, {
        maxRetries: 0,
        maxResponseBytes: 1000,
      });

      expect(result).toEqual({ data: 'small' });
    });

    it('should throw ResponseTooLargeError when response exceeds limit', async () => {
      const largeResponse = 'x'.repeat(1001);
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: largeResponse }],
      });

      await expect(
        callMCPTool('context7', 'test-tool', {}, {
          maxRetries: 0,
          maxResponseBytes: 1000,
        })
      ).rejects.toThrow(ResponseTooLargeError);
    });

    it('should include actual and max bytes in error', async () => {
      const largeResponse = 'x'.repeat(1500);
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: largeResponse }],
      });

      await expect(
        callMCPTool('context7', 'test-tool', {}, {
          maxRetries: 0,
          maxResponseBytes: 1000,
        })
      ).rejects.toThrow(/1,500 bytes.*1,000 bytes/);
    });

    it('should log warning at 80% threshold', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // Enable debug logging to see warnings
      process.env.MCP_DEBUG = '1';

      const response80Percent = 'x'.repeat(850); // 85% of 1000
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: response80Percent }],
      });

      await callMCPTool('context7', 'test-tool', {}, {
        maxRetries: 0,
        maxResponseBytes: 1000,
      });

      // mcpLog.warn logs to console.warn when MCP_DEBUG=1
      expect(warnSpy).toHaveBeenCalled();
      const warnCalls = warnSpy.mock.calls.filter(
        call => call.some(arg => typeof arg === 'string' && arg.includes('approaching limit'))
      );
      expect(warnCalls.length).toBeGreaterThan(0);

      warnSpy.mockRestore();
      delete process.env.MCP_DEBUG;
    });

    it('should NOT log warning below 80% threshold', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // Enable debug logging to verify it doesn't warn below threshold
      process.env.MCP_DEBUG = '1';

      const response70Percent = 'x'.repeat(700); // 70% of 1000
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: response70Percent }],
      });

      await callMCPTool('context7', 'test-tool', {}, {
        maxRetries: 0,
        maxResponseBytes: 1000,
      });

      // Should not warn at 70%
      const warnCalls = warnSpy.mock.calls.filter(
        call => call.some(arg => typeof arg === 'string' && arg.includes('approaching limit'))
      );
      expect(warnCalls.length).toBe(0);

      warnSpy.mockRestore();
      delete process.env.MCP_DEBUG;
    });

    it('should use default 1MB limit when not specified', async () => {
      // Response of exactly 1MB should pass
      const exactlyOneMB = 'x'.repeat(1_000_000);
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: exactlyOneMB }],
      });

      // Should not throw (exactly at limit is allowed in our check)
      const result = await callMCPTool('context7', 'test-tool', {}, { maxRetries: 0 });
      expect(result).toBe(exactlyOneMB);
    });

    it('should respect custom maxResponseBytes option', async () => {
      const response = 'x'.repeat(500);
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: response }],
      });

      // Custom limit of 100 bytes should reject 500 byte response
      await expect(
        callMCPTool('context7', 'test-tool', {}, {
          maxRetries: 0,
          maxResponseBytes: 100,
        })
      ).rejects.toThrow(ResponseTooLargeError);
    });

    it('should include MCP and tool name in ResponseTooLargeError', async () => {
      const largeResponse = 'x'.repeat(200);
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: largeResponse }],
      });

      await expect(
        callMCPTool('context7', 'my-tool', {}, {
          maxRetries: 0,
          maxResponseBytes: 100,
        })
      ).rejects.toThrow(/MCP: context7/);
    });
  });

  describe('Audit Logging', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;
    const originalAuditEnv = process.env.AUDIT_MCP_CALLS;
    const originalDebugEnv = process.env.MCP_DEBUG;
    const originalDebugLevelEnv = process.env.MCP_DEBUG_LEVEL;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      // Audit logging requires THREE env vars:
      // - AUDIT_MCP_CALLS=true enables audit events
      // - MCP_DEBUG=1 enables mcpLog.debug() to check shouldLog
      // - MCP_DEBUG_LEVEL=debug enables debug level logging
      process.env.MCP_DEBUG = '1';
      process.env.MCP_DEBUG_LEVEL = 'debug';
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      if (originalAuditEnv !== undefined) {
        process.env.AUDIT_MCP_CALLS = originalAuditEnv;
      } else {
        delete process.env.AUDIT_MCP_CALLS;
      }
      if (originalDebugEnv !== undefined) {
        process.env.MCP_DEBUG = originalDebugEnv;
      } else {
        delete process.env.MCP_DEBUG;
      }
      if (originalDebugLevelEnv !== undefined) {
        process.env.MCP_DEBUG_LEVEL = originalDebugLevelEnv;
      } else {
        delete process.env.MCP_DEBUG_LEVEL;
      }
    });

    it('should log credential access when AUDIT_MCP_CALLS=true', async () => {
      process.env.AUDIT_MCP_CALLS = 'true';

      await callMCPTool('context7', 'test-tool', {}, { maxRetries: 0 });

      // mcpLog.debug() logs as: console.log('[MCP]', '[DEBUG]', ...message)
      const auditCalls = consoleSpy.mock.calls.filter(
        call => call.some(arg => typeof arg === 'string' && arg.includes('[AUDIT]'))
      );
      expect(auditCalls.length).toBeGreaterThan(0);
      expect(auditCalls.some(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('credential_access'))
      )).toBe(true);
    });

    it('should log MCP call start when AUDIT_MCP_CALLS=true', async () => {
      process.env.AUDIT_MCP_CALLS = 'true';

      await callMCPTool('context7', 'test-tool', {}, { maxRetries: 0 });

      const auditCalls = consoleSpy.mock.calls.filter(
        call => call.some(arg => typeof arg === 'string' && arg.includes('[AUDIT]'))
      );
      const startCall = auditCalls.find(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('mcp_call_start'))
      );
      expect(startCall).toBeDefined();
      expect(startCall?.some(arg => typeof arg === 'string' && arg.includes('mcpName=context7'))).toBe(true);
      expect(startCall?.some(arg => typeof arg === 'string' && arg.includes('toolName=test-tool'))).toBe(true);
    });

    it('should log MCP call success with duration', async () => {
      process.env.AUDIT_MCP_CALLS = 'true';

      await callMCPTool('context7', 'test-tool', {}, { maxRetries: 0 });

      const auditCalls = consoleSpy.mock.calls.filter(
        call => call.some(arg => typeof arg === 'string' && arg.includes('[AUDIT]'))
      );
      const successCall = auditCalls.find(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('mcp_call_success'))
      );
      expect(successCall).toBeDefined();
      expect(successCall?.some(arg => typeof arg === 'string' && arg.includes('success=true'))).toBe(true);
      expect(successCall?.some(arg => typeof arg === 'string' && arg.includes('durationMs='))).toBe(true);
    });

    it('should log MCP call error on failure', async () => {
      process.env.AUDIT_MCP_CALLS = 'true';
      mockClient.connect.mockRejectedValue(new Error('Connection failed'));

      try {
        await callMCPTool('context7', 'test-tool', {}, { maxRetries: 0 });
      } catch {
        // Expected to throw
      }

      const auditCalls = consoleSpy.mock.calls.filter(
        call => call.some(arg => typeof arg === 'string' && arg.includes('[AUDIT]'))
      );
      const errorCall = auditCalls.find(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('mcp_call_error'))
      );
      expect(errorCall).toBeDefined();
      expect(errorCall?.some(arg => typeof arg === 'string' && arg.includes('success=false'))).toBe(true);
    });

    it('should NOT log when AUDIT_MCP_CALLS is not set', async () => {
      delete process.env.AUDIT_MCP_CALLS;

      await callMCPTool('context7', 'test-tool', {}, { maxRetries: 0 });

      // console.log should NOT have been called with [AUDIT]
      const auditCalls = consoleSpy.mock.calls.filter(
        call => call.some(arg => typeof arg === 'string' && arg.includes('[AUDIT]'))
      );
      expect(auditCalls.length).toBe(0);
    });

    it('should include timestamp in audit logs', async () => {
      process.env.AUDIT_MCP_CALLS = 'true';

      await callMCPTool('context7', 'test-tool', {}, { maxRetries: 0 });

      // Check for ISO timestamp pattern in audit logs
      const auditCalls = consoleSpy.mock.calls.filter(
        call => call.some(arg => typeof arg === 'string' && arg.includes('[AUDIT]'))
      );
      expect(auditCalls.length).toBeGreaterThan(0);
      const hasTimestamp = auditCalls.some(call =>
        call.some(arg => typeof arg === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(arg))
      );
      expect(hasTimestamp).toBe(true);
    });
  });

  describe('getMCPServerConfig', () => {
    describe('praetorian-cli account parameter', () => {
      const originalAccount = process.env.PRAETORIAN_ACCOUNT;
      const originalProfile = process.env.PRAETORIAN_PROFILE;

      afterEach(() => {
        // Restore environment
        if (originalAccount !== undefined) {
          process.env.PRAETORIAN_ACCOUNT = originalAccount;
        } else {
          delete process.env.PRAETORIAN_ACCOUNT;
        }
        if (originalProfile !== undefined) {
          process.env.PRAETORIAN_PROFILE = originalProfile;
        } else {
          delete process.env.PRAETORIAN_PROFILE;
        }
      });

      it('should NOT include --account when PRAETORIAN_ACCOUNT is not set', () => {
        delete process.env.PRAETORIAN_ACCOUNT;
        process.env.PRAETORIAN_PROFILE = 'test-profile';

        const config = getMCPServerConfig('praetorian-cli');

        expect(config.command).toBe('praetorian');
        expect(config.args).not.toContain('--account');
        expect(config.args).toContain('--profile');
        expect(config.args).toContain('test-profile');
        expect(config.args).toContain('chariot');
        expect(config.args).toContain('agent');
        expect(config.args).toContain('mcp');
        expect(config.args).toContain('start');
      });

      it('should include --account before chariot subcommand when PRAETORIAN_ACCOUNT is set', () => {
        process.env.PRAETORIAN_ACCOUNT = 'customer-acme';
        process.env.PRAETORIAN_PROFILE = 'test-profile';

        const config = getMCPServerConfig('praetorian-cli');

        expect(config.command).toBe('praetorian');
        expect(config.args).toContain('--account');
        expect(config.args).toContain('customer-acme');

        // Verify --account comes before 'chariot' subcommand
        const accountIndex = config.args.indexOf('--account');
        const chariotIndex = config.args.indexOf('chariot');
        expect(accountIndex).toBeLessThan(chariotIndex);
        expect(accountIndex).toBeGreaterThanOrEqual(0);
      });

      it('should NOT include --account when PRAETORIAN_ACCOUNT is empty string', () => {
        process.env.PRAETORIAN_ACCOUNT = '';
        process.env.PRAETORIAN_PROFILE = 'test-profile';

        const config = getMCPServerConfig('praetorian-cli');

        expect(config.args).not.toContain('--account');
      });

      it('should handle special characters in PRAETORIAN_ACCOUNT', () => {
        process.env.PRAETORIAN_ACCOUNT = 'customer-with-dashes_and_underscores';
        process.env.PRAETORIAN_PROFILE = 'test-profile';

        const config = getMCPServerConfig('praetorian-cli');

        expect(config.args).toContain('--account');
        expect(config.args).toContain('customer-with-dashes_and_underscores');
      });

      it('should use default profile when PRAETORIAN_PROFILE is not set', () => {
        delete process.env.PRAETORIAN_ACCOUNT;
        delete process.env.PRAETORIAN_PROFILE;

        const config = getMCPServerConfig('praetorian-cli');

        expect(config.args).toContain('--profile');
        expect(config.args).toContain('demo');
      });

      it('should construct correct full command with account', () => {
        process.env.PRAETORIAN_ACCOUNT = 'intel';
        process.env.PRAETORIAN_PROFILE = 'production';

        const config = getMCPServerConfig('praetorian-cli');

        // Expected: ['--account', 'intel', '--profile', 'production', 'chariot', 'agent', 'mcp', 'start']
        expect(config.args).toEqual([
          '--account', 'intel',
          '--profile', 'production',
          'chariot', 'agent', 'mcp', 'start'
        ]);
      });

      it('should construct correct full command without account', () => {
        delete process.env.PRAETORIAN_ACCOUNT;
        process.env.PRAETORIAN_PROFILE = 'production';

        const config = getMCPServerConfig('praetorian-cli');

        // Expected: ['--profile', 'production', 'chariot', 'agent', 'mcp', 'start']
        expect(config.args).toEqual([
          '--profile', 'production',
          'chariot', 'agent', 'mcp', 'start'
        ]);
      });
    });

    describe('error handling', () => {
      it('should throw error for unknown MCP server', () => {
        expect(() => getMCPServerConfig('unknown-mcp')).toThrow(/not configured/);
      });

      it('should include available servers in error message', () => {
        expect(() => getMCPServerConfig('unknown-mcp')).toThrow(/Available:/);
      });
    });
  });
});
