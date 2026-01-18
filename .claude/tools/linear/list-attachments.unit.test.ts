/**
 * list-attachments.unit.test.ts - Unit tests for list-attachments wrapper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listAttachments, listAttachmentsParams, listAttachmentsOutput } from './list-attachments';

// Mock the client and GraphQL helpers
vi.mock('./client.js', () => ({
  createLinearClient: vi.fn()
}));

vi.mock('./graphql-helpers.js', () => ({
  executeGraphQL: vi.fn()
}));

describe('listAttachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('should accept filter with issueId', () => {
      const result = listAttachmentsParams.safeParse({
        filter: { issueId: 'issue-uuid-123' }
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty input (no filter)', () => {
      const result = listAttachmentsParams.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject control characters in issueId', () => {
      const result = listAttachmentsParams.safeParse({
        filter: { issueId: 'issue\x00id' }
      });
      expect(result.success).toBe(false);
    });

    it('should reject path traversal in issueId', () => {
      const result = listAttachmentsParams.safeParse({
        filter: { issueId: '../../../etc/passwd' }
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid limit', () => {
      const result = listAttachmentsParams.safeParse({ limit: 50 });
      expect(result.success).toBe(true);
    });

    it('should reject limit below 1', () => {
      const result = listAttachmentsParams.safeParse({ limit: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject limit above 250', () => {
      const result = listAttachmentsParams.safeParse({ limit: 251 });
      expect(result.success).toBe(false);
    });
  });

  describe('output validation', () => {
    it('should validate correct output structure', () => {
      const result = listAttachmentsOutput.safeParse({
        attachments: [
          {
            id: 'att-1',
            title: 'Design mockups',
            url: 'https://example.com/mockup.pdf',
            source: 'https://example.com/mockup.pdf'
          }
        ],
        totalAttachments: 1,
        estimatedTokens: 100
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional fields in attachment', () => {
      const result = listAttachmentsOutput.safeParse({
        attachments: [
          {
            id: 'att-1',
            title: 'Design mockups',
            subtitle: 'Sprint 5 designs',
            url: 'https://example.com/mockup.pdf',
            source: 'https://example.com/mockup.pdf',
            sourceType: 'pdf',
            metadata: { size: 1024 },
            issueId: 'issue-1',
            creatorId: 'user-1',
            createdAt: '2026-01-17T10:00:00Z',
            updatedAt: '2026-01-17T10:00:00Z'
          }
        ],
        totalAttachments: 1,
        estimatedTokens: 150
      });
      expect(result.success).toBe(true);
    });

    it('should require estimatedTokens', () => {
      const result = listAttachmentsOutput.safeParse({
        attachments: [],
        totalAttachments: 0
      });
      expect(result.success).toBe(false);
    });
  });

  describe('execute', () => {
    it('should call GraphQL with correct query for unfiltered list', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      const mockClient = {};
      (createLinearClient as any).mockResolvedValue(mockClient);
      (executeGraphQL as any).mockResolvedValue({
        attachments: {
          nodes: [
            {
              id: 'att-1',
              title: 'Test attachment',
              url: 'https://example.com/test.pdf',
              source: 'https://example.com/test.pdf'
            }
          ]
        }
      });

      const result = await listAttachments.execute({});

      expect(createLinearClient).toHaveBeenCalled();
      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('attachments'),
        expect.objectContaining({ first: 100 })
      );
      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0].id).toBe('att-1');
      expect(result.totalAttachments).toBe(1);
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });

    it('should call GraphQL with issueId filter when provided', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      const mockClient = {};
      (createLinearClient as any).mockResolvedValue(mockClient);
      (executeGraphQL as any).mockResolvedValue({
        attachments: {
          nodes: []
        }
      });

      await listAttachments.execute({
        filter: { issueId: 'issue-uuid-123' }
      });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('attachments'),
        expect.objectContaining({
          filter: expect.objectContaining({
            issue: { id: { eq: 'issue-uuid-123' } }
          })
        })
      );
    });

    it('should use custom limit when provided', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      const mockClient = {};
      (createLinearClient as any).mockResolvedValue(mockClient);
      (executeGraphQL as any).mockResolvedValue({
        attachments: {
          nodes: []
        }
      });

      await listAttachments.execute({ limit: 50 });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.any(String),
        expect.objectContaining({ first: 50 })
      );
    });

    it('should handle empty result', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      (createLinearClient as any).mockResolvedValue({});
      (executeGraphQL as any).mockResolvedValue({
        attachments: {
          nodes: []
        }
      });

      const result = await listAttachments.execute({});

      expect(result.attachments).toEqual([]);
      expect(result.totalAttachments).toBe(0);
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });

    it('should map all attachment fields correctly', async () => {
      const { executeGraphQL } = await import('./graphql-helpers.js');
      const { createLinearClient } = await import('./client.js');

      (createLinearClient as any).mockResolvedValue({});
      (executeGraphQL as any).mockResolvedValue({
        attachments: {
          nodes: [
            {
              id: 'att-1',
              title: 'Design doc',
              subtitle: 'V2',
              url: 'https://example.com/doc.pdf',
              source: 'https://example.com/doc.pdf',
              sourceType: 'pdf',
              metadata: { pages: 10 },
              issue: { id: 'issue-1' },
              creator: { id: 'user-1' },
              createdAt: '2026-01-17T10:00:00Z',
              updatedAt: '2026-01-17T11:00:00Z'
            }
          ]
        }
      });

      const result = await listAttachments.execute({});

      expect(result.attachments[0]).toMatchObject({
        id: 'att-1',
        title: 'Design doc',
        subtitle: 'V2',
        url: 'https://example.com/doc.pdf',
        source: 'https://example.com/doc.pdf',
        sourceType: 'pdf',
        metadata: { pages: 10 },
        issueId: 'issue-1',
        creatorId: 'user-1',
        createdAt: '2026-01-17T10:00:00Z',
        updatedAt: '2026-01-17T11:00:00Z'
      });
    });
  });
});
