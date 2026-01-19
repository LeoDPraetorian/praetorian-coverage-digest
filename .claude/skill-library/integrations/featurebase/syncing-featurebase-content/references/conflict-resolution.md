# Conflict Resolution Strategies

**Techniques for resolving conflicts when both FeatureBase and local files changed.**

---

## Current Implementation: Last Writer Wins with Skip

### Algorithm

1. Fetch current state from FeatureBase API
2. Compare `updatedAt` timestamps
3. If API newer: Skip update, add to conflicts array
4. If local newer: Proceed with PATCH
5. Report conflicts for manual resolution

### Code Pattern

```typescript
// sync-from-markdown implementation
for (const file of changedFiles) {
  const frontmatter = parseFrontmatter(file);

  // Fetch current API state
  const current = await getTool.execute({
    id: frontmatter.featurebaseId
  }, client);

  // Timestamp comparison
  const apiUpdatedAt = new Date(current.updatedAt);
  const localUpdatedAt = new Date(frontmatter.updatedAt);

  if (apiUpdatedAt > localUpdatedAt) {
    // API wins - skip update
    conflicts.push({
      file: file.path,
      reason: 'API has newer changes',
      apiUpdatedAt: apiUpdatedAt.toISOString(),
      localUpdatedAt: localUpdatedAt.toISOString(),
      resolution: 'skipped'
    });
    continue;
  }

  // Local wins - proceed with update
  await updateTool.execute({
    id: frontmatter.featurebaseId,
    ...updateData
  }, client);

  results.updated++;
}
```

---

## Resolution Options

### Option 1: Keep Remote (FeatureBase Wins) - Recommended

**When to use:** API content is more authoritative (e.g., user updated via FeatureBase UI)

**Process:**
1. Re-run pull sync to overwrite local files
2. Discard local changes
3. Start fresh from API state

**Command:**

```bash
# Pull latest from FeatureBase, force overwrite
npx tsx .github/scripts/featurebase-pull-sync.ts --force
```

**Pros:**
- Simple and safe
- Preserves user edits made in FeatureBase UI
- No risk of overwriting important changes

**Cons:**
- Loses local changes
- Requires manual re-application of local edits

### Option 2: Keep Local (Force Push) - DANGEROUS

**When to use:** Local content is definitely correct (e.g., fixing typo, API data corrupt)

**Process:**
1. Re-run push sync with force flag
2. Ignore `updatedAt` checks
3. Overwrite API with local content

**Command:**

```bash
# Force push local changes, ignore conflicts
npx tsx .github/scripts/featurebase-push-sync.ts --force
```

**Pros:**
- Preserves local work
- Useful for correcting API errors

**Cons:**
- **Dangerous:** Can overwrite user edits made in FeatureBase UI
- No safety net
- Should only be used when certain local is correct

### Option 3: Manual Review - Per File

**When to use:** Need to decide on a case-by-case basis

**Process:**

1. Review conflicts array from sync results
2. For each conflict:
   - View local content: `cat modules/chariot/docs/featurebase/posts/{file}.md`
   - View API content: Call `get-post` MCP tool
   - Compare differences
   - Decide which to keep or manually merge

**Example workflow:**

```bash
# 1. Get conflict list
npx tsx .github/scripts/featurebase-push-sync.ts --dry-run

# 2. For each conflict, view both versions
cat modules/chariot/docs/featurebase/posts/post_abc123-feature.md

# 3. Use MCP tool to fetch API version
# (via Claude MCP integration)

# 4. Manually merge in editor
vim modules/chariot/docs/featurebase/posts/post_abc123-feature.md

# 5. Update updatedAt timestamp to current time
# 6. Re-run push sync
npx tsx .github/scripts/featurebase-push-sync.ts
```

**Pros:**
- Full control over resolution
- Can preserve changes from both sides
- Safest for important content

**Cons:**
- Time-consuming
- Requires human judgment
- Not automated

---

## Alternative Strategies (Industry)

### Field-Level Merge

**Pattern:** Resolve conflicts at field level, not record level.

**Example:**
- API updated `title`: "Feature Request"
- Local updated `content`: "Updated description..."
- **Merge both**: Take API's title, local's content

**Implementation (not currently used):**

```typescript
// Field-level merge pattern
const apiFields = await fetchFromAPI(id);
const localFields = parseLocalFile(file);

const merged = {};

for (const field of Object.keys(localFields)) {
  if (apiFields[field] !== localFields[field]) {
    // Conflict detected on this field

    if (apiUpdatedAt[field] > localUpdatedAt[field]) {
      merged[field] = apiFields[field]; // API wins
    } else {
      merged[field] = localFields[field]; // Local wins
    }
  } else {
    merged[field] = localFields[field]; // No conflict
  }
}

await updateAPI(id, merged);
```

**When to use:**
- Frequent conflicts on independent fields
- Documents with many fields
- Multiple collaborators editing different sections

**Trade-offs:**
- More complex implementation
- Requires per-field timestamp tracking
- May still have conflicts (both changed same field)

### Vector Clocks

**Pattern:** Track causality, not just time.

**Example:**

```json
{
  "id": "post_123",
  "title": "Feature Request",
  "vector_clock": {
    "featurebase_api": 5,
    "github_local": 3
  }
}
```

**Conflict detection:**
- If `api > local`: API wins (causal order)
- If `local > api`: Local wins
- If neither > other: Concurrent modification (true conflict)

**When to use:**
- Clock skew is a problem
- Need true concurrent modification detection
- Distributed systems with multiple writers

**Trade-offs:**
- Complex implementation
- Requires API support
- Every update increments counter

### ETag-Based Optimistic Concurrency

**Pattern:** HTTP-native conflict detection via If-Match headers.

**Flow:**

```http
GET /api/posts/123
ETag: "v5-abc123"

...

PUT /api/posts/123
If-Match: "v5-abc123"
Content: {...}

Response: 412 Precondition Failed (if ETag changed)
```

**When to use:**
- API supports ETags
- Want HTTP-native solution
- Simpler than vector clocks

**Implementation (if FeatureBase API supports):**

```typescript
// Fetch with ETag
const response = await client.get(`/api/posts/${id}`);
const etag = response.headers.get('etag');
const post = response.data;

// Update with If-Match
try {
  await client.patch(`/api/posts/${id}`, {
    json: updatedData,
    headers: {
      'If-Match': etag
    }
  });
} catch (err) {
  if (err.response.status === 412) {
    // Conflict detected - API changed since we fetched
    conflicts.push({
      file,
      reason: 'ETag mismatch',
      resolution: 'manual_review_required'
    });
  }
}
```

---

## Conflict Prevention Strategies

### 1. Clear Ownership

**Assign content types to systems:**

- **Posts:** User-facing, edited primarily in FeatureBase UI → API is authoritative
- **Changelog:** Internal, edited primarily in Git → Local is authoritative
- **Articles:** Mixed, edited in both → Conflicts expected, use manual review

### 2. Communication Channels

**Before editing content:**
- Check if others are working on it
- Use git branches for local edits
- Coordinate via team chat for API edits

### 3. Shorter Sync Intervals

**Current:** Daily pull (24hr lag)

**Enhancement:** More frequent pulls (e.g., every 6 hours) reduce conflict window.

**Trade-off:** More API calls, potential rate limiting.

### 4. Real-Time Locking (Advanced)

**Pattern:** Lock content while being edited.

**Not implemented, but possible:**
- Webhook notifies when content opened for edit in FeatureBase UI
- Lock file in Git with placeholder commit
- Unlock when edit complete

**Trade-off:** Complex, rare conflicts may not justify effort.

---

## When Conflicts Occur

### Typical Scenarios

1. **User edited in FeatureBase UI between daily pulls**
   - Resolution: Keep remote (Option 1)

2. **Developer edited locally, forgot to pull first**
   - Resolution: Pull, manually merge changes, push again

3. **Automated script updated content via API**
   - Resolution: Check script logic, may need adjustment

4. **Clock skew caused incorrect timestamp comparison**
   - Resolution: Manual review, consider vector clocks

### Debugging Conflicts

**Information to gather:**

1. Conflict array from sync results
2. Last pull timestamp (`syncedAt` in frontmatter)
3. Local file `updatedAt`
4. API response `updatedAt`
5. Recent edit history (git log + FeatureBase activity log)

**Resolution decision tree:**

```
Is local edit more recent?
  Yes → Was it intentional?
    Yes → Force push (Option 2)
    No → Keep remote (Option 1)
  No → Keep remote (Option 1)

Is local edit critical?
  Yes → Manual merge (Option 3)
  No → Keep remote (Option 1)
```

---

## Future Enhancements

### 1. Conflict Resolution UI

**Concept:** Web UI showing:
- Side-by-side diff
- Field-by-field comparison
- One-click resolution (keep local/remote/merge)
- History of past conflicts

### 2. Automated Resolution Policies

**Per content type:**

```json
{
  "posts": {
    "policy": "remote_wins",
    "exceptions": {
      "status": "manual_review"
    }
  },
  "changelog": {
    "policy": "local_wins"
  },
  "articles": {
    "policy": "field_level_merge",
    "fields": {
      "title": "newest",
      "content": "manual_review",
      "tags": "union"
    }
  }
}
```

### 3. Three-Way Merge

**Pattern:** Compare API, local, and last synced version.

**Benefits:**
- Detect what changed on each side
- Auto-merge non-overlapping changes
- Only manual review for true conflicts

**Requires:** Store last synced snapshot for comparison.

---

## Related Skills

- `troubleshooting-featurebase-sync` - Debugging conflict issues
- `creating-featurebase-content` - Avoiding conflicts by proper creation
