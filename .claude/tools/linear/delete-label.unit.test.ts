// .claude/tools/linear/delete-label.unit.test.ts
import { describe, it, expect, vi } from 'vitest';
import { deleteLabel, deleteLabelParams, deleteLabelOutput } from './delete-label';

vi.mock('./client.js', () => ({ createLinearClient: vi.fn() }));
vi.mock('./graphql-helpers.js', () => ({ executeGraphQL: vi.fn() }));

describe('deleteLabel', () => {
  describe('input validation', () => {
    it('should require id', () => {
      const result = deleteLabelParams.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept valid id', () => {
      const result = deleteLabelParams.safeParse({ id: 'label-uuid' });
      expect(result.success).toBe(true);
    });

    it('should reject control characters in id', () => {
      const result = deleteLabelParams.safeParse({ id: 'label\x00id' });
      expect(result.success).toBe(false);
    });
  });

  describe('output validation', () => {
    it('should validate success response', () => {
      const result = deleteLabelOutput.safeParse({
        success: true,
        estimatedTokens: 10
      });
      expect(result.success).toBe(true);
    });
  });
});
