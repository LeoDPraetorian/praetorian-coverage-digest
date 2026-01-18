// .claude/tools/linear/get-label.unit.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getLabel, getLabelParams, getLabelOutput } from './get-label';

vi.mock('./client.js', () => ({ createLinearClient: vi.fn() }));
vi.mock('./graphql-helpers.js', () => ({ executeGraphQL: vi.fn() }));

describe('getLabel', () => {
  describe('input validation', () => {
    it('should require id', () => {
      const result = getLabelParams.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept valid id', () => {
      const result = getLabelParams.safeParse({ id: 'label-uuid' });
      expect(result.success).toBe(true);
    });
  });

  describe('output validation', () => {
    it('should validate correct output', () => {
      const result = getLabelOutput.safeParse({
        label: { id: 'l1', name: 'Bug', color: '#ff0000' },
        estimatedTokens: 25
      });
      expect(result.success).toBe(true);
    });
  });

  describe('execute', () => {
    it('should call GraphQL with correct query', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      const mockClient = {};
      (createLinearClient as any).mockResolvedValue(mockClient);
      (executeGraphQL as any).mockResolvedValue({
        issueLabel: { id: 'l1', name: 'Bug', color: '#ff0000', description: null, isGroup: false, parentId: null }
      });

      const result = await getLabel.execute({ id: 'label-uuid' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('issueLabel'),
        expect.objectContaining({ id: 'label-uuid' })
      );
      expect(result.label).toBeDefined();
      expect(result.label?.id).toBe('l1');
    });
  });
});
