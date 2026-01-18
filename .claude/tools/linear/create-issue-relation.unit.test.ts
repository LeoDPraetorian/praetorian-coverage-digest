/**
 * Unit Tests for Linear create-issue-relation Wrapper (GraphQL)
 *
 * Tests validate:
 * - Input validation (security constraints, format validation)
 * - Output schema compliance (required fields, type correctness)
 * - GraphQL call behavior (mutation execution, response parsing)
 * - Edge cases (relation types, identifiers)
 * - Error handling (validation failures, GraphQL errors)
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { graphql, HttpResponse } from 'msw';
import {
  createIssueRelation,
  createIssueRelationParams,
  createIssueRelationOutput,
  type CreateIssueRelationInput,
} from './create-issue-relation';

const linearApi = graphql.link('https://api.linear.app/graphql');

const server = setupServer(
  linearApi.mutation('IssueRelationCreate', ({ variables }) => {
    return HttpResponse.json({
      data: {
        issueRelationCreate: {
          success: true,
          issueRelation: {
            id: 'rel-123',
            type: variables.input?.type || 'blocks',
            issue: { id: 'issue-1' },
            relatedIssue: { id: 'issue-2' },
          },
        },
      },
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('createIssueRelation (GraphQL)', () => {
  // =========================================================================
  // INPUT VALIDATION
  // =========================================================================

  describe('input validation', () => {
    it('validates required fields', async () => {
      await expect(
        createIssueRelation.execute({} as CreateIssueRelationInput, 'test-key')
      ).rejects.toThrow();
    });

    it('validates issueId against control characters', async () => {
      await expect(
        createIssueRelation.execute({
          issueId: 'ISSUE\x00123',
          relatedIssueId: 'ISSUE-456',
          type: 'blocks'
        }, 'test-key')
      ).rejects.toThrow('Control characters not allowed');
    });

    it('validates relatedIssueId against path traversal', async () => {
      await expect(
        createIssueRelation.execute({
          issueId: 'ISSUE-123',
          relatedIssueId: '../../../etc/passwd',
          type: 'blocks'
        }, 'test-key')
      ).rejects.toThrow('Path traversal not allowed');
    });

    it('validates relation type is one of the allowed types', async () => {
      await expect(
        createIssueRelation.execute({
          issueId: 'ISSUE-123',
          relatedIssueId: 'ISSUE-456',
          type: 'invalid' as any
        }, 'test-key')
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // SUCCESSFUL CREATION - ALL RELATION TYPES
  // =========================================================================

  describe('successful creation', () => {
    it('creates a "blocks" relation', async () => {
      server.use(
        linearApi.mutation('IssueRelationCreate', ({ variables }) => {
          return HttpResponse.json({
            data: {
              issueRelationCreate: {
                success: true,
                issueRelation: {
                  id: 'rel-123',
                  type: 'blocks',
                  issue: { id: 'issue-1' },
                  relatedIssue: { id: 'issue-2' },
                },
              },
            },
          });
        })
      );

      const result = await createIssueRelation.execute({
        issueId: 'ISSUE-123',
        relatedIssueId: 'ISSUE-456',
        type: 'blocks'
      }, 'test-key');

      expect(result.success).toBe(true);
      expect(result.relation.id).toBe('rel-123');
      expect(result.relation.type).toBe('blocks');
      expect(result.relation.issueId).toBe('issue-1');
      expect(result.relation.relatedIssueId).toBe('issue-2');
    });

    it('creates a "blocked_by" relation', async () => {
      server.use(
        linearApi.mutation('IssueRelationCreate', ({ variables }) => {
          return HttpResponse.json({
            data: {
              issueRelationCreate: {
                success: true,
                issueRelation: {
                  id: 'rel-456',
                  type: 'blocked_by',
                  issue: { id: 'issue-1' },
                  relatedIssue: { id: 'issue-2' },
                },
              },
            },
          });
        })
      );

      const result = await createIssueRelation.execute({
        issueId: 'ISSUE-123',
        relatedIssueId: 'ISSUE-456',
        type: 'blocked_by'
      }, 'test-key');

      expect(result.relation.type).toBe('blocked_by');
    });

    it('creates a "duplicate" relation', async () => {
      server.use(
        linearApi.mutation('IssueRelationCreate', ({ variables }) => {
          return HttpResponse.json({
            data: {
              issueRelationCreate: {
                success: true,
                issueRelation: {
                  id: 'rel-789',
                  type: 'duplicate',
                  issue: { id: 'issue-1' },
                  relatedIssue: { id: 'issue-2' },
                },
              },
            },
          });
        })
      );

      const result = await createIssueRelation.execute({
        issueId: 'ISSUE-123',
        relatedIssueId: 'ISSUE-456',
        type: 'duplicate'
      }, 'test-key');

      expect(result.relation.type).toBe('duplicate');
    });

    it('creates a "related" relation', async () => {
      server.use(
        linearApi.mutation('IssueRelationCreate', ({ variables }) => {
          return HttpResponse.json({
            data: {
              issueRelationCreate: {
                success: true,
                issueRelation: {
                  id: 'rel-abc',
                  type: 'related',
                  issue: { id: 'issue-1' },
                  relatedIssue: { id: 'issue-2' },
                },
              },
            },
          });
        })
      );

      const result = await createIssueRelation.execute({
        issueId: 'ISSUE-123',
        relatedIssueId: 'ISSUE-456',
        type: 'related'
      }, 'test-key');

      expect(result.relation.type).toBe('related');
    });
  });

  // =========================================================================
  // ERROR HANDLING
  // =========================================================================

  describe('error handling', () => {
    it('throws error when GraphQL returns success: false', async () => {
      server.use(
        linearApi.mutation('IssueRelationCreate', () => {
          return HttpResponse.json({
            data: {
              issueRelationCreate: {
                success: false,
              },
            },
          });
        })
      );

      await expect(
        createIssueRelation.execute({
          issueId: 'ISSUE-123',
          relatedIssueId: 'ISSUE-456',
          type: 'blocks'
        }, 'test-key')
      ).rejects.toThrow('Failed to create issue relation');
    });

    it('throws error when GraphQL returns errors', async () => {
      server.use(
        linearApi.mutation('IssueRelationCreate', () => {
          return HttpResponse.json({
            errors: [
              {
                message: 'Issue relation already exists',
                path: ['issueRelationCreate'],
              },
            ],
          });
        })
      );

      await expect(
        createIssueRelation.execute({
          issueId: 'ISSUE-123',
          relatedIssueId: 'ISSUE-456',
          type: 'blocks'
        }, 'test-key')
      ).rejects.toThrow(/GraphQL errors/);
    });

    it('throws error when issueRelation is missing', async () => {
      server.use(
        linearApi.mutation('IssueRelationCreate', () => {
          return HttpResponse.json({
            data: {
              issueRelationCreate: {
                success: true,
                // Missing issueRelation
              },
            },
          });
        })
      );

      await expect(
        createIssueRelation.execute({
          issueId: 'ISSUE-123',
          relatedIssueId: 'ISSUE-456',
          type: 'blocks'
        }, 'test-key')
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // TOKEN ESTIMATION
  // =========================================================================

  describe('token estimation', () => {
    it('includes token estimation in output', async () => {
      const result = await createIssueRelation.execute({
        issueId: 'ISSUE-123',
        relatedIssueId: 'ISSUE-456',
        type: 'blocks'
      }, 'test-key');

      expect(result.estimatedTokens).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // GRAPHQL CALL BEHAVIOR
  // =========================================================================

  describe('GraphQL call behavior', () => {
    it('should send GraphQL mutation with correct structure', async () => {
      let capturedVariables: any;

      server.use(
        linearApi.mutation('IssueRelationCreate', ({ variables }) => {
          capturedVariables = variables;
          return HttpResponse.json({
            data: {
              issueRelationCreate: {
                success: true,
                issueRelation: {
                  id: 'rel-1',
                  type: 'blocks',
                  issue: { id: 'issue-1' },
                  relatedIssue: { id: 'issue-2' },
                },
              },
            },
          });
        })
      );

      await createIssueRelation.execute({
        issueId: 'ISSUE-123',
        relatedIssueId: 'ISSUE-456',
        type: 'blocks'
      }, 'test-key');

      expect(capturedVariables).toEqual({
        input: {
          issueId: 'ISSUE-123',
          relatedIssueId: 'ISSUE-456',
          type: 'blocks',
        },
      });
    });
  });
});
