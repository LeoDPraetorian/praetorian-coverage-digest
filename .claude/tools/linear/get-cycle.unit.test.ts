/**
 * Unit Tests for Linear get-cycle Wrapper (GraphQL)
 *
 * Tests validate:
 * - Input validation (security constraints, format validation)
 * - Output schema compliance (required fields, type correctness)
 * - GraphQL call behavior (query execution, response parsing)
 * - Edge cases (null values, missing optional fields)
 * - Error handling (validation failures, GraphQL errors)
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { graphql, HttpResponse } from 'msw';
import { getCycle, type GetCycleInput } from './get-cycle';

const linearApi = graphql.link('https://api.linear.app/graphql');

const server = setupServer(
  linearApi.query('Cycle', ({ variables }) => {
    const id = variables.id as string;

    // Handle not found case
    if (id === 'nonexistent') {
      return HttpResponse.json({
        data: {
          cycle: null
        }
      });
    }

    // Default response with full data
    if (id === 'cycle-123') {
      return HttpResponse.json({
        data: {
          cycle: {
            id: 'cycle-123',
            name: 'Sprint 1',
            description: 'First sprint of Q1',
            number: 1,
            team: {
              id: 'team-456',
              name: 'Engineering'
            },
            startsAt: '2025-01-01',
            endsAt: '2025-01-14',
            createdAt: '2024-12-01T00:00:00Z',
            updatedAt: '2024-12-01T00:00:00Z'
          }
        }
      });
    }

    // Response with minimal fields
    return HttpResponse.json({
      data: {
        cycle: {
          id: id,
          name: 'Sprint 1',
          number: 1
        }
      }
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('getCycle (GraphQL)', () => {
  describe('successful retrieval', () => {
    it('retrieves a cycle by ID', async () => {
      const input: GetCycleInput = { id: 'cycle-123' };
      const result = await getCycle.execute(input, 'test-token');

      expect(result.id).toBe('cycle-123');
      expect(result.name).toBe('Sprint 1');
      expect(result.description).toBe('First sprint of Q1');
      expect(result.number).toBe(1);
      expect(result.team?.id).toBe('team-456');
      expect(result.team?.name).toBe('Engineering');
      expect(result.startsAt).toBe('2025-01-01');
      expect(result.endsAt).toBe('2025-01-14');
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });

    it('handles cycle without optional fields', async () => {
      const input: GetCycleInput = { id: 'cycle-minimal' };
      const result = await getCycle.execute(input, 'test-token');

      expect(result.id).toBe('cycle-minimal');
      expect(result.name).toBe('Sprint 1');
      expect(result.description).toBeUndefined();
      expect(result.team).toBeUndefined();
      expect(result.startsAt).toBeUndefined();
      expect(result.endsAt).toBeUndefined();
    });
  });

  describe('input validation', () => {
    it('rejects empty id', async () => {
      const input = { id: '' };

      await expect(getCycle.execute(input, 'test-token')).rejects.toThrow();
    });

    it('rejects id with control characters', async () => {
      const input = { id: 'cycle-123\x00' };

      await expect(getCycle.execute(input, 'test-token')).rejects.toThrow(/control characters/i);
    });

    it('rejects id with path traversal', async () => {
      const input = { id: '../../../etc/passwd' };

      await expect(getCycle.execute(input, 'test-token')).rejects.toThrow(/path traversal/i);
    });
  });

  describe('error handling', () => {
    it('throws error when cycle not found', async () => {
      const input: GetCycleInput = { id: 'nonexistent' };

      await expect(getCycle.execute(input, 'test-token')).rejects.toThrow('Cycle not found: nonexistent');
    });
  });
});
