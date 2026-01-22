# Integration Reviewer Prompt Templates

**Phase 9 (Design Verification), Phase 10 (Domain Compliance), and Phase 11 (Code Quality) prompts.**

---

## Integration Reviewer - Phase 9 (Design Verification)

```markdown
Task(
subagent_type: "integration-reviewer",
description: "Verify {vendor} implementation matches architecture",
prompt: "

## Task: Verify Implementation Matches Architecture Plan

### Stage: Design Verification (Phase 9)

### Architecture Plan

{From .claude/.output/integrations/{workflow-id}/architecture-plan.md}

### Implementation Summary

{From .claude/.output/integrations/{workflow-id}/implementation.md}

### MANDATORY SKILLS TO READ FIRST

- gateway-integrations
- developing-integrations (LIBRARY): Read('.claude/skill-library/development/integrations/developing-integrations/SKILL.md')
- integrating-with-{vendor} (LIBRARY): Read('.claude/skill-library/development/integrations/integrating-with-{vendor}/SKILL.md')

### Files to Review

- modules/chariot/backend/pkg/integrations/{vendor}/\*.go

### YOUR ONLY FOCUS

Does implementation match architecture plan exactly?

### Checklist

- [ ] All planned tasks implemented
- [ ] Client interface matches design
- [ ] Collector flow matches design
- [ ] Asset mapping matches design
- [ ] File structure matches plan
- [ ] No extra features added

### DO NOT Evaluate

- P0 compliance (that's Phase 10)
- Code quality (that's Phase 11)
- Test coverage (that's Phase 14)

### Output Format

{
'verdict': 'MATCHES_PLAN | DEVIATES_FROM_PLAN',
'checklist': {
'tasks_implemented': true,
'client_interface': true,
'collector_flow': true,
'asset_mapping': true,
'file_structure': true
},
'deviations': [
{ 'planned': '...', 'actual': '...', 'severity': 'HIGH' }
],
'missing_features': [],
'extra_features': []
}
"
)
```

---

## Integration Reviewer - Phase 10 (P0 Compliance)

````markdown
Task(
subagent_type: "integration-reviewer",
description: "P0 compliance review for {vendor} integration",
prompt: "

## Task: Verify P0 Compliance

### Stage: Domain Compliance (Phase 10) - BLOCKING

### MANDATORY SKILLS TO READ FIRST

- gateway-integrations
- developing-integrations (LIBRARY): Read('.claude/skill-library/development/integrations/developing-integrations/SKILL.md')
- validating-integrations (LIBRARY): Read('.claude/skill-library/development/integrations/validating-integrations/SKILL.md')

### Files to Review

- modules/chariot/backend/pkg/integrations/{vendor}/\*.go

### P0 COMPLIANCE CHECKLIST (ALL REQUIRED)

| #   | Requirement         | Status    | Evidence                                    |
| --- | ------------------- | --------- | ------------------------------------------- |
| 1   | VMFilter            | PASS/FAIL | {file}:{line} - {description}               |
| 2   | CheckAffiliation    | PASS/FAIL | {file}:{line} - Real API call or STUB?      |
| 3   | ValidateCredentials | PASS/FAIL | {file}:{line} - First in Invoke()?          |
| 4   | errgroup Safety     | PASS/FAIL | {file}:{line} - SetLimit + captured vars?   |
| 5   | Pagination Safety   | PASS/FAIL | {file}:{line} - maxPages or LastPage check? |
| 6   | Error Handling      | PASS/FAIL | Files checked for _, _ = patterns           |
| 7   | File Size           | PASS/FAIL | All files under 400 lines?                  |

### Validation Commands

```bash
# VMFilter
grep -n 'Filter:.*NewVMFilter' {vendor}.go
grep -B5 'Job.Send' {vendor}.go | grep -q 'Filter'

# CheckAffiliation (MUST NOT be stub)
grep -A30 'func.*CheckAffiliation' {vendor}.go | grep -E 'http|graphql|client\.'

# ValidateCredentials
grep -A5 'func.*Invoke' {vendor}.go | head -6

# errgroup
grep -A3 'errgroup.Group' collector.go | grep 'SetLimit'
grep -A10 'g.Go' collector.go | grep -E 'item :=|asset :='

# Pagination
grep -E 'const maxPages|LastPage|HasMore' *.go

# Error Handling
grep -n '_, _ =' *.go
grep 'fmt.Errorf' *.go | grep -v '%w'

# File Size
wc -l *.go
```
````

### CRITICAL: CheckAffiliation Validation

98% of integrations have stub CheckAffiliation that returns true without API call.
You MUST verify the implementation makes a REAL API query.

**Stub (FAILS P0):**

```go
func (c *Capability) CheckAffiliation(ctx context.Context, asset string) bool {
    return true  // STUB - NO API CALL
}
```

**Real (PASSES P0):**

```go
func (c *Capability) CheckAffiliation(ctx context.Context, asset string) bool {
    resp, err := c.client.GetAsset(ctx, asset)
    if err != nil { return false }
    return resp.BelongsToOrg(c.orgID)
}
```

### Output Format

{
'verdict': 'P0_COMPLIANT | P0_VIOLATIONS_FOUND',
'violations_count': {count},
'compliance_table': [
{ 'requirement': 'VMFilter', 'status': 'PASS', 'file': '{vendor}.go', 'line': 45, 'evidence': 'Filter initialized and called' },
{ 'requirement': 'CheckAffiliation', 'status': 'FAIL', 'file': '{vendor}.go', 'line': 78, 'evidence': 'STUB - returns true without API call' }
],
'critical_violations': [
{ 'requirement': 'CheckAffiliation', 'severity': 'CRITICAL', 'fix': 'Implement real API query' }
],
'recommendations': []
}

### BLOCKING BEHAVIOR

If ANY P0 requirement fails:

- Return P0_VIOLATIONS_FOUND
- List all violations with specific fix instructions
- Implementation CANNOT proceed to Phase 11 until fixed
  "
  )

````

---

## Integration Reviewer - Phase 11 (Code Quality)

```markdown
Task(
subagent_type: "integration-reviewer",
description: "Code quality review for {vendor} integration",
prompt: "

## Task: Code Quality Review

### Stage: Phase 11 (Parallel with backend-security)

### Prerequisite

Phase 10 PASSED (P0 compliance confirmed)

### MANDATORY SKILLS TO READ FIRST

- adhering-to-dry
- gateway-integrations
- developing-integrations (LIBRARY): Read('.claude/skill-library/development/integrations/developing-integrations/SKILL.md')

### Files to Review

- modules/chariot/backend/pkg/integrations/{vendor}/*.go

### Quality Checklist

- [ ] Go idioms followed (effective Go patterns)
- [ ] Error handling (wrapping, logging, no swallowing)
- [ ] Concurrency safety (mutexes, channel patterns)
- [ ] API client design (rate limiting, retries, timeouts)
- [ ] Code organization (single responsibility)
- [ ] DRY principle followed
- [ ] Test coverage adequate (80%+ on business logic)

### Output Format

{
'verdict': 'APPROVED | APPROVED_WITH_NOTES | CHANGES_REQUESTED',
'quality_score': {0-100},
'issues': [
  { 'file': '...', 'line': ..., 'issue': '...', 'severity': 'HIGH' }
],
'suggestions': []
}
"
)
````

---

## Backend Security Review (Phase 11 - Parallel)

```markdown
Task(
subagent_type: "backend-security",
description: "Security review for {vendor} integration",
prompt: "

## Task: Security Review

### Stage: Phase 11 (Parallel with integration-reviewer quality)

### Prerequisite

Phase 10 PASSED (P0 compliance confirmed)

### MANDATORY SKILLS TO READ FIRST

- gateway-integrations
- developing-integrations (LIBRARY): Read('.claude/skill-library/development/integrations/developing-integrations/SKILL.md')

### Files to Review

- modules/chariot/backend/pkg/integrations/{vendor}/\*.go

### Security Checklist

- [ ] Credential handling (no hardcoded secrets, proper storage)
- [ ] API key exposure (not logged, not in error messages)
- [ ] Input validation (user-controlled data sanitized)
- [ ] Output encoding (proper escaping)
- [ ] Error message leakage (no sensitive data exposed)
- [ ] Rate limiting (prevent abuse)
- [ ] TLS/HTTPS enforcement
- [ ] OWASP Top 10 relevance

### Integration-Specific Security Focus

- Third-party API credentials
- Webhook signature validation (if applicable)
- Data exfiltration prevention
- Multi-tenant isolation (CheckAffiliation)

### Output Format

{
'verdict': 'APPROVED | CHANGES_REQUESTED',
'vulnerabilities': [
{ 'type': 'CREDENTIAL_EXPOSURE', 'file': '...', 'line': ..., 'severity': 'CRITICAL', 'fix': '...' }
],
'recommendations': []
}
"
)
```

---

## Related References

- [Phase 9: Design Verification](../phase-9-design-verification.md) - Phase context
- [Phase 10: Domain Compliance](../phase-10-domain-compliance.md) - P0 validation
- [Phase 11: Code Quality](../phase-11-code-quality.md) - Quality review
- [Agent Matrix](../agent-matrix.md) - Agent selection
- [P0 Compliance](../p0-compliance.md) - P0 requirements detail
