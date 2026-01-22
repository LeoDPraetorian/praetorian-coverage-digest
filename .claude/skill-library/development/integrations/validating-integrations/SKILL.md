---
name: validating-integrations
description: Use when verifying that an integration implementation meets all P0 mandatory requirements before code review or PR submission - provides systematic verification patterns with evidence gathering
allowed-tools: Read, Bash, Grep, Glob, TodoWrite
---

# Validating Integrations

**Systematic verification of Chariot backend integrations against P0 mandatory requirements.**

> **Note**: This skill validates against patterns defined in `developing-integrations`. If patterns are updated there, this skill must be updated to match. See `developing-integrations/references/` for authoritative pattern definitions.

## When to Use

Use this skill when:

- Phase 4.5 of integration development (pre-review P0 check)
- Code review of integration PRs
- Self-review before submitting integration PR
- Auditing existing integrations for compliance

**You MUST use TodoWrite** to track verification of all 7 P0 requirements.

## Quick Reference

| Requirement         | Verification Command                                     | Pass Criteria                                      |
| ------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| VMFilter            | `grep -n 'Filter:.*NewVMFilter\|Filter.Asset'`           | Initialized in struct AND called before Job.Send() |
| CheckAffiliation    | `grep -A 20 'func.*CheckAffiliation'`                    | HTTP call present (not stub)                       |
| ValidateCredentials | `grep -n 'ValidateCredentials'`                          | Called in Invoke() before enumeration              |
| errgroup Safety     | `grep -n 'SetLimit\|:= item'`                            | SetLimit(10-25) + loop capture present             |
| Error Handling      | `grep -n '_, _ ='`                                       | Zero results (no ignored errors)                   |
| Pagination Safety   | `grep -n 'maxPages\|LastPage\|HasMore\|NextToken.*==""'` | Termination guarantee present                      |
| File Size           | `wc -l integrations/vendor.go`                           | <400 lines (or split into \_types.go, \_client.go) |

---

## P0 Requirements (from developing-integrations)

### 1. VMFilter

**Purpose**: Filter virtual machine assets to prevent duplicate sending

**Requirements**:

- MUST initialize vmFilter in Invoke() with `vmFilter := filter.NewVMFilter()`
- MUST call `vmFilter.ShouldSend(asset)` before every `Job.Send()` call
- MUST skip sending if ShouldSend returns false

**Verification**: [vmfilter-verification.md](references/vmfilter-verification.md)

### 2. CheckAffiliation

**Purpose**: Verify asset ownership before including in results

**Requirements**:

- MUST query external API to verify organization owns the asset
- MUST NOT be a stub returning `true, nil` (unless using CheckAffiliationSimple for cloud providers)
- MUST handle affiliation failure appropriately (skip asset or log warning)

**Known violation rate**: 41 of 42 integrations (98%) have stub CheckAffiliation

**Verification**: [checkaffiliation-verification.md](references/checkaffiliation-verification.md)

### 3. ValidateCredentials

**Purpose**: Fail fast if credentials are invalid before enumeration

**Requirements**:

- MUST be called in Invoke() before any asset enumeration
- MUST make lightweight API call to verify credentials work
- MUST return error if credentials invalid (don't proceed with enumeration)

**Verification**: [validatecredentials-verification.md](references/validatecredentials-verification.md)

### 4. errgroup Safety

**Purpose**: Prevent unbounded concurrency and goroutine leaks

**Requirements**:

- MUST call `g.SetLimit(10-25)` to limit concurrent goroutines
- MUST capture loop variable before goroutine: `item := item`
- MUST use errgroup.Group for all concurrent operations

**Verification**: [errgroup-verification.md](references/errgroup-verification.md)

### 5. Error Handling

**Purpose**: Ensure all errors are properly handled and wrapped

**Requirements**:

- MUST NOT ignore errors with `_, _ =` pattern
- All errors MUST be wrapped with context (e.g., `fmt.Errorf("context: %w", err)`)
- MUST propagate errors to caller

**Verification**: [error-handling-verification.md](references/error-handling-verification.md)

### 6. Pagination Safety

**Purpose**: Prevent infinite loops on paginated API endpoints

**Requirements**:

- MUST define maxPages constant (typically 1000)
- MUST break pagination loop when maxPages reached
- MUST log warning when maxPages hit

**Verification**: [pagination-verification.md](references/pagination-verification.md)

### 7. File Size

**Purpose**: Maintain code readability and modularity

**Requirements**:

- Integration file MUST be under 400 lines
- If larger, MUST split into:
  - `vendor.go` - Core integration logic
  - `vendor_types.go` - Type definitions
  - `vendor_client.go` - API client wrapper
  - `vendor_utils.go` - Helper functions

**Verification**: [file-size-verification.md](references/file-size-verification.md)

---

## Verification Workflow

### Step 1: Setup

Navigate to integration directory and identify the integration file:

```bash
cd modules/chariot/backend/integrations/
ls -la vendor/
```

### Step 2: Run Verification Commands

Use TodoWrite to track each requirement check. For each P0 requirement:

1. Run verification command from Quick Reference table
2. Analyze output against pass criteria
3. Document evidence (file:line references)
4. Mark as ✅ PASS or ❌ FAIL

**Example**:

```bash
# Check VMFilter
grep -n 'NewVMFilter' integrations/aws/aws.go
# Expected: aws.go:45: vmFilter := filter.NewVMFilter()

grep -n 'ShouldSend' integrations/aws/aws.go
# Expected: aws.go:123: if vmFilter.ShouldSend(asset) {
```

### Step 3: Generate Compliance Report

Create structured report using template: [compliance-report-template.md](references/compliance-report-template.md)

Report must include:

- Overall status: COMPLIANT | NON-COMPLIANT
- Table of requirements with status and evidence
- List of violations with file:line references
- Required remediations

---

## Compliance Report Format

### Report Structure

```markdown
# Integration Compliance Report: {vendor-name}

**Date**: {YYYY-MM-DD}
**Status**: COMPLIANT | NON-COMPLIANT
**Violations**: {count}

## Requirements Summary

| Requirement         | Status  | Evidence                                     |
| ------------------- | ------- | -------------------------------------------- |
| VMFilter            | ✅ / ❌ | file.go:123 - description                    |
| CheckAffiliation    | ✅ / ❌ | file.go:456 - Pattern A/B/C or stub detected |
| ValidateCredentials | ✅ / ❌ | file.go:789 - description                    |
| errgroup Safety     | ✅ / ❌ | file.go:234 - description                    |
| Error Handling      | ✅ / ❌ | file.go:567 - description                    |
| Pagination Safety   | ✅ / ❌ | file.go:890 - {maxPages OR API signal} used  |
| File Size           | ✅ / ❌ | {line-count} lines                           |

## Violations

{If any requirement failed, list with details}

### {Requirement Name}

- **Issue**: {what is wrong}
- **Location**: {file.go:line}
- **Current**: {current code snippet}
- **Required**: {what should be there}
- **Remediation**: {how to fix}

## Recommendations

{List of required changes to achieve compliance}
```

---

## Evidence Format

Each verified requirement needs evidence:

- **Status**: ✅ PASS or ❌ FAIL
- **Evidence**: file.go:123 - specific code reference
- **If FAIL**: Description of what's missing/wrong

**Example PASS**:

```
✅ VMFilter
Evidence: aws.go:45 - vmFilter := filter.NewVMFilter()
Evidence: aws.go:123 - if vmFilter.ShouldSend(asset) { Job.Send(asset) }
```

**Example FAIL**:

```
❌ CheckAffiliation
Evidence: aws.go:234 - func (a *AWS) CheckAffiliation(...) (bool, error) { return true, nil }
Issue: Stub implementation, no API call to verify ownership
Required: Must query AWS API to verify organization owns the resource
```

---

## Integration

### Called By

- integration-developer agent (Phase 4.5 pre-review verification)
- backend-reviewer agent (during code review)
- integration-lead agent (during integration audits)

### Requires (invoke before starting)

None - standalone verification skill

### Calls (during execution)

None - terminal skill that produces compliance reports

### Pairs With (conditional)

| Skill                     | Trigger                             | Purpose                                  |
| ------------------------- | ----------------------------------- | ---------------------------------------- |
| `developing-integrations` | When fixing violations              | Reference implementation patterns        |
| `testing-integrations`    | After achieving P0 compliance       | Write tests for verified requirements    |
| `gateway-integrations`    | When discovering integration skills | Routes to integration development skills |

---

## Related Skills

- `developing-integrations` - Source of P0 requirements and implementation patterns
- `testing-integrations` - Test patterns for P0 requirements
- `gateway-integrations` - Routes to integration skills
