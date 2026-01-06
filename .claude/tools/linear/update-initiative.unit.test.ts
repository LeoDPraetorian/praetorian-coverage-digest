import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import {
  updateInitiative,
  updateInitiativeParams,
  updateInitiativeOutput,
} from './update-initiative';
import { graphql, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer();

beforeAll(() => server.listen());
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

describe('updateInitiative', () => {
  it('should update initiative successfully', async () => {
    server.use(
      graphql.link('https://api.linear.app/graphql').operation((req, res, ctx) => {
        return HttpResponse.json({
          data: {
            initiativeUpdate: {
              success: true,
              initiative: { id: 'init-1', name: 'Updated Name' },
            },
          },
        });
      })
    );

    const result = await updateInitiative.execute(
      { id: 'init-1', name: 'Updated Name' },
      'Bearer test-token'
    );
    expect(result.success).toBe(true);
    expect(result.initiative.name).toBe('Updated Name');
  });

  it('should reject missing id', () => {
    const input = { name: 'Test' };
    expect(() => updateInitiativeParams.parse(input)).toThrow();
  });

  it('should have correct metadata', () => {
    expect(updateInitiative.name).toBe('linear.update_initiative');
    expect(updateInitiative.tokenEstimate.reduction).toBe('99%');
  });
});
