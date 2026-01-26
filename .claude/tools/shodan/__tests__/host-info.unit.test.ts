/**
 * Unit tests for Shodan host-info wrapper
 *
 * Tests the /shodan/host/{ip} endpoint wrapper following TDD methodology.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { hostInfo } from '../host-info.js';
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

describe('hostInfo', () => {
  describe('input validation', () => {
    it('rejects invalid IP format (non-IPv4)', async () => {
      await expect(hostInfo.execute({ ip: 'not-an-ip' }, testClient)).rejects.toThrow();
    });

    it('rejects IPv6 addresses', async () => {
      await expect(hostInfo.execute({ ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7334' }, testClient)).rejects.toThrow();
    });

    it('rejects empty IP', async () => {
      await expect(hostInfo.execute({ ip: '' }, testClient)).rejects.toThrow();
    });

    it('accepts valid IPv4 address', async () => {
      const result = await hostInfo.execute({ ip: '8.8.8.8' }, testClient);
      expect(result).toBeDefined();
    });
  });

  describe('successful responses', () => {
    it('returns filtered host information with essential fields', async () => {
      const result = await hostInfo.execute({ ip: '8.8.8.8' }, testClient);

      // Check essential fields are present
      expect(result.ip).toBe('8.8.8.8');
      expect(result.ports).toEqual([53, 443, 80]);
      expect(result.os).toBe('Linux');
      expect(result.org).toBe('Google LLC');
      expect(result.asn).toBe('AS15169');
      expect(result.hostnames).toEqual(['dns.google', 'dns.google.com']);
      expect(result.domains).toEqual(['google.com']);
      expect(result.vulns).toEqual(['CVE-2021-1234', 'CVE-2021-5678']);
    });

    it('includes token estimation', async () => {
      const result = await hostInfo.execute({ ip: '8.8.8.8' }, testClient);
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });

    it('handles optional history parameter', async () => {
      const result = await hostInfo.execute({ ip: '8.8.8.8', history: true }, testClient);
      expect(result).toBeDefined();
    });

    it('handles optional minify parameter', async () => {
      const result = await hostInfo.execute({ ip: '8.8.8.8', minify: true }, testClient);
      expect(result).toBeDefined();
    });
  });

  describe('response filtering (token optimization)', () => {
    it('omits internal _shodan field', async () => {
      const result = await hostInfo.execute({ ip: '8.8.8.8' }, testClient);
      expect(result).not.toHaveProperty('_shodan');
    });

    it('omits internal opts field', async () => {
      const result = await hostInfo.execute({ ip: '8.8.8.8' }, testClient);
      expect(result).not.toHaveProperty('opts');
    });

    it('omits location details', async () => {
      const result = await hostInfo.execute({ ip: '8.8.8.8' }, testClient);
      expect(result).not.toHaveProperty('location');
    });

    it('omits large data blobs', async () => {
      const result = await hostInfo.execute({ ip: '8.8.8.8' }, testClient);
      expect(result).not.toHaveProperty('data');
    });
  });

  describe('error handling', () => {
    it('handles 404 for unknown IP', async () => {
      await expect(hostInfo.execute({ ip: '1.1.1.1' }, testClient)).rejects.toThrow(/404|not found/i);
    });

    it('handles 401 authentication error', async () => {
      server.use(
        http.get('https://api.shodan.io/shodan/host/:ip', () => {
          return HttpResponse.json({ error: 'Invalid API key' }, { status: 401 });
        })
      );

      await expect(hostInfo.execute({ ip: '8.8.8.8' }, testClient)).rejects.toThrow(/401|auth/i);
    });

    it('handles network timeout', async () => {
      server.use(
        http.get('https://api.shodan.io/shodan/host/:ip', async () => {
          await new Promise((r) => setTimeout(r, 100000));
        })
      );

      await expect(
        hostInfo.execute({ ip: '8.8.8.8' }, testClient)
      ).rejects.toThrow(/timed out/i);
    }, { timeout: 35000 });
  });

  describe('optional parameters', () => {
    it('handles history=true query parameter', async () => {
      let capturedUrl: string | undefined;

      server.use(
        http.get('https://api.shodan.io/shodan/host/:ip', ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            ip_str: '8.8.8.8',
            ports: [80],
            os: null,
            org: 'Test',
            asn: 'AS1234',
          });
        })
      );

      await hostInfo.execute({ ip: '8.8.8.8', history: true }, testClient);
      expect(capturedUrl).toContain('history=true');
    });

    it('handles minify=true query parameter', async () => {
      let capturedUrl: string | undefined;

      server.use(
        http.get('https://api.shodan.io/shodan/host/:ip', ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            ip_str: '8.8.8.8',
            ports: [80],
            os: null,
            org: 'Test',
            asn: 'AS1234',
          });
        })
      );

      await hostInfo.execute({ ip: '8.8.8.8', minify: true }, testClient);
      expect(capturedUrl).toContain('minify=true');
    });
  });

  describe('edge cases', () => {
    it('handles missing optional fields gracefully', async () => {
      server.use(
        http.get('https://api.shodan.io/shodan/host/:ip', () => {
          return HttpResponse.json({
            ip_str: '192.168.1.1',
            ports: [],
            // All optional fields missing
          });
        })
      );

      const result = await hostInfo.execute({ ip: '192.168.1.1' }, testClient);
      expect(result.ip).toBe('192.168.1.1');
      expect(result.ports).toBeUndefined(); // Empty array is filtered to undefined
    });

    it('handles null values in response', async () => {
      server.use(
        http.get('https://api.shodan.io/shodan/host/:ip', () => {
          return HttpResponse.json({
            ip_str: '192.168.1.1',
            ports: [80],
            os: null,
            org: null,
            asn: null,
            hostnames: null,
            domains: null,
            vulns: null,
          });
        })
      );

      const result = await hostInfo.execute({ ip: '192.168.1.1' }, testClient);
      expect(result.ip).toBe('192.168.1.1');
      // Optional fields should be undefined when null
      expect(result.os).toBeUndefined();
      expect(result.org).toBeUndefined();
    });
  });
});
