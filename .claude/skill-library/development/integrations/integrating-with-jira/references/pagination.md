# Jira Pagination Reference

**Pagination strategies including migration from offset-based to token-based pagination.**

## Critical: Pagination Architecture Migration

Jira is transitioning pagination methods with significant performance implications:

| Feature               | Legacy (`/rest/api/3/search`)          | New (`/rest/api/3/search/jql`) |
| --------------------- | -------------------------------------- | ------------------------------ |
| **Pagination**        | Offset-based (`startAt`, `maxResults`) | Token-based (`nextPageToken`)  |
| **Parallel Fetching** | ✅ Supported (3-5x faster)             | ❌ Sequential only             |
| **Data Consistency**  | ⚠️ Results can change between pages    | ✅ Consistent snapshots        |
| **Status**            | Deprecated August 2025                 | Active, required               |

**Performance Impact**: Migration from parallel to sequential results in **3-5x slower data retrieval** for large datasets.

## Offset-Based Pagination (Legacy)

**Endpoint**: `GET /rest/api/3/search`

**Parameters**:

- `startAt`: Zero-based index of first result (default: 0)
- `maxResults`: Maximum results per page (default: 50, max: varies)
- `jql`: JQL query string

**Response**:

```json
{
  "expand": "names,schema",
  "startAt": 0,
  "maxResults": 100,
  "total": 5000,
  "issues": [...]
}
```

**Implementation** (parallel-friendly):

```typescript
async function searchAllIssuesParallel(jql: string): Promise<Issue[]> {
  // Fetch first page to get total count
  const firstPage = await fetch(
    `${baseUrl}/rest/api/3/search?` + `jql=${encodeURIComponent(jql)}&` + `startAt=0&maxResults=100`
  ).then((r) => r.json());

  const total = firstPage.total;
  const pageCount = Math.ceil(total / 100);

  if (pageCount === 1) {
    return firstPage.issues;
  }

  // Fetch remaining pages in parallel
  const pagePromises = Array.from({ length: pageCount - 1 }, (_, i) =>
    fetch(
      `${baseUrl}/rest/api/3/search?` +
        `jql=${encodeURIComponent(jql)}&` +
        `startAt=${(i + 1) * 100}&maxResults=100`
    ).then((r) => r.json())
  );

  const remainingPages = await Promise.all(pagePromises);

  return [...firstPage.issues, ...remainingPages.flatMap((page) => page.issues)];
}
```

**Advantage**: 3-5x faster for large datasets due to parallel fetching.

**Disadvantage**: Results can change between page fetches (inconsistent snapshots).

## Token-Based Pagination (Current)

**Endpoint**: `POST /rest/api/3/search/jql`

**Request**:

```json
{
  "jql": "project = PROJ ORDER BY created DESC",
  "fields": ["key", "summary", "status"],
  "maxResults": 100
}
```

**Response**:

```json
{
  "issues": [...],
  "nextPageToken": "abc123...",
  "total": 5000
}
```

**Implementation** (sequential):

```typescript
async function searchAllIssuesSequential(jql: string): Promise<Issue[]> {
  const allIssues: Issue[] = [];
  let nextPageToken: string | undefined;

  do {
    const body: any = {
      jql,
      fields: ["key", "summary", "status"],
      maxResults: 100,
    };

    if (nextPageToken) {
      body.nextPageToken = nextPageToken;
    }

    const response = await fetch(`${baseUrl}/rest/api/3/search/jql`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }).then((r) => r.json());

    allIssues.push(...response.issues);
    nextPageToken = response.nextPageToken;
  } while (nextPageToken);

  return allIssues;
}
```

**Advantage**: Consistent data snapshots (results don't change during pagination).

**Disadvantage**: Sequential execution only, 3-5x slower than parallel offset-based.

## Hybrid Pagination Strategy

Use offset-based when available, fall back to token-based:

```typescript
async function searchAllIssues(jql: string): Promise<Issue[]> {
  const config = await detectJiraConfig(baseUrl);

  // Use legacy parallel pagination if available
  if (config.supportsOffsetPagination) {
    return searchAllIssuesParallel(jql);
  }

  // Fall back to sequential token pagination
  return searchAllIssuesSequential(jql);
}

async function detectJiraConfig(baseUrl: string) {
  const serverInfo = await fetch(`${baseUrl}/rest/api/3/serverInfo`).then((r) => r.json());
  const version = parseVersion(serverInfo.version);

  return {
    supportsOffsetPagination: version.major < 11, // Jira 11+ removed offset
  };
}
```

## Dynamic maxResults Optimization

The `maxResults` limit varies based on response payload size:

| Scenario                       | Typical maxResults |
| ------------------------------ | ------------------ |
| All fields                     | 50-100             |
| Minimal fields (`key,summary`) | 1,000-5,000        |
| With expansions (`changelog`)  | 10-50              |

**Optimization**: Request fewer fields to increase page size:

```typescript
// Heavy payload → low maxResults
const heavy = await search(jql, "*all"); // maxResults: 50

// Light payload → high maxResults
const light = await search(jql, "key,summary,status"); // maxResults: 1,000+
```

**Implementation**:

```typescript
async function searchWithOptimalPagination(
  jql: string,
  fields: string[] = ["key", "summary", "status"]
): Promise<Issue[]> {
  // Fewer fields = higher maxResults capacity
  const maxResults = fields.length <= 5 ? 1000 : 100;

  return searchAllIssues(jql, {
    fields: fields.join(","),
    maxResults,
  });
}
```

## Pagination Best Practices

### 1. Always Specify Fields

```typescript
// Bad: Returns all fields, low maxResults
const issues = await search(jql);

// Good: Returns only needed fields, high maxResults
const issues = await search(jql, {
  fields: "key,summary,status,assignee",
  maxResults: 1000,
});
```

### 2. Use ORDER BY for Consistency

```typescript
// Bad: Inconsistent ordering between pages
const jql = "project = PROJ";

// Good: Consistent ordering
const jql = "project = PROJ ORDER BY key ASC";
```

### 3. Handle Empty Pages

```typescript
async function searchAllIssues(jql: string): Promise<Issue[]> {
  const allIssues: Issue[] = [];
  let startAt = 0;

  while (true) {
    const response = await search(jql, { startAt, maxResults: 100 });

    if (response.issues.length === 0) {
      break; // No more results
    }

    allIssues.push(...response.issues);

    // Check if we've fetched all
    if (allIssues.length >= response.total) {
      break;
    }

    startAt += response.issues.length;
  }

  return allIssues;
}
```

### 4. Progress Reporting

```typescript
async function searchWithProgress(
  jql: string,
  onProgress: (fetched: number, total: number) => void
): Promise<Issue[]> {
  const allIssues: Issue[] = [];
  let startAt = 0;

  const firstPage = await search(jql, { startAt: 0, maxResults: 100 });
  allIssues.push(...firstPage.issues);
  onProgress(allIssues.length, firstPage.total);

  while (allIssues.length < firstPage.total) {
    startAt += 100;
    const page = await search(jql, { startAt, maxResults: 100 });
    allIssues.push(...page.issues);
    onProgress(allIssues.length, firstPage.total);
  }

  return allIssues;
}

// Usage
const issues = await searchWithProgress(jql, (fetched, total) => {
  console.log(`Progress: ${fetched}/${total} (${Math.round((fetched / total) * 100)}%)`);
});
```

## Known Issues

### Duplicate Issues Across Pages

**Problem**: With offset pagination, concurrent issue creation/deletion can cause duplicates or missing issues.

**Solution**: Use token-based pagination for data integrity, or deduplicate by issue key:

```typescript
const allIssues = await searchAllIssues(jql);
const uniqueIssues = [...new Map(allIssues.map((i) => [i.key, i])).values()];
```

### nextPageToken Infinite Loop (Bug)

**Problem**: Some Jira versions return the same `nextPageToken` repeatedly.

**Solution**: Track seen tokens and break on repeat:

```typescript
async function searchSafely(jql: string): Promise<Issue[]> {
  const allIssues: Issue[] = [];
  const seenTokens = new Set<string>();
  let nextPageToken: string | undefined;

  do {
    const response = await search(jql, { nextPageToken });
    allIssues.push(...response.issues);

    if (response.nextPageToken && seenTokens.has(response.nextPageToken)) {
      console.warn("Detected infinite pagination loop, breaking");
      break;
    }

    seenTokens.add(response.nextPageToken);
    nextPageToken = response.nextPageToken;
  } while (nextPageToken);

  return allIssues;
}
```

### Jira 10.3.5+ Pagination Breaking

**Problem**: Some Jira 10.3.5+ instances break pagination beyond 100 results.

**Solution**: Monitor Atlassian status page and use workarounds:

```typescript
// Workaround: Use multiple JQL queries with date ranges
const issues = await searchInDateRanges(jql, {
  start: "2024-01-01",
  end: "2024-12-31",
  chunkDays: 7, // Query 7 days at a time
});
```

## Common Pitfalls

| Pitfall                  | Cause                              | Solution                       |
| ------------------------ | ---------------------------------- | ------------------------------ |
| Missing issues           | Parallel pagination + data changes | Use token-based or deduplicate |
| Slow performance         | Token pagination sequential        | Optimize with field limiting   |
| 400 on large startAt     | startAt > total results            | Check total before paginating  |
| Infinite loop            | Bug in nextPageToken               | Track seen tokens              |
| Timeout on large queries | Too many results                   | Add date ranges to JQL         |
