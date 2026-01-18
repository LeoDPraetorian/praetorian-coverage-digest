// .claude/tools/linear/update-label.unit.test.ts
import { describe, it, expect, vi } from 'vitest';
import { updateLabel, updateLabelParams, updateLabelOutput } from './update-label';

vi.mock('./client.js', () => ({ createLinearClient: vi.fn() }));
vi.mock('./graphql-helpers.js', () => ({ executeGraphQL: vi.fn() }));

describe('updateLabel', () => {
  describe('input validation', () => {
    it('should require id', () => {
      const result = updateLabelParams.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept id and optional fields', () => {
      const result = updateLabelParams.safeParse({
        id: 'label-id',
        name: 'Updated Bug',
        color: '#00ff00'
      });
      expect(result.success).toBe(true);
    });

    it('should reject control characters in name', () => {
      const result = updateLabelParams.safeParse({ id: 'l1', name: 'Bug\x00' });
      expect(result.success).toBe(false);
    });
  });

  describe('output validation', () => {
    it('should validate success response', () => {
      const result = updateLabelOutput.safeParse({
        success: true,
        label: { id: 'l1', name: 'Updated Bug', color: '#00ff00' },
        estimatedTokens: 30
      });
      expect(result.success).toBe(true);
    });
  });
});
