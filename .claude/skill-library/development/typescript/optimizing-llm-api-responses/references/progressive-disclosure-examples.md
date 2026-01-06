# Progressive Disclosure Examples

**Real-world patterns for hierarchical response design.**

## Overview

Progressive disclosure is the most powerful token reduction strategy (90-95% reduction) but requires careful API design. This reference provides real-world examples from Chariot and common API patterns.

## Example 1: Vulnerability Management

### Without Progressive Disclosure (15,000 tokens)

```typescript
async function getVulnerabilities() {
  return await api.getVulnerabilities(); // Returns 100+ vulns with full details
}
```

**Problem**: Agent receives all vulnerabilities upfront, exhausts context window.

### With Progressive Disclosure (550 tokens)

```typescript
// Step 1: Summary (50 tokens)
async function getVulnerabilitySummary() {
  const vulns = await api.getVulnerabilities();
  return {
    total: vulns.length,
    bySeverity: {
      critical: vulns.filter((v) => v.severity === "critical").length,
      high: vulns.filter((v) => v.severity === "high").length,
      medium: vulns.filter((v) => v.severity === "medium").length,
      low: vulns.filter((v) => v.severity === "low").length,
    },
    topCVEs: vulns
      .filter((v) => v.cve)
      .slice(0, 5)
      .map((v) => v.cve),
  };
}

// Step 2: Details for severity (500 tokens)
async function getVulnerabilityDetails(severity: string, limit = 20) {
  const vulns = await api.getVulnerabilities();
  return vulns
    .filter((v) => v.severity === severity)
    .slice(0, limit)
    .map((v) => ({
      id: v.id,
      title: v.title,
      cve: v.cve,
      severity: v.severity,
      affectedAssets: v.affectedAssets.length,
    }));
}
```

**Agent workflow**:

1. Call `getVulnerabilitySummary()` → See "5 critical vulnerabilities"
2. Call `getVulnerabilityDetails('critical')` → Get critical details
3. Total: 550 tokens vs 15,000

## Example 2: Asset Discovery

### Without Progressive Disclosure (20,000 tokens)

```typescript
async function getAssets() {
  return await api.getAssets(); // 200+ assets with nested relationships
}
```

### With Progressive Disclosure (800 tokens)

```typescript
// Level 1: Counts by class (50 tokens)
async function getAssetCounts() {
  const assets = await api.getAssets();
  return {
    total: assets.length,
    byClass: {
      ipv4: assets.filter((a) => a.class === "ipv4").length,
      domain: assets.filter((a) => a.class === "domain").length,
      port: assets.filter((a) => a.class === "port").length,
    },
  };
}

// Level 2: List by class (300 tokens)
async function getAssetsByClass(assetClass: string, limit = 20) {
  const assets = await api.getAssets();
  return assets
    .filter((a) => a.class === assetClass)
    .slice(0, limit)
    .map((a) => ({
      id: a.id,
      name: a.name,
      status: a.status,
    }));
}

// Level 3: Full details (450 tokens)
async function getAssetDetails(assetId: string) {
  const asset = await api.getAsset(assetId);
  return {
    id: asset.id,
    name: asset.name,
    class: asset.class,
    status: asset.status,
    attributes: asset.attributes,
    risks: asset.risks.slice(0, 10).map((r) => ({
      id: r.id,
      title: r.title,
      severity: r.severity,
    })),
  };
}
```

**Agent workflow**:

1. `getAssetCounts()` → "50 domains, 200 IPs"
2. `getAssetsByClass('domain')` → List of domains
3. `getAssetDetails(domainId)` → Full details for specific domain
4. Total: 800 tokens vs 20,000

## Example 3: Search Results

### Without Progressive Disclosure (30,000 tokens)

```typescript
async function search(query: string) {
  return await api.search(query); // 500+ results with full content
}
```

### With Progressive Disclosure (1,200 tokens)

```typescript
// Level 1: Summary with facets (200 tokens)
async function searchSummary(query: string) {
  const results = await api.search(query);
  return {
    total: results.length,
    facets: {
      byType: groupBy(results, "type"),
      bySeverity: groupBy(results, "severity"),
    },
    preview: results.slice(0, 3).map((r) => r.title),
  };
}

// Level 2: Results page (1,000 tokens)
async function searchResults(query: string, page = 0, limit = 10) {
  const results = await api.search(query);
  const start = page * limit;
  return {
    results: results.slice(start, start + limit).map((r) => ({
      id: r.id,
      title: r.title,
      snippet: truncateWithIndicator(r.content, 200),
    })),
    pagination: {
      page,
      limit,
      total: results.length,
      hasNext: start + limit < results.length,
    },
  };
}
```

## Example 4: Log Streaming

### Without Progressive Disclosure (streaming 100k tokens)

```typescript
async function getLogs() {
  return await api.getLogs(); // All logs, chronological
}
```

### With Progressive Disclosure (2,000 tokens)

```typescript
// Level 1: Statistics (100 tokens)
async function getLogStats() {
  const logs = await api.getLogs();
  return {
    total: logs.length,
    byLevel: {
      error: logs.filter((l) => l.level === "error").length,
      warn: logs.filter((l) => l.level === "warn").length,
      info: logs.filter((l) => l.level === "info").length,
    },
    timeRange: {
      start: logs[0]?.timestamp,
      end: logs[logs.length - 1]?.timestamp,
    },
  };
}

// Level 2: Filtered logs (1,900 tokens)
async function getLogsByLevel(level: string, limit = 50) {
  const logs = await api.getLogs();
  return logs
    .filter((l) => l.level === level)
    .slice(0, limit)
    .map((l) => ({
      timestamp: l.timestamp,
      level: l.level,
      message: truncateWithIndicator(l.message, 200),
    }));
}
```

## Design Guidelines

**When to use progressive disclosure**:

1. Data has natural hierarchy (counts → lists → details)
2. Typical use cases need only subset of data
3. Total dataset > 5,000 tokens
4. Results can be grouped/filtered meaningfully

**API structure**:

```typescript
// Level 1: Always summary/counts (50-200 tokens)
getSummary() → { total, counts, preview }

// Level 2: Filtered lists (500-1000 tokens)
getList(filter, limit) → { items[], pagination }

// Level 3: Full details (500-2000 tokens)
getDetails(id) → { ...full object with nested data }
```

## Token Comparison Table

| Pattern         | Without PD | With PD | Reduction |
| --------------- | ---------- | ------- | --------- |
| Vulnerabilities | 15,000     | 550     | 96%       |
| Asset Discovery | 20,000     | 800     | 96%       |
| Search Results  | 30,000     | 1,200   | 96%       |
| Log Streaming   | 100,000    | 2,000   | 98%       |

## Checklist

- [ ] Summary endpoint returns counts/stats only
- [ ] List endpoint supports filtering and pagination
- [ ] Details endpoint available for deep dives
- [ ] Agent workflow documented (which endpoints to call when)
- [ ] Token estimates included in responses

## Related

- Parent: [optimizing-llm-api-responses](../SKILL.md)
- See also: [Token Estimation](token-estimation.md)
