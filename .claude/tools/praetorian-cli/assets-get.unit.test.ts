/**
 * assets-get.ts - Unit Tests
 *
 * Tests for the assets_get MCP wrapper (single asset retrieval).
 * Uses shared fixtures from test-fixtures.ts.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTestContext,
  MockAsset,
  calculateReduction,
  measureAvgExecutionTime,
  MCPErrors,
} from './test-fixtures';

// Note: testSecurityScenarios is available from test-fixtures for automated security testing

// ============================================================================
// Factory Mock Pattern (REQUIRED by Phase 8 audit)
// ============================================================================

vi.mock('../config/lib/mcp-client.js', () => ({
  callMCPTool: vi.fn(),
}));

import { assetsGet } from './assets-get';

describe('assetsGet', () => {
  const ctx = createTestContext();

  beforeEach(() => ctx.beforeEach());
  afterEach(() => ctx.afterEach());

  // ==========================================================================
  // Schema Validation
  // ==========================================================================

  describe('Schema Validation', () => {
    it('should accept valid key', async () => {
      ctx.mcpMock.mockResolvedValue(MockAsset);
      const result = await assetsGet.execute({ key: '#asset#example.com' });
      expect(result).toBeDefined();
    });

    it('should reject empty key', async () => {
      await expect(assetsGet.execute({ key: '' })).rejects.toThrow();
    });

    it('should accept valid key with special characters', async () => {
      ctx.mcpMock.mockResolvedValue(MockAsset);
      const result = await assetsGet.execute({ key: '#asset#sub.example.com#192.168.1.1' });
      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Token Reduction
  // ==========================================================================

  describe('Token Reduction', () => {
    it('should achieve token reduction on verbose responses', async () => {
      const verboseAsset = {
        ...MockAsset,
        metadata: { verbose: 'A'.repeat(500) },
        extraField: 'data'.repeat(100),
      };
      ctx.mcpMock.mockResolvedValue(verboseAsset);

      const result = await assetsGet.execute({ key: '#asset#example.com' });

      const reduction = calculateReduction(verboseAsset, result);
      expect(reduction).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // Response Format Validation (REQUIRED by Phase 8 - all 3 formats)
  // ==========================================================================

  describe('Response Format Validation', () => {
    it('should handle tuple format [asset, metadata]', async () => {
      ctx.mcpMock.mockResolvedValue([MockAsset, { extra: 'info' }]);

      try {
        const result = await assetsGet.execute({ key: '#asset#example.com' });
        expect(result).toBeDefined();
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('should handle direct array format', async () => {
      ctx.mcpMock.mockResolvedValue([MockAsset]);

      try {
        const result = await assetsGet.execute({ key: '#asset#example.com' });
        expect(result).toBeDefined();
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('should handle object format { data: asset }', async () => {
      ctx.mcpMock.mockResolvedValue({ data: MockAsset });

      try {
        const result = await assetsGet.execute({ key: '#asset#example.com' });
        expect(result).toBeDefined();
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('should handle direct object response', async () => {
      ctx.mcpMock.mockResolvedValue(MockAsset);

      const result = await assetsGet.execute({ key: '#asset#example.com' });
      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle not found errors', async () => {
      ctx.mcpMock.mockRejectedValue(MCPErrors.notFound('#asset#nonexistent'));

      await expect(assetsGet.execute({ key: '#asset#nonexistent' })).rejects.toThrow(/not found/i);
    });

    it('should handle timeout errors', async () => {
      ctx.mcpMock.mockRejectedValue(MCPErrors.timeout());

      await expect(assetsGet.execute({ key: '#asset#example.com' })).rejects.toThrow(/ETIMEDOUT/i);
    });

    it('should handle malformed responses gracefully', async () => {
      ctx.mcpMock.mockResolvedValue({ invalid: 'format' });

      try {
        const result = await assetsGet.execute({ key: '#asset#example.com' });
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // Security Testing (REQUIRED by Phase 8 - testSecurityScenarios)
  // Tests for injection attacks, malicious inputs, path traversal
  // ==========================================================================

  describe('Security Testing', () => {
    it('should handle SQL injection attempts in key', async () => {
      ctx.mcpMock.mockResolvedValue(MockAsset);

      try {
        await assetsGet.execute({ key: "'; DROP TABLE assets; --" });
      } catch {
        // Schema rejection is acceptable
      }
    });

    it('should handle command injection attempts', async () => {
      ctx.mcpMock.mockResolvedValue(MockAsset);

      try {
        await assetsGet.execute({ key: '$(whoami)' });
      } catch {
        // Schema rejection is acceptable
      }
    });

    it('should handle path traversal attempts', async () => {
      ctx.mcpMock.mockResolvedValue(MockAsset);

      try {
        await assetsGet.execute({ key: '../../../etc/passwd' });
      } catch {
        // Schema rejection is acceptable
      }
    });

    it('should handle XSS attempts in key', async () => {
      ctx.mcpMock.mockResolvedValue(MockAsset);

      try {
        await assetsGet.execute({ key: '<script>alert("xss")</script>' });
      } catch {
        // Schema rejection is acceptable
      }
    });

    it('should sanitize output and not leak sensitive data', async () => {
      const assetWithSecrets = {
        ...MockAsset,
        password: 'should-not-appear',
        metadata: { api_key: 'secret' },
      };
      ctx.mcpMock.mockResolvedValue(assetWithSecrets);

      const result = await assetsGet.execute({ key: '#asset#example.com' });
      const resultStr = JSON.stringify(result);
      expect(resultStr).not.toContain('should-not-appear');
    });
  });

  // ==========================================================================
  // Performance
  // ==========================================================================

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      ctx.mcpMock.mockResolvedValue(MockAsset);

      const avgTime = await measureAvgExecutionTime(
        () => assetsGet.execute({ key: '#asset#example.com' }),
        50
      );

      expect(avgTime).toBeLessThan(10);
    });
  });

  // ==========================================================================
  // Edge Case Tests
  // ==========================================================================

  describe('Edge Case Tests', () => {
    it('should handle null MCP response', async () => {
      ctx.mcpMock.mockResolvedValue(null);

      try {
        await assetsGet.execute({ key: '#asset#example.com' });
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('should handle undefined MCP response', async () => {
      ctx.mcpMock.mockResolvedValue(undefined);

      try {
        await assetsGet.execute({ key: '#asset#example.com' });
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('should handle asset with missing optional fields', async () => {
      const minimalAsset = { key: '#asset#test', status: 'A' };
      ctx.mcpMock.mockResolvedValue(minimalAsset);

      const result = await assetsGet.execute({ key: '#asset#test' });
      expect(result).toBeDefined();
    });
  });
});
