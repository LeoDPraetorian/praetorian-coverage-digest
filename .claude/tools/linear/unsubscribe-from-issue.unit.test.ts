// .claude/tools/linear/unsubscribe-from-issue.unit.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { unsubscribeFromIssue, unsubscribeFromIssueParams, unsubscribeFromIssueOutput } from './unsubscribe-from-issue';

// Mock the client
vi.mock('./client.js', () => ({
  createLinearClient: vi.fn()
}));

vi.mock('./graphql-helpers.js', () => ({
  executeGraphQL: vi.fn()
}));

describe('unsubscribeFromIssue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('should require issueId', () => {
      const result = unsubscribeFromIssueParams.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept valid issueId only', () => {
      const result = unsubscribeFromIssueParams.safeParse({ issueId: 'issue-uuid' });
      expect(result.success).toBe(true);
    });

    it('should accept issueId and userId', () => {
      const result = unsubscribeFromIssueParams.safeParse({
        issueId: 'issue-uuid',
        userId: 'user-uuid'
      });
      expect(result.success).toBe(true);
    });

    it('should reject control characters in issueId', () => {
      const result = unsubscribeFromIssueParams.safeParse({ issueId: 'issue\x00id' });
      expect(result.success).toBe(false);
    });

    it('should reject control characters in userId', () => {
      const result = unsubscribeFromIssueParams.safeParse({
        issueId: 'issue-uuid',
        userId: 'user\x00id'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('output validation', () => {
    it('should validate correct output structure', () => {
      const result = unsubscribeFromIssueOutput.safeParse({
        success: true,
        issue: {
          id: 'issue-1',
          identifier: 'CHARIOT-123'
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
        issueUnsubscribe: {
          success: true,
          issue: {
            id: 'issue-1',
            identifier: 'CHARIOT-123'
          }
        }
      });

      const result = await unsubscribeFromIssue.execute({
        issueId: 'issue-uuid'
      });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('issueUnsubscribe'),
        { issueId: 'issue-uuid', userId: undefined }
      );
      expect(result.success).toBe(true);
      expect(result.issue.id).toBe('issue-1');
    });

    it('should pass userId when provided', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      const mockClient = {};
      (createLinearClient as any).mockResolvedValue(mockClient);
      (executeGraphQL as any).mockResolvedValue({
        issueUnsubscribe: {
          success: true,
          issue: {
            id: 'issue-1',
            identifier: 'CHARIOT-123'
          }
        }
      });

      await unsubscribeFromIssue.execute({
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
