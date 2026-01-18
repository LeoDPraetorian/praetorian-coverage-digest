// .claude/tools/linear/subscribe-to-issue.unit.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { subscribeToIssue, subscribeToIssueParams, subscribeToIssueOutput } from './subscribe-to-issue';

// Mock the client
vi.mock('./client.js', () => ({
  createLinearClient: vi.fn()
}));

vi.mock('./graphql-helpers.js', () => ({
  executeGraphQL: vi.fn()
}));

describe('subscribeToIssue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('should require issueId', () => {
      const result = subscribeToIssueParams.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept valid issueId only', () => {
      const result = subscribeToIssueParams.safeParse({ issueId: 'issue-uuid' });
      expect(result.success).toBe(true);
    });

    it('should accept issueId and userId', () => {
      const result = subscribeToIssueParams.safeParse({
        issueId: 'issue-uuid',
        userId: 'user-uuid'
      });
      expect(result.success).toBe(true);
    });

    it('should reject control characters in issueId', () => {
      const result = subscribeToIssueParams.safeParse({ issueId: 'issue\x00id' });
      expect(result.success).toBe(false);
    });

    it('should reject control characters in userId', () => {
      const result = subscribeToIssueParams.safeParse({
        issueId: 'issue-uuid',
        userId: 'user\x00id'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('output validation', () => {
    it('should validate correct output structure', () => {
      const result = subscribeToIssueOutput.safeParse({
        success: true,
        issue: {
          id: 'issue-1',
          identifier: 'CHARIOT-123',
          subscribers: [
            { id: 'user-1', name: 'Alice' }
          ]
        },
        estimatedTokens: 100
      });
      expect(result.success).toBe(true);
    });

    it('should allow empty subscribers array', () => {
      const result = subscribeToIssueOutput.safeParse({
        success: true,
        issue: {
          id: 'issue-1',
          identifier: 'CHARIOT-123',
          subscribers: []
        },
        estimatedTokens: 50
      });
      expect(result.success).toBe(true);
    });
  });

  describe('execute', () => {
    it('should call GraphQL with correct mutation and variables', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      const mockClient = {};
      (createLinearClient as any).mockResolvedValue(mockClient);
      (executeGraphQL as any).mockResolvedValue({
        issueSubscribe: {
          success: true,
          issue: {
            id: 'issue-1',
            identifier: 'CHARIOT-123',
            subscribers: {
              nodes: [{ id: 'user-1', name: 'Alice' }]
            }
          }
        }
      });

      const result = await subscribeToIssue.execute({
        issueId: 'issue-uuid'
      });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('issueSubscribe'),
        { issueId: 'issue-uuid', userId: undefined }
      );
      expect(result.success).toBe(true);
      expect(result.issue.id).toBe('issue-1');
      expect(result.issue.subscribers).toHaveLength(1);
    });

    it('should pass userId when provided', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      const mockClient = {};
      (createLinearClient as any).mockResolvedValue(mockClient);
      (executeGraphQL as any).mockResolvedValue({
        issueSubscribe: {
          success: true,
          issue: {
            id: 'issue-1',
            identifier: 'CHARIOT-123',
            subscribers: {
              nodes: []
            }
          }
        }
      });

      await subscribeToIssue.execute({
        issueId: 'issue-uuid',
        userId: 'user-uuid'
      });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.any(String),
        { issueId: 'issue-uuid', userId: 'user-uuid' }
      );
    });
  });
});
