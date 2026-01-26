/**
 * Unit tests for Shodan DNS Domain wrapper
 *
 * Tests the /dns/domain/{domain} endpoint wrapper following TDD methodology.
 * Endpoint returns DNS records: A, AAAA, CNAME, MX, NS, SOA, TXT
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { dnsDomain } from '../dns-domain.js';
import { shodanHandlers } from './msw-handlers.js';
import { createShodanClientAsync } from '../client.js';
import type { SecretsProvider, HTTPPort } from '../../config/lib/index.js';

// Setup MSW server
const server = setupServer(...shodanHandlers);

// Create test client with mock credentials (async pattern)
const mockProvider: SecretsProvider = {
  name: 'test',
  getSecret: async () => ({ ok: true, value: 'test-api-key' })
};

let testClient: HTTPPort;

beforeAll(async () => {
  server.listen({ onUnhandledRequest: 'error' });
  testClient = await createShodanClientAsync(mockProvider);
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('dnsDomain', () => {
  describe('input validation', () => {
    it('rejects empty domain', async () => {
      await expect(dnsDomain.execute({ domain: '' }, testClient)).rejects.toThrow();
    });

    it('rejects invalid domain format (spaces)', async () => {
      await expect(dnsDomain.execute({ domain: 'invalid domain.com' }, testClient)).rejects.toThrow();
    });

    it('rejects invalid domain format (special chars)', async () => {
      await expect(dnsDomain.execute({ domain: 'invalid@domain.com' }, testClient)).rejects.toThrow();
    });

    it('accepts valid domain', async () => {
      // Should not throw
      const result = await dnsDomain.execute({ domain: 'example.com' }, testClient);
      expect(result).toBeDefined();
    });
  });

  describe('successful responses', () => {
    it('returns filtered DNS records with token estimate', async () => {
      const result = await dnsDomain.execute({ domain: 'example.com' }, testClient);

      expect(result.domain).toBe('example.com');
      expect(result.records).toBeDefined();
      expect(result.records.A).toBeDefined();
      expect(result.records.AAAA).toBeDefined();
      expect(result.records.MX).toBeDefined();
      expect(result.records.NS).toBeDefined();
      expect(result.records.TXT).toBeDefined();
      expect(result.records.CNAME).toBeDefined();
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });

    it('includes subdomains with limit for token efficiency', async () => {
      server.use(
        http.get('https://api.shodan.io/dns/domain/:domain', ({ params }) => {
          return HttpResponse.json({
            domain: params.domain,
            subdomains: Array.from({ length: 50 }, (_, i) => `sub${i}`),
            data: [
              { subdomain: 'www', type: 'A', value: '93.184.216.34' },
            ],
          });
        })
      );

      const result = await dnsDomain.execute({ domain: 'example.com' }, testClient);

      // Should limit subdomains array (e.g., to 20)
      expect(result.subdomains).toBeDefined();
      expect(result.subdomains!.length).toBeLessThanOrEqual(20);
      expect(result.summary?.totalSubdomains).toBe(50);
      expect(result.summary?.hasMoreSubdomains).toBe(true);
    });

    it('returns A records', async () => {
      const result = await dnsDomain.execute({ domain: 'example.com' }, testClient);

      expect(result.records.A).toBeDefined();
      expect(Array.isArray(result.records.A)).toBe(true);
      if (result.records.A && result.records.A.length > 0) {
        expect(result.records.A[0]).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
      }
    });

    it('returns MX records with priority', async () => {
      server.use(
        http.get('https://api.shodan.io/dns/domain/:domain', ({ params }) => {
          return HttpResponse.json({
            domain: params.domain,
            data: [
              { subdomain: '', type: 'MX', value: '10 mail.example.com', priority: 10 },
              { subdomain: '', type: 'MX', value: '20 mail2.example.com', priority: 20 },
            ],
          });
        })
      );

      const result = await dnsDomain.execute({ domain: 'example.com' }, testClient);

      expect(result.records.MX).toBeDefined();
      expect(Array.isArray(result.records.MX)).toBe(true);
      expect(result.records.MX!.length).toBeGreaterThan(0);
    });

    it('returns TXT records', async () => {
      server.use(
        http.get('https://api.shodan.io/dns/domain/:domain', ({ params }) => {
          return HttpResponse.json({
            domain: params.domain,
            data: [
              { subdomain: '', type: 'TXT', value: 'v=spf1 include:_spf.example.com ~all' },
            ],
          });
        })
      );

      const result = await dnsDomain.execute({ domain: 'example.com' }, testClient);

      expect(result.records.TXT).toBeDefined();
      expect(Array.isArray(result.records.TXT)).toBe(true);
      expect(result.records.TXT!.length).toBeGreaterThan(0);
    });
  });

  describe('pagination support', () => {
    it('supports history parameter', async () => {
      let capturedHistory: string | null = null;

      server.use(
        http.get('https://api.shodan.io/dns/domain/:domain', ({ request, params }) => {
          const url = new URL(request.url);
          capturedHistory = url.searchParams.get('history');

          return HttpResponse.json({
            domain: params.domain,
            data: [],
          });
        })
      );

      await dnsDomain.execute({ domain: 'example.com', history: true }, testClient);
      expect(capturedHistory).toBe('true');
    });

    it('supports page parameter', async () => {
      let capturedPage: string | null = null;

      server.use(
        http.get('https://api.shodan.io/dns/domain/:domain', ({ request, params }) => {
          const url = new URL(request.url);
          capturedPage = url.searchParams.get('page');

          return HttpResponse.json({
            domain: params.domain,
            data: [],
          });
        })
      );

      await dnsDomain.execute({ domain: 'example.com', page: 2 }, testClient);
      expect(capturedPage).toBe('2');
    });
  });

  describe('error handling', () => {
    it('handles 404 unknown domain', async () => {
      server.use(
        http.get('https://api.shodan.io/dns/domain/:domain', () => {
          return HttpResponse.json({ error: 'Domain not found' }, { status: 404 });
        })
      );

      await expect(dnsDomain.execute({ domain: 'nonexistent.example' }, testClient)).rejects.toThrow(
        /not found|404/i
      );
    });

    it('handles 401 authentication error', async () => {
      server.use(
        http.get('https://api.shodan.io/dns/domain/:domain', () => {
          return HttpResponse.json({ error: 'Invalid API key' }, { status: 401 });
        })
      );

      await expect(dnsDomain.execute({ domain: 'example.com' }, testClient)).rejects.toThrow(
        /auth|invalid api key/i
      );
    });

    it('handles network timeout', async () => {
      server.use(
        http.get('https://api.shodan.io/dns/domain/:domain', async () => {
          await new Promise((r) => setTimeout(r, 100000));
        })
      );

      await expect(
        dnsDomain.execute({ domain: 'example.com' }, testClient)
      ).rejects.toThrow(/timed out/i);
    }, { timeout: 35000 });
  });

  describe('token optimization', () => {
    it('limits subdomains array to reduce tokens', async () => {
      server.use(
        http.get('https://api.shodan.io/dns/domain/:domain', ({ params }) => {
          return HttpResponse.json({
            domain: params.domain,
            subdomains: Array.from({ length: 100 }, (_, i) => `subdomain${i}.example.com`),
            data: [],
          });
        })
      );

      const result = await dnsDomain.execute({ domain: 'example.com' }, testClient);

      // Should limit to reasonable size (e.g., 20)
      expect(result.subdomains).toBeDefined();
      expect(result.subdomains!.length).toBeLessThanOrEqual(20);
    });

    it('omits verbose internal fields', async () => {
      server.use(
        http.get('https://api.shodan.io/dns/domain/:domain', ({ params }) => {
          return HttpResponse.json({
            domain: params.domain,
            subdomains: ['www'],
            data: [
              {
                subdomain: 'www',
                type: 'A',
                value: '93.184.216.34',
                ttl: 3600,
                last_seen: '2024-01-01T00:00:00Z',
                _internal: 'verbose data',
                metadata: { internal: true },
              },
            ],
            tags: ['web', 'production'],
            more_data_available: true,
          });
        })
      );

      const result = await dnsDomain.execute({ domain: 'example.com' }, testClient);

      // Should not include internal/verbose fields
      expect(result).not.toHaveProperty('_internal');
      expect(result).not.toHaveProperty('metadata');
      expect(result).not.toHaveProperty('more_data_available');
    });

    it('includes summary with counts', async () => {
      server.use(
        http.get('https://api.shodan.io/dns/domain/:domain', ({ params }) => {
          return HttpResponse.json({
            domain: params.domain,
            subdomains: ['www', 'mail', 'ftp'],
            data: [
              { subdomain: 'www', type: 'A', value: '1.2.3.4' },
              { subdomain: 'www', type: 'AAAA', value: '::1' },
              { subdomain: 'mail', type: 'MX', value: '10 mail' },
              { subdomain: '', type: 'NS', value: 'ns1.example.com' },
              { subdomain: '', type: 'NS', value: 'ns2.example.com' },
            ],
          });
        })
      );

      const result = await dnsDomain.execute({ domain: 'example.com' }, testClient);

      expect(result.summary).toBeDefined();
      expect(result.summary?.totalRecords).toBeGreaterThan(0);
      expect(result.summary?.recordTypes).toBeDefined();
    });
  });
});
