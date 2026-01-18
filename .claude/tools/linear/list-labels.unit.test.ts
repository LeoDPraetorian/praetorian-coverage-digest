// .claude/tools/linear/list-labels.unit.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listLabels, listLabelsParams, listLabelsOutput } from './list-labels';

// Mock the client
vi.mock('./client.js', () => ({
  createLinearClient: vi.fn()
}));

vi.mock('./graphql-helpers.js', () => ({
  executeGraphQL: vi.fn()
}));

describe('listLabels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('should accept empty input (no filters)', () => {
      const result = listLabelsParams.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept teamId filter', () => {
      const result = listLabelsParams.safeParse({ teamId: 'team-uuid' });
      expect(result.success).toBe(true);
    });

    it('should reject control characters in teamId', () => {
      const result = listLabelsParams.safeParse({ teamId: 'team\x00id' });
      expect(result.success).toBe(false);
    });
  });

  describe('output validation', () => {
    it('should validate correct output structure', () => {
      const result = listLabelsOutput.safeParse({
        labels: [
          { id: 'label-1', name: 'Bug', color: '#ff0000' }
        ],
        totalLabels: 1,
        estimatedTokens: 50
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
        issueLabels: {
          nodes: [{ id: 'l1', name: 'Bug', color: '#ff0000' }]
        }
      });

      const result = await listLabels.execute({});

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('issueLabels'),
        expect.any(Object)
      );
      expect(result.labels).toHaveLength(1);
    });
  });
});
