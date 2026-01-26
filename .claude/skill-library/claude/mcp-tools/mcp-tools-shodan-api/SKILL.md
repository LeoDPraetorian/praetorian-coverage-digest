---
name: mcp-tools-shodan-api
description: Use when performing security reconnaissance with Shodan - provides token-optimized wrappers for host search, IP lookups, and DNS enumeration
allowed-tools: Read, Bash
---

# Shodan API Wrappers

**Token-optimized REST API wrappers for Shodan security intelligence.**

## Execution Pattern

**Execute wrappers using Bash tool with npx tsx:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { hostSearch } = await import('$ROOT/.claude/tools/shodan/index.js');

  const result = await hostSearch.execute({
    query: 'port:443 nginx',
    page: 1
  });

  console.log('Total:', result.summary.total);
  console.log('First 5 matches:');
  result.matches.slice(0, 5).forEach(m =>
    console.log(\`  \${m.ip}:\${m.port} - \${m.product || 'unknown'}\`)
  );
})();" 2>/dev/null
```

## When to Use

Use these wrappers when:

- Searching for hosts running specific software/services
- Enumerating open ports on an IP address
- Discovering subdomains for a target domain
- Finding CVEs/vulnerabilities for specific hosts
- Performing network reconnaissance

## Available Wrappers

### hostSearch - Search Hosts by Query

**File:** `.claude/tools/shodan/host-search.ts`
**Endpoint:** `/shodan/host/search`

**Purpose:** Search Shodan for hosts matching a query

**Input:**

```typescript
{
  query: string;        // Shodan search query (required)
  page?: number;        // Page 1-100, default 1
  facets?: string;      // Facet filters (optional)
}
```

**Output:**

```typescript
{
  summary: {
    total: number; // Total matches found
    returned: number; // Matches in this response (max 20)
    hasMore: boolean; // More results available
    query: string; // Original query
  }
  matches: Array<{
    ip: string;
    port: number;
    protocol?: string;
    product?: string;
    version?: string;
    os?: string;
    org?: string;
    hostnames?: string[];
    bannerPreview?: string; // Truncated to 200 chars
  }>;
  estimatedTokens: number;
}
```

**Token Optimization:**

- Limits to 20 results per page
- Truncates banners to 200 characters
- Limits hostnames array to 3 items
- Omits internal fields (\_shodan, opts, location)

**Execution:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { hostSearch } = await import('$ROOT/.claude/tools/shodan/index.js');
  const result = await hostSearch.execute({ query: 'port:443 nginx', page: 1 });
  result.matches.slice(0, 5).forEach(m => console.log(\`\${m.ip}:\${m.port} - \${m.product}\`));
})();" 2>/dev/null
```

### hostInfo - Get Host Details by IP

**File:** `.claude/tools/shodan/host-info.ts`
**Endpoint:** `/shodan/host/{ip}`

**Purpose:** Get detailed information about a specific IP address

**Input:**

```typescript
{
  ip: string;          // IPv4 address (required, validated)
  history?: boolean;   // Include historical data
  minify?: boolean;    // Return minified response
}
```

**Output:**

```typescript
{
  ip: string;
  ports?: number[];
  os?: string;
  org?: string;
  asn?: string;
  hostnames?: string[];
  domains?: string[];
  vulns?: string[];        // CVE identifiers
  estimatedTokens: number;
}
```

**Token Optimization:**

- Omits internal fields (\_shodan, opts, location)
- Omits large data blobs
- Null values converted to undefined

**Execution:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { hostInfo } = await import('$ROOT/.claude/tools/shodan/index.js');
  const result = await hostInfo.execute({ ip: '8.8.8.8' });
  console.log('IP:', result.ip, '| Ports:', result.ports?.join(','), '| Org:', result.org);
})();" 2>/dev/null
```

### dnsDomain - Get DNS Records

**File:** `.claude/tools/shodan/dns-domain.ts`
**Endpoint:** `/dns/domain/{domain}`

**Purpose:** Get DNS records and subdomains for a domain

**Input:**

```typescript
{
  domain: string;      // Domain name (required, validated)
  history?: boolean;   // Include historical records
  page?: number;       // Page 1-100 (optional)
}
```

**Output:**

```typescript
{
  domain: string;
  subdomains?: string[];  // Limited to 20
  records: {
    A?: string[];
    AAAA?: string[];
    MX?: string[];
    NS?: string[];
    TXT?: string[];
    CNAME?: string[];
    SOA?: string[];
  };
  summary?: {
    totalSubdomains: number;
    hasMoreSubdomains: boolean;
    totalRecords: number;
    recordTypes: Record<string, number>;
  };
  estimatedTokens: number;
}
```

**Token Optimization:**

- Limits subdomains to 20 items
- Groups records by type
- Includes summary statistics

**Execution:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { dnsDomain } = await import('$ROOT/.claude/tools/shodan/index.js');
  const result = await dnsDomain.execute({ domain: 'google.com' });
  console.log('Domain:', result.domain, '| A records:', result.records.A?.slice(0,3).join(','));
  console.log('Subdomains:', result.summary?.totalSubdomains);
})();" 2>/dev/null
```

## Use Cases

| Task                  | Wrapper    | Example Query              |
| --------------------- | ---------- | -------------------------- |
| Find nginx servers    | hostSearch | `port:443 nginx`           |
| Find hosts on network | hostSearch | `net:192.168.1.0/24`       |
| Check open ports      | hostInfo   | `{ ip: '1.2.3.4' }`        |
| Find CVEs on host     | hostInfo   | Check `vulns` field        |
| Enumerate subdomains  | dnsDomain  | `{ domain: 'target.com' }` |
| Get MX records        | dnsDomain  | Check `records.MX`         |

## Setup

Shodan API key is stored in 1Password:

- **Vault:** "Claude Code Tools"
- **Item:** "Shodan API Key"
- **Field:** password

The first API call will prompt for biometric authentication. Credentials are cached for 15 minutes.

**Legacy (deprecated):** credentials.json is no longer supported. Migrate to 1Password.

## Testing

**For development/testing**, inject a mock client:

```typescript
import { createShodanClient } from ".claude/tools/shodan";

const testClient = createShodanClient({ apiKey: "test-key" });
const result = await hostSearch.execute({ query: "test" }, testClient);
```

**Run existing tests:**

```bash
cd .claude && npm test -- tools/shodan/__tests__/
```

## Architecture

Built on the HTTP client infrastructure at `.claude/tools/config/lib/http-client.ts`:

- Ky-based HTTP client with retry logic
- Result type for explicit error handling
- MSW for HTTP mocking in tests
- Zod schemas for validation

**See:** `.claude/.output/api-wrappers/http-client-architecture.md` for complete architecture

## Related Skills

- `orchestrating-api-tool-development` - Create new REST API wrappers
- `gateway-mcp-tools` - Routes to tool-related skills
