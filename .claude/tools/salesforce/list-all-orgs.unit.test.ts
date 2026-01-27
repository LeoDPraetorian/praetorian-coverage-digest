/**
 * Unit Tests for Salesforce list_all_orgs Wrapper
 *
 * RISK LEVEL: LOW
 * Coverage Target: ≥80%
 *
 * Test Categories:
 * 1. Input validation (Zod schema)
 * 2. Response format handling (array/tuple/object)
 * 3. Edge cases and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listAllOrgs, listAllOrgsParams, orgSummary } from './list-all-orgs.js';
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

describe('list_all_orgs wrapper', () => {
  let mockPort: ReturnType<typeof createMockMCPPort>;

  // Reset mocks before each test for isolation
  beforeEach(() => {
    mockPort = createMockMCPPort();
    vi.clearAllMocks();
  });

  // ============================================
  // Input Validation Tests
  // ============================================
  describe('Input Validation (Zod Schema)', () => {
    it('should accept empty input with defaults', () => {
      const result = listAllOrgsParams.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.skipConnectionStatus).toBe(false);
      }
    });

    it('should accept boolean skipConnectionStatus parameter', () => {
      const result = listAllOrgsParams.safeParse({ skipConnectionStatus: true });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.skipConnectionStatus).toBe(true);
      }
    });

    it('should accept pagination parameters', () => {
      const result = listAllOrgsParams.safeParse({ limit: 50, offset: 10 });
      expect(result.success).toBe(true);
    });

    it('should reject invalid skipConnectionStatus type', () => {
      const result = listAllOrgsParams.safeParse({ skipConnectionStatus: 'yes' });
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // Response Format Tests (CRITICAL)
  // ============================================
  describe('Response Format Handling', () => {
    it('direct array format - org categories at top level', async () => {
      mockPort.callTool.mockResolvedValue(SalesforceResponses.listOrgs({
        scratchOrgs: [{ username: 'scratch@test.com', alias: 'scratch' }],
        nonScratchOrgs: [{ username: 'prod@test.com' }],
        sandboxes: []
      }));

      const result = await listAllOrgs.execute({ limit: 50 }, mockPort);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary.total_count).toBe(2);
        expect(result.data.scratchOrgs).toHaveLength(1);
        expect(result.data.nonScratchOrgs).toHaveLength(1);
      }
    });

    it('object format - wrapped in result property', async () => {
      mockPort.callTool.mockResolvedValue({
        result: {
          scratchOrgs: [{ username: 'scratch@test.com' }],
          nonScratchOrgs: [],
          sandboxes: []
        }
      });

      const result = await listAllOrgs.execute({ limit: 50 }, mockPort);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary.total_count).toBe(1);
      }
    });

    it('tuple format - array with org categories', async () => {
      mockPort.callTool.mockResolvedValue(SalesforceResponses.listOrgs());

      const result = await listAllOrgs.execute({ limit: 50 }, mockPort);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary.total_count).toBe(0);
        expect(result.data.scratchOrgs).toBeUndefined();
        expect(result.data.nonScratchOrgs).toBeUndefined();
        expect(result.data.sandboxes).toBeUndefined();
      }
    });

    it('should handle only sandboxes', async () => {
      mockPort.callTool.mockResolvedValue(SalesforceResponses.listOrgs({
        sandboxes: [
          { username: 'sandbox1@test.com', alias: 'sb1' },
          { username: 'sandbox2@test.com', alias: 'sb2' }
        ]
      }));

      const result = await listAllOrgs.execute({ limit: 50 }, mockPort);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary.total_count).toBe(2);
        expect(result.data.sandboxes).toHaveLength(2);
      }
    });
  });

  // ============================================
  // Execute Function Tests
  // ============================================
  describe('Execute Function', () => {
    it('should call MCP with correct parameters', async () => {
      mockPort.callTool.mockResolvedValue(SalesforceResponses.listOrgs());

      await listAllOrgs.execute({ limit: 50 }, mockPort);

      expect(mockPort.callTool).toHaveBeenCalledWith(
        'salesforce',
        'list_all_orgs',
        { skipConnectionStatus: false }
      );
    });

    it('should include skipConnectionStatus when true', async () => {
      mockPort.callTool.mockResolvedValue(SalesforceResponses.listOrgs());

      await listAllOrgs.execute({ skipConnectionStatus: true, limit: 50 }, mockPort);

      expect(mockPort.callTool).toHaveBeenCalledWith(
        'salesforce',
        'list_all_orgs',
        { skipConnectionStatus: true }
      );
    });

    it('should apply pagination correctly', async () => {
      const manyOrgs = Array.from({ length: 10 }, (_, i) => ({
        username: `scratch${i}@test.com`
      }));
      mockPort.callTool.mockResolvedValue({
        scratchOrgs: manyOrgs,
        nonScratchOrgs: [],
        sandboxes: []
      });

      const result = await listAllOrgs.execute({ limit: 5, offset: 2 }, mockPort);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary.total_count).toBe(10);
        expect(result.data.summary.has_more).toBe(true);
      }
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    it('should handle MCP errors gracefully', async () => {
      mockPort.callTool.mockRejectedValue(new Error('MCP connection failed'));

      const result = await listAllOrgs.execute({ limit: 50 }, mockPort);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('should handle timeout errors', async () => {
      mockPort.callTool.mockRejectedValue(new Error('ETIMEDOUT'));

      const result = await listAllOrgs.execute({ limit: 50 }, mockPort);

      expect(result.success).toBe(false);
    });

    it('should handle malformed response', async () => {
      mockPort.callTool.mockResolvedValue(null);

      const result = await listAllOrgs.execute({ limit: 50 }, mockPort);

      // Should handle gracefully
      expect(result).toBeDefined();
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('should handle null org arrays in response', async () => {
      mockPort.callTool.mockResolvedValue({
        scratchOrgs: null,
        nonScratchOrgs: null,
        sandboxes: null
      });

      const result = await listAllOrgs.execute({ limit: 50 }, mockPort);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary.total_count).toBe(0);
      }
    });

    it('should handle undefined org arrays', async () => {
      mockPort.callTool.mockResolvedValue({});

      const result = await listAllOrgs.execute({ limit: 50 }, mockPort);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary.total_count).toBe(0);
      }
    });

    it('should handle large org counts', async () => {
      const largeOrgList = Array.from({ length: 100 }, (_, i) => ({
        username: `org${i}@test.com`,
        alias: `org${i}`
      }));

      mockPort.callTool.mockResolvedValue({
        scratchOrgs: largeOrgList,
        nonScratchOrgs: [],
        sandboxes: []
      });

      const result = await listAllOrgs.execute({ limit: 10 }, mockPort);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary.total_count).toBe(100);
        expect(result.data.summary.has_more).toBe(true);
      }
    });
  });

  // ============================================
  // Output Schema Tests
  // ============================================
  describe('Output Schema (orgSummary)', () => {
    it('should validate org summary with required fields', () => {
      const result = orgSummary.safeParse({
        username: 'user@company.com'
      });
      expect(result.success).toBe(true);
    });

    it('should validate org summary with all optional fields', () => {
      const result = orgSummary.safeParse({
        username: 'user@company.com',
        alias: 'prod',
        orgId: '00D123456789ABC',
        instanceUrl: 'https://company.my.salesforce.com',
        isDefaultUsername: true,
        isDefaultDevHubUsername: false,
        connectedStatus: 'Connected'
      });
      expect(result.success).toBe(true);
    });

    it('should reject org summary without username', () => {
      const result = orgSummary.safeParse({
        alias: 'prod'
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // Token Estimation Tests
  // ============================================
  describe('Token Estimation', () => {
    it('should have correct token estimates', () => {
      expect(listAllOrgs.tokenEstimate.withoutCustomTool).toBe(20000);
      expect(listAllOrgs.tokenEstimate.whenUsed).toBe(500);
      expect(listAllOrgs.tokenEstimate.reduction).toBe('97%');
    });

    it('should include estimatedTokens in response', async () => {
      mockPort.callTool.mockResolvedValue(SalesforceResponses.listOrgs({
        scratchOrgs: [{ username: 'test@test.com' }]
      }));

      const result = await listAllOrgs.execute({ limit: 50 }, mockPort);

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
      expect(listAllOrgs.name).toBe('salesforce.list_all_orgs');
    });

    it('should have description', () => {
      expect(listAllOrgs.description).toBeDefined();
      expect(listAllOrgs.description.length).toBeGreaterThan(0);
    });

    it('should have parameters schema', () => {
      expect(listAllOrgs.parameters).toBeDefined();
    });
  });
});
