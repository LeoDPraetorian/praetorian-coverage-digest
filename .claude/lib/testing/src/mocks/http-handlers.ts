/**
 * Generic HTTP mock utilities for REST API testing
 *
 * Provides reusable MSW handlers for common HTTP scenarios like pagination,
 * rate limiting, and error responses.
 */

import { http, HttpResponse } from 'msw';

/**
 * Predefined HTTP error responses for testing
 */
export const HTTPErrors = {
  /**
   * Rate limit error (429) with Retry-After header
   */
  rateLimit: (retryAfter = 60) =>
    HttpResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    ),

  /**
   * Unauthorized error (401)
   */
  unauthorized: () =>
    HttpResponse.json({ error: 'Unauthorized' }, { status: 401 }),

  /**
   * Forbidden error (403)
   */
  forbidden: () =>
    HttpResponse.json({ error: 'Forbidden' }, { status: 403 }),

  /**
   * Not found error (404)
   */
  notFound: (resource: string) =>
    HttpResponse.json({ error: `Not found: ${resource}` }, { status: 404 }),

  /**
   * Server error (500)
   */
  serverError: () =>
    HttpResponse.json({ error: 'Internal server error' }, { status: 500 }),

  /**
   * Timeout simulation (delays indefinitely)
   */
  timeout: () =>
    new Promise((resolve) => setTimeout(resolve, 100000)) as never,
};

/**
 * Create a paginated list response handler
 *
 * @param url - URL pattern to match
 * @param items - Full list of items to paginate
 * @param pageSize - Number of items per page (default: 20)
 * @returns MSW request handler
 *
 * @example
 * ```typescript
 * const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
 * server.use(createPaginatedHandler('https://api.test.com/items', items, 10));
 * ```
 */
export function createPaginatedHandler<T>(
  url: string,
  items: T[],
  pageSize = 20
) {
  return http.get(url, ({ request }) => {
    const requestUrl = new URL(request.url);
    const page = parseInt(requestUrl.searchParams.get('page') || '1', 10);
    const offset = (page - 1) * pageSize;
    const pageItems = items.slice(offset, offset + pageSize);

    return HttpResponse.json({
      items: pageItems,
      total: items.length,
      page,
      hasMore: offset + pageItems.length < items.length,
    });
  });
}

/**
 * Create a rate-limited handler that succeeds after N attempts
 *
 * @param url - URL pattern to match
 * @param attemptsBeforeSuccess - Number of 429 responses before success
 * @param successResponse - Response to return on success
 * @returns MSW request handler
 *
 * @example
 * ```typescript
 * server.use(
 *   createRateLimitedHandler(
 *     'https://api.test.com/limited',
 *     2, // Fail first 2 attempts
 *     { success: true }
 *   )
 * );
 * ```
 */
export function createRateLimitedHandler(
  url: string,
  attemptsBeforeSuccess: number,
  successResponse: unknown
) {
  let attempts = 0;
  return http.get(url, () => {
    attempts++;
    if (attempts <= attemptsBeforeSuccess) {
      return HttpResponse.json(
        { error: 'Rate limit' },
        { status: 429, headers: { 'Retry-After': '1' } }
      );
    }
    return HttpResponse.json(successResponse);
  });
}
