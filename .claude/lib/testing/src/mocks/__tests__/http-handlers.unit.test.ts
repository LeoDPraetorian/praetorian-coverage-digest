import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import ky from 'ky';
import {
  HTTPErrors,
  createPaginatedHandler,
  createRateLimitedHandler,
} from '../http-handlers.js';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('HTTPErrors', () => {
  describe('rateLimit', () => {
    it('returns 429 status with Retry-After header', async () => {
      server.use(
        http.get('https://api.test.com/rate-limit', () => {
          return HTTPErrors.rateLimit(60);
        })
      );

      try {
        await ky.get('https://api.test.com/rate-limit', { retry: 0 }).json();
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.response.status).toBe(429);
        expect(error.response.headers.get('Retry-After')).toBe('60');
      }
    });

    it('uses default Retry-After of 60 seconds', async () => {
      server.use(
        http.get('https://api.test.com/rate-limit-default', () => {
          return HTTPErrors.rateLimit();
        })
      );

      try {
        await ky.get('https://api.test.com/rate-limit-default', { retry: 0 }).json();
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.response.headers.get('Retry-After')).toBe('60');
      }
    });
  });

  describe('unauthorized', () => {
    it('returns 401 status', async () => {
      server.use(
        http.get('https://api.test.com/unauthorized', () => {
          return HTTPErrors.unauthorized();
        })
      );

      try {
        await ky.get('https://api.test.com/unauthorized').json();
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('forbidden', () => {
    it('returns 403 status', async () => {
      server.use(
        http.get('https://api.test.com/forbidden', () => {
          return HTTPErrors.forbidden();
        })
      );

      try {
        await ky.get('https://api.test.com/forbidden').json();
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.response.status).toBe(403);
      }
    });
  });

  describe('notFound', () => {
    it('returns 404 status with resource message', async () => {
      server.use(
        http.get('https://api.test.com/notfound', () => {
          return HTTPErrors.notFound('user');
        })
      );

      try {
        await ky.get('https://api.test.com/notfound').json();
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        const data = await error.response.json();
        expect(data.error).toContain('user');
      }
    });
  });

  describe('serverError', () => {
    it('returns 500 status', async () => {
      server.use(
        http.get('https://api.test.com/server-error', () => {
          return HTTPErrors.serverError();
        })
      );

      try {
        await ky.get('https://api.test.com/server-error').json();
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.response.status).toBe(500);
      }
    });
  });

  describe('timeout', () => {
    it('delays indefinitely (for timeout testing)', async () => {
      server.use(
        http.get('https://api.test.com/timeout', () => {
          return HTTPErrors.timeout();
        })
      );

      const startTime = Date.now();
      try {
        await ky.get('https://api.test.com/timeout', { timeout: 100 }).json();
        expect.fail('Should have timed out');
      } catch (error: any) {
        const duration = Date.now() - startTime;
        expect(duration).toBeGreaterThan(90); // Close to 100ms timeout
        expect(duration).toBeLessThan(200); // But not much longer
      }
    });
  });
});

describe('createPaginatedHandler', () => {
  it('returns paginated results', async () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ id: i, name: `Item ${i}` }));

    server.use(createPaginatedHandler('https://api.test.com/items', items, 20));

    // Page 1
    const page1 = await ky.get('https://api.test.com/items?page=1').json<any>();
    expect(page1.items).toHaveLength(20);
    expect(page1.total).toBe(50);
    expect(page1.page).toBe(1);
    expect(page1.hasMore).toBe(true);
    expect(page1.items[0].id).toBe(0);

    // Page 2
    const page2 = await ky.get('https://api.test.com/items?page=2').json<any>();
    expect(page2.items).toHaveLength(20);
    expect(page2.total).toBe(50);
    expect(page2.page).toBe(2);
    expect(page2.hasMore).toBe(true);
    expect(page2.items[0].id).toBe(20);

    // Page 3 (last page)
    const page3 = await ky.get('https://api.test.com/items?page=3').json<any>();
    expect(page3.items).toHaveLength(10); // Remaining items
    expect(page3.total).toBe(50);
    expect(page3.page).toBe(3);
    expect(page3.hasMore).toBe(false);
    expect(page3.items[0].id).toBe(40);
  });

  it('defaults to page 1 when no page parameter', async () => {
    const items = [{ id: 1 }, { id: 2 }];

    server.use(createPaginatedHandler('https://api.test.com/items', items, 10));

    const response = await ky.get('https://api.test.com/items').json<any>();
    expect(response.page).toBe(1);
    expect(response.items).toHaveLength(2);
  });

  it('uses custom page size', async () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));

    server.use(createPaginatedHandler('https://api.test.com/items', items, 5));

    const page1 = await ky.get('https://api.test.com/items?page=1').json<any>();
    expect(page1.items).toHaveLength(5);
    expect(page1.hasMore).toBe(true);
  });
});

describe('createRateLimitedHandler', () => {
  it('returns rate limit error for first N attempts', async () => {
    let attempts = 0;

    server.use(
      createRateLimitedHandler(
        'https://api.test.com/limited',
        2, // Fail first 2 attempts
        { success: true }
      )
    );

    // First attempt - rate limited
    try {
      await ky.get('https://api.test.com/limited', { retry: 0 }).json();
      expect.fail('Should have been rate limited');
    } catch (error: any) {
      expect(error.response.status).toBe(429);
      expect(error.response.headers.get('Retry-After')).toBe('1');
    }

    // Second attempt - rate limited
    try {
      await ky.get('https://api.test.com/limited', { retry: 0 }).json();
      expect.fail('Should have been rate limited');
    } catch (error: any) {
      expect(error.response.status).toBe(429);
    }

    // Third attempt - succeeds
    const response = await ky.get('https://api.test.com/limited', { retry: 0 }).json<any>();
    expect(response.success).toBe(true);
  });

  it('succeeds immediately when attemptsBeforeSuccess is 0', async () => {
    server.use(
      createRateLimitedHandler(
        'https://api.test.com/immediate',
        0, // No rate limiting
        { data: 'success' }
      )
    );

    const response = await ky.get('https://api.test.com/immediate').json<any>();
    expect(response.data).toBe('success');
  });
});
