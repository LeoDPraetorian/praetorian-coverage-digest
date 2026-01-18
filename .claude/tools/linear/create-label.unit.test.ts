// .claude/tools/linear/create-label.unit.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createLabel, createLabelParams, createLabelOutput } from './create-label';

vi.mock('./client.js', () => ({ createLinearClient: vi.fn() }));
vi.mock('./graphql-helpers.js', () => ({ executeGraphQL: vi.fn() }));

describe('createLabel', () => {
  describe('input validation', () => {
    it('should require name', () => {
      const result = createLabelParams.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept name and optional color', () => {
      const result = createLabelParams.safeParse({
        name: 'Bug',
        color: '#ff0000'
      });
      expect(result.success).toBe(true);
    });

    it('should reject control characters in name', () => {
      const result = createLabelParams.safeParse({ name: 'Bug\x00' });
      expect(result.success).toBe(false);
    });
  });

  describe('output validation', () => {
    it('should validate success response', () => {
      const result = createLabelOutput.safeParse({
        success: true,
        label: { id: 'l1', name: 'Bug', color: '#ff0000' },
        estimatedTokens: 30
      });
      expect(result.success).toBe(true);
    });
  });

  describe('execute', () => {
    it('should call GraphQL with correct mutation', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      const mockClient = {};
      (createLinearClient as any).mockResolvedValue(mockClient);
      (executeGraphQL as any).mockResolvedValue({
        issueLabelCreate: {
          success: true,
          issueLabel: { id: 'l1', name: 'Bug', color: '#ff0000' }
        }
      });

      const result = await createLabel.execute({ name: 'Bug', color: '#ff0000' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('issueLabelCreate'),
        expect.objectContaining({
          input: expect.objectContaining({ name: 'Bug', color: '#ff0000' })
        })
      );
      expect(result.success).toBe(true);
      expect(result.label?.name).toBe('Bug');
    });
  });
});
