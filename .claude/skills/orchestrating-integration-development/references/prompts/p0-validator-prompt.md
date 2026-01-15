# P0 Validator Prompt (Phase 4.5)

**Phase**: 4.5 (P0 Compliance Verification)
**Method**: Orchestrator invokes `validating-integrations` skill (not an agent)
**Purpose**: Verify ALL P0 requirements before code review

## Overview

Phase 4.5 is NOT an agent spawn - it's a skill invocation by the orchestrator. The orchestrator invokes the `validating-integrations` library skill which performs automated verification.

## Orchestrator Action

```markdown
# After Phase 4 completes, orchestrator invokes:

Read(".claude/skill-library/development/integrations/validating-integrations/SKILL.md")

# Then follows the skill's instructions to verify P0 compliance
```

## Validation Process

The `validating-integrations` skill verifies:

### 1. VMFilter
```bash
# Check initialization
grep -n "Filter:.*NewVMFilter\|Filter:.*NewCloudModuleFilter\|Filter:.*NewWizFilter" {file}.go

# Check usage before Job.Send()
grep -B5 "Job.Send" {file}.go | grep "Filter.Asset"
```

**Pass criteria**:
- VMFilter initialized in struct
- Filter.Asset() called before every Job.Send()

### 2. CheckAffiliation
```bash
# Check if overridden
grep -n "func.*CheckAffiliation" {file}.go

# Verify makes API call (not stub)
grep -A30 "func.*CheckAffiliation" {file}.go | grep -E "http|graphql|api|query|request"
```

**Pass criteria**:
- CheckAffiliation method overrides base
- Method queries external API (not `return true, nil`)

### 3. ValidateCredentials
```bash
# Find Invoke method
grep -n "func.*Invoke" {file}.go

# Verify first statement is ValidateCredentials
grep -A5 "func.*Invoke" {file}.go | head -6 | grep "ValidateCredentials"
```

**Pass criteria**:
- ValidateCredentials called as first statement in Invoke()

### 4. errgroup
```bash
# Check SetLimit called
grep -A3 "errgroup.Group" {file}.go | grep "SetLimit"

# Check loop variable capture
grep -B2 -A10 "group.Go\|g.Go" {file}.go | grep "^\s*\w\+ := \w\+.*//.*capture"
```

**Pass criteria**:
- SetLimit() called
- Loop variables captured

### 5. Pagination
```bash
# Check for maxPages constant
grep -n "const maxPages" {file}.go

# Check loop uses maxPages or API-provided limit
grep -A20 "for.*page\|for.*offset" {file}.go
```

**Pass criteria**:
- maxPages constant defined OR API provides authoritative limit
- Break condition present

### 6. Error Handling
```bash
# Find ignored errors
grep -n "_, _.*=" {file}.go
```

**Pass criteria**:
- Returns 0 matches (no ignored errors)

### 7. File Size
```bash
wc -l {file}.go
```

**Pass criteria**:
- Each file <400 lines OR split into multiple files

## Output: p0-compliance-review.md

```markdown
# P0 Compliance Report: {vendor}

**Status**: {COMPLIANT | NON-COMPLIANT}
**Violations**: {count}

## Requirements Summary

| Requirement | Status | Evidence |
|-------------|--------|----------|
| VMFilter | {✅|❌} | {file}:{line} (init), {file}:{line} (usage) |
| CheckAffiliation | {✅|❌} | {file}:{line} {queries API | stub | not overridden} |
| ValidateCredentials | {✅|❌} | {file}:{line} (first in Invoke) |
| errgroup Safety | {✅|❌} | {file}:{line} (SetLimit), {file}:{line} (capture) |
| Pagination Safety | {✅|❌} | {file}:{line} (maxPages constant | API limit) |
| Error Handling | {✅|❌} | {no violations found | N violations at lines X, Y} |
| File Size | {✅|⚠️|❌} | {file}: {lines} lines |

## Violations Details

{If any violations, list each with:}
- Requirement violated
- Current state
- Required fix
- Pattern reference
```

## Human Checkpoint (Conditional)

**IF violations found**, orchestrator uses AskUserQuestion:

```markdown
P0 Compliance Verification found {count} violations.

**Critical**: {violation descriptions}

Options:
1. Fix violations now (Recommended)
2. Proceed anyway with violations documented
3. Review violations and decide
```

**IF no violations**, orchestrator proceeds automatically to Phase 5 (no checkpoint needed).

## Related References

- [Phase 4.5: P0 Validation](../phase-4.5-p0-validation.md) - Detailed P0 requirements
- [Validating Integrations Skill](.claude/skill-library/development/integrations/validating-integrations/SKILL.md)
