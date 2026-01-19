---
name: troubleshooting-featurebase-sync
description: Use when FeatureBase sync fails - systematic debugging of GitHub Actions workflows, API errors, validation failures, and conflicts
allowed-tools: Read, Bash, Grep, TodoWrite, AskUserQuestion
---

# Troubleshooting FeatureBase Sync

**Systematic debugging workflow for FeatureBase synchronization failures.**

> **You MUST use TodoWrite** to track debugging phases.

---

## What This Skill Does

Systematically diagnoses and resolves FeatureBase sync failures:

- **Failure Mode Identification**: Classify error type (auth, validation, conflict, network, API)
- **Context Gathering**: Collect logs, error messages, sync results
- **Root Cause Analysis**: Trace error to source
- **Fix Application**: Apply failure-mode-specific fixes
- **Verification**: Confirm fix resolves issue

**Why this matters:** Reduces debugging time from hours to minutes with structured approach.

---

## When to Use

- User says "FeatureBase sync failed"
- User says "getting YAML validation errors"
- User says "sync conflict detected"
- GitHub Actions workflow failed
- MCP tool returned error
- User needs help debugging sync issues

---

## Quick Reference

| Error Type | Symptoms | Common Causes | Typical Fix |
| --- | --- | --- | --- |
| **Authentication** | 401, 403 errors | Invalid API key | Rotate key |
| **Rate Limiting** | 429 errors | Too many requests | Wait + retry |
| **Validation** | YAML parse errors | Invalid frontmatter | Fix syntax |
| **Conflicts** | Conflicts array populated | Concurrent edits | Manual resolution |
| **Network** | Timeout, ECONNREFUSED | API down | Retry later |
| **API Errors** | 500, 502, 503 | Server issues | Retry with backoff |

---

## Phase 1: Identify Failure Mode

Ask user via AskUserQuestion:

```
Question: Where did the failure occur?
Header: Failure location
Options:
  - GitHub Actions workflow - Check workflow logs
  - MCP tool (manual sync) - Check tool output
  - YAML validation - Check frontmatter syntax
  - Not sure - Guide me through detection
```

**Based on selection, proceed to corresponding Phase 2 sub-workflow.**

---

## Phase 2A: GitHub Actions Workflow Failures

### 2A.1 Identify Which Workflow

Ask user via AskUserQuestion:

```
Question: Which workflow failed?
Header: Workflow
Options:
  - Pull sync (Sync from FeatureBase) - Daily pull from API to GitHub
  - Push sync (Sync to FeatureBase) - PR merge trigger push to API
```

### 2A.2 Get Workflow Logs

**Pull workflow logs:**

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

**Push workflow logs:**

```bash
# List recent runs
gh run list --workflow="Sync to FeatureBase" --limit 10

# View failed run associated with PR
gh run list --workflow="Sync to FeatureBase" --status failure --limit 1
gh run view <run-id> --log
```

### 2A.3 Parse Error from Logs

**Common error patterns:**

| Log Message | Error Type | See Reference |
| --- | --- | --- |
| `401 Unauthorized` | Authentication | [GitHub Actions Debugging](references/github-actions-debugging.md#authentication-failures-401-403) |
| `429 Too Many Requests` | Rate limiting | [GitHub Actions Debugging](references/github-actions-debugging.md#rate-limiting-failures-429) |
| `YAML parse error` | Validation | [YAML Syntax Guide](references/yaml-syntax.md) |
| `ECONNREFUSED` | Network | [GitHub Actions Debugging](references/github-actions-debugging.md#network-failures) |
| `500 Internal Server Error` | API error | [GitHub Actions Debugging](references/github-actions-debugging.md#api-server-errors-5xx) |
| `Conflicts detected: 3` | Conflict | [GitHub Actions Debugging](references/github-actions-debugging.md#conflict-failures) |

**See:** [GitHub Actions Debugging](references/github-actions-debugging.md) for detailed fix procedures for each error type.

---

## Phase 2B: MCP Tool Failures (Manual Sync)

### 2B.1 Identify Which Tool Failed

**Common tools:**
- `sync-to-markdown` (pull)
- `sync-from-markdown` (push)
- `create-post` / `create-changelog` / `create-article` (create)
- `update-post` / `update-changelog` / `update-article` (update)

### 2B.2 Check Error Message

**MCP tools return:**

```typescript
{
  ok: false,
  error: {
    message: "Error description",
    status: 400,  // HTTP status code
    context: {...}  // Additional context
  }
}
```

**Common error codes:**

| Status | Meaning | Fix |
| --- | --- | --- |
| 400 | Bad Request | Check input validation |
| 401 | Unauthorized | Check API key |
| 404 | Not Found | Check featurebaseId exists |
| 409 | Conflict | Check for duplicates |
| 429 | Rate Limit | Wait and retry |
| 500 | Server Error | Retry later |

### 2B.3 Apply Fix Based on Status Code

**For 400 Bad Request:**

```bash
# Check input parameters
# Example: Missing required field

# Fix: Add missing field to input
{
  title: "My Post",
  boardId: "board_abc123",  # Was missing
  content: "..."
}
```

**For 401 Unauthorized:**

```bash
# Check API key
echo $FEATUREBASE_API_KEY

# If missing or wrong, set correct key
export FEATUREBASE_API_KEY="sk_live_..."
```

**For 404 Not Found:**

```bash
# featurebaseId doesn't exist
# Either:
# 1. Use create tool instead of update
# 2. Get correct ID from FeatureBase
# 3. Remove file if content was deleted
```

**For 409 Conflict:**

```bash
# Duplicate content (e.g., same title)
# Either:
# 1. Update existing instead of creating new
# 2. Change title to make unique
# 3. Delete duplicate first
```

---

## Phase 2C: YAML Validation Failures

### 2C.1 Run Validation Script

```bash
npx tsx .github/scripts/validate-frontmatter.ts
```

**See:** [YAML Syntax Guide](references/yaml-syntax.md) for complete syntax error patterns and fixes.

### 2C.2-2C.3 Fix and Re-Validate

Follow the YAML Syntax Guide to fix errors, then re-run validation.

---

## Phase 3: Verify Fix

### 3.1 Re-Run Failed Operation

**GitHub Actions:**

```bash
# Re-trigger workflow
gh workflow run featurebase-pull.yml  # or featurebase-push.yml

# Watch run status
gh run watch
```

**MCP tool:**

```bash
# Re-execute tool with fixed parameters
# Example: sync-from-markdown after fixing YAML
```

### 3.2 Confirm Success

**Check for:**
- ✅ No errors in logs
- ✅ Expected results (filesProcessed, created, updated)
- ✅ Zero conflicts
- ✅ Content synced correctly

### 3.3 Document Root Cause

**Save to `.local/troubleshooting-log.md`:**

```markdown
## 2026-01-14 - Sync Failure

**Error:** 401 Unauthorized

**Root Cause:** API key expired after 90 days

**Fix Applied:** Rotated API key in FeatureBase dashboard, updated GitHub secret

**Prevention:** Set calendar reminder to rotate key every 60 days
```

---

## Common Failure Modes

### Mode 1: Authentication Failures

**Symptoms:**
- 401 Unauthorized
- 403 Forbidden
- "Invalid API key" message

**Debug steps:**
1. Check if `FEATUREBASE_API_KEY` secret exists
2. Verify API key format (starts with `sk_`)
3. Test API key manually
4. Rotate if expired

**See:** [Authentication Debugging](references/authentication-debugging.md)

### Mode 2: Rate Limit Failures

**Symptoms:**
- 429 Too Many Requests
- "Rate limit exceeded" message
- Retry-After header in response

**Debug steps:**
1. Check workflow frequency (multiple manual triggers?)
2. Look for Retry-After header value
3. Wait for rate limit reset
4. Check if API exposes rate limit headers

**See:** [Rate Limit Debugging](references/rate-limit-debugging.md)

### Mode 3: Validation Failures

**Symptoms:**
- "YAML parse error"
- "Invalid frontmatter"
- Validation job fails

**Debug steps:**
1. Run validate-frontmatter.ts locally
2. Review syntax errors
3. Fix YAML in flagged files
4. Re-validate

**See:** [YAML Syntax Guide](references/yaml-syntax.md)

### Mode 4: Conflict Failures

**Symptoms:**
- Conflicts array populated
- "API has newer changes" messages
- Files skipped during push

**Debug steps:**
1. Review conflicts array from sync results
2. Check `updatedAt` timestamps
3. Choose resolution strategy (keep remote/local/manual merge)
4. Apply resolution

**See:** [Conflict Resolution](../syncing-featurebase-content/references/conflict-resolution.md)

### Mode 5: Network Failures

**Symptoms:**
- ECONNREFUSED
- ETIMEDOUT
- "Network error" messages

**Debug steps:**
1. Check FeatureBase API status
2. Test connectivity
3. Wait for restoration
4. Retry (automatic via Ky library)

**See:** [Network Debugging](references/network-debugging.md)

### Mode 6: API Errors

**Symptoms:**
- 500 Internal Server Error
- 502 Bad Gateway
- 503 Service Unavailable

**Debug steps:**
1. Check if transient (auto-retries should handle)
2. Check FeatureBase status page
3. Wait 15 minutes
4. Contact support if persistent

**See:** [API Error Debugging](references/api-error-debugging.md)

---

## Debugging Decision Tree

```
Start → Identify failure location
  ├─ GitHub Actions → Get workflow logs → Parse error → Apply fix
  ├─ MCP Tool → Check error.status → Apply status-specific fix
  ├─ YAML Validation → Run validator → Fix syntax errors
  └─ Not sure → Check GitHub Actions first → Then MCP tools
```

---

## Success Criteria

Troubleshooting is successful when:

1. ✅ Root cause identified
2. ✅ Fix applied
3. ✅ Operation re-run successfully
4. ✅ No errors in logs
5. ✅ Expected results achieved
6. ✅ Root cause documented for future reference

---

## Integration

### Called By

- User request: "FeatureBase sync failed"
- User request: "debug sync error"
- GitHub Actions failure notification
- After `syncing-featurebase-content` encounters errors

### Requires (invoke before starting)

| Skill | When | Purpose |
| --- | --- | --- |
| `using-todowrite` | Start | Track debugging phases |
| `debugging-systematically` | Complex issues | Structured debugging methodology |

### Calls (during execution)

| Tool/Skill | Phase | Purpose |
| --- | --- | --- |
| `syncing-featurebase-content` | 3 | Verify fix by re-running sync |
| GitHub CLI (gh) | 2A | Fetch workflow logs |
| validate-frontmatter.ts | 2C | Validate YAML syntax |

### Pairs With (conditional)

| Skill | Trigger | Purpose |
| --- | --- | --- |
| `syncing-featurebase-content` | After fix | Re-run sync to verify |
| `creating-featurebase-content` | Validation errors | Understand correct format |

---

## Related Skills

- `syncing-featurebase-content` - Bidirectional sync workflow
- `creating-featurebase-content` - Content creation templates
- `debugging-systematically` - General debugging methodology

---

## References

- [Authentication Debugging](references/authentication-debugging.md) - API key issues
- [Rate Limit Debugging](references/rate-limit-debugging.md) - 429 error handling
- [YAML Syntax Guide](references/yaml-syntax.md) - Frontmatter validation
- [Network Debugging](references/network-debugging.md) - Connectivity issues
- [API Error Debugging](references/api-error-debugging.md) - Server errors
