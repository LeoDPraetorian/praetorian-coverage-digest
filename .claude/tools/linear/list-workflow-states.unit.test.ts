import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listWorkflowStates, listWorkflowStatesParams, listWorkflowStatesOutput } from './list-workflow-states';

// Mock the client
vi.mock('./client.js', () => ({
  createLinearClient: vi.fn()
}));

vi.mock('./graphql-helpers.js', () => ({
  executeGraphQL: vi.fn()
}));

describe('listWorkflowStates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('should accept empty input (no filters)', () => {
      const result = listWorkflowStatesParams.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept filter parameter', () => {
      const result = listWorkflowStatesParams.safeParse({ filter: { teamId: 'team-uuid' } });
      expect(result.success).toBe(true);
    });

    it('should reject control characters in teamId filter', () => {
      const result = listWorkflowStatesParams.safeParse({ filter: { teamId: 'team\x00id' } });
      expect(result.success).toBe(false);
    });

    it('should accept limit parameter', () => {
      const result = listWorkflowStatesParams.safeParse({ limit: 50 });
      expect(result.success).toBe(true);
    });

    it('should reject invalid limit values', () => {
      const negativeLimit = listWorkflowStatesParams.safeParse({ limit: -1 });
      expect(negativeLimit.success).toBe(false);

      const excessiveLimit = listWorkflowStatesParams.safeParse({ limit: 300 });
      expect(excessiveLimit.success).toBe(false);
    });
  });

  describe('output validation', () => {
    it('should validate correct output structure', () => {
      const result = listWorkflowStatesOutput.safeParse({
        workflowStates: [
          {
            id: 'state-1',
            name: 'Todo',
            type: 'backlog',
            color: '#e2e2e2',
            position: 0,
            teamId: 'team-1',
            teamName: 'Engineering'
          }
        ],
        totalStates: 1,
        estimatedTokens: 100
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional fields', () => {
      const result = listWorkflowStatesOutput.safeParse({
        workflowStates: [
          {
            id: 'state-1',
            name: 'Todo',
            type: 'backlog',
            color: '#e2e2e2',
            position: 0
          }
        ],
        totalStates: 1,
        estimatedTokens: 100
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
        workflowStates: {
          nodes: [
            {
              id: 'ws1',
              name: 'Todo',
              type: 'backlog',
              color: '#e2e2e2',
              position: 0,
              team: { id: 't1', name: 'Engineering' }
            }
          ]
        }
      });

      const result = await listWorkflowStates.execute({});

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('workflowStates'),
        expect.any(Object)
      );
      expect(result.workflowStates).toHaveLength(1);
      expect(result.workflowStates[0].name).toBe('Todo');
    });

    it('should pass filter to GraphQL query when provided', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      const mockClient = {};
      (createLinearClient as any).mockResolvedValue(mockClient);
      (executeGraphQL as any).mockResolvedValue({
        workflowStates: { nodes: [] }
      });

      await listWorkflowStates.execute({ filter: { teamId: 'team-123' } });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.any(String),
        expect.objectContaining({
          filter: expect.objectContaining({
            team: expect.objectContaining({
              id: expect.objectContaining({ eq: 'team-123' })
            })
          })
        })
      );
    });
  });
});
