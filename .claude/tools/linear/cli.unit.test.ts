// .claude/tools/linear/cli.unit.test.ts
import { describe, it, expect, vi } from 'vitest';
import { parseCliArgs, routeOperation } from './cli.js';

describe('CLI Runner', () => {
  describe('parseCliArgs', () => {
    it('parses operation and JSON params', () => {
      const result = parseCliArgs(['create-issue', '{"title":"Test","team":"Eng"}']);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.operation).toBe('create-issue');
        expect(result.value.params).toEqual({ title: 'Test', team: 'Eng' });
      }
    });

    it('returns error for missing operation', () => {
      const result = parseCliArgs([]);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Usage:');
      }
    });

    it('returns error for invalid JSON', () => {
      const result = parseCliArgs(['create-issue', 'not-json']);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Invalid JSON');
      }
    });
  });

  describe('routeOperation', () => {
    it('routes to create-issue', async () => {
      const mockCreateIssue = vi.fn().mockResolvedValue({ success: true, issue: { id: '1' } });
      const result = await routeOperation('create-issue', { title: 'Test' }, { createIssue: mockCreateIssue });
      expect(mockCreateIssue).toHaveBeenCalledWith({ title: 'Test' });
    });

    it('returns error for unknown operation', async () => {
      const result = await routeOperation('unknown-op', {}, {});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Unknown operation');
        expect(result.error).toContain('Available operations:');
      }
    });
  });
});
