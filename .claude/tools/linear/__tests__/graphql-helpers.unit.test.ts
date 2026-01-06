// .claude/tools/linear/__tests__/graphql-helpers.unit.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
  buildGraphQLRequest,
  parseGraphQLResponse,
  executeGraphQL,
  GraphQLError,
  type GraphQLResponse,
} from '../graphql-helpers';
import type { HTTPPort } from '../../config/lib/http-client';

describe('GraphQL Helpers', () => {
  describe('buildGraphQLRequest', () => {
    it('should build request body with query and variables', () => {
      const body = buildGraphQLRequest(
        'query GetIssue($id: String!) { issue(id: $id) { id title } }',
        { id: 'CHARIOT-123' }
      );

      expect(body).toEqual({
        query: 'query GetIssue($id: String!) { issue(id: $id) { id title } }',
        variables: { id: 'CHARIOT-123' },
      });
    });

    it('should handle empty variables', () => {
      const body = buildGraphQLRequest('query { viewer { id } }');
      expect(body).toEqual({
        query: 'query { viewer { id } }',
        variables: {},
      });
    });
  });

  describe('parseGraphQLResponse', () => {
    it('should extract data from successful response', () => {
      const response: GraphQLResponse<{ issue: { id: string } }> = {
        data: { issue: { id: '123' } },
      };

      const result = parseGraphQLResponse(response);
      expect(result).toEqual({ issue: { id: '123' } });
    });

    it('should throw GraphQLError on error response', () => {
      const response: GraphQLResponse<unknown> = {
        errors: [{ message: 'Not found', path: ['issue'] }],
      };

      expect(() => parseGraphQLResponse(response)).toThrow(GraphQLError);
      expect(() => parseGraphQLResponse(response)).toThrow(/Not found/);
    });

    it('should include all error messages in GraphQLError', () => {
      const response: GraphQLResponse<unknown> = {
        errors: [
          { message: 'Error 1' },
          { message: 'Error 2' },
        ],
      };

      try {
        parseGraphQLResponse(response);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        expect((error as GraphQLError).errors).toHaveLength(2);
      }
    });

    it('should throw on null data', () => {
      const response: GraphQLResponse<unknown> = { data: null };
      expect(() => parseGraphQLResponse(response)).toThrow(/No data/);
    });
  });

  describe('executeGraphQL', () => {
    const mockQuery = 'query { viewer { id } }';
    const mockVariables = { test: 'value' };
    const mockResponse: GraphQLResponse<{ viewer: { id: string } }> = {
      data: { viewer: { id: '123' } },
    };

    it('should accept a pre-created client (backward compatibility)', async () => {
      const mockClient: HTTPPort = {
        request: vi.fn().mockResolvedValue({
          ok: true,
          data: mockResponse,
        }),
      } as any;

      const result = await executeGraphQL(mockClient, mockQuery, mockVariables);

      expect(result).toEqual({ viewer: { id: '123' } });
      expect(mockClient.request).toHaveBeenCalledWith('post', 'graphql', {
        json: {
          query: mockQuery,
          variables: mockVariables,
        },
        maxResponseBytes: 5_000_000,
      });
    });

    it('should accept a Promise<HTTPPort> (backward compatibility)', async () => {
      const mockClient: HTTPPort = {
        request: vi.fn().mockResolvedValue({
          ok: true,
          data: mockResponse,
        }),
      } as any;

      const clientPromise = Promise.resolve(mockClient);

      const result = await executeGraphQL(clientPromise, mockQuery, mockVariables);

      expect(result).toEqual({ viewer: { id: '123' } });
      expect(mockClient.request).toHaveBeenCalledWith('post', 'graphql', {
        json: {
          query: mockQuery,
          variables: mockVariables,
        },
        maxResponseBytes: 5_000_000,
      });
    });

    it('should accept a factory function returning Promise<HTTPPort>', async () => {
      const mockClient: HTTPPort = {
        request: vi.fn().mockResolvedValue({
          ok: true,
          data: mockResponse,
        }),
      } as any;

      const clientFactory = vi.fn().mockResolvedValue(mockClient);

      const result = await executeGraphQL(clientFactory, mockQuery, mockVariables);

      expect(result).toEqual({ viewer: { id: '123' } });
      expect(clientFactory).toHaveBeenCalledTimes(1);
      expect(mockClient.request).toHaveBeenCalledWith('post', 'graphql', {
        json: {
          query: mockQuery,
          variables: mockVariables,
        },
        maxResponseBytes: 5_000_000,
      });
    });

    it('should call factory function on every request (enables OAuth refresh)', async () => {
      let callCount = 0;
      const mockClient: HTTPPort = {
        request: vi.fn().mockResolvedValue({
          ok: true,
          data: mockResponse,
        }),
      } as any;

      const clientFactory = vi.fn(async () => {
        callCount++;
        return mockClient;
      });

      // Call twice
      await executeGraphQL(clientFactory, mockQuery);
      await executeGraphQL(clientFactory, mockQuery);

      expect(callCount).toBe(2);
      expect(clientFactory).toHaveBeenCalledTimes(2);
    });

    it('should throw error on HTTP failure', async () => {
      const mockClient: HTTPPort = {
        request: vi.fn().mockResolvedValue({
          ok: false,
          error: { message: 'Network error' },
        }),
      } as any;

      await expect(executeGraphQL(mockClient, mockQuery)).rejects.toThrow(
        'HTTP error: Network error'
      );
    });

    it('should throw GraphQLError on GraphQL errors', async () => {
      const mockClient: HTTPPort = {
        request: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            errors: [{ message: 'Field not found' }],
          },
        }),
      } as any;

      await expect(executeGraphQL(mockClient, mockQuery)).rejects.toThrow(
        GraphQLError
      );
    });
  });
});
