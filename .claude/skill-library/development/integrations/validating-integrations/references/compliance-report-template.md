# Compliance Report Template

**Purpose**: Standard output format for integration P0 compliance verification.

## Report Structure

````markdown
# Integration Compliance Report: {vendor-name}

**Date**: {YYYY-MM-DD}
**Reviewer**: {agent-name or human}
**Integration Path**: modules/chariot/backend/pkg/tasks/integrations/{vendor}/

## Summary

**Overall Status**: COMPLIANT | NON-COMPLIANT
**P0 Requirements Met**: {count}/7
**Critical Violations**: {count}
**Warnings**: {count}

---

## Requirements Matrix

| #   | Requirement         | Status        | Evidence      | Notes |
| --- | ------------------- | ------------- | ------------- | ----- |
| 1   | VMFilter            | ✅ / ❌ / N/A | file.go:line  |       |
| 2   | CheckAffiliation    | ✅ / ❌ / N/A | file.go:line  |       |
| 3   | ValidateCredentials | ✅ / ❌ / N/A | file.go:line  |       |
| 4   | errgroup Safety     | ✅ / ❌ / N/A | file.go:line  |       |
| 5   | Error Handling      | ✅ / ❌       | file.go:line  |       |
| 6   | Pagination Safety   | ✅ / ❌ / N/A | file.go:line  |       |
| 7   | File Size           | ✅ / ❌       | {lines} lines |       |

---

## Detailed Findings

### 1. VMFilter

**Status**: ✅ PASS / ❌ FAIL / N/A

**Evidence**:

- {file.go}:{line} - `{code snippet or description}`

**Issue** (if FAIL):
{Description of what's wrong}

**Remediation** (if FAIL):
{Steps to fix}

### 2. CheckAffiliation

**Status**: ✅ PASS / ❌ FAIL / N/A

**Evidence**:

- {file.go}:{line} - `{code snippet or description}`

**Issue** (if FAIL):
{Description of what's wrong}

**Remediation** (if FAIL):
{Steps to fix}

### 3. ValidateCredentials

**Status**: ✅ PASS / ❌ FAIL / N/A

**Evidence**:

- {file.go}:{line} - `{code snippet or description}`

**Issue** (if FAIL):
{Description of what's wrong}

**Remediation** (if FAIL):
{Steps to fix}

### 4. errgroup Safety

**Status**: ✅ PASS / ❌ FAIL / N/A

**Evidence**:

- {file.go}:{line} - `{code snippet or description}`

**Issue** (if FAIL):
{Description of what's wrong}

**Remediation** (if FAIL):
{Steps to fix}

### 5. Error Handling

**Status**: ✅ PASS / ❌ FAIL

**Evidence**:

- {file.go}:{line} - `{code snippet or description}`

**Violations Found** (if FAIL):
| Line | Pattern | Issue |
|------|---------|-------|
| {line} | `{code}` | {description} |

**Remediation** (if FAIL):
{Steps to fix}

### 6. Pagination Safety

**Status**: ✅ PASS / ❌ FAIL / N/A

**Evidence**:

- {file.go}:{line} - `{code snippet or description}`

**Issue** (if FAIL):
{Description of what's wrong}

**Remediation** (if FAIL):
{Steps to fix}

### 7. File Size

**Status**: ✅ PASS / ❌ FAIL

**Evidence**:

- Main file: {vendor.go} - {lines} lines
- Split files: {list or "None"}

**Issue** (if FAIL):
{Description of what's wrong}

**Remediation** (if FAIL):
{Steps to fix}

---

## Recommendations

### Priority 1 (Critical)

1. {Critical fix needed}

### Priority 2 (High)

1. {High priority improvement}

### Priority 3 (Medium)

1. {Medium priority improvement}

---

## Verification Commands Used

```bash
# VMFilter
grep -n 'NewVMFilter\|ShouldSend' {vendor}/{vendor}.go

# CheckAffiliation
grep -A 20 'func.*CheckAffiliation' {vendor}/{vendor}.go

# ValidateCredentials
grep -A 3 'func.*Invoke()' {vendor}/{vendor}.go | grep ValidateCredentials

# errgroup
grep -n 'SetLimit' {vendor}/{vendor}.go
grep -B3 'g.Go(func()' {vendor}/{vendor}.go

# Error Handling
grep -n '_, _ =' {vendor}/{vendor}.go
grep -n ', _ := json\\.' {vendor}/{vendor}.go

# Pagination
grep -n 'maxPages\|MaxPages' {vendor}/{vendor}.go

# File Size
wc -l {vendor}/{vendor}.go
```
````

````

---

## Example: Compliant Integration

```markdown
# Integration Compliance Report: github

**Date**: 2026-01-13
**Reviewer**: integration-reviewer agent
**Integration Path**: modules/chariot/backend/pkg/tasks/integrations/github/

## Summary

**Overall Status**: COMPLIANT
**P0 Requirements Met**: 6/7
**Critical Violations**: 0
**Warnings**: 0

---

## Requirements Matrix

| # | Requirement | Status | Evidence | Notes |
|---|-------------|--------|----------|-------|
| 1 | VMFilter | N/A | - | SCM integration, no IP assets |
| 2 | CheckAffiliation | ❌ | base default | Uses base class stub |
| 3 | ValidateCredentials | ✅ | github.go:73 | GET /orgs/{org} |
| 4 | errgroup Safety | ✅ | github.go:145 | SetLimit(25), variable capture |
| 5 | Error Handling | ✅ | - | No ignored errors |
| 6 | Pagination Safety | ✅ | github.go:145 | resp.LastPage from API |
| 7 | File Size | ✅ | 285 lines | Under 400 limit |

---

## Detailed Findings

### 1. VMFilter
**Status**: N/A
**Rationale**: GitHub is an SCM integration discovering repositories, not IP/host assets. VMFilter not applicable.

### 2. CheckAffiliation
**Status**: ❌ FAIL (Known limitation)
**Evidence**: github.go - No CheckAffiliation override, uses base class stub
**Note**: GitHub API does not have efficient single-repo ownership query. CheckAffiliationSimple would work but is expensive.

### 3. ValidateCredentials
**Status**: ✅ PASS
**Evidence**:
- github.go:73 - `func (task *Github) ValidateCredentials() error`
- github.go:85 - `task.client.Organizations.Get(context.Background(), task.name)` (lightweight)
- github.go:118 - Called first in Invoke()

### 4. errgroup Safety
**Status**: ✅ PASS
**Evidence**:
- github.go:145 - `g.SetLimit(25)` (appropriate for GitHub API)
- github.go:147 - `page := i` (loop variable capture)
- github.go:155 - `g.Wait()` called

### 5. Error Handling
**Status**: ✅ PASS
**Evidence**: No `_, _ =` patterns found. All errors wrapped with context.

### 6. Pagination Safety
**Status**: ✅ PASS
**Evidence**:
- github.go:145 - `for i := 2; i <= resp.LastPage; i++`
- API provides authoritative page count (resp.LastPage)

### 7. File Size
**Status**: ✅ PASS
**Evidence**: github.go - 285 lines (under 400 limit)
````

---

## Example: Non-Compliant Integration

```markdown
# Integration Compliance Report: xpanse

**Date**: 2026-01-13
**Reviewer**: integration-reviewer agent
**Integration Path**: modules/chariot/backend/pkg/tasks/integrations/xpanse/

## Summary

**Overall Status**: NON-COMPLIANT
**P0 Requirements Met**: 4/7
**Critical Violations**: 3
**Warnings**: 0

---

## Requirements Matrix

| #   | Requirement         | Status | Evidence                  | Notes                      |
| --- | ------------------- | ------ | ------------------------- | -------------------------- |
| 1   | VMFilter            | ✅     | xpanse.go:390             | filter.Asset() before Send |
| 2   | CheckAffiliation    | ❌     | base default              | Uses base class stub       |
| 3   | ValidateCredentials | ✅     | xpanse.go:108             | Validates headers          |
| 4   | errgroup Safety     | ✅     | xpanse.go:390             | SetLimit(10)               |
| 5   | Error Handling      | ❌     | xpanse.go:158,256,352,448 | 4 json.Marshal ignored     |
| 6   | Pagination Safety   | ✅     | cursor-based with retry   | Uses cursor pagination     |
| 7   | File Size           | ❌     | 509 lines                 | 27% over 400 limit         |

---

## Recommendations

### Priority 1 (Critical)

1. **Fix ignored JSON errors** (4 instances)
   - xpanse.go:158 - Add error check for json.Marshal
   - xpanse.go:256 - Add error check for json.Marshal
   - xpanse.go:352 - Add error check for json.Marshal
   - xpanse.go:448 - Add error check for json.Marshal

2. **Split file** (509 lines, 27% over)
   - Extract types to xpanse_types.go (~150 lines)
   - Extract client methods to xpanse_client.go (~100 lines)

### Priority 2 (High)

1. **Implement real CheckAffiliation** if Xpanse API supports single-asset query
```

---

## Status Definitions

| Status  | Meaning                                             |
| ------- | --------------------------------------------------- |
| ✅ PASS | Requirement met with evidence                       |
| ❌ FAIL | Requirement not met, remediation needed             |
| N/A     | Requirement not applicable to this integration type |

## Severity Definitions

| Severity | Criteria                                          | Example                          |
| -------- | ------------------------------------------------- | -------------------------------- |
| CRITICAL | Breaks functionality or causes data issues        | Ignored errors, missing VMFilter |
| WARNING  | Reduces maintainability or violates best practice | File size, suboptimal patterns   |
| INFO     | Minor improvement opportunity                     | Documentation, code style        |
