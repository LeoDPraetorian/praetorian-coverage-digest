---
name: syncing-featurebase-content
description: Use when synchronizing FeatureBase content bidirectionally - handles pull from API, push to API, conflict resolution, and GitHub workflow integration
allowed-tools: Read, Write, Edit, Bash, TodoWrite, AskUserQuestion
---

# Syncing FeatureBase Content

**Bidirectional synchronization workflow between FeatureBase platform and GitHub repository.**

> **You MUST use TodoWrite** to track sync operations across all phases.

---

## What This Skill Does

Orchestrates complete bidirectional sync between FeatureBase and GitHub:

- **Pull:** FeatureBase → Markdown files with YAML frontmatter
- **Push:** Markdown files → FeatureBase API
- **Conflicts:** Detect and resolve when both sides changed
- **Verification:** Ensure sync completed successfully
- **Integration:** Works with GitHub Actions workflows

**Why this matters:** MCP tools exist for individual operations, but the complete workflow (conflict detection, PR creation, verification) requires orchestration.

---

## When to Use

- User says "sync FeatureBase content"
- User says "pull latest from FeatureBase"
- User says "push my changes to FeatureBase"
- Daily GitHub Actions workflow creates sync PR
- Manual sync needed outside scheduled runs

---

## Quick Reference

| Operation | Tools Used | Output |
| --- | --- | --- |
| Pull from FeatureBase | sync-to-markdown | Markdown files created/updated |
| Push to FeatureBase | sync-from-markdown | API calls (POST/PATCH/DELETE) |
| Conflict detection | Check updatedAt timestamps | conflicts array |
| Verification | Check sync results | Success/failure status |

---

## Phase 1: Determine Sync Direction

Ask user via AskUserQuestion:

```
Question: Which sync operation do you want to perform?
Header: Sync direction
Options:
  - Pull from FeatureBase (FeatureBase → GitHub) - Download latest content from FeatureBase platform
  - Push to FeatureBase (GitHub → FeatureBase) - Upload local markdown changes to FeatureBase
  - Bidirectional sync (both directions) - Pull then push with conflict resolution
```

**Selection determines workflow:**

- **Pull only:** Phase 2A → Phase 4
- **Push only:** Phase 2B → Phase 4
- **Bidirectional:** Phase 2A → Phase 2B → Phase 3 (conflicts) → Phase 4

---

## Phase 2A: Pull from FeatureBase (API → GitHub)

### 2A.1 Invoke MCP Tool

```typescript
import { syncToMarkdown, createFeaturebaseClient } from '.claude/tools/featurebase';

const client = createFeaturebaseClient();
const result = await syncToMarkdown({
  outputDir: './modules/chariot/docs/featurebase',
  types: ['posts', 'changelog', 'articles'],
  limit: 100  // Optional: items per type
}, client);
```

**Via Claude MCP:** Claude automatically invokes the tool with these parameters.

### 2A.2 Review Changes

```bash
# Check what changed
git diff modules/chariot/docs/featurebase/

# Show changed files
git diff --name-only modules/chariot/docs/featurebase/
```

### 2A.3 Create Branch and PR (if changes detected)

```bash
# Configure git
git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

# Create branch
TIMESTAMP=$(date -u +"%Y-%m-%d-%H%M%S")
BRANCH="featurebase-sync-${TIMESTAMP}"
git checkout -b "${BRANCH}"

# Stage and commit
git add modules/chariot/docs/featurebase/
git commit -m "sync: FeatureBase content - $(date -u +"%Y-%m-%d %H:%M:%S UTC")"

# Push branch
git push origin "${BRANCH}"

# Create PR
gh pr create \
  --title "sync: FeatureBase content - $(date -u +"%Y-%m-%d %H:%M:%S UTC")" \
  --body "Automated FeatureBase sync. Review changes before merging." \
  --base main \
  --head "${BRANCH}"
```

**GitHub Actions:** The featurebase-pull.yml workflow automates this daily at 6 AM UTC.

---

## Phase 2B: Push to FeatureBase (GitHub → API)

### 2B.1 Validate YAML Frontmatter

```bash
# Run validation script
npx tsx .github/scripts/validate-frontmatter.ts
```

**Required frontmatter fields:**

- `title` (string, minimum 1 character)
- `boardId` (string, required for posts)
- `featurebaseId` (string, optional for new content)

**Validation failures:** Fix YAML syntax errors before proceeding.

### 2B.2 Invoke MCP Tool

```typescript
import { syncFromMarkdown, createFeaturebaseClient } from '.claude/tools/featurebase';

const client = createFeaturebaseClient();
const result = await syncFromMarkdown({
  inputDir: './modules/chariot/docs/featurebase',
  types: ['posts', 'changelog', 'articles']
}, client);
```

**Result contains:**

- `filesProcessed` - Number of files read
- `created` - New posts/articles/changelog created
- `updated` - Existing content updated
- `deleted` - Content removed from FeatureBase
- `conflicts` - Files skipped due to newer FeatureBase content

### 2B.3 Check for Conflicts

```typescript
if (result.conflicts && result.conflicts.length > 0) {
  console.log(`⚠️ Conflicts detected: ${result.conflicts.length}`);
  result.conflicts.forEach(conflict => {
    console.log(`- ${conflict.file}: FeatureBase updated at ${conflict.remoteUpdatedAt}, local ${conflict.localUpdatedAt}`);
  });
  // Proceed to Phase 3
} else {
  console.log(`✅ Sync completed: ${result.created} created, ${result.updated} updated`);
  // Skip to Phase 4
}
```

---

## Phase 3: Conflict Resolution

**Conflict occurs when:** FeatureBase `updatedAt` > local file `syncedAt`

### 3.1 Present Conflict Options

Ask user via AskUserQuestion:

```
Question: Conflicts detected. How would you like to resolve them?
Header: Conflict resolution
Options:
  - Keep remote (FeatureBase wins) - Overwrite local changes with FeatureBase content
  - Keep local (Force push) - Overwrite FeatureBase with local changes (DANGEROUS)
  - Manual review - Show me the conflicts so I can decide per file
```

### 3.2 Apply Resolution Strategy

**Keep remote (recommended):**

```bash
# Re-run pull to overwrite local files
# This is the safe default
syncToMarkdown({
  outputDir: './modules/chariot/docs/featurebase',
  types: ['posts', 'changelog', 'articles'],
  force: true  // Overwrite local changes
}, client);
```

**Keep local (force push):**

```typescript
// Re-run push with force flag
syncFromMarkdown({
  inputDir: './modules/chariot/docs/featurebase',
  types: ['posts', 'changelog', 'articles'],
  force: true  // Ignore updatedAt check
}, client);
```

**Manual review:**

For each conflict:

1. Show user the diff between local and remote
2. Ask which version to keep
3. Apply resolution per file

---

## Phase 4: Verification

### 4.1 Confirm Sync Success

**Check sync results:**

```typescript
console.log('Sync Summary:');
console.log(`- Files processed: ${result.filesProcessed}`);
console.log(`- Created: ${result.created}`);
console.log(`- Updated: ${result.updated}`);
console.log(`- Deleted: ${result.deleted}`);
console.log(`- Conflicts: ${result.conflicts?.length || 0}`);
```

**Expected:** Zero conflicts after resolution.

### 4.2 Verify Content in FeatureBase UI

**Manual verification steps:**

1. Log into FeatureBase dashboard
2. Navigate to Posts/Changelog/Articles
3. Verify updated content displays correctly
4. Check metadata (title, status, tags) matches markdown frontmatter

### 4.3 Check GitHub Actions Status

**If using automated workflow:**

```bash
# Check latest workflow run
gh workflow view "Sync from FeatureBase" --web

# Or check recent runs
gh run list --workflow="Sync from FeatureBase" --limit 5
```

**Success criteria:**

- ✅ Workflow completed successfully
- ✅ PR created (if changes detected)
- ✅ No validation errors
- ✅ Sync results show expected counts

---

## Error Handling

### API Authentication Errors

**Error:** `401 Unauthorized` or `403 Forbidden`

**Fix:**

```bash
# Check API key is set
echo $FEATUREBASE_API_KEY

# Rotate API key (FeatureBase dashboard → Settings → API)
# Update GitHub secret
gh secret set FEATUREBASE_API_KEY
```

### YAML Validation Errors

**Error:** `Invalid YAML frontmatter in file X`

**Fix:**

```bash
# Run validation to see specific errors
npx tsx .github/scripts/validate-frontmatter.ts

# Common issues:
# - Missing closing --- marker
# - Invalid field types (e.g., string instead of array)
# - Missing required fields (title, boardId)
```

### Rate Limiting

**Error:** `429 Too Many Requests`

**Fix:**

- Wait 60 seconds before retrying
- Reduce batch size (limit parameter)
- Check FeatureBase API status page

### Network Failures

**Error:** `ECONNREFUSED` or `ETIMEDOUT`

**Fix:**

- Retry sync operation (exponential backoff built into MCP tools)
- Check FeatureBase platform status
- Verify internet connectivity

---

## GitHub Actions Integration

### Pull Workflow (featurebase-pull.yml)

**Trigger:** Daily at 6 AM UTC + manual dispatch

**Process:**

1. Checkout repository
2. Install dependencies
3. Run featurebase-pull-sync.ts
4. Detect changes with git diff
5. Create PR if changes found
6. Notify on failure (creates GitHub issue)

**Manual trigger:**

```bash
gh workflow run featurebase-pull.yml
```

### Push Workflow (featurebase-push.yml)

**Trigger:** PR merged to main with changes in `modules/chariot/docs/featurebase/`

**Process:**

1. Validate YAML frontmatter (separate job)
2. Run featurebase-push-sync.ts
3. Handle deleted files (DELETE API calls)
4. Comment on PR with sync results
5. Notify on failure (creates GitHub issue)

**View workflow logs:**

```bash
# List recent runs
gh run list --workflow="Sync to FeatureBase" --limit 5

# View specific run
gh run view <run-id> --log
```

---

## Troubleshooting

### Sync Failures

**Symptom:** Workflow fails, no PR created

**Debug steps:**

1. Check GitHub Actions logs
2. Verify FEATUREBASE_API_KEY secret is set
3. Test MCP tools manually
4. Check FeatureBase API connectivity

**See:** `troubleshooting-featurebase-sync` skill for comprehensive debugging workflow.

### Conflicts Not Resolving

**Symptom:** Conflicts array not empty after resolution

**Debug steps:**

1. Check if remote content was updated again during resolution
2. Verify force flag was used correctly
3. Re-run sync with fresh pull

### PR Not Creating

**Symptom:** Git diff shows changes but PR not created

**Debug steps:**

1. Check git permissions (GITHUB_TOKEN scope)
2. Verify branch creation succeeded
3. Check gh CLI authentication

---

## Success Criteria

Sync is successful when:

1. ✅ Result shows expected counts (created/updated/deleted)
2. ✅ Zero conflicts after resolution
3. ✅ Content displays correctly in FeatureBase UI
4. ✅ GitHub Actions workflow completed successfully
5. ✅ PR created (if changes detected)
6. ✅ YAML validation passed

---

## Integration

### Called By

- User request: "sync FeatureBase content"
- GitHub Actions workflows (automated daily)
- `/featurebase sync` command (if created)

### Requires (invoke before starting)

| Skill | When | Purpose |
| --- | --- | --- |
| `using-todowrite` | Start | Track multi-phase sync workflow |

### Calls (during execution)

| Tool/Skill | Phase | Purpose |
| --- | --- | --- |
| sync-to-markdown (MCP) | 2A | Pull content from API |
| sync-from-markdown (MCP) | 2B | Push content to API |
| validate-frontmatter.ts | 2B | Validate YAML schema |

### Pairs With (conditional)

| Skill | Trigger | Purpose |
| --- | --- | --- |
| `troubleshooting-featurebase-sync` | Sync failure | Debug errors |
| `creating-featurebase-content` | After pull | Create new content locally |

---

## Related Skills

- `creating-featurebase-content` - Create posts/changelog/articles with proper frontmatter
- `troubleshooting-featurebase-sync` - Debug sync failures systematically

---

## References

- [Bidirectional Sync Architecture](references/sync-architecture.md) - Technical details
- [Conflict Resolution Strategies](references/conflict-resolution.md) - Resolution patterns
- [GitHub Actions Integration](references/github-actions.md) - Workflow details
- [Error Handling Patterns](references/error-handling.md) - Common errors and fixes
