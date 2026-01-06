/**
 * Shodan API Wrappers
 *
 * Token-optimized wrappers for Shodan API endpoints.
 *
 * @example
 * ```typescript
 * import { hostSearch, hostInfo, dnsDomain } from './shodan';
 *
 * // Search for hosts
 * const results = await hostSearch.execute({ query: 'port:443 nginx' });
 *
 * // Get host info
 * const host = await hostInfo.execute({ ip: '8.8.8.8' });
 *
 * // Get DNS records
 * const dns = await dnsDomain.execute({ domain: 'example.com' });
 * ```
 */

export { hostSearch, type HostSearchInput, type HostSearchOutput } from './host-search.js';
export { hostInfo, type HostInfoInput, type HostInfoOutput } from './host-info.js';
export { dnsDomain, type DNSDomainInput, type DNSDomainOutput } from './dns-domain.js';
export { createShodanClient, getShodanClient, shodanConfig } from './client.js';
