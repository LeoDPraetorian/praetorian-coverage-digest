/**
 * MSW handlers for Shodan API mocking
 *
 * Provides mock HTTP responses for testing Shodan wrappers without hitting the real API.
 */

import { http, HttpResponse } from 'msw';

/**
 * Shared MSW handlers for Shodan API endpoints
 */
export const shodanHandlers = [
  // Host search endpoint: /shodan/host/search
  http.get('https://api.shodan.io/shodan/host/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('query');
    const key = url.searchParams.get('key');
    const page = url.searchParams.get('page');

    // Auth check
    if (!key || key === 'invalid') {
      return HttpResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Empty query
    if (!query) {
      return HttpResponse.json({ error: 'Query required' }, { status: 400 });
    }

    // Simulate rate limit trigger
    if (url.searchParams.get('trigger_rate_limit') === 'true') {
      return HttpResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: { 'Retry-After': '1' },
        }
      );
    }

    // Simulate timeout trigger
    if (url.searchParams.get('trigger_timeout') === 'true') {
      return new Promise((resolve) => setTimeout(resolve, 100000)) as never;
    }

    // Simulate large response (check facets parameter for trigger)
    const facets = url.searchParams.get('facets') || '';
    if (facets.includes('trigger_large_banner')) {
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
    }

    // Simulate many results (for pagination test)
    if (facets.includes('trigger_many_results')) {
      const matches = Array.from({ length: 50 }, (_, i) => ({
        ip_str: `192.168.1.${i}`,
        port: 80,
        transport: 'tcp',
        product: 'nginx',
      }));
      return HttpResponse.json({ matches, total: 50 });
    }

    // Simulate internal fields that should be filtered
    if (facets.includes('trigger_internal_fields')) {
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
    }

    // Default successful response
    return HttpResponse.json({
      matches: [
        {
          ip_str: '8.8.8.8',
          port: 53,
          transport: 'udp',
          product: 'Google DNS',
          version: '1.0',
          os: 'Linux',
          asn: 'AS15169',
          org: 'Google LLC',
          isp: 'Google',
          hostnames: ['dns.google'],
          domains: ['google.com'],
          timestamp: '2026-01-04T12:00:00.000000',
          data: 'DNS Server Response data here...',
        },
      ],
      total: 1,
    });
  }),

  // Host info endpoint: /shodan/host/{ip}
  http.get('https://api.shodan.io/shodan/host/:ip', ({ params, request }) => {
    const { ip } = params;
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    // Auth check
    if (!key || key === 'invalid') {
      return HttpResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Mock 404 for unknown IP
    if (ip === '1.1.1.1') {
      return HttpResponse.json({ error: 'No information available for that IP.' }, { status: 404 });
    }

    // Mock successful response
    return HttpResponse.json({
      ip_str: ip,
      ports: [53, 443, 80],
      os: 'Linux',
      org: 'Google LLC',
      asn: 'AS15169',
      hostnames: ['dns.google', 'dns.google.com'],
      domains: ['google.com'],
      vulns: ['CVE-2021-1234', 'CVE-2021-5678'],
      // Internal fields that should be filtered out
      _shodan: {
        crawler: 'google-bot',
        module: 'http',
        id: 'internal-id',
      },
      opts: {
        raw: 'internal-option',
      },
      location: {
        city: 'Mountain View',
        country_code: 'US',
        latitude: 37.386,
        longitude: -122.084,
      },
      data: [
        {
          port: 53,
          transport: 'udp',
          data: 'A'.repeat(5000), // Large data blob to test filtering
        },
        {
          port: 443,
          transport: 'tcp',
          data: 'B'.repeat(3000),
        },
      ],
    });
  }),

  // DNS domain endpoint: /dns/domain/{domain}
  http.get('https://api.shodan.io/dns/domain/:domain', ({ params, request }) => {
    const { domain } = params;
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    // Auth check
    if (!key || key === 'invalid') {
      return HttpResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Mock 404 for nonexistent domains
    if (domain === 'nonexistent.example') {
      return HttpResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Mock successful DNS response
    return HttpResponse.json({
      domain: domain,
      subdomains: ['www', 'mail', 'ftp', 'api', 'cdn'],
      data: [
        { subdomain: '', type: 'A', value: '93.184.216.34', ttl: 3600 },
        { subdomain: '', type: 'AAAA', value: '2606:2800:220:1:248:1893:25c8:1946', ttl: 3600 },
        { subdomain: '', type: 'MX', value: '10 mail.example.com', priority: 10 },
        { subdomain: '', type: 'MX', value: '20 mail2.example.com', priority: 20 },
        { subdomain: '', type: 'NS', value: 'ns1.example.com' },
        { subdomain: '', type: 'NS', value: 'ns2.example.com' },
        { subdomain: '', type: 'TXT', value: 'v=spf1 include:_spf.example.com ~all' },
        { subdomain: '', type: 'CNAME', value: 'cdn.example.com' },
        { subdomain: 'www', type: 'A', value: '93.184.216.35', ttl: 1800 },
        { subdomain: 'mail', type: 'A', value: '93.184.216.36', ttl: 1800 },
      ],
      tags: ['web', 'production'],
      more_data_available: false,
    });
  }),

  // Rate limit simulation
  http.get('https://api.shodan.io/shodan/host/ratelimit-test', () => {
    return HttpResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: { 'Retry-After': '60' },
      }
    );
  }),
];
