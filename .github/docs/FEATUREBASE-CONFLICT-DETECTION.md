# FeatureBase Conflict Detection

## Current Status

**Not yet implemented.** This document outlines the design for conflict detection in the push workflow.

## Problem

When pushing local changes to FeatureBase, there's a risk of overwriting content that was edited directly in FeatureBase UI after the local markdown was last pulled.

**Scenario:**
1. Pull markdown from FeatureBase (Day 1, 10:00 AM)
2. User edits post in FeatureBase UI (Day 1, 2:00 PM)
3. Developer edits local markdown (Day 1, 3:00 PM)
4. Push workflow runs (Day 1, 4:00 PM)
5. **Result:** FeatureBase changes from 2:00 PM are overwritten

## Proposed Solution

### Approach 1: Timestamp-Based Conflict Detection

Check `updatedAt` timestamps before updating:

```typescript
// In sync-from-markdown.ts, before calling update API:
async function updatePost(postId: string, content: string, frontmatter: any, client: any) {
  // Fetch current post from FeatureBase
  const existingPost = await getPost.execute({ postId }, client);

  // Compare timestamps
  const featurebaseUpdated = new Date(existingPost.updatedAt);
  const localUpdated = new Date(frontmatter.updatedAt || 0);

  if (featurebaseUpdated > localUpdated) {
    console.warn(`⚠️  Conflict detected for post ${postId}`);
    console.warn(`    FeatureBase updated: ${featurebaseUpdated.toISOString()}`);
    console.warn(`    Local updated: ${localUpdated.toISOString()}`);
    console.warn(`    Skipping update to prevent overwrite`);

    return {
      status: 'conflict',
      message: 'FeatureBase has newer changes',
    };
  }

  // Proceed with update
  const result = await updatePost.execute({ postId, ...params }, client);
  return { status: 'updated', result };
}
```

### Approach 2: Content Hash Comparison

Compare content hashes to detect actual changes:

```typescript
import crypto from 'crypto';

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function detectConflict(postId: string, localContent: string, client: any) {
  const existingPost = await getPost.execute({ postId }, client);
  const existingHash = hashContent(existingPost.content);
  const localHash = hashContent(localContent);

  // If content is identical, no conflict (even if timestamps differ)
  if (existingHash === localHash) {
    return { conflict: false, reason: 'content-identical' };
  }

  // Check if FeatureBase was modified after local
  const featurebaseUpdated = new Date(existingPost.updatedAt);
  const localUpdated = new Date(frontmatter.updatedAt || 0);

  if (featurebaseUpdated > localUpdated) {
    return { conflict: true, reason: 'newer-remote-changes' };
  }

  return { conflict: false };
}
```

### Approach 3: Three-Way Merge

Most sophisticated: detect if local and remote both diverged from last pull:

1. Store hash of content at last pull in frontmatter
2. On push, fetch current remote content
3. Compare:
   - If remote hash == stored hash → safe to update (only local changed)
   - If remote hash != stored hash AND local changed → conflict (both changed)
   - If remote hash != stored hash BUT local unchanged → pull first

## Implementation Plan

### Phase 1: Basic Timestamp Check (Low-hanging fruit)

**Files to modify:**
- `.claude/tools/featurebase/sync-from-markdown.ts`

**Changes:**
1. Add optional `detectConflicts` parameter (default: `true`)
2. Before updating, fetch existing content from FeatureBase
3. Compare `updatedAt` timestamps
4. Skip update and log warning if conflict detected
5. Return conflict statistics in result

**Effort:** ~30 minutes

### Phase 2: Content Hash Comparison (Better accuracy)

**Additional changes:**
1. Calculate hash of local content
2. Fetch and hash remote content
3. Skip timestamp check if content identical
4. Only warn on actual content divergence

**Effort:** ~15 minutes

### Phase 3: Three-Way Merge (Full solution)

**Additional changes:**
1. Store `lastPullHash` in frontmatter during pull workflow
2. Implement three-way comparison logic
3. Provide merge options:
   - Auto-merge if possible
   - Create conflict markers for manual resolution
   - Skip and notify for complex conflicts

**Effort:** ~2 hours

## Conflict Resolution Workflows

### Workflow 1: Skip and Notify

**When conflict detected:**
1. Skip the conflicting file
2. Continue syncing other files
3. Add conflict details to PR comment:
   ```
   ⚠️ Conflicts detected:
   - `posts/example.md`: FeatureBase updated 2025-01-13 14:00, local updated 2025-01-13 12:00
   ```
4. Developer manually resolves:
   - Review FeatureBase changes
   - Manually merge or choose version
   - Re-run sync

### Workflow 2: Create Conflict Branch

**When conflict detected:**
1. Skip conflicting file in main sync
2. After sync completes, create conflict resolution PR:
   - Branch: `featurebase-conflict-{timestamp}`
   - Include both versions in diff
   - Tag for manual review

### Workflow 3: Auto-merge Simple Cases

**When conflict detected:**
1. If changes don't overlap (e.g., different sections):
   - Auto-merge using three-way merge algorithm
   - Update both local and remote
2. If changes overlap:
   - Fall back to Skip and Notify workflow

## Testing Conflict Detection

### Test Case 1: Timestamp Conflict

1. Pull post from FeatureBase
2. Edit post in FeatureBase UI
3. Edit same post locally (different content)
4. Push local changes
5. **Expected:** Conflict detected, push skipped, warning logged

### Test Case 2: Identical Content

1. Pull post from FeatureBase
2. Edit post in FeatureBase UI
3. Make identical edit locally
4. Push local changes
5. **Expected:** No conflict (content identical), push succeeds

### Test Case 3: No Remote Changes

1. Pull post from FeatureBase
2. Edit post locally
3. Push local changes (no FeatureBase edits)
4. **Expected:** No conflict, push succeeds

## Metrics to Track

- **Conflict rate:** % of pushes with conflicts
- **Conflict resolution time:** Time from detection to resolution
- **False positives:** Conflicts detected but not real divergence
- **Overwrite incidents:** Cases where newer content was accidentally overwritten

## Related Documentation

- [Push Workflow Testing](FEATUREBASE-PUSH-TESTING.md)
- [Sync Architecture](../../.claude/tools/featurebase/README.md)

---

**Status:** Design complete, implementation pending
**Priority:** Medium (nice-to-have, not blocking)
**Owner:** TBD
