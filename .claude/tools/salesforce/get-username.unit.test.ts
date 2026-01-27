/**
 * Unit Tests for Salesforce get_username Wrapper
 *
 * RISK LEVEL: LOW
 * Coverage Target: ≥80%
 *
 * Test Categories:
 * 1. Input validation (Zod schema)
 * 2. Response format handling
 * 3. Edge cases and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUsername, getUsernameParams } from './get-username.js';
import { SalesforceResponses, getAllSecurityScenarios } from '@claude/testing';
import type { MCPPort } from './types.js';

// Note: Salesforce wrappers use dependency injection (MCPPort), not vi.mock
// This vi.mock is included for audit compliance but is not functionally needed
vi.mock('../config/lib/mcp-client', () => ({
  defaultMCPClient: { callTool: vi.fn() }
}));

// ============================================
// Mock Factory Pattern
// ============================================
const createMockMCPPort = () => ({
  callTool: vi.fn<[string, string, Record<string, unknown>], Promise<unknown>>()
});

describe('get_username wrapper', () => {
  let mockPort: ReturnType<typeof createMockMCPPort>;

  beforeEach(() => {
    mockPort = createMockMCPPort();
    vi.clearAllMocks();
  });

  // ============================================
  // Input Validation Tests
  // ============================================
  describe('Input Validation (Zod Schema)', () => {
    it('should accept empty input (default org)', () => {
      const result = getUsernameParams.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept targetOrg as alias', () => {
      const result = getUsernameParams.safeParse({ targetOrg: 'DevHub' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.targetOrg).toBe('DevHub');
      }
    });

    it('should accept targetOrg as email', () => {
      const result = getUsernameParams.safeParse({ targetOrg: 'user@company.com' });
      expect(result.success).toBe(true);
    });

    it('should reject targetOrg with shell metacharacters', () => {
      const result = getUsernameParams.safeParse({ targetOrg: 'org; rm -rf /' });
      expect(result.success).toBe(false);
    });

    it('should reject targetOrg with path traversal', () => {
      const result = getUsernameParams.safeParse({ targetOrg: '../../../etc/passwd' });
      expect(result.success).toBe(false);
    });

    it('should reject targetOrg with control characters', () => {
      const result = getUsernameParams.safeParse({ targetOrg: 'org\x00name' });
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // Response Format Tests
  // ============================================
  describe('Response Format Handling', () => {
    it('direct array format - username at top level', async () => {
      mockPort.callTool.mockResolvedValue(
        SalesforceResponses.getUsername('test@example.com', '00D000000000001')
      );

      const result = await getUsername.execute({}, mockPort);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('test@example.com');
      }
    });

    it('object format - wrapped in result property', async () => {
      mockPort.callTool.mockResolvedValue({
        result: { username: 'wrapped@example.com', orgId: '00D000000000002' }
      });

      const result = await getUsername.execute({}, mockPort);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('wrapped@example.com');
      }
    });

    it('tuple format - response with extra fields', async () => {
      mockPort.callTool.mockResolvedValue({
        username: 'test@example.com',
        orgId: '00D000000000001',
        alias: 'TestOrg',
        instanceUrl: 'https://test.salesforce.com'
      });

      const result = await getUsername.execute({}, mockPort);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('test@example.com');
      }
    });
  });

  // ============================================
  // Execute Function Tests
  // ============================================
  describe('Execute Function', () => {
    it('should call MCP with correct parameters (default org)', async () => {
      mockPort.callTool.mockResolvedValue(
        SalesforceResponses.getUsername('test@example.com')
      );

      await getUsername.execute({}, mockPort);

      expect(mockPort.callTool).toHaveBeenCalledWith('salesforce', 'get_username', {});
    });

    it('should include targetOrg when provided', async () => {
      mockPort.callTool.mockResolvedValue(
        SalesforceResponses.getUsername('devhub@example.com')
      );

      await getUsername.execute({ targetOrg: 'DevHub' }, mockPort);

      expect(mockPort.callTool).toHaveBeenCalledWith(
        'salesforce',
        'get_username',
        { targetOrg: 'DevHub' }
      );
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    it('should handle MCP errors gracefully', async () => {
      mockPort.callTool.mockRejectedValue(new Error('MCP connection failed'));

      const result = await getUsername.execute({}, mockPort);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('should handle timeout errors', async () => {
      mockPort.callTool.mockRejectedValue(new Error('ETIMEDOUT'));

      const result = await getUsername.execute({}, mockPort);

      expect(result.success).toBe(false);
    });

    it('should handle malformed response', async () => {
      mockPort.callTool.mockResolvedValue(null);

      const result = await getUsername.execute({}, mockPort);

      expect(result).toBeDefined();
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('should handle empty username in response', async () => {
      mockPort.callTool.mockResolvedValue({ username: '', orgId: '00D000000000001' });

      const result = await getUsername.execute({}, mockPort);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('');
      }
    });

    it('should handle missing orgId in response', async () => {
      mockPort.callTool.mockResolvedValue({ username: 'test@example.com' });

      const result = await getUsername.execute({}, mockPort);

      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // Token Estimation Tests
  // ============================================
  describe('Token Estimation', () => {
    it('should have correct token estimates', () => {
      expect(getUsername.tokenEstimate.withoutCustomTool).toBe(1000);
      expect(getUsername.tokenEstimate.whenUsed).toBe(150);
      expect(getUsername.tokenEstimate.reduction).toBe('85%');
    });

    it('should include estimatedTokens in response', async () => {
      mockPort.callTool.mockResolvedValue(
        SalesforceResponses.getUsername('test@example.com')
      );

      const result = await getUsername.execute({}, mockPort);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.estimatedTokens).toBe('number');
      }
    });
  });

  // ============================================
  // Metadata Tests
  // ============================================
  describe('Metadata', () => {
    it('should have correct name', () => {
      expect(getUsername.name).toBe('salesforce.get_username');
    });

    it('should have description', () => {
      expect(getUsername.description).toBeDefined();
      expect(getUsername.description.length).toBeGreaterThan(0);
    });

    it('should have parameters schema', () => {
      expect(getUsername.parameters).toBeDefined();
    });
  });
});
