/**
 * Unit tests for Shodan host search wrapper
 *
 * Following TDD methodology: Write tests FIRST, watch them FAIL, then implement.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { hostSearch } from '../host-search.js';
import { shodanHandlers } from './msw-handlers.js';
import { createShodanClient } from '../client.js';

// Setup MSW server
const server = setupServer(...shodanHandlers);

// Create test client with mock credentials
const testClient = createShodanClient({ apiKey: 'test-api-key' });

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('hostSearch', () => {
  describe('input validation', () => {
    it('rejects empty query', async () => {
      await expect(
        hostSearch.execute({ query: '' }, testClient)
      ).rejects.toThrow();
    });

    it('rejects invalid page number (0)', async () => {
      await expect(
        hostSearch.execute({ query: 'test', page: 0 }, testClient)
      ).rejects.toThrow();
    });

    it('rejects invalid page number (>100)', async () => {
      await expect(
        hostSearch.execute({ query: 'test', page: 101 }, testClient)
      ).rejects.toThrow();
    });

    it('accepts valid page number', async () => {
      const result = await hostSearch.execute({ query: 'test', page: 1 }, testClient);
      expect(result).toBeDefined();
    });
  });

  describe('successful responses', () => {
    it('returns filtered results with token estimate', async () => {
      const result = await hostSearch.execute({ query: 'port:53 google' }, testClient);

      // Summary validation
      expect(result.summary).toBeDefined();
      expect(result.summary.total).toBe(1);
      expect(result.summary.returned).toBe(1);
      expect(result.summary.hasMore).toBe(false);
      expect(result.summary.query).toBe('port:53 google');

      // Matches validation
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0]).toEqual({
        ip: '8.8.8.8',
        port: 53,
        protocol: 'udp',
        product: 'Google DNS',
        version: '1.0',
        os: 'Linux',
        org: 'Google LLC',
        hostnames: ['dns.google'],
        bannerPreview: 'DNS Server Response data here...',
      });

      // Token estimation
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });

    it('truncates large banner data to 200 chars', async () => {
      // Override handler for this test
      server.use(
        http.get('https://api.shodan.io/shodan/host/search', ({ request }) => {
          const url = new URL(request.url);
          if (url.searchParams.get('trigger_large_banner') !== 'true') {
            return;
          }
          return HttpResponse.json({
            matches: [
              {
                ip_str: '1.2.3.4',
                port: 80,
                transport: 'tcp',
                data: 'A'.repeat(1000), // Large banner
                product: 'nginx',
              },
            ],
            total: 1,
          });
        })
      );

      const result = await hostSearch.execute({
        query: 'test',
        facets: 'trigger_large_banner:true',
      }, testClient);

      expect(result.matches[0].bannerPreview).toBeDefined();
      expect(result.matches[0].bannerPreview!.length).toBeLessThanOrEqual(200);
    });

    it('handles default page parameter', async () => {
      const result = await hostSearch.execute({ query: 'test' }, testClient);
      expect(result).toBeDefined();
      expect(result.summary.returned).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('handles 401 authentication error', async () => {
      // Override handler for this test
      server.use(
        http.get('https://api.shodan.io/shodan/host/search', () => {
          return HttpResponse.json(
            { error: 'Invalid API key' },
            { status: 401 }
          );
        })
      );

      await expect(
        hostSearch.execute({ query: 'test' }, testClient)
      ).rejects.toThrow(/auth|invalid/i);
    });

    it('handles 429 rate limit error', async () => {
      let attempts = 0;
      server.use(
        http.get('https://api.shodan.io/shodan/host/search', () => {
          attempts++;
          if (attempts === 1) {
            return HttpResponse.json(
              { error: 'Rate limit' },
              { status: 429, headers: { 'Retry-After': '1' } }
            );
          }
          return HttpResponse.json({ matches: [], total: 0 });
        })
      );

      const result = await hostSearch.execute({ query: 'test' }, testClient);
      expect(result.summary.total).toBe(0);
      expect(attempts).toBeGreaterThanOrEqual(2); // Confirms retry occurred
    });

    it('handles network timeout', async () => {
      server.use(
        http.get('https://api.shodan.io/shodan/host/search', async () => {
          await new Promise((r) => setTimeout(r, 100000));
          return HttpResponse.json({ matches: [], total: 0 });
        })
      );

      await expect(
        hostSearch.execute({ query: 'test' }, testClient)
      ).rejects.toThrow(/timed out/i);
    }, { timeout: 35000 });
  });

  describe('token optimization', () => {
    it('limits results to 20 items', async () => {
      // Override handler for this test
      server.use(
        http.get('https://api.shodan.io/shodan/host/search', ({ request }) => {
          const url = new URL(request.url);
          if (url.searchParams.get('trigger_many_results') !== 'true') {
            return;
          }
          const matches = Array.from({ length: 50 }, (_, i) => ({
            ip_str: `192.168.1.${i}`,
            port: 80,
            transport: 'tcp',
            product: 'nginx',
          }));
          return HttpResponse.json({ matches, total: 50 });
        })
      );

      const result = await hostSearch.execute({
        query: 'test',
        facets: 'trigger_many_results:true',
      }, testClient);

      expect(result.matches).toHaveLength(20);
      expect(result.summary.hasMore).toBe(true);
      expect(result.summary.total).toBe(50);
    });

    it('omits internal Shodan fields', async () => {
      // Override handler for this test
      server.use(
        http.get('https://api.shodan.io/shodan/host/search', ({ request }) => {
          const url = new URL(request.url);
          if (url.searchParams.get('trigger_internal_fields') !== 'true') {
            return;
          }
          return HttpResponse.json({
            matches: [
              {
                ip_str: '1.2.3.4',
                port: 80,
                transport: 'tcp',
                product: 'nginx',
                _shodan: { module: 'http' },
                opts: { internal: true },
                location: { city: 'NYC', country: 'US' },
              },
            ],
            total: 1,
          });
        })
      );

      const result = await hostSearch.execute({
        query: 'test',
        facets: 'trigger_internal_fields:true',
      }, testClient);

      const match = result.matches[0];
      expect(match).not.toHaveProperty('_shodan');
      expect(match).not.toHaveProperty('opts');
      expect(match).not.toHaveProperty('location');
    });

    it('limits hostnames array to 3 items', async () => {
      // Override handler for this test
      server.use(
        http.get('https://api.shodan.io/shodan/host/search', () => {
          return HttpResponse.json({
            matches: [
              {
                ip_str: '1.2.3.4',
                port: 80,
                hostnames: ['host1', 'host2', 'host3', 'host4', 'host5'],
              },
            ],
            total: 1,
          });
        })
      );

      const result = await hostSearch.execute({ query: 'test' }, testClient);
      expect(result.matches[0].hostnames).toHaveLength(3);
    });
  });

  describe('schema validation', () => {
    it('validates input schema', () => {
      expect(hostSearch.inputSchema).toBeDefined();
      expect(hostSearch.inputSchema.parse({ query: 'test' })).toEqual({
        query: 'test',
        page: 1, // Default value
      });
    });

    it('validates output schema', () => {
      expect(hostSearch.outputSchema).toBeDefined();
    });
  });
});
