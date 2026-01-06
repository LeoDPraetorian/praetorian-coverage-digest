# Reviewer Subagent Prompt Template

Use this template when dispatching capability-reviewer subagent in Phase 5.

## Usage

```typescript
Task({
  subagent_type: "capability-reviewer",
  description: "Review [capability] implementation",
  prompt: `[Use template below, filling in placeholders]`,
});
```

## Template

````markdown
You are reviewing the implementation of capability: [CAPABILITY_NAME]

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

## Your Job

Perform two-stage review:

### Stage 1: Spec Compliance Review

Does the implementation match the architecture plan?

1. Check detection logic matches architecture.md
2. Verify all edge cases from architecture are handled
3. Confirm quality targets are met
4. Validate error handling approach

### Stage 2: Code Quality Review

Is the capability well-built?

1. **Code Quality**: Clean, readable, well-documented
2. **DRY Compliance**: Reuses patterns, no duplication
3. **YAGNI Compliance**: No unnecessary features or abstractions
4. **Test Coverage**: Adequate tests for detection scenarios
5. **Performance**: Meets performance targets
6. **Security**: Proper secret handling, input validation

## Review Document Structure

Your review.md MUST include:

```markdown
# [Capability] Review

## Verdict

**Status**: APPROVED | CHANGES_REQUESTED

**Overall Assessment**: [2-3 sentences summary]

## Stage 1: Spec Compliance Review

### Detection Logic

- [ ] Matches architecture.md approach
- [ ] All edge cases handled
- [ ] Quality targets met (accuracy, false positive rate)
- [ ] Error handling implemented

**Issues**:
[List any spec compliance issues, or "None"]

## Stage 2: Code Quality Review

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

**Issues**:
[List any quality issues, or "None"]

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
````

## Output Format

Create structured JSON metadata at the end of review.md:

```json
{
  "agent": "capability-reviewer",
  "output_type": "review",
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

```

```
