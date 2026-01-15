---
name: developing-integrations
description: Use when creating or updating Chariot backend integrations (Go) - enforces mandatory requirements (VMFilter, CheckAffiliation, ValidateCredentials), prevents security bugs (race conditions, infinite loops), provides pre-PR checklist, and routes to integration-chariot-patterns for detailed implementation examples
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion
---

# Developing Chariot Backend Integrations

**Complete development workflow for creating secure, compliant, and maintainable Chariot backend integrations with external APIs.**

## When to Use

Use this skill when:

- Creating a new Chariot integration in `modules/chariot/backend/pkg/tasks/integrations/`
- Reviewing an existing integration for compliance violations
- User asks "How do I create a Chariot integration?"
- Implementing integrations for: Wiz, CrowdStrike, Qualys, Tenable, GitHub, Okta, AWS, Azure, GCP, etc.

**NOT for generic Go API clients.** This skill is specific to Chariot's integration task interface.

## Quick Reference

| Requirement          | Status | Description                                 |
| -------------------- | ------ | ------------------------------------------- |
| VMFilter             | P0     | REQUIRED for all Asset/Risk emissions       |
| CheckAffiliation     | P0     | REQUIRED - use Pattern A/B/C                |
| ValidateCredentials  | P0     | REQUIRED - verify before processing         |
| errgroup Safety      | P0     | SetLimit + loop variable capture            |
| Error Handling       | P0     | Never ignore errors                         |
| Pagination Safety    | P0     | Termination guarantee (maxPages OR API signal) |
| File Size Limit      | P1     | <400 lines (split at 500+)                  |
| Frontend Integration | P1     | UI card + enum + logos                      |

**For detailed patterns and code examples**, see [integration-chariot-patterns](.claude/skill-library/development/integrations/integration-chariot-patterns/SKILL.md).

---

## Development Workflow

### Step 1: Mandatory Requirements Checklist

Before writing any code, review the [Mandatory Requirements](references/mandatory-requirements.md) reference:

1. **VMFilter** - Asset/Risk filtering by username
2. **CheckAffiliation** - Use approved pattern (A/B/C) for ownership verification
3. **ValidateCredentials** - Credential verification before processing
4. **errgroup Safety** - Concurrency limits and variable capture
5. **Error Handling** - No ignored errors
6. **Pagination Safety** - Infinite loop prevention

**Cannot proceed without understanding these requirements** ✅

### Step 2: Integration Structure

**Standard integration file structure:**

```
modules/chariot/backend/pkg/tasks/integrations/
├── vendor-name.go              # Main integration (<400 lines)
├── vendor-name_types.go        # API response types (if needed)
├── vendor-name_client.go       # HTTP client wrapper (if needed)
├── vendor-name_transform.go    # Tabularium mapping (if needed)
└── vendor-name_test.go         # Unit tests
```

**When to split files**: If main file exceeds 400 lines, extract types/client/transform.

### Step 3: Implementation Checklist

Use [Pre-PR Checklist](references/pre-pr-checklist.md) to verify compliance:

- [ ] VMFilter initialized in struct: `Filter: filter.NewVMFilter(job.Username)`
- [ ] Filter called before emission: `task.Filter.Asset(&asset)` → `task.Job.Send(&asset)`
- [ ] CheckAffiliation uses approved pattern (A/B/C) - not stub returning true
- [ ] ValidateCredentials implemented and called in `Invoke()`
- [ ] All errgroup usage has `g.SetLimit(10)` and `item := item` before `g.Go()`
- [ ] No ignored errors (no `_, _ = json.Marshal()`)
- [ ] Pagination has `maxPages` constant with break condition
- [ ] File under 400 lines (split if larger)
- [ ] Frontend card added to `modules/chariot/ui/src/hooks/useIntegration.tsx`
- [ ] Enum name in `modules/chariot/ui/src/types.ts` matches backend `Name()` (lowercase)
- [ ] Logos added to both `icons/dark/` AND `icons/light/` directories
- [ ] Tests added with `-race` flag enabled

### Step 4: Anti-Pattern Detection

Review [Anti-Patterns](references/anti-patterns.md) before implementation:

1. **Silent batch failures** - Goroutines returning `nil` instead of propagating errors
2. **Missing HTTP timeouts** - Use `Timeout: 30*time.Second` minimum
3. **No rate limiting** - Use `golang.org/x/time/rate` for tight loops
4. **Hardcoded magic numbers** - Use named constants
5. **Error URL leakage** - Sanitize URLs before logging
6. **Command injection** - Never pass user input to `exec.Command` (AWS/Azure/GCP CLIs)

### Step 5: Detailed Implementation Patterns

This skill now includes comprehensive validated code examples in `references/`:

#### Core Patterns (NEW - Validated from Production)

- **[CheckAffiliation Patterns](references/checkaffiliation-patterns.md)** - Wiz real implementation (only working example), stub patterns
- **[Pagination Patterns](references/pagination-patterns.md)** - 4 patterns with code: token-based, page-based, cursor-based, SDK-based
- **[errgroup Patterns](references/errgroup-patterns.md)** - Concurrent processing, shared state, loop capture, continue-on-error
- **[Tabularium Mapping](references/tabularium-mapping.md)** - Model decision tree: Asset, Cloud Resource, Webpage, Risk
- **[ValidateCredentials Patterns](references/validatecredentials-patterns.md)** - 6 auth patterns: API calls, OAuth2, JWT, HMAC
- **[Test Patterns](references/test-patterns.md)** - Table-driven tests, mock servers, mock collectors, race detection

#### Additional Resources

**[integration-chariot-patterns](.claude/skill-library/development/integrations/integration-chariot-patterns/SKILL.md)** provides:

- Additional batch processing patterns
- HTTP client configuration
- Rate limiting strategies

### Step 6: Frontend Integration

**UI card requirements** (P1):

1. **Add enum** to `modules/chariot/ui/src/types.ts`:

```typescript
export enum IntegrationName {
  // ... existing
  SHODAN = "shodan", // MUST match backend Name() method (lowercase)
}
```

2. **Add logos** to BOTH directories:

```
modules/chariot/ui/src/assets/integrations/icons/dark/shodan.svg
modules/chariot/ui/src/assets/integrations/icons/light/shodan.svg
```

3. **Update hook** in `modules/chariot/ui/src/hooks/useIntegration.tsx` - Add integration to routing logic

### Step 7: Testing

**Minimum test coverage:**

- [ ] ValidateCredentials success/failure cases
- [ ] CheckAffiliation affiliated/unaffiliated/error cases
- [ ] VMFilter application (mock `job.Send()` and verify filtered)
- [ ] Pagination loop termination (mock API with >maxPages responses)
- [ ] Error propagation (no silent failures)

**Run with race detection:**

```bash
go test -race ./modules/chariot/backend/pkg/tasks/integrations/...
```

---

## Violation Examples (What NOT to Do)

### ❌ Missing VMFilter (DigitalOcean, GitHub, GitLab, Cloudflare)

```go
// WRONG - emits assets without filtering
task.Job.Send(&asset)
```

```go
// RIGHT - filter before emission
task.Filter.Asset(&asset)
task.Job.Send(&asset)
```

### ❌ Stub CheckAffiliation - Use Approved Patterns Instead

```go
// WRONG - stub implementation without verification
func (t *Integration) CheckAffiliation(asset model.Asset) (bool, error) {
    return true, nil // VIOLATION - doesn't use any approved pattern
}
```

**RIGHT - Choose the appropriate pattern based on API capability:**

**Decision Flowchart:**
```
Does the vendor API have a single-asset lookup endpoint?
├── YES → Implement Pattern A (direct query)
└── NO → Is this a cloud provider integration (AWS/Azure/GCP)?
    ├── YES → Use Pattern B (CheckAffiliationSimple)
    └── NO → Is integration seed-scoped (only discovers from user seeds)?
        ├── YES → Implement Pattern C (seed-based)
        └── NO → Consult with integration-lead for custom approach
```

**Pattern A Example (PREFERRED):**
```go
func (t *Integration) CheckAffiliation(asset model.Asset) (bool, error) {
    resp, err := t.client.GetAsset(asset.CloudId)
    if err != nil {
        if isNotFoundError(err) {
            return false, nil
        }
        return false, fmt.Errorf("querying asset: %w", err)
    }
    return resp.ID != "" && resp.DeletedAt == "", nil
}
```

**Pattern B Example (cloud providers):**
```go
func (t *Integration) CheckAffiliation(asset model.Asset) (bool, error) {
    return t.BaseCapability.CheckAffiliationSimple(asset)
}
```

**Pattern C Example (seed-scoped):**
```go
func (t *Integration) CheckAffiliation(asset model.Asset) (bool, error) {
    // Check all relevant asset fields against user-provided seeds
    for _, seed := range t.Job.Seeds {
        if strings.Contains(asset.Key, seed.Value) {
            return true, nil
        }
        if asset.DNS != "" && strings.Contains(asset.DNS, seed.Value) {
            return true, nil
        }
    }
    return false, nil
}
```

See [checkaffiliation-patterns.md](references/checkaffiliation-patterns.md) for complete implementation guidance.

### ❌ Missing errgroup Limits (wiz.go, github.go, tenable-vm.go)

```go
// WRONG - unlimited goroutines
g, ctx := errgroup.WithContext(ctx)
for _, item := range items {
    g.Go(func() error { // RACE: captures wrong item
        return process(item)
    })
}
```

```go
// RIGHT - limit goroutines and capture loop variable
g, ctx := errgroup.WithContext(ctx)
g.SetLimit(10) // REQUIRED
for _, item := range items {
    item := item // REQUIRED - capture loop variable
    g.Go(func() error {
        return process(item)
    })
}
```

### ❌ Ignored Errors (wiz, okta, xpanse, tenable_vm)

```go
// WRONG - ignores marshal error
data, _ := json.Marshal(obj) // VIOLATION
```

```go
// RIGHT - handle all errors
data, err := json.Marshal(obj)
if err != nil {
    return fmt.Errorf("marshaling object: %w", err)
}
```

### ❌ Infinite Pagination (MS Defender, EntraID, CrowdStrike, Xpanse, InsightVM, GitLab)

```go
// WRONG - no safety limit
for pageToken != "" {
    resp, err := api.ListAssets(pageToken)
    // ... infinite loop if API bugs out
    pageToken = resp.NextToken
}
```

```go
// RIGHT - enforce maxPages limit
const maxPages = 1000
page := 0
for pageToken != "" {
    if page >= maxPages {
        log.Warn("reached maxPages limit, stopping pagination")
        break
    }
    resp, err := api.ListAssets(pageToken)
    // ...
    pageToken = resp.NextToken
    page++
}
```

---

## Related Skills

| Skill                                 | Purpose                                            |
| ------------------------------------- | -------------------------------------------------- |
| **integration-chariot-patterns**      | Detailed code examples and implementation patterns |
| **go-errgroup-concurrency**           | Deep dive on errgroup safety and concurrency       |
| **error-handling-patterns**           | Go error wrapping and propagation best practices   |
| **reviewing-backend-implementations** | Code review criteria for backend Go code           |

---

## References

All detailed content has been extracted to `references/` for progressive disclosure:

### Requirements & Compliance

- [Mandatory Requirements](references/mandatory-requirements.md) - P0 blocking requirements with violation examples
- [Pre-PR Checklist](references/pre-pr-checklist.md) - Complete checklist before submitting PR
- [Anti-Patterns](references/anti-patterns.md) - Common mistakes and how to avoid them

### Implementation Patterns (NEW - Validated from Production)

- [CheckAffiliation Patterns](references/checkaffiliation-patterns.md) - Real implementations with file:line references
- [Pagination Patterns](references/pagination-patterns.md) - Token, page, cursor, SDK patterns from Okta, GitHub, Xpanse, DigitalOcean
- [errgroup Patterns](references/errgroup-patterns.md) - Standard, shared state, loop capture, continue-on-error patterns
- [Tabularium Mapping](references/tabularium-mapping.md) - Model selection: Asset, Cloud Resource, Webpage, Risk with examples
- [ValidateCredentials Patterns](references/validatecredentials-patterns.md) - API call, OAuth2, JWT, HMAC auth patterns
- [Test Patterns](references/test-patterns.md) - Table-driven, mock server, mock collector, race detection patterns

### Frontend & Testing

- [Frontend Integration](references/frontend-integration.md) - UI card setup and enum configuration
- [Testing Strategy](references/testing-strategy.md) - Test coverage requirements and race detection

---

## Changelog

See [.history/CHANGELOG](.history/CHANGELOG) for version history.
