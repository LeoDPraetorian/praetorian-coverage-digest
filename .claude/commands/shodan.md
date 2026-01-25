---
description: Use when performing security reconnaissance with Shodan - search hosts, lookup IPs, enumerate DNS records
argument-hint: <describe your operation naturally>
allowed-tools: Bash, Read, Skill
---

# Shodan Security Intelligence

**Speak naturally!** Just describe what you want after `/shodan` - I'll figure it out.

## What You Can Do

- **Search hosts** - Find servers running specific software, ports, or services
- **Lookup IPs** - Get detailed information about a specific IP address
- **Find vulnerabilities** - Check CVEs associated with a host
- **Enumerate DNS** - Get subdomains and DNS records for a domain

I'll automatically parse your natural language and execute the right tool.

---

## Natural Language Examples

### Searching for Hosts

```bash
# All of these work:
/shodan search for nginx servers on port 443
/shodan find hosts running apache
/shodan search port:22 ssh
/shodan find servers on network 192.168.1.0/24
```

### Looking Up IP Addresses

```bash
# Any of these:
/shodan lookup 8.8.8.8
/shodan get info for IP 1.2.3.4
/shodan what ports are open on 8.8.8.8
/shodan check vulnerabilities for 1.2.3.4
```

### DNS Enumeration

```bash
# Domain queries:
/shodan get subdomains for example.com
/shodan enumerate DNS for target.com
/shodan get MX records for company.com
/shodan find all DNS records for domain.com
```

---

## How It Works

1. **You describe** your intent naturally (no rigid syntax required)
2. **I read** the mcp-tools-shodan-api skill for available operations
3. **I parse** your input to extract operation type and parameters
4. **I execute** the appropriate Shodan wrapper with your parameters
5. **I display** clean, token-optimized results back to you

**No memorization needed!** Just tell me what you need in plain language.

---

## Implementation

When you invoke this command, I will:

### Step 1: Detect Repository Root and Read the Shodan Skill

**CRITICAL:** This command works from any directory (including submodules like `modules/chariot/`).

First, detect the super-repo root:

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
```

Then read the skill file:

```bash
Read: $ROOT/.claude/skill-library/claude/mcp-tools/mcp-tools-shodan-api/SKILL.md
```

This gives me context about available tools and execution patterns.

### Step 2: Parse Your Natural Language

I'll analyze your input for:

- **Operation type**: host search, IP lookup, or DNS enumeration
- **Query/Target**: Search query, IP address, or domain name
- **Options**: Page number, history, etc.

### Step 3: Execute the Appropriate Tool

**All commands use dynamic repository root detection** to work from any directory:

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "..." 2>/dev/null
```

Based on your request, I'll execute one of:

**hostSearch** - Search for hosts matching a query

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { hostSearch } = await import('$ROOT/.claude/tools/shodan/index.js');
  const result = await hostSearch.execute({
    query: 'port:443 nginx',
    page: 1
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**hostInfo** - Get detailed information about an IP address

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { hostInfo } = await import('$ROOT/.claude/tools/shodan/index.js');
  const result = await hostInfo.execute({
    ip: '8.8.8.8'
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**dnsDomain** - Get DNS records and subdomains for a domain

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { dnsDomain } = await import('$ROOT/.claude/tools/shodan/index.js');
  const result = await dnsDomain.execute({
    domain: 'example.com'
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### Step 4: Format and Display Results

I'll parse the JSON response and display it in a clean, readable format with:

- For host search: Matching hosts with IPs, ports, and services
- For IP lookup: Open ports, OS, organization, and CVEs
- For DNS: Subdomains, A/AAAA/MX/NS records
- Token count estimates for context awareness

---

## Available Operations

| Operation | Wrapper | Use Case |
|-----------|---------|----------|
| Search hosts | `hostSearch` | Find servers by query (port, product, network) |
| Lookup IP | `hostInfo` | Get details for a specific IP address |
| DNS enum | `dnsDomain` | Get subdomains and DNS records |

### Shodan Query Syntax

Common search filters you can use:

| Filter | Example | Description |
|--------|---------|-------------|
| `port:` | `port:443` | Find hosts with specific port open |
| `product:` | `product:nginx` | Find hosts running specific software |
| `net:` | `net:192.168.1.0/24` | Search within a network range |
| `os:` | `os:windows` | Filter by operating system |
| `country:` | `country:US` | Filter by country |
| `org:` | `org:google` | Filter by organization |
| `ssl:` | `ssl:true` | Find hosts with SSL enabled |
| `vuln:` | `vuln:CVE-2021-44228` | Find hosts vulnerable to specific CVE |

**Combine filters:** `port:443 nginx country:US`

---

## Token Optimization

Shodan responses are automatically optimized for token efficiency:

- **hostSearch**: Max 20 results per page, banners truncated to 200 chars
- **hostInfo**: Internal fields omitted, null values cleaned
- **dnsDomain**: Subdomains limited to 20, records grouped by type

The wrapper automatically reports `estimatedTokens` so you can track context usage.

---

## Authentication

Shodan API requires an API key configured in `.claude/tools/config/credentials.json`:

```json
{
  "shodan": {
    "apiKey": "your-shodan-api-key-here"
  }
}
```

**Get your API key from:** https://account.shodan.io/

---

## Tips for Best Results

- **Be specific**: "nginx servers on port 443" > "find servers"
- **Use Shodan syntax**: Combine filters like `port:22 country:US`
- **Check CVEs**: IP lookup includes `vulns` field with CVE identifiers
- **Paginate**: Use "page 2" for more results from large searches
- **Valid IPs only**: IP lookup requires valid IPv4 addresses

---

## When Something Fails

If you encounter an error with this interface:

1. **State the error**: "The /shodan command returned: [exact error message]"
2. **Show what you tried**: Include the natural language command you used
3. **Check API key**: Verify credentials.json has valid Shodan API key
4. **Ask the user**: "Should I debug the interface or try a different approach?"
5. **Wait for response**: Do not silently fall back to low-level execution

---

## Security Context

**Authorized use only.** Shodan queries should be used for:

- Authorized penetration testing engagements
- Security research on your own infrastructure
- CTF challenges and educational purposes
- Defensive security and threat intelligence

---

## Technical Reference

For developers or debugging, here are the underlying wrapper patterns:

### Host Search (Direct Execution)

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
npx tsx -e "(async () => {
  const { hostSearch } = await import('$ROOT/.claude/tools/shodan/index.js');
  const result = await hostSearch.execute({ query: 'port:443 nginx', page: 1 });
  console.log('Total:', result.summary.total);
  result.matches.slice(0, 5).forEach(m => console.log(\`\${m.ip}:\${m.port} - \${m.product}\`));
})();" 2>/dev/null
```

### Host Info (Direct Execution)

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
npx tsx -e "(async () => {
  const { hostInfo } = await import('$ROOT/.claude/tools/shodan/index.js');
  const result = await hostInfo.execute({ ip: '8.8.8.8' });
  console.log('IP:', result.ip, '| Ports:', result.ports?.join(','), '| Org:', result.org);
})();" 2>/dev/null
```

### DNS Domain (Direct Execution)

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
npx tsx -e "(async () => {
  const { dnsDomain } = await import('$ROOT/.claude/tools/shodan/index.js');
  const result = await dnsDomain.execute({ domain: 'example.com' });
  console.log('Domain:', result.domain, '| Subdomains:', result.summary?.totalSubdomains);
})();" 2>/dev/null
```

---

## Related Skills

For more complex workflows, these library skills are available:

- `mcp-tools-shodan-api` - Low-level wrapper implementations
- `mcp-tools-registry` - Execution patterns for all API tools
