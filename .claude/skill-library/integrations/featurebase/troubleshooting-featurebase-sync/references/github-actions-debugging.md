# GitHub Actions Debugging

**Detailed procedures for debugging GitHub Actions workflow failures.**

---

## Getting Workflow Logs

### Pull Workflow Logs

```bash
# List recent runs
gh run list --workflow="Sync from FeatureBase" --limit 10

# View latest failed run
gh run list --workflow="Sync from FeatureBase" --status failure --limit 1

# View logs for specific run
gh run view <run-id> --log

# Or open in browser
gh run view <run-id> --web
```

### Push Workflow Logs

```bash
# List recent runs
gh run list --workflow="Sync to FeatureBase" --limit 10

# View failed run associated with PR
gh run list --workflow="Sync to FeatureBase" --status failure --limit 1
gh run view <run-id> --log
```

---

## Authentication Failures (401, 403)

### Symptoms

- Workflow fails with `401 Unauthorized`
- API key rejected
- "Permission denied" errors

### Root Causes

1. API key missing from GitHub secrets
2. API key invalid or expired
3. API key has insufficient permissions
4. Wrong API key format

### Fix Procedure

```bash
# 1. Check if secret is set
gh secret list | grep FEATUREBASE_API_KEY

# If not found, add it
gh secret set FEATUREBASE_API_KEY
# Paste API key when prompted

# 2. If secret exists but failing, rotate API key
# - Log into FeatureBase dashboard
# - Settings → API → Generate new key
# - Copy new key (starts with sk_)

# 3. Update GitHub secret
gh secret set FEATUREBASE_API_KEY
# Paste new API key

# 4. Re-run workflow
gh workflow run featurebase-pull.yml

# 5. Verify next run succeeds
gh run list --workflow="Sync from FeatureBase" --limit 1
```

### Verification

```bash
# Test API key manually
curl -H "Authorization: Bearer $FEATUREBASE_API_KEY" \
  https://api.featurebase.app/v1/posts?limit=1

# Should return 200 OK with JSON response
```

---

## Rate Limiting Failures (429)

### Symptoms

- `429 Too Many Requests` in logs
- "Rate limit exceeded" message
- `Retry-After` header present

### Root Causes

1. Too many workflow triggers in short period
2. Multiple manual runs
3. Batch operations exceed rate limit
4. FeatureBase API rate limit reduced

### Fix Procedure

```bash
# 1. Check Retry-After header in logs
# Example log: "Retry-After: 3600" means wait 1 hour

# 2. Wait for rate limit reset
# Typically: 60 minutes

# 3. Check recent workflow runs (avoid duplicates)
gh run list --workflow="Sync from FeatureBase" --limit 10

# 4. Cancel duplicate/queued runs if present
gh run list --workflow="Sync from FeatureBase" --status queued
gh run cancel <run-id>

# 5. After waiting, re-run manually
gh workflow run featurebase-pull.yml
```

### Prevention Strategies

**1. Reduce batch size (future enhancement):**

```typescript
// In .github/scripts/featurebase-pull-sync.ts
const result = await syncToMarkdown({
  outputDir: './modules/chariot/docs/featurebase',
  types: ['posts', 'changelog', 'articles'],
  limit: 25  // Reduced from 100
}, client);
```

**2. Add request pacing:**

```typescript
// Add delay between API calls
for (const type of types) {
  await syncType(type);
  await sleep(2000); // 2 second delay
}
```

**3. Monitor rate limit headers (if available):**

```typescript
const remaining = response.headers.get('X-RateLimit-Remaining');
if (remaining && parseInt(remaining) < 10) {
  console.log('Approaching rate limit, adding delay...');
  await sleep(5000);
}
```

---

## Validation Failures

### Symptoms

- Validation job fails
- "YAML parse error" in logs
- "Invalid frontmatter" message
- Push workflow doesn't proceed to sync job

### Fix Procedure

```bash
# 1. Run validation locally
npx tsx .github/scripts/validate-frontmatter.ts

# Output shows specific errors:
# ❌ posts/my-post.md
#   - Line 3: Missing closing --- marker
#   - Line 7: tags should be array

# 2. Fix each error
vim modules/chariot/docs/featurebase/posts/my-post.md

# 3. Re-validate
npx tsx .github/scripts/validate-frontmatter.ts

# Should show: ✅ All files valid

# 4. Commit fix
git commit -am "fix: correct YAML frontmatter syntax"
git push

# 5. Validation will re-run automatically on next PR
```

### Common YAML Errors

See parent skill's [Error Handling](../creating-featurebase-content/SKILL.md#error-handling) section and [Validation Rules](../creating-featurebase-content/references/validation-rules.md).

---

## Network Failures

### Symptoms

- `ECONNREFUSED`
- `ETIMEDOUT`
- `ENOTFOUND`
- "Network error" in logs

### Root Causes

1. FeatureBase API down
2. DNS resolution failure
3. Network connectivity issue
4. Firewall blocking requests

### Fix Procedure

```bash
# 1. Check FeatureBase API status
curl -I https://api.featurebase.app/v1/health

# Expected: HTTP 200 OK

# 2. Test DNS resolution
nslookup api.featurebase.app

# Expected: Returns IP address

# 3. Test network connectivity
ping api.featurebase.app

# 4. If API is down, check status page
# FeatureBase status page URL (check FeatureBase docs)

# 5. Wait for restoration

# 6. Retry workflow (Ky library auto-retries, but may need manual trigger)
gh workflow run featurebase-pull.yml
```

### Automatic Retry Logic

**Ky library handles:**
- 3 retry attempts
- Exponential backoff (1s, 2s, 4s)
- Retries on: 408, 429, 500, 502, 503, 504

**If all retries fail:**
- Workflow fails
- GitHub issue created automatically
- Manual intervention required

---

## API Server Errors (5xx)

### Symptoms

- 500 Internal Server Error
- 502 Bad Gateway
- 503 Service Unavailable
- 504 Gateway Timeout

### Root Causes

1. FeatureBase API bug
2. Deployment in progress
3. Database connection issues
4. Load balancer problems

### Fix Procedure

```bash
# 1. Check if transient (auto-retries should handle)
# Ky library retries 3 times automatically

# 2. If workflow still fails, check FeatureBase status
# FeatureBase status page

# 3. Wait 15-30 minutes for deployment/fix

# 4. Re-run workflow
gh workflow run featurebase-pull.yml

# 5. If persistent (>1 hour), contact FeatureBase support
# Provide:
#   - Request details from logs
#   - Error message and status code
#   - Timestamp
#   - Run ID: gh run list --workflow="Sync from FeatureBase" --limit 1
```

---

## Conflict Failures

### Symptoms

- Sync completes but reports conflicts
- `conflicts` array populated in results
- "API has newer changes" messages
- Files skipped during push

### Example Conflict Output

```json
{
  "filesProcessed": 5,
  "created": 0,
  "updated": 3,
  "conflicts": [
    {
      "file": "post_abc123-feature.md",
      "reason": "API has newer changes",
      "apiUpdatedAt": "2026-01-14T12:00:00Z",
      "localUpdatedAt": "2026-01-14T10:00:00Z"
    },
    {
      "file": "article_xyz789-guide.md",
      "reason": "API has newer changes",
      "apiUpdatedAt": "2026-01-14T11:30:00Z",
      "localUpdatedAt": "2026-01-14T09:00:00Z"
    }
  ]
}
```

### Resolution Workflow

**Use the `syncing-featurebase-content` skill Phase 3 (Conflict Resolution):**

```
Read(".claude/skill-library/integrations/featurebase/syncing-featurebase-content/SKILL.md")
```

**Quick resolution (keep remote):**

```bash
# Re-run pull to get latest from API
gh workflow run featurebase-pull.yml

# Wait for PR
gh pr list | grep "featurebase-sync"

# Review and merge PR to overwrite local changes
gh pr merge <pr-number> --squash
```

**See:** [Conflict Resolution](../syncing-featurebase-content/references/conflict-resolution.md) for complete strategies.

---

## Workflow Permissions Errors

### Symptoms

- "Permission denied" on git push
- "Cannot create PR" error
- "Cannot create issue" error

### Root Causes

1. Insufficient workflow permissions
2. `GITHUB_TOKEN` doesn't have required scopes

### Fix Procedure

```bash
# 1. Check workflow permissions in .github/workflows/featurebase-pull.yml
cat .github/workflows/featurebase-pull.yml | grep -A 5 "permissions:"

# Should show:
# permissions:
#   contents: write
#   pull-requests: write
#   issues: write

# 2. If missing, add permissions block
vim .github/workflows/featurebase-pull.yml

# 3. Commit and push
git commit -am "fix: add workflow permissions"
git push

# 4. Re-run workflow
gh workflow run featurebase-pull.yml
```

---

## Debugging Checklist

**Before opening issue or asking for help:**

- [ ] Checked GitHub Actions workflow logs
- [ ] Identified specific error message
- [ ] Verified API key is set and valid
- [ ] Ran validation script locally (for push sync)
- [ ] Checked FeatureBase API status
- [ ] Tested network connectivity
- [ ] Reviewed conflicts array (if present)
- [ ] Attempted fix based on error type
- [ ] Re-ran operation to verify fix
- [ ] Documented root cause

**If still failing after checklist:**
- Open GitHub issue with full logs
- Tag with "automation" and "bug" labels
- Include run ID and error details
