import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { HttpResponse, graphql } from 'msw';
import {
  deleteInitiative,
  deleteInitiativeParams,
  deleteInitiativeOutput,
} from './delete-initiative';

// Setup MSW server with Linear GraphQL endpoint
const linearApi = graphql.link('https://api.linear.app/graphql');

const server = setupServer(
  // Delete Initiative mutation handler
  linearApi.mutation('InitiativeDelete', () => {
    return HttpResponse.json({
      data: {
        initiativeDelete: {
          success: true,
        },
      },
    });
  })
);

describe('deleteInitiative', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterAll(() => server.close());
  afterEach(() => server.resetHandlers());

  it('should delete initiative successfully', async () => {
    const result = await deleteInitiative.execute(
      { id: 'init-1' },
      'test-token'
    );

    expect(result.success).toBe(true);
    expect(result.estimatedTokens).toBeGreaterThan(0);
  });

  it('should reject empty id', () => {
    const input = { id: '' };
    expect(() => deleteInitiativeParams.parse(input)).toThrow();
  });

  it('should handle GraphQL errors', async () => {
    server.use(
      linearApi.mutation('InitiativeDelete', () => {
        return HttpResponse.json({
          errors: [{ message: 'Initiative not found' }],
        });
      })
    );

    await expect(
      deleteInitiative.execute({ id: 'nonexistent' }, 'test-token')
    ).rejects.toThrow('Initiative not found');
  });

  it('should have correct metadata', () => {
    expect(deleteInitiative.name).toBe('linear.delete_initiative');
    expect(deleteInitiative.tokenEstimate.reduction).toBe('99%');
  });
});
