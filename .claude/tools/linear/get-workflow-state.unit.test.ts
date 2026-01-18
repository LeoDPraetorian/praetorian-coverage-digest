import { describe, it, expect, vi } from 'vitest';
import { getWorkflowState, getWorkflowStateParams, getWorkflowStateOutput } from './get-workflow-state';

vi.mock('./client.js', () => ({ createLinearClient: vi.fn() }));
vi.mock('./graphql-helpers.js', () => ({ executeGraphQL: vi.fn() }));

describe('getWorkflowState', () => {
  describe('input validation', () => {
    it('should require id', () => {
      const result = getWorkflowStateParams.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept valid id', () => {
      const result = getWorkflowStateParams.safeParse({ id: 'state-uuid' });
      expect(result.success).toBe(true);
    });

    it('should reject control characters in id', () => {
      const result = getWorkflowStateParams.safeParse({ id: 'state\x00uuid' });
      expect(result.success).toBe(false);
    });

    it('should reject path traversal in id', () => {
      const result = getWorkflowStateParams.safeParse({ id: '../../../etc/passwd' });
      expect(result.success).toBe(false);
    });
  });

  describe('output validation', () => {
    it('should validate correct output', () => {
      const result = getWorkflowStateOutput.safeParse({
        workflowState: {
          id: 'ws1',
          name: 'In Progress',
          type: 'started',
          color: '#f2c94c',
          position: 1
        },
        estimatedTokens: 40
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional fields', () => {
      const result = getWorkflowStateOutput.safeParse({
        workflowState: {
          id: 'ws1',
          name: 'In Progress',
          type: 'started',
          color: '#f2c94c',
          position: 1,
          description: 'Work in progress',
          teamId: 't1',
          teamName: 'Engineering'
        },
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
        workflowState: {
          id: 'ws1',
          name: 'In Progress',
          type: 'started',
          color: '#f2c94c',
          position: 1,
          description: 'Active work',
          team: { id: 't1', name: 'Engineering' }
        }
      });

      const result = await getWorkflowState.execute({ id: 'ws1' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('workflowState'),
        { id: 'ws1' }
      );
      expect(result.workflowState.id).toBe('ws1');
      expect(result.workflowState.name).toBe('In Progress');
    });

    it('should throw error when workflow state not found', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      const mockClient = {};
      (createLinearClient as any).mockResolvedValue(mockClient);
      (executeGraphQL as any).mockResolvedValue({ workflowState: null });

      await expect(getWorkflowState.execute({ id: 'nonexistent' }))
        .rejects
        .toThrow('Workflow state not found');
    });
  });
});
