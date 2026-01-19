# Error Handling Patterns

**Common errors and fixes for FeatureBase synchronization.**

---

## Error Categories

| Category | Examples | Typical Fix | Auto-Retry |
| --- | --- | --- | --- |
| Authentication | 401, 403 | Rotate API key | No |
| Rate Limiting | 429 | Wait + backoff | Yes |
| Validation | Invalid YAML | Fix syntax | No |
| Network | Timeout, ECONNREFUSED | Retry | Yes |
| Conflict | Newer API content | Manual resolution | No |
| API Errors | 500, 502, 503 | Retry | Yes |

---

## Authentication Errors

### Error: 401 Unauthorized

**Symptoms:**
- Sync fails with "401 Unauthorized"
- API key rejected

**Causes:**
- API key missing or invalid
- API key expired
- Wrong API key format

**Fix:**

```bash
# 1. Check if API key is set
echo $FEATUREBASE_API_KEY

# 2. Rotate API key in FeatureBase dashboard
# Settings → API → Generate new key

# 3. Update GitHub secret
gh secret set FEATUREBASE_API_KEY

# 4. Re-run workflow
gh workflow run featurebase-pull.yml
```

### Error: 403 Forbidden

**Symptoms:**
- API key valid but operation rejected
- "Permission denied" errors

**Causes:**
- API key doesn't have required permissions
- Trying to access restricted board
- Account tier limitations

**Fix:**

```bash
# 1. Check API key permissions in FeatureBase dashboard
# 2. Ensure API key has "read" + "write" permissions
# 3. Verify boardId is accessible with this API key
```

---

## Rate Limiting Errors

### Error: 429 Too Many Requests

**Symptoms:**
- Sync fails with "429 Too Many Requests"
- "Rate limit exceeded" message
- `Retry-After` header present

**Causes:**
- Too many API requests in short period
- FeatureBase API rate limit reached
- Multiple concurrent workflows

**Current Handling:**

```typescript
// Ky library automatically retries with exponential backoff
retry: {
  limit: 3,
  methods: ['get', 'post', 'put', 'patch', 'delete'],
  statusCodes: [408, 429, 500, 502, 503, 504]
}
```

**Manual Fix:**

```bash
# 1. Wait for rate limit reset (typically 60 minutes)
# 2. Check rate limit headers if available:
#    X-RateLimit-Limit: 100
#    X-RateLimit-Remaining: 0
#    X-RateLimit-Reset: 1642123456

# 3. Retry workflow manually
gh workflow run featurebase-pull.yml
```

**Prevention:**

```typescript
// Check rate limit proactively (future enhancement)
const remaining = response.headers.get('X-RateLimit-Remaining');
if (remaining && parseInt(remaining) < 10) {
  // Add delay before next request
  await sleep(5000);
}
```

---

## YAML Validation Errors

### Error: Invalid YAML Syntax

**Symptoms:**
- Validation job fails
- "YAML parse error" in logs
- Push workflow doesn't proceed to sync job

**Common Causes:**

**1. Missing closing marker:**

```yaml
---
title: My Post
# Missing closing ---
```

**Fix:**

```yaml
---
title: My Post
---
```

**2. Invalid field type:**

```yaml
---
title: My Post
tags: security  # Should be array
---
```

**Fix:**

```yaml
---
title: My Post
tags:
  - security
---
```

**3. Unquoted special characters:**

```yaml
---
title: Post: A Guide  # Colon breaks parsing
---
```

**Fix:**

```yaml
---
title: "Post: A Guide"
---
```

**4. Indentation errors:**

```yaml
---
title: My Post
tags:
- security
  - bug  # Wrong indentation
---
```

**Fix:**

```yaml
---
title: My Post
tags:
  - security
  - bug
---
```

**Validation command:**

```bash
# Run validation locally before pushing
npx tsx .github/scripts/validate-frontmatter.ts
```

### Error: Missing Required Fields

**Symptoms:**
- Validation passes but sync fails
- "Missing required field: boardId" error

**Required fields by type:**

**Posts:**
- `title` (string)
- `boardId` (string)

**Changelog:**
- `title` (string)

**Articles:**
- `title` (string)
- `category` (string)

**Fix:**

```yaml
---
title: "My Feature Request"
boardId: "board_abc123"  # Add missing field
---
```

---

## Network Errors

### Error: ECONNREFUSED / ETIMEDOUT

**Symptoms:**
- Sync fails with network error
- "Connection refused" or "Timeout" in logs

**Causes:**
- FeatureBase API down
- Network connectivity issues
- DNS resolution failures
- Firewall blocking requests

**Automatic Retry:**

Ky library retries automatically (3 attempts with exponential backoff).

**Manual Fix:**

```bash
# 1. Check FeatureBase API status
curl -I https://api.featurebase.app/v1/health

# 2. Test connectivity
ping api.featurebase.app

# 3. Wait and retry workflow
gh workflow run featurebase-pull.yml

# 4. If persistent, check FeatureBase status page
```

### Error: Request Timeout

**Symptoms:**
- Sync times out after 30 seconds
- "Request timeout" error

**Causes:**
- Slow API response
- Large payload
- Network congestion

**Fix:**

```typescript
// Increase timeout (future enhancement)
const client = ky.create({
  timeout: 60000, // 60 seconds instead of default 30
  retry: {
    limit: 3,
    statusCodes: [408, 429, 500, 502, 503, 504]
  }
});
```

---

## Conflict Errors

### Conflict: API Has Newer Changes

**Symptoms:**
- Push sync completes but reports conflicts
- "API has newer changes" in conflicts array
- Files not updated in FeatureBase

**Example:**

```json
{
  "conflicts": [
    {
      "file": "post_abc123-feature.md",
      "reason": "API has newer changes",
      "apiUpdatedAt": "2026-01-14T12:00:00Z",
      "localUpdatedAt": "2026-01-14T10:00:00Z"
    }
  ]
}
```

**Resolution Options:**

**Option 1: Keep API changes (recommended)**

```bash
# Pull latest from API
gh workflow run featurebase-pull.yml

# Wait for PR
gh pr list | grep "featurebase-sync"

# Review and merge PR
gh pr merge <pr-number> --squash
```

**Option 2: Force local changes**

```bash
# Re-run push with force flag (DANGEROUS)
npx tsx .github/scripts/featurebase-push-sync.ts --force
```

**Option 3: Manual merge**

```bash
# 1. Fetch API content via MCP tool
# 2. Compare with local file
diff <(curl -H "Authorization: Bearer $FEATUREBASE_API_KEY" \
  https://api.featurebase.app/v1/posts/abc123) \
  modules/chariot/docs/featurebase/posts/post_abc123-feature.md

# 3. Manually merge changes
vim modules/chariot/docs/featurebase/posts/post_abc123-feature.md

# 4. Update updatedAt to current time
# 5. Re-run push sync
```

**See:** `references/conflict-resolution.md` for complete guide

---

## API Errors

### Error: 500 Internal Server Error

**Symptoms:**
- Sync fails with "500 Internal Server Error"
- FeatureBase API error

**Causes:**
- Bug in FeatureBase API
- Invalid request payload
- Server-side issue

**Automatic Retry:**

Ky library retries 500 errors automatically (3 attempts).

**Manual Fix:**

```bash
# 1. Wait 5 minutes (transient error may resolve)
# 2. Retry workflow
gh workflow run featurebase-pull.yml

# 3. If persistent, check request payload
cat modules/chariot/docs/featurebase/posts/post_abc123-feature.md

# 4. Contact FeatureBase support if issue persists
```

### Error: 502 Bad Gateway / 503 Service Unavailable

**Symptoms:**
- Sync fails with 502 or 503 error
- "Service unavailable" message

**Causes:**
- FeatureBase API deployment
- Load balancer issues
- Temporary outage

**Automatic Retry:**

Ky library retries 502/503 automatically.

**Manual Fix:**

```bash
# 1. Check FeatureBase status page
# 2. Wait for service restoration
# 3. Retry workflow
gh workflow run featurebase-pull.yml
```

---

## Partial Sync Failures

### Some Files Sync, Others Fail

**Symptoms:**
- Sync completes with partial success
- `errors` array contains failed files
- Some files updated, others skipped

**Example:**

```json
{
  "filesProcessed": 10,
  "created": 2,
  "updated": 5,
  "errors": [
    {
      "file": "post_xyz789-broken.md",
      "type": "update",
      "error": "Invalid boardId",
      "context": {"featurebaseId": "post_xyz789"}
    }
  ]
}
```

**Fix:**

```bash
# 1. Review errors array from sync results
# 2. Fix each failed file
vim modules/chariot/docs/featurebase/posts/post_xyz789-broken.md

# 3. Re-run push sync (only failed files will retry)
npx tsx .github/scripts/featurebase-push-sync.ts
```

---

## Deletion Errors

### Error: Post Not Found (404)

**Symptoms:**
- Attempting to delete post that doesn't exist
- "404 Not Found" during deletion

**Causes:**
- Post already deleted in FeatureBase
- Wrong featurebaseId
- Post moved to different board

**Fix:**

```bash
# 1. Verify post exists in FeatureBase
curl -H "Authorization: Bearer $FEATUREBASE_API_KEY" \
  https://api.featurebase.app/v1/posts/abc123

# 2. If 404, remove local file (already deleted)
git rm modules/chariot/docs/featurebase/posts/post_abc123-feature.md
git commit -m "chore: remove deleted post"

# 3. If exists but wrong ID, update frontmatter
vim modules/chariot/docs/featurebase/posts/post_abc123-feature.md
# Update featurebaseId field
```

---

## Debug Commands

### View Sync Logs

```bash
# Pull workflow logs
gh run list --workflow="Sync from FeatureBase" --limit 5
gh run view <run-id> --log

# Push workflow logs
gh run list --workflow="Sync to FeatureBase" --limit 5
gh run view <run-id> --log
```

### Test Sync Locally

```bash
# Pull sync (dry run)
FEATUREBASE_API_KEY="sk_..." npx tsx .github/scripts/featurebase-pull-sync.ts --dry-run

# Push sync (dry run)
FEATUREBASE_API_KEY="sk_..." npx tsx .github/scripts/featurebase-push-sync.ts --dry-run
```

### Validate Single File

```bash
# Validate YAML frontmatter
npx tsx -e "
import { parseFrontmatter } from '.claude/tools/featurebase/internal/frontmatter';
import { readFileSync } from 'fs';

const file = 'modules/chariot/docs/featurebase/posts/post_abc123-feature.md';
const content = readFileSync(file, 'utf-8');
const frontmatter = parseFrontmatter(content);

console.log(JSON.stringify(frontmatter, null, 2));
"
```

### Check API Connectivity

```bash
# Test FeatureBase API
curl -H "Authorization: Bearer $FEATUREBASE_API_KEY" \
  https://api.featurebase.app/v1/posts?limit=1

# Check rate limit headers
curl -I -H "Authorization: Bearer $FEATUREBASE_API_KEY" \
  https://api.featurebase.app/v1/posts
```

---

## Error Prevention Checklist

**Before creating content:**
- [ ] Use valid YAML syntax
- [ ] Include required fields (title, boardId)
- [ ] Quote strings with special characters
- [ ] Use arrays for tags field
- [ ] Validate locally before pushing

**Before pushing changes:**
- [ ] Pull latest changes first
- [ ] Check for conflicts
- [ ] Run validation script
- [ ] Review git diff

**After sync failures:**
- [ ] Read workflow logs
- [ ] Check errors array
- [ ] Fix issues file by file
- [ ] Re-run sync

**Periodic maintenance:**
- [ ] Rotate API key every 90 days
- [ ] Review sync success rate
- [ ] Clear old sync branches
- [ ] Update dependencies

---

## Related Skills

- `syncing-featurebase-content` - Main sync workflow
- `troubleshooting-featurebase-sync` - Systematic debugging
