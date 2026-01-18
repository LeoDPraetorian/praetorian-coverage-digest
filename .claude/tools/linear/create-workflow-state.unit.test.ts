import { describe, it, expect, vi } from 'vitest';
import { createWorkflowState, createWorkflowStateParams, createWorkflowStateOutput } from './create-workflow-state';

vi.mock('./client.js', () => ({ createLinearClient: vi.fn() }));
vi.mock('./graphql-helpers.js', () => ({ executeGraphQL: vi.fn() }));

describe('createWorkflowState', () => {
  describe('input validation', () => {
    it('should require name, type, and teamId', () => {
      const result = createWorkflowStateParams.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept valid required fields', () => {
      const result = createWorkflowStateParams.safeParse({
        name: 'In Review',
        type: 'started',
        teamId: 'team-uuid'
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional color and position', () => {
      const result = createWorkflowStateParams.safeParse({
        name: 'In Review',
        type: 'started',
        teamId: 'team-uuid',
        color: '#f2c94c',
        position: 2
      });
      expect(result.success).toBe(true);
    });

    it('should reject control characters in name', () => {
      const result = createWorkflowStateParams.safeParse({
        name: 'In\x00Review',
        type: 'started',
        teamId: 'team-uuid'
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid type', () => {
      const result = createWorkflowStateParams.safeParse({
        name: 'In Review',
        type: 'invalid-type',
        teamId: 'team-uuid'
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid hex color', () => {
      const result = createWorkflowStateParams.safeParse({
        name: 'In Review',
        type: 'started',
        teamId: 'team-uuid',
        color: 'red'  // Not hex format
      });
      expect(result.success).toBe(false);
    });
  });

  describe('output validation', () => {
    it('should validate success response', () => {
      const result = createWorkflowStateOutput.safeParse({
        success: true,
        workflowState: {
          id: 'ws1',
          name: 'In Review',
          type: 'started',
          color: '#f2c94c'
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
        workflowStateCreate: {
          success: true,
          workflowState: {
            id: 'ws1',
            name: 'In Review',
            type: 'started',
            color: '#f2c94c'
          }
        }
      });

      const result = await createWorkflowState.execute({
        name: 'In Review',
        type: 'started',
        teamId: 'team-123'
      });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('workflowStateCreate'),
        expect.objectContaining({
          input: expect.objectContaining({
            name: 'In Review',
            type: 'started',
            teamId: 'team-123'
          })
        })
      );
      expect(result.success).toBe(true);
      expect(result.workflowState.name).toBe('In Review');
    });

    it('should throw error when creation fails', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      const mockClient = {};
      (createLinearClient as any).mockResolvedValue(mockClient);
      (executeGraphQL as any).mockResolvedValue({
        workflowStateCreate: {
          success: false,
          workflowState: null
        }
      });

      await expect(createWorkflowState.execute({
        name: 'In Review',
        type: 'started',
        teamId: 'team-123'
      })).rejects.toThrow('Failed to create workflow state');
    });
  });
});
