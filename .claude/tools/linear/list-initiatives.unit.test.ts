/**
 * Unit Tests for Linear list-initiatives Wrapper (GraphQL)
 *
 * Tests validate:
 * - Input validation (security constraints, format validation)
 * - Output schema compliance (required fields, type correctness)
 * - GraphQL call behavior (MSW interception)
 * - Pagination response handling (nodes array, pageInfo)
 * - Edge cases (empty list, missing optional fields)
 * - Error handling (validation failures, GraphQL errors)
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { graphql, HttpResponse } from 'msw';
import {
  listInitiatives,
  listInitiativesParams,
  listInitiativesOutput,
  type ListInitiativesInput,
} from './list-initiatives';

const linearApi = graphql.link('https://api.linear.app/graphql');

const server = setupServer(
  linearApi.query('Initiatives', ({ variables }) => {
    return HttpResponse.json({
      data: {
        initiatives: {
          nodes: [
            {
              id: 'init-uuid-1',
              name: 'Q2 2025 Roadmap',
              description: 'Quarterly planning initiative',
              targetDate: '2025-06-30',
            },
            {
              id: 'init-uuid-2',
              name: 'Q3 2025 Goals',
              description: null,
              targetDate: null,
            },
          ],
          pageInfo: {
            hasNextPage: false,
            endCursor: null,
          },
        },
      },
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('listInitiatives (GraphQL)', () => {
  // =========================================================================
  // INPUT VALIDATION
  // =========================================================================

  describe('Input Validation', () => {
    it('should accept empty input (no filter or limit)', async () => {
      const result = await listInitiatives.execute(
        {},
        'test-token'
      );

      expect(result).toBeDefined();
      expect(result.initiatives).toBeDefined();
    });

    it('should accept filter parameter', async () => {
      const input: ListInitiativesInput = {
        filter: 'Q2',
      };

      const result = await listInitiatives.execute(input, 'test-token');
      expect(result).toBeDefined();
    });

    it('should accept limit parameter', async () => {
      const input: ListInitiativesInput = {
        limit: 10,
      };

      const result = await listInitiatives.execute(input, 'test-token');
      expect(result).toBeDefined();
    });

    it('should accept both filter and limit', async () => {
      const input: ListInitiativesInput = {
        filter: 'Q2',
        limit: 5,
      };

      const result = await listInitiatives.execute(input, 'test-token');
      expect(result).toBeDefined();
    });

    it('should reject limit below 1', () => {
      const input = { limit: 0 };
      expect(() => listInitiativesParams.parse(input)).toThrow();
    });

    it('should reject limit above 100', () => {
      const input = { limit: 101 };
      expect(() => listInitiativesParams.parse(input)).toThrow();
    });
  });

  // =========================================================================
  // SECURITY VALIDATION
  // =========================================================================

  describe('Security Validation - Control Characters in Filter', () => {
    it('should reject null byte injection in filter', () => {
      const input = { filter: 'Q2\x00injection' };
      expect(() => listInitiativesParams.parse(input)).toThrow(/control|invalid/i);
    });

    it('should reject control character in filter', () => {
      const input = { filter: 'Q2\u0001malicious' };
      expect(() => listInitiativesParams.parse(input)).toThrow(/control|invalid/i);
    });

    it('should reject path traversal in filter', () => {
      const input = { filter: '../../../etc/passwd' };
      expect(() => listInitiativesParams.parse(input)).toThrow(/path|traversal/i);
    });

    it('should reject command injection in filter', () => {
      const input = { filter: 'Q2; rm -rf /' };
      expect(() => listInitiativesParams.parse(input)).toThrow(/invalid|characters/i);
    });
  });

  // =========================================================================
  // OUTPUT SCHEMA - REQUIRED FIELDS
  // =========================================================================

  describe('Output Schema - Required Fields', () => {
    it('should return initiatives array with all required fields', async () => {
      const result = await listInitiatives.execute({}, 'test-token');

      expect(result.initiatives).toBeDefined();
      expect(Array.isArray(result.initiatives)).toBe(true);
      expect(result.initiatives.length).toBeGreaterThan(0);
      expect(result.initiatives[0].id).toBe('init-uuid-1');
      expect(result.initiatives[0].name).toBe('Q2 2025 Roadmap');
    });

    it('should include optional fields when present', async () => {
      const result = await listInitiatives.execute({}, 'test-token');

      expect(result.initiatives[0].description).toBe('Quarterly planning initiative');
      expect(result.initiatives[0].targetDate).toBe('2025-06-30');
    });

    it('should handle null optional fields', async () => {
      const result = await listInitiatives.execute({}, 'test-token');

      expect(result.initiatives[1].description).toBeUndefined();
      expect(result.initiatives[1].targetDate).toBeUndefined();
    });

    it('should include estimatedTokens in output', async () => {
      const result = await listInitiatives.execute({}, 'test-token');

      expect(result.estimatedTokens).toBeDefined();
      expect(typeof result.estimatedTokens).toBe('number');
    });
  });

  // =========================================================================
  // PAGINATION HANDLING
  // =========================================================================

  describe('Pagination Response Handling', () => {
    it('should handle empty initiatives list', async () => {
      server.use(
        linearApi.query('Initiatives', () => {
          return HttpResponse.json({
            data: {
              initiatives: {
                nodes: [],
                pageInfo: {
                  hasNextPage: false,
                  endCursor: null,
                },
              },
            },
          });
        })
      );

      const result = await listInitiatives.execute({}, 'test-token');

      expect(result.initiatives).toEqual([]);
      expect(result.estimatedTokens).toBeDefined();
    });

    it('should extract nodes from pagination response', async () => {
      const result = await listInitiatives.execute({}, 'test-token');

      // Should extract nodes array, not include pageInfo in output
      expect(result.initiatives).toBeDefined();
      expect(Array.isArray(result.initiatives)).toBe(true);
      expect(result.initiatives).toHaveLength(2);
    });
  });

  // =========================================================================
  // ERROR HANDLING
  // =========================================================================

  describe('Error Handling', () => {
    it('should throw when GraphQL returns errors', async () => {
      server.use(
        linearApi.query('Initiatives', () => {
          return HttpResponse.json({
            errors: [{ message: 'Authentication required' }],
          });
        })
      );

      await expect(
        listInitiatives.execute({}, 'test-token')
      ).rejects.toThrow(/Authentication required/);
    });

    it('should throw when GraphQL returns null data', async () => {
      server.use(
        linearApi.query('Initiatives', () => {
          return HttpResponse.json({
            data: null,
          });
        })
      );

      await expect(
        listInitiatives.execute({}, 'test-token')
      ).rejects.toThrow(/No data/);
    });

    it('should throw on invalid response format (missing nodes)', async () => {
      server.use(
        linearApi.query('Initiatives', () => {
          return HttpResponse.json({
            data: {
              initiatives: {
                // Missing nodes array
                pageInfo: { hasNextPage: false },
              },
            },
          });
        })
      );

      await expect(
        listInitiatives.execute({}, 'test-token')
      ).rejects.toThrow(/Invalid response format/);
    });
  });

  // =========================================================================
  // DESCRIPTION TRUNCATION
  // =========================================================================

  describe('Description Truncation', () => {
    it('should truncate long descriptions to 200 characters', async () => {
      const longDescription = 'a'.repeat(250);

      server.use(
        linearApi.query('Initiatives', () => {
          return HttpResponse.json({
            data: {
              initiatives: {
                nodes: [
                  {
                    id: 'init-1',
                    name: 'Test',
                    description: longDescription,
                  },
                ],
                pageInfo: { hasNextPage: false, endCursor: null },
              },
            },
          });
        })
      );

      const result = await listInitiatives.execute({}, 'test-token');

      expect(result.initiatives[0].description).toBeDefined();
      expect(result.initiatives[0].description!.length).toBe(200);
    });
  });

  // =========================================================================
  // WRAPPER METADATA
  // =========================================================================

  describe('Wrapper Metadata', () => {
    it('should have correct name', () => {
      expect(listInitiatives.name).toBe('linear.list_initiatives');
    });

    it('should have descriptive description', () => {
      expect(listInitiatives.description).toBe(
        'List all initiatives in Linear with optional filtering'
      );
    });

    it('should have parameters schema', () => {
      expect(listInitiatives.parameters).toBeDefined();
    });

    it('should have tokenEstimate metadata', () => {
      expect(listInitiatives.tokenEstimate).toBeDefined();
      expect(listInitiatives.tokenEstimate.reduction).toBe('98%');
    });
  });
});
