# Reviewer Subagent Prompt Template

Use this template when dispatching reviewer subagents in Phase 5.

## Two-Stage Review Process

Code review has TWO stages:

1. **Spec Compliance Review** - Does the code match the architecture?
2. **Code Quality Review** - Is the code well-built?

**IMPORTANT:** Do NOT start code quality review until spec compliance is confirmed.

## Usage

### Stage 1: Spec Compliance Reviewer

```typescript
Task({
  subagent_type: "capability-reviewer",
  description: "Spec compliance review for [capability]",
  prompt: `[Use spec compliance template below]`,
});
```

### Stage 2: Code Quality Reviewer

```typescript
Task({
  subagent_type: "capability-reviewer",
  description: "Code quality review for [capability]",
  prompt: `[Use code quality template below]`,
});
```

---

## Stage 1: Spec Compliance Review Template

````markdown
You are reviewing code for SPEC COMPLIANCE: [CAPABILITY_NAME]

## Your Single Focus

Does the implementation match the specification in architecture.md?

- Nothing missing (all requirements implemented)
- Nothing extra (no unrequested features)
- Correct behavior (matches spec, not "close enough")

---

## CRITICAL VERIFICATION RULE

**The implementer may have finished quickly. Their report may be:**

- **Incomplete** - Missing requirements they didn't mention
- **Inaccurate** - Claiming things work that don't
- **Optimistic** - Glossing over issues or edge cases

**You MUST verify independently:**

1. **Read the actual code** - Do NOT trust the implementer's summary
2. **Compare line-by-line** - Check each architecture requirement against actual implementation
3. **Test claims** - If they say "all tests pass", verify test files exist and cover the requirement
4. **Look for omissions** - What did they NOT mention? Often more important than what they did

### Verification Checklist

For EACH requirement in the architecture:

| Requirement | Claimed Status | Verified Status | Evidence |
|-------------|----------------|-----------------|----------|
| [req 1]     | [what dev said]| [what you found]| [file:line] |
| [req 2]     | ...            | ...             | ... |

### Red Flags to Watch For

- "Implemented as specified" without details
- Vague summaries ("added the capability")
- No test file references
- Suspiciously fast completion
- Claims that can't be verified from code
- Missing TDD evidence (no RED phase documented)

---

## Architecture Requirements

[PASTE the full specification from architecture.md]

## Implementation Summary

[PASTE the implementation-log.md summary from developer]

## Files to Review

[LIST of files created/modified by developer]

## Output Directory

OUTPUT_DIRECTORY: [CAPABILITY_DIR]

## MANDATORY CHECK

For EACH requirement in the architecture:

1. Is it implemented? (Yes/No - verify in code, not summary)
2. Does it match the spec exactly? (Yes/No/Deviation noted)
3. Is there anything extra not in the spec? (List extras)

## Spec Compliance Checklist

| Requirement | Implemented | Matches Spec | Notes |
| ----------- | ----------- | ------------ | ----- |
| [req 1]     | ✓/✗         | ✓/✗          |       |
| [req 2]     | ✓/✗         | ✓/✗          |       |
| ...         |             |              |       |

## Verdict

**SPEC_COMPLIANT** - All requirements met, nothing extra
**NOT_COMPLIANT** - Issues found (list below)

### Issues (if NOT_COMPLIANT)

**Missing:**

- [Requirements not implemented]

**Extra (unrequested):**

- [Features added that weren't in spec]

**Deviations:**

- [Behaviors that don't match spec]

## Output Format

```json
{
  "agent": "capability-reviewer",
  "output_type": "spec-compliance-review",
  "capability_directory": "[CAPABILITY_DIR]",
  "skills_invoked": ["persisting-agent-outputs"],
  "status": "complete",
  "verdict": "SPEC_COMPLIANT|NOT_COMPLIANT",
  "issues_found": [],
  "handoff": {
    "next_agent": "capability-reviewer (code quality)",
    "context": "[Summary of spec compliance verdict]"
  }
}
```
````

---

## Stage 2: Code Quality Review Template

````markdown
You are reviewing code for QUALITY: [CAPABILITY_NAME]

## Your Focus

Is the code well-built?

- Clean and maintainable
- Follows capability-type patterns
- Proper error handling
- Good test coverage
- Performance considerations

**DO NOT check spec compliance here** - that was Stage 1.

---

## Capability Context

**Type**: [VQL | Nuclei | Janus | Fingerprintx | Scanner]

**Description**: [PASTE design.md summary from Phase 1]

## Architecture Plan

[PASTE architecture.md key sections - detection logic, data flow, quality targets]

## Implementation

[PASTE implementation-log.md summary - files created, decisions, verification results]

## Output Directory

OUTPUT_DIRECTORY: [CAPABILITY_DIR]

Write your output to: [CAPABILITY_DIR]/review.md

## MANDATORY SKILLS (invoke ALL before completing)

You MUST use these skills during this task:

1. **persisting-agent-outputs** - Use for output file format and metadata
2. **adhering-to-dry** - Verify no duplication exists
3. **adhering-to-yagni** - Ensure no over-engineering

## Review Checklist

### Code Quality

- [ ] Clean and readable
- [ ] Well-documented
- [ ] Follows capability-type conventions

### DRY Compliance

- [ ] Reuses patterns from discovery
- [ ] No unnecessary duplication

### YAGNI Compliance

- [ ] Only implements specified detection
- [ ] No speculative features

### Test Coverage

- [ ] Tests for positive cases
- [ ] Tests for negative cases
- [ ] Tests for edge cases
- [ ] All tests passing

### Performance

- [ ] Meets performance targets
- [ ] No obvious bottlenecks

### Security

- [ ] Secrets properly managed
- [ ] Input validation present
- [ ] Output sanitization where needed

## Review Document Structure

Your review.md MUST include:

```markdown
# [Capability] Review

## Verdict

**Status**: APPROVED | CHANGES_REQUESTED

**Overall Assessment**: [2-3 sentences summary]

## Code Quality

- [ ] Clean and readable
- [ ] Well-documented
- [ ] Follows capability-type conventions

**Issues**:
[List any quality issues, or "None"]

## DRY Compliance

- [ ] Reuses patterns from discovery
- [ ] No unnecessary duplication

**Issues**:
[List any DRY issues, or "None"]

## YAGNI Compliance

- [ ] Only implements specified detection
- [ ] No speculative features

**Issues**:
[List any YAGNI issues, or "None"]

## Test Coverage

- [ ] Tests for positive cases
- [ ] Tests for negative cases
- [ ] Tests for edge cases
- [ ] All tests passing

**Issues**:
[List any test coverage issues, or "None"]

## Performance

- [ ] Meets performance targets
- [ ] No obvious bottlenecks

**Issues**:
[List any performance issues, or "None"]

## Security

- [ ] Secrets properly managed
- [ ] Input validation present
- [ ] Output sanitization where needed

**Issues**:
[List any security issues, or "None"]

## Required Changes (if CHANGES_REQUESTED)

### Critical Issues (must fix)

1. [Issue]: [What's wrong] → [How to fix]

### Minor Issues (should fix)

1. [Issue]: [What's wrong] → [How to fix]

## Recommendations (if APPROVED)

[Optional suggestions for future improvements, not blockers]

## Next Steps

[If APPROVED]: Ready for testing
[If CHANGES_REQUESTED]: Developer must address critical issues
```

## Output Format

Create structured JSON metadata at the end of review.md:

```json
{
  "agent": "capability-reviewer",
  "output_type": "code-quality-review",
  "verdict": "APPROVED|CHANGES_REQUESTED",
  "capability_type": "[type]",
  "skills_invoked": ["persisting-agent-outputs", "adhering-to-dry", "adhering-to-yagni"],
  "status": "complete",
  "critical_issues": 0,
  "minor_issues": 0,
  "handoff": {
    "next_agent": "test-lead|capability-developer",
    "context": "[If APPROVED] Ready for testing | [If CHANGES_REQUESTED] N critical issues to fix"
  }
}
```

### If Blocked

If you cannot complete review:

```json
{
  "status": "blocked",
  "blocked_reason": "missing_context|unclear_architecture|missing_files",
  "attempted": ["what you tried"],
  "handoff": {
    "next_agent": null,
    "context": "Detailed explanation of blocker"
  }
}
```
````

```

```
