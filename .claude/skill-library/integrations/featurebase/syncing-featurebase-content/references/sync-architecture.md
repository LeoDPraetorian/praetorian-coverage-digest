# Bidirectional Sync Architecture

**Technical details of FeatureBase two-way synchronization system.**

---

## Architecture Overview

### File-Based Sync Pattern

**Core principle:** Markdown files with YAML frontmatter serve as the source of truth.

**Benefits:**
- Git-based version control with full history
- Human-readable and editable
- PR workflow for review before API push
- Merge conflict resolution via standard git tools

**Trade-offs:**
- Eventual consistency (not real-time)
- Daily schedule creates up to 24hr sync lag
- No automatic conflict resolution

### Dual-Direction Workflows

**Pull (API → Local):**
```
FeatureBase API → sync-to-markdown → Markdown files → Git → PR → Review → Merge
```

**Trigger:** Daily at 6 AM UTC (GitHub Actions cron)

**Process:**
1. Fetch all posts/changelog/articles via API
2. Transform to markdown with YAML frontmatter
3. Detect changes with `git diff`
4. Create timestamped branch
5. Commit changes and push
6. Create PR for human review

**Push (Local → API):**
```
Git → PR merge → git diff → sync-from-markdown → FeatureBase API
```

**Trigger:** PR merged to main with changes in `modules/chariot/docs/featurebase/`

**Process:**
1. Detect changed/deleted files
2. Parse YAML frontmatter
3. Validate schema
4. POST (create) or PATCH (update) or DELETE
5. Comment sync results on PR

---

## Timestamp-Based Conflict Detection

### Implementation

```typescript
// Fetch current state from API
const current = await getTool.execute({ id: featurebaseId }, client);
const apiUpdatedAt = new Date(current.updatedAt);
const localUpdatedAt = new Date(frontmatter.updatedAt);

// Skip update if API is newer
if (apiUpdatedAt > localUpdatedAt) {
  conflicts.push({
    file,
    reason: `API has newer changes`,
    apiUpdatedAt: apiUpdatedAt.toISOString(),
    localUpdatedAt: localUpdatedAt.toISOString()
  });
  continue; // Skip update
}

// Otherwise, proceed with PATCH
await updateTool.execute({ id: featurebaseId, ...data }, client);
```

### Type-Specific Configuration

**Posts:**
- Conflict checking: **Enabled**
- Rationale: User-facing content, concurrent edits likely

**Articles:**
- Conflict checking: **Enabled**
- Rationale: Documentation, simultaneous updates possible

**Changelog:**
- Conflict checking: **Disabled**
- Rationale: Append-only, local always wins

---

## Progressive ID Assignment

**Challenge:** New content doesn't have a FeatureBase ID yet.

**Solution:**
1. Create markdown file WITHOUT `featurebaseId` in frontmatter
2. POST to FeatureBase API during push sync
3. API returns newly created ID
4. Write ID back to markdown file frontmatter
5. Commit the updated file

**Example:**

```markdown
---
# Before POST (no ID)
title: "New Feature Request"
status: "open"
boardId: "board_abc123"
---

Content here...
```

After POST:

```markdown
---
# After POST (ID written back)
featurebaseId: "post_xyz789"
title: "New Feature Request"
status: "open"
boardId: "board_abc123"
createdAt: "2026-01-14T10:00:00Z"
updatedAt: "2026-01-14T10:00:00Z"
---

Content here...
```

---

## Error Handling and Resilience

### Individual Error Collection

**Pattern:** Don't fail entire sync on single error.

```typescript
const errors = [];
const results = {
  filesProcessed: 0,
  created: 0,
  updated: 0,
  deleted: 0,
  conflicts: []
};

for (const file of files) {
  try {
    // Sync logic
    results.updated++;
  } catch (err) {
    errors.push({
      file,
      type: 'update',
      error: err.message,
      context: {featurebaseId, title}
    });
  }
}

return { ...results, errors };
```

### HTTP Retry Logic

**Implemented via Ky library:**

```typescript
retry: {
  limit: 3,
  methods: ['get', 'post', 'put', 'patch', 'delete'],
  statusCodes: [408, 429, 500, 502, 503, 504]
}
```

**Exponential backoff:**
- 1st retry: ~1 second
- 2nd retry: ~2 seconds
- 3rd retry: ~4 seconds

**Retryable status codes:**
- 408: Request Timeout
- 429: Too Many Requests (rate limit)
- 5xx: Server errors

---

## Security Hardening

### YAML Parsing Protection

**Threats mitigated:**
- Prototype pollution attacks
- YAML bomb (excessive nesting)
- Malicious payload injection

**Implementation:**

```typescript
import * as yaml from 'js-yaml';

// Use SAFE_SCHEMA (no arbitrary code execution)
const parsed = yaml.load(content, { schema: yaml.SAFE_SCHEMA });

// Additional validation
if (content.length > 1024 * 1024) { // 1MB limit
  throw new Error('YAML file too large');
}

// Depth limit check
const maxDepth = 20;
if (checkDepth(parsed) > maxDepth) {
  throw new Error('YAML nesting too deep');
}
```

---

## Alternative Patterns (Industry)

### Cursor-Based Pagination

**When to use:** Datasets > 100K records

**Current:** FeatureBase sync uses list operations (likely offset-based)

**Enhancement:** If FeatureBase API supports cursors

```typescript
// Cursor-based pagination pattern
let cursor = null;
const allItems = [];

do {
  const response = await client.get('/api/posts', {
    searchParams: { limit: 100, cursor }
  });

  allItems.push(...response.data);
  cursor = response.next_cursor;
} while (response.has_more);
```

### Webhooks for Real-Time Sync

**When to use:** Need <1 minute sync latency

**Current:** Daily scheduled pull (24hr lag acceptable for roadmap content)

**Enhancement:** If FeatureBase API supports webhooks

```typescript
// Webhook receiver pattern
app.post('/webhooks/featurebase', async (req, res) => {
  const signature = req.headers['x-featurebase-signature'];

  // Verify webhook signature
  if (!verifySignature(req.body, signature)) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.body;

  if (event.type === 'post.updated') {
    // Trigger incremental pull for specific post
    await syncSinglePost(event.data.id);
  }

  res.status(200).send('OK');
});
```

### Incremental Sync with State Tracking

**When to use:** Large datasets, frequent syncs

**Current:** Full list fetch every time

**Enhancement:** Track last sync timestamp

```typescript
// Incremental sync pattern
const lastSyncTime = await getLastSyncTime();

const response = await client.get('/api/posts', {
  searchParams: {
    updated_after: lastSyncTime.toISOString(),
    limit: 100
  }
});

// Only fetch posts updated since last sync
for (const post of response.data) {
  await syncPost(post);
}

await setLastSyncTime(new Date());
```

---

## Performance Characteristics

**Current sync times (estimated):**

| Content Type | Count | Time | Bottleneck |
| --- | --- | --- | --- |
| Posts | <1000 | ~30s | API pagination |
| Changelog | <100 | ~5s | Network latency |
| Articles | <50 | ~3s | File writes |

**Scaling limits:**

- Offset pagination degrades at >10K records
- Full list fetch becomes slow at >100K records
- Git commit/push scales well (tested to 10K files)

**Optimization opportunities:**

1. Cursor-based pagination (if API supports)
2. Parallel API requests (rate limit permitting)
3. Incremental sync (only fetch changes)
4. Compression for large markdown files

---

## Related Patterns

See `.claude/skill-library/integrations/hackerone/sync-patterns.md` for alternative sync architecture using:
- Incremental sync with DynamoDB state
- Cursor-based pagination
- Webhooks + polling fallback
- Last-write-wins with explicit conflict resolution
