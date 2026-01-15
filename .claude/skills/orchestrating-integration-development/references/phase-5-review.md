# Phase 5: Review (Two-Stage Gated)

**Purpose**: Validate implementation quality through spec compliance and security review.

## Overview

Phase 5 uses a two-stage gated review process to ensure implementation quality before testing. Each stage has retry limits to prevent infinite loops, with human escalation when retries are exhausted.

**Two stages:**
1. **Stage 1: Spec Compliance** - Does implementation match architecture.md?
2. **Stage 2: Quality + Security** - Is code well-built and secure?

## Stage 1: Spec Compliance Review

**Agent**: `backend-reviewer`

**Focus**: Verify implementation matches the architecture.md specification.

### Review Checklist

| Aspect | Question | Evidence |
|--------|----------|----------|
| Structure | Are all planned files created? | Compare file-placement.md to actual files |
| Methods | Are all required methods implemented? | Check handler has Match, Invoke, CheckAffiliation, ValidateCredentials |
| Auth flow | Does auth match architecture? | Compare implementation to Auth section |
| Pagination | Does pagination match architecture? | Check maxPages constant, termination condition |
| Data mapping | Do transforms match Tabularium mapping? | Compare to Data Mapping section |
| Concurrency | Does errgroup match architecture? | Check SetLimit value, loop capture |

### Agent Prompt

```markdown
Task: Spec Compliance Review for {vendor} integration

INPUT FILES:
- architecture.md: The specification to review against
- Implementation files: {list from Phase 4}
- implementation-log.md: Developer's notes

REVIEW QUESTIONS:
1. Does the file structure match file-placement.md?
2. Are all methods from architecture.md implemented?
3. Does authentication flow match the Auth section?
4. Does pagination match the Pagination Strategy section?
5. Do data transformations match the Tabularium Mapping section?
6. Does errgroup usage match the Concurrency Strategy section?

OUTPUT: spec-compliance-review.md with:
- Compliance verdict: SPEC_COMPLIANT | SPEC_VIOLATIONS
- Checklist results
- Violation details (if any)
- Required fixes (if any)

MANDATORY SKILLS:
- adhering-to-dry
- gateway-backend
- persisting-agent-outputs

OUTPUT_DIRECTORY: {from Phase 0}

COMPLIANCE: Document invoked skills in output metadata.
```

### spec-compliance-review.md Structure

```markdown
# Spec Compliance Review: {vendor}

## Verdict: {SPEC_COMPLIANT | SPEC_VIOLATIONS}

## Checklist Results

| Requirement | Status | Evidence |
|-------------|--------|----------|
| File structure | ✅ | 3 files created per file-placement.md |
| Required methods | ✅ | Match, Invoke, CheckAffiliation, ValidateCredentials present |
| Auth flow | ✅ | API key retrieved from Job.Secret, client initialized |
| Pagination | ✅ | maxPages=1000, breaks on empty NextToken |
| Data mapping | ⚠️ | Missing CloudId mapping (see Violations) |
| Concurrency | ✅ | SetLimit(10), loop variable captured |

## Violations (if any)

### Violation 1: Missing CloudId Mapping
**Architecture says**: Map vendor.cloud_platform_id to asset.CloudId
**Implementation has**: No CloudId assignment in transformAsset()
**Required fix**: Add `asset.CloudId = item.CloudPlatformID` in transform

## Required Fixes
1. Add CloudId mapping in {vendor}_transform.go:transformAsset()

## Recommendation
{If violations: Return to integration-developer for fixes}
{If compliant: Proceed to Stage 2}
```

### Stage 1 Retry Logic

**MAX 2 RETRIES** before human escalation

```
Attempt 1: Review finds violations
  └─ Return to integration-developer with fix instructions
     │
Attempt 2: Re-review after fixes
  └─ If still violations → Attempt 3
     │
Attempt 3: Final review
  └─ If still violations → 🛑 Human Checkpoint
```

**Fix cycle:**
1. Reviewer identifies violations
2. Orchestrator spawns fresh `integration-developer` with violation context
3. Developer fixes specific violations
4. Orchestrator spawns reviewer for re-review
5. Repeat until compliant OR max retries

**Human checkpoint trigger:**

```markdown
Stage 1 Review: Max retries exceeded

After 3 attempts, spec compliance issues remain:
- {violation 1}
- {violation 2}

Options:
1. Continue anyway (not recommended) - Proceed with known spec deviations
2. Manual intervention - I'll explain the issues for you to resolve
3. Architecture revision - Return to Phase 3 to revise requirements
```

## Stage 2: Quality + Security Review

**Agents**: `backend-reviewer` + `backend-security` (PARALLEL)

**Focus**: Code quality and security vulnerabilities.

### Quality Review Checklist

| Aspect | Question |
|--------|----------|
| Error handling | Are all errors checked and wrapped with context? |
| Logging | Is appropriate logging present for debugging? |
| Code style | Does code follow Go conventions (gofmt, naming)? |
| Comments | Are complex sections documented? |
| Edge cases | Are nil checks and boundary conditions handled? |
| Performance | Are there obvious performance issues? |

### Security Review Checklist

| Aspect | Question |
|--------|----------|
| Credential handling | Are secrets retrieved securely, never logged? |
| Input validation | Is external input validated before use? |
| SQL/Command injection | Are queries parameterized? |
| TLS | Is HTTPS enforced for API calls? |
| Rate limiting | Does code respect vendor rate limits? |
| Error disclosure | Do error messages avoid leaking sensitive data? |

### Parallel Agent Prompts

**Spawn both agents in SINGLE message:**

```markdown
Task: Code Quality Review for {vendor} integration

INPUT FILES:
- Implementation files: {list}
- architecture.md: Reference
- spec-compliance-review.md: Stage 1 results

REVIEW FOCUS:
- Error handling quality
- Code style and conventions
- Logging appropriateness
- Edge case handling
- Performance concerns

OUTPUT: code-quality-review.md with:
- Quality verdict: APPROVED | NEEDS_WORK
- Findings by category
- Required fixes (if any)

MANDATORY SKILLS:
- adhering-to-dry
- gateway-backend
- persisting-agent-outputs

OUTPUT_DIRECTORY: {from Phase 0}
```

```markdown
Task: Security Review for {vendor} integration

INPUT FILES:
- Implementation files: {list}
- architecture.md: Reference

REVIEW FOCUS:
- Credential handling (secrets never logged, proper retrieval)
- Input validation (external data validated)
- TLS enforcement (HTTPS for all API calls)
- Error disclosure (no sensitive data in errors)
- Rate limit compliance

OUTPUT: security-review.md with:
- Security verdict: APPROVED | SECURITY_ISSUES
- Findings by severity (Critical, High, Medium, Low)
- Required fixes for Critical/High

MANDATORY SKILLS:
- persisting-agent-outputs

OUTPUT_DIRECTORY: {from Phase 0}
```

### code-quality-review.md Structure

```markdown
# Code Quality Review: {vendor}

## Verdict: {APPROVED | NEEDS_WORK}

## Findings

### Error Handling
- ✅ All errors checked (no `_, _ =` patterns)
- ✅ Errors wrapped with context
- ⚠️ Consider adding more context to line 145

### Code Style
- ✅ Follows gofmt formatting
- ✅ Naming conventions followed
- ℹ️ Consider extracting duplicate code at lines 78, 95

### Logging
- ✅ Appropriate debug logging
- ✅ No sensitive data logged

### Edge Cases
- ✅ Nil checks present
- ⚠️ Consider handling empty response at line 120

## Required Fixes
{None if APPROVED}
{List if NEEDS_WORK}

## Recommendations (optional)
1. Extract common error wrapping pattern
2. Add debug logging for pagination progress
```

### security-review.md Structure

```markdown
# Security Review: {vendor}

## Verdict: {APPROVED | SECURITY_ISSUES}

## Findings by Severity

### Critical
{None found | List with required fixes}

### High
{None found | List with required fixes}

### Medium
- ⚠️ Rate limit headers checked but no backoff implemented
  - Impact: Could trigger vendor rate limiting
  - Recommendation: Add exponential backoff

### Low
- ℹ️ Consider adding request timeout configuration
  - Currently hardcoded to 30s

## Required Fixes
{For Critical/High only}

## Security Checklist

| Control | Status |
|---------|--------|
| Secrets via Job.Secret | ✅ |
| No secrets in logs | ✅ |
| HTTPS enforced | ✅ |
| Input validation | ✅ |
| Error messages safe | ✅ |
```

### Stage 2 Retry Logic

**MAX 1 RETRY** before human escalation

Stage 2 issues are typically more fundamental than Stage 1, so fewer retries are allowed.

```
Attempt 1: Reviews find issues
  └─ Return to integration-developer with fix instructions
     │
Attempt 2: Re-review after fixes
  └─ If still issues → 🛑 Human Checkpoint
```

**Human checkpoint trigger:**

```markdown
Stage 2 Review: Max retries exceeded

Quality/Security issues remain after fixes:
- {issue 1}
- {issue 2}

Options:
1. Accept with documented risks - Proceed with known issues
2. Manual intervention - Review issues together
3. Architectural change - Issue requires design change
```

## Gate Checklist

Phase 5 is complete when:

- [ ] Stage 1: `backend-reviewer` spawned for spec compliance
- [ ] Stage 1: `spec-compliance-review.md` created
- [ ] Stage 1: Verdict is SPEC_COMPLIANT (or human approved deviation)
- [ ] Stage 2: `backend-reviewer` spawned for quality review
- [ ] Stage 2: `backend-security` spawned for security review
- [ ] Stage 2: `code-quality-review.md` created
- [ ] Stage 2: `security-review.md` created
- [ ] Stage 2: Quality verdict is APPROVED (or human approved)
- [ ] Stage 2: Security verdict is APPROVED (no Critical/High unfixed)
- [ ] MANIFEST.yaml updated with all review files
- [ ] metadata.json phase-5 status updated to 'complete'

## Common Issues

### Issue: Reviewer Misunderstands Architecture

**Symptom**: False positive violations

**Solution**:
- Provide specific architecture.md sections in prompt
- Include implementation-log.md for developer intent
- Clarify ambiguous requirements with user

### Issue: Security Finding Requires Architecture Change

**Symptom**: Security issue can't be fixed without design change

**Solution**:
1. Document in security-review.md
2. Escalate to human checkpoint
3. If significant, return to Phase 3 (Architecture)

### Issue: Quality vs. Deadline Tradeoff

**Symptom**: Minor quality issues but need to proceed

**Solution**:
- Document accepted technical debt
- Create follow-up tasks for improvements
- Proceed if no Critical/High issues

## Related Phases

- **Phase 4 (Implementation)**: Provides files to review
- **Phase 4.5 (P0 Validation)**: Complements with P0-specific checks
- **Phase 6 (Testing)**: Receives quality baseline from reviews

## Related Skills

- `adhering-to-dry` - Code quality patterns
- `gateway-backend` - Go backend patterns
- `backend-security` - Security review methodology
