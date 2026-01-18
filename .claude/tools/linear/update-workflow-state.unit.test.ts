import { describe, it, expect, vi } from 'vitest';
import { updateWorkflowState, updateWorkflowStateParams, updateWorkflowStateOutput } from './update-workflow-state';

vi.mock('./client.js', () => ({ createLinearClient: vi.fn() }));
vi.mock('./graphql-helpers.js', () => ({ executeGraphQL: vi.fn() }));

describe('updateWorkflowState', () => {
  describe('input validation', () => {
    it('should require id', () => {
      const result = updateWorkflowStateParams.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept id with name update', () => {
      const result = updateWorkflowStateParams.safeParse({
        id: 'state-uuid',
        name: 'Updated Name'
      });
      expect(result.success).toBe(true);
    });

    it('should accept id with color update', () => {
      const result = updateWorkflowStateParams.safeParse({
        id: 'state-uuid',
        color: '#27ae60'
      });
      expect(result.success).toBe(true);
    });

    it('should accept id with position update', () => {
      const result = updateWorkflowStateParams.safeParse({
        id: 'state-uuid',
        position: 5
      });
      expect(result.success).toBe(true);
    });

    it('should reject control characters in id', () => {
      const result = updateWorkflowStateParams.safeParse({
        id: 'state\x00uuid',
        name: 'Updated'
      });
      expect(result.success).toBe(false);
    });

    it('should reject control characters in name', () => {
      const result = updateWorkflowStateParams.safeParse({
        id: 'state-uuid',
        name: 'Updated\x00Name'
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid hex color', () => {
      const result = updateWorkflowStateParams.safeParse({
        id: 'state-uuid',
        color: 'green'  // Not hex format
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative position', () => {
      const result = updateWorkflowStateParams.safeParse({
        id: 'state-uuid',
        position: -1
      });
      expect(result.success).toBe(false);
    });
  });

  describe('output validation', () => {
    it('should validate success response', () => {
      const result = updateWorkflowStateOutput.safeParse({
        success: true,
        workflowState: {
          id: 'ws1',
          name: 'Updated Name',
          type: 'started',
          color: '#27ae60'
        },
        estimatedTokens: 50
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
        workflowStateUpdate: {
          success: true,
          workflowState: {
            id: 'ws1',
            name: 'Updated Name',
            type: 'started',
            color: '#27ae60'
          }
        }
      });

      const result = await updateWorkflowState.execute({
        id: 'ws1',
        name: 'Updated Name',
        color: '#27ae60'
      });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('workflowStateUpdate'),
        expect.objectContaining({
          id: 'ws1',
          input: expect.objectContaining({
            name: 'Updated Name',
            color: '#27ae60'
          })
        })
      );
      expect(result.success).toBe(true);
      expect(result.workflowState.name).toBe('Updated Name');
    });

    it('should only include provided fields in mutation', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      const mockClient = {};
      (createLinearClient as any).mockResolvedValue(mockClient);
      (executeGraphQL as any).mockResolvedValue({
        workflowStateUpdate: {
          success: true,
          workflowState: {
            id: 'ws1',
            name: 'Same Name',
            type: 'started',
            color: '#27ae60'
          }
        }
      });

      await updateWorkflowState.execute({
        id: 'ws1',
        color: '#27ae60'
      });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.any(String),
        expect.objectContaining({
          id: 'ws1',
          input: expect.objectContaining({
            color: '#27ae60'
          })
        })
      );

      // Verify name is NOT in the input - get the last call
      const callArgs = (executeGraphQL as any).mock.calls[(executeGraphQL as any).mock.calls.length - 1];
      expect(callArgs[2].input).not.toHaveProperty('name');
    });

    it('should throw error when update fails', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      const mockClient = {};
      (createLinearClient as any).mockResolvedValue(mockClient);
      (executeGraphQL as any).mockResolvedValue({
        workflowStateUpdate: {
          success: false,
          workflowState: null
        }
      });

      await expect(updateWorkflowState.execute({
        id: 'ws1',
        name: 'Updated'
      })).rejects.toThrow('Failed to update workflow state');
    });
  });
});
