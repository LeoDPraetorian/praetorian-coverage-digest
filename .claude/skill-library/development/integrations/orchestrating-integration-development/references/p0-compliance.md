# P0 Compliance: Integration Development

**Domain-specific compliance checks for Chariot backend integrations with third-party APIs.**

---

## Overview

P0 Compliance Validation is a **blocking gate** that verifies integration implementations meet mandatory requirements BEFORE code enters review. This prevents:

- Wasted reviewer time on non-compliant code
- Multiple review cycles fixing the same violations
- Production bugs from common integration anti-patterns

**When it runs**: Phase 10 (Domain Compliance), after implementation
**Blocking behavior**: Violations found → Human Checkpoint → Must fix before proceeding
**Success behavior**: All checks pass → Automatic progression to review

---

## P0 Requirements Table

Integration development has **7 mandatory P0 requirements**:

| #   | P0 Requirement          | What to Verify                                   | Validation Command                                             | Blocking |
| --- | ----------------------- | ------------------------------------------------ | -------------------------------------------------------------- | -------- |
| 1   | **VMFilter**            | Initialized + called before Job.Send()           | `grep -n "Filter:.*NewVMFilter"` + `grep -B5 "Job.Send"`       | Always   |
| 2   | **CheckAffiliation**    | Makes external API call (not stub)               | `grep -A30 "func.*CheckAffiliation"` \| `grep "http\|graphql"` | Always   |
| 3   | **ValidateCredentials** | Called as FIRST statement in Invoke()            | `grep -A5 "func.*Invoke"` \| `grep "ValidateCredentials"`      | Always   |
| 4   | **errgroup Safety**     | SetLimit() called + loop vars captured           | `grep -A3 "errgroup.Group"` \| `grep "SetLimit"`               | Always   |
| 5   | **Pagination Safety**   | maxPages constant OR API-provided limit          | `grep "const maxPages"` + loop termination check               | Always   |
| 6   | **Error Handling**      | No `_, _ =` patterns; all errors wrapped with %w | `grep -n "_, _.*="` + `grep "fmt.Errorf"` \| `grep -v "%w"`    | Always   |
| 7   | **File Size**           | Under 400 lines or split into multiple files     | `wc -l {file}.go`                                              | Always   |

---

## Known High-Impact Violations

Based on audit of existing integrations:

| Requirement          | Violation Rate           | Impact                                                          |
| -------------------- | ------------------------ | --------------------------------------------------------------- |
| **CheckAffiliation** | 98% (41/42 integrations) | Stub returns false positives for deleted assets                 |
| **Pagination**       | 0/44 use maxPages        | All rely on API-provided limits (acceptable)                    |
| **File Size**        | 3 major violators        | Wiz (914 lines), Bitbucket (610 lines), CrowdStrike (569 lines) |

**CheckAffiliation is the #1 violation** - most integrations return a stub that doesn't actually query the external API to verify asset ownership.

---

## Detailed Validation Procedures

### 1. VMFilter

**Purpose**: Filter assets by VM membership before processing

**Validation**:

```bash
# Check initialization
grep -n "Filter:.*NewVMFilter" vendor.go

# Check usage before Job.Send
grep -B5 "Job.Send" vendor.go | grep -q "Filter" && echo "PASS" || echo "FAIL"
```

**Common Violation**: VMFilter initialized but never called

**Fix Pattern**:

```go
// In Invoke()
filteredAssets := c.Filter.FilterAssets(assets)
for _, asset := range filteredAssets {
    // process asset
}
```

### 2. CheckAffiliation

**Purpose**: Verify asset ownership via external API query

**Validation**:

```bash
# Check for real API call (not stub)
grep -A30 "func.*CheckAffiliation" vendor.go | grep -E "http|graphql|client\."
```

**Common Violation**: Stub implementation that always returns true

```go
// ❌ WRONG - Stub
func (c *Capability) CheckAffiliation(ctx context.Context, asset string) bool {
    return true  // This is a stub!
}
```

**Fix Pattern**:

```go
// ✅ CORRECT - Real API query
func (c *Capability) CheckAffiliation(ctx context.Context, asset string) bool {
    resp, err := c.client.GetAsset(ctx, asset)
    if err != nil {
        return false
    }
    return resp.BelongsToOrg(c.orgID)
}
```

### 3. ValidateCredentials

**Purpose**: Fail fast on invalid credentials

**Validation**:

```bash
# Check ValidateCredentials is FIRST in Invoke()
grep -A5 "func.*Invoke" vendor.go | head -6
```

**Common Violation**: ValidateCredentials called after other logic

**Fix Pattern**:

```go
func (c *Capability) Invoke(ctx context.Context) error {
    if err := c.ValidateCredentials(ctx); err != nil {  // MUST be first
        return err
    }
    // rest of implementation
}
```

### 4. errgroup Safety

**Purpose**: Prevent goroutine leaks and unbounded concurrency

**Validation**:

```bash
# Check SetLimit is called
grep -A3 "errgroup.Group" vendor.go | grep "SetLimit"

# Check loop variables are captured
grep -A10 "g.Go" vendor.go | grep -E "asset :=|item :="
```

**Common Violation**: No SetLimit, loop variable not captured

**Fix Pattern**:

```go
g, ctx := errgroup.WithContext(ctx)
g.SetLimit(10)  // MUST set limit

for _, asset := range assets {
    asset := asset  // MUST capture loop variable
    g.Go(func() error {
        return c.processAsset(ctx, asset)
    })
}
```

### 5. Pagination Safety

**Purpose**: Prevent infinite loops in paginated API calls

**Validation**:

```bash
# Check for maxPages constant
grep "const maxPages" vendor.go

# OR check for API-provided termination
grep -E "LastPage|HasMore|NextToken == nil" vendor.go
```

**Acceptable Patterns**:

- `const maxPages = 100` with loop check
- API-provided `resp.LastPage` or `resp.HasMore == false`

### 6. Error Handling

**Purpose**: No silent failures, all errors wrapped with context

**Validation**:

```bash
# Check for ignored errors (should return empty)
grep -n "_, _ =" vendor.go

# Check all fmt.Errorf use %w (should return empty for violations)
grep "fmt.Errorf" vendor.go | grep -v "%w"
```

**Common Violation**: JSON marshaling errors ignored

```go
// ❌ WRONG
payload, _ := json.Marshal(reqBody)

// ✅ CORRECT
payload, err := json.Marshal(reqBody)
if err != nil {
    return fmt.Errorf("marshal request: %w", err)
}
```

### 7. File Size

**Purpose**: Maintainability - files under 400 lines

**Validation**:

```bash
wc -l vendor.go
```

**Split Pattern** (if over 400 lines):

- `vendor.go` - Main integration logic
- `vendor_types.go` - Type definitions
- `vendor_client.go` - API client wrapper
- `vendor_transform.go` - Data transformation

---

## Validation Protocol

**3-Step Validation Process (MANDATORY):**

### Step 1: Run All P0 Checks

```bash
FILE="modules/chariot/backend/capability/vendor/vendor.go"

# 1. VMFilter
echo "=== VMFilter ==="
grep -n "Filter:.*NewVMFilter" $FILE

# 2. CheckAffiliation
echo "=== CheckAffiliation ==="
grep -A30 "func.*CheckAffiliation" $FILE | grep -E "http|graphql|client\."

# 3. ValidateCredentials
echo "=== ValidateCredentials ==="
grep -A5 "func.*Invoke" $FILE | head -6

# 4. errgroup
echo "=== errgroup ==="
grep -A3 "errgroup.Group" $FILE | grep "SetLimit"

# 5. Pagination
echo "=== Pagination ==="
grep -E "const maxPages|LastPage|HasMore" $FILE

# 6. Error Handling
echo "=== Error Handling ==="
grep -n "_, _ =" $FILE
grep "fmt.Errorf" $FILE | grep -v "%w"

# 7. File Size
echo "=== File Size ==="
wc -l $FILE
```

### Step 2: Document Results

For each check, record:

- ✅ PASS with evidence (file:line)
- ❌ FAIL with violation details
- ⚠️ WARNING with justification

### Step 3: Proceed or Escalate

| Result          | Action                                | Human Checkpoint? |
| --------------- | ------------------------------------- | ----------------- |
| All checks PASS | Proceed to Phase 11 (Code Quality)    | No                |
| Any check FAILS | Generate compliance report + escalate | **YES**           |

---

## Output Format

````markdown
# P0 Compliance Report: Integration Development - {vendor-name}

**Status**: COMPLIANT | NON-COMPLIANT
**Violations**: {count} ({critical} CRITICAL, {error} ERROR, {warning} WARNING)
**Date**: {ISO 8601 timestamp}

## Requirements Summary

| #   | Requirement         | Status      | Evidence                                                        |
| --- | ------------------- | ----------- | --------------------------------------------------------------- |
| 1   | VMFilter            | ✅          | vendor.go:45 (initialized), vendor.go:123 (used)                |
| 2   | CheckAffiliation    | ❌ CRITICAL | vendor.go:234 (stub without API call)                           |
| 3   | ValidateCredentials | ✅          | vendor.go:89 (first statement in Invoke())                      |
| 4   | errgroup Safety     | ✅          | vendor.go:156 (SetLimit(10)), vendor.go:160 (loop var captured) |
| 5   | Pagination Safety   | ✅          | vendor.go:189 (API-provided resp.LastPage)                      |
| 6   | Error Handling      | ❌ ERROR    | vendor.go:267 (json.Marshal error ignored)                      |
| 7   | File Size           | ⚠️ WARNING  | 478 lines (exceeds 400 line limit)                              |

## Violations Details

### CRITICAL: CheckAffiliation (vendor.go:234)

**Current:**

```go
func (c *Capability) CheckAffiliation(ctx context.Context, asset string) bool {
    return true  // Stub!
}
```
````

**Fix**: Implement real API query (see wiz.go:717-783 for reference)

```

---

## Rationalization Prevention

| Rationalization | Reality | Counter |
| --------------- | ------- | ------- |
| "CheckAffiliation stub is fine, we'll implement it later" | Stub causes false positives (shows deleted assets) | Must implement real API query before PR |
| "File is 478 lines but splitting would be premature" | 400-line limit prevents monolithic files | Split now using vendor_{types,client,transform}.go |
| "maxPages constant isn't needed, API provides LastPage" | API-provided limits are acceptable alternatives | ✅ ACCEPTABLE - Document which pattern is used |
| "JSON marshaling never fails, safe to ignore" | json.Marshal CAN fail (cyclic refs, invalid types) | Must check error and wrap with context |
| "errgroup doesn't need SetLimit for small batches" | Unbounded goroutines cause resource exhaustion | Always SetLimit, even for small batches |

---

## Related References

| Reference | Location | Purpose |
| --------- | -------- | ------- |
| Phase 10 Details | [phase-10-domain-compliance.md](phase-10-domain-compliance.md) | Full domain compliance checklist |
| Validation Skill | `.claude/skill-library/development/integrations/validating-integrations/SKILL.md` | Automated P0 validation |
| Integration Patterns | `.claude/skill-library/development/integrations/developing-integrations/SKILL.md` | P0 requirements definition |
| Orchestration Guards | [orchestration-guards.md](orchestration-guards.md) | Rationalization prevention |
```
