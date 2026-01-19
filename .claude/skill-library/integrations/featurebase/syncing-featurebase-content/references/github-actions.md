# GitHub Actions Integration

**Automated sync workflows for FeatureBase bidirectional synchronization.**

---

## Workflow Overview

Two separate workflows handle pull and push synchronization:

| Workflow | Trigger | Purpose | Duration |
| --- | --- | --- | --- |
| `featurebase-pull.yml` | Daily 6 AM UTC | Pull API → Local | ~2-5 min |
| `featurebase-push.yml` | PR merge to main | Push Local → API | ~1-3 min |

---

## Pull Workflow (featurebase-pull.yml)

### Triggers

**Scheduled (primary):**

```yaml
on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC
```

**Manual (testing):**

```yaml
on:
  workflow_dispatch:  # Actions tab → Run workflow
```

**Manual trigger command:**

```bash
gh workflow run featurebase-pull.yml
```

### Workflow Steps

**1. Checkout Repository**

```yaml
- uses: actions/checkout@v4
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    fetch-depth: 0  # Full history for git operations
```

**2. Setup Node.js**

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
```

**3. Install Dependencies**

```yaml
- run: npm ci  # Clean install from package-lock.json
```

**4. Run Sync Script**

```yaml
- env:
    FEATUREBASE_API_KEY: ${{ secrets.FEATUREBASE_API_KEY }}
  run: npx tsx .github/scripts/featurebase-pull-sync.ts
```

**5. Detect Changes**

```bash
if git diff --quiet --exit-code modules/chariot/docs/featurebase/; then
  echo "No changes detected"
  CHANGES_DETECTED=false
else
  echo "Changes detected"
  CHANGES_DETECTED=true
fi
```

**6. Create PR (if changes)**

```bash
# Create timestamped branch
TIMESTAMP=$(date -u +"%Y-%m-%d-%H%M%S")
BRANCH="featurebase-sync-${TIMESTAMP}"
git checkout -b "${BRANCH}"

# Stage and commit
git add modules/chariot/docs/featurebase/
git commit -m "sync: FeatureBase content - $(date -u +"%Y-%m-%d %H:%M:%S UTC")"

# Push and create PR
git push origin "${BRANCH}"
gh pr create \
  --title "sync: FeatureBase content" \
  --body "Automated sync from FeatureBase" \
  --base main \
  --head "${BRANCH}"
```

**7. Error Notification**

```yaml
- if: failure()
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: '🚨 FeatureBase sync failed',
        body: `Workflow failed. See logs: ${context.payload.repository.html_url}/actions/runs/${context.runId}`,
        labels: ['automation', 'bug']
      });
```

---

## Push Workflow (featurebase-push.yml)

### Triggers

**PR merge to main:**

```yaml
on:
  pull_request:
    types: [closed]
    branches: [main]
    paths:
      - 'modules/chariot/docs/featurebase/help-center/**'
      - 'modules/chariot/docs/featurebase/posts/**'
      - 'modules/chariot/docs/featurebase/changelog/**'
```

**Condition:** Only runs if PR was merged (not just closed)

```yaml
if: github.event.pull_request.merged == true
```

### Workflow Jobs

#### Job 1: Validate YAML Frontmatter

**Purpose:** Catch syntax errors before syncing to API.

```yaml
validate:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 2  # Need previous commit for diff

    - uses: actions/setup-node@v4
    - run: npm ci

    - run: npx tsx .github/scripts/validate-frontmatter.ts
```

**Validation checks:**
- Valid YAML syntax
- Required fields present (title, boardId for posts)
- Field types correct (string, array, etc.)
- No prototype pollution patterns

#### Job 2: Push to FeatureBase

**Depends on:** validate job passing

```yaml
sync:
  needs: validate
  runs-on: ubuntu-latest
```

**Steps:**

1. Checkout with previous commit for diff
2. Install dependencies
3. Run push sync script
4. Comment results on PR

**Sync script execution:**

```yaml
- id: sync
  env:
    FEATUREBASE_API_KEY: ${{ secrets.FEATUREBASE_API_KEY }}
  run: npx tsx .github/scripts/featurebase-push-sync.ts
```

**PR comment (success):**

```yaml
- uses: actions/github-script@v7
  with:
    script: |
      await github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.payload.pull_request.number,
        body: `## FeatureBase Sync Results\n\n✅ Success\n\n- Files processed: ${filesProcessed}\n- Created: ${created}\n- Updated: ${updated}\n- Deleted: ${deleted}`
      });
```

**PR comment (conflicts):**

```
## FeatureBase Sync Results

⚠️ Conflicts detected

- Files processed: 5
- Created: 0
- Updated: 3
- **Conflicts: 2**

**Conflicted files:**
- post_abc123-feature.md (API has newer changes)
- article_xyz789-guide.md (API has newer changes)

**Next steps:** Re-run pull sync to get latest from API.
```

---

## Configuration Requirements

### GitHub Secrets

**FEATUREBASE_API_KEY:**

```bash
# Set via CLI
gh secret set FEATUREBASE_API_KEY

# Or via GitHub UI
# Settings → Secrets and variables → Actions → New repository secret
```

**Verify secret:**

```bash
gh secret list | grep FEATUREBASE_API_KEY
```

**Obtain API key:**
1. Log into FeatureBase dashboard
2. Navigate to Settings → API
3. Generate or copy API key (starts with `sk_`)

### Repository Permissions

**Pull workflow needs:**
- `contents: write` - Create branches, commit changes
- `pull-requests: write` - Create PRs

**Push workflow needs:**
- `contents: read` - Read changed files
- `pull-requests: write` - Comment on PRs

---

## Manual Operations

### Trigger Pull Sync Manually

```bash
# Via GitHub CLI
gh workflow run featurebase-pull.yml

# Via GitHub UI
# Actions tab → Sync from FeatureBase → Run workflow
```

### View Workflow Logs

```bash
# List recent runs
gh run list --workflow="Sync from FeatureBase" --limit 5

# View specific run
gh run view <run-id> --log

# Watch live run
gh run watch
```

### Trigger Push Sync Manually

**Not directly triggerable** (event-driven only).

**Workaround:** Create and merge a dummy PR that touches featurebase/ directory.

```bash
git checkout -b test-sync
echo "test" >> modules/chariot/docs/featurebase/README.md
git commit -am "test: trigger sync"
git push origin test-sync
gh pr create --title "test: trigger sync" --body "Test" --base main
gh pr merge --squash
```

---

## Troubleshooting

### Pull Workflow Failures

**No PR created:**
- **Cause:** No changes detected (FeatureBase content unchanged)
- **Check:** Workflow logs show "No changes detected"
- **Action:** None needed (working as expected)

**Authentication errors:**
- **Cause:** FEATUREBASE_API_KEY missing or invalid
- **Check:** `gh secret list | grep FEATUREBASE_API_KEY`
- **Fix:** Rotate API key and update secret

**Rate limit errors (429):**
- **Cause:** Too many API requests in short period
- **Check:** Workflow logs show "429 Too Many Requests"
- **Fix:** Wait 60 minutes, workflow will retry next day

**Git push failures:**
- **Cause:** Insufficient permissions
- **Check:** Workflow logs show "permission denied"
- **Fix:** Check repository settings → Actions → General → Workflow permissions

### Push Workflow Failures

**Validation job fails:**
- **Cause:** Invalid YAML frontmatter in changed files
- **Check:** Validation job logs show syntax errors
- **Fix:** Correct YAML syntax, re-push

**Sync job fails:**
- **Cause:** API errors, rate limits, network issues
- **Check:** Sync job logs for error details
- **Fix:** See error handling reference

**No workflow triggered:**
- **Cause:** PR closed (not merged) or paths don't match
- **Check:** PR was merged AND touched featurebase/ directory
- **Fix:** Ensure PR merged (not just closed)

### Notification Issues

**No GitHub issue created on failure:**
- **Cause:** `actions/github-script` step not executing
- **Check:** Workflow permissions allow issue creation
- **Fix:** Add `issues: write` permission

**No PR comment on sync:**
- **Cause:** Comment step failed or skipped
- **Check:** Workflow logs for comment step
- **Fix:** Check PR number and permissions

---

## Performance Optimization

### Current Sync Times

**Pull workflow:**
- Checkout: ~10s
- Dependencies: ~20s (cached)
- Sync: ~30-60s (depends on content count)
- PR creation: ~5s
- **Total:** ~2-5 minutes

**Push workflow:**
- Validation: ~30s
- Sync: ~20-40s (depends on changed files)
- Comment: ~2s
- **Total:** ~1-3 minutes

### Optimization Opportunities

1. **Parallel API requests** (if rate limits allow)
2. **Incremental sync** (only fetch changes)
3. **Dependency caching** (already implemented)
4. **Skip validation** for trusted branches (not recommended)

---

## Monitoring and Alerts

### Success Rate Tracking

```bash
# View recent run success rate
gh run list --workflow="Sync from FeatureBase" --limit 20 | grep -c "completed"
gh run list --workflow="Sync from FeatureBase" --limit 20 | grep -c "failure"
```

### Alert Channels

**On failure:**
1. GitHub issue created automatically
2. Email notification (if configured)
3. Slack/Discord webhook (if configured)

**Configure Slack notifications:**

```yaml
- if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "FeatureBase sync failed: ${{ github.server_url }}/${{ github.repository}}/actions/runs/${{ github.run_id }}"
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## Future Enhancements

### 1. Auto-Merge for Pull Sync PRs

**If validation passes, auto-merge:**

```yaml
- if: env.CHANGES_DETECTED == 'true'
  run: gh pr merge "${BRANCH}" --squash --auto
```

**Trade-off:** Less human review, but faster sync.

### 2. Conflict Resolution UI

**Web UI for reviewing conflicts before merge.**

### 3. Webhook-Triggered Pull

**Real-time sync instead of daily schedule.**

```yaml
on:
  repository_dispatch:
    types: [featurebase_content_updated]
```

**Requires:** FeatureBase webhook support.

### 4. Dry Run Mode

**Test sync without actually updating API:**

```bash
npx tsx .github/scripts/featurebase-push-sync.ts --dry-run
```

---

## Related Documentation

- `.github/scripts/featurebase-pull-sync.ts` - Pull sync implementation
- `.github/scripts/featurebase-push-sync.ts` - Push sync implementation
- `.github/scripts/validate-frontmatter.ts` - YAML validation
