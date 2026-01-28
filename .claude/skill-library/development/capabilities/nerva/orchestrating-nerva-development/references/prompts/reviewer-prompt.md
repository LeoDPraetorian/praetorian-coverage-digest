# Capability Reviewer Prompt Template (Fingerprintx)

Use this template when dispatching capability-reviewer agent in Phase 11.

## Usage

```typescript
Task({
  subagent_type: "capability-reviewer",
  description: "Review [protocol] fingerprintx plugin",
  prompt: `[Use template below, filling in placeholders]`,
});
```

## Template

````markdown
You are reviewing fingerprintx plugin for CODE QUALITY: [PROTOCOL_NAME]

**PREREQUISITE:** Domain compliance (Phase 10) must be PASSED before this review.

## Your Focus

Is the code well-built?

- Clean and maintainable
- Follows fingerprintx patterns (5-method interface)
- Proper error handling
- Good code organization
- No magic numbers or hardcoded values

## Architecture to Compare Against

[PASTE architecture decisions from architecture.md]

## Implementation Summary (from Phase 8)

[PASTE implementation notes from agents/capability-developer.md]

## Files to Review

- `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/[protocol]/plugin.go`
- `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/[protocol]/[protocol]_test.go`
- `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go` (diff only)
- `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go` (diff only)

## Output Directory

OUTPUT_DIRECTORY: .fingerprintx-development

Write review findings to agents/capability-reviewer.md

## MANDATORY SKILLS (invoke ALL before completing)

1. **Read(".claude/skill-library/development/capabilities/reviewing-capability-implementations/SKILL.md")** - Review checklist
2. **verifying-before-completion** - Verify claims before making them

## CRITICAL VERIFICATION RULE

**The implementer may have finished quickly. Their report may be:**

- **Incomplete** - Missing features they didn't mention
- **Inaccurate** - Claiming something works when it doesn't
- **Optimistic** - Glossing over edge cases

**You MUST verify independently:**

1. **Read the actual code** - Do NOT trust the implementer's summary
2. **Compare against architecture** - Does implementation match design?
3. **Look for omissions** - What did they NOT mention?

## Code Quality Checklist

### Architecture & Design

- [ ] Implements 5-method plugin interface correctly
  - `Type() plugins.Protocol`
  - `Priority() int`
  - `Run(conn net.Conn, timeout time.Duration, target plugins.Target) (*plugins.Service, error)`
  - `PortPriority(port uint16) bool`
  - `Name() string`
- [ ] Two-phase detection (detect then enrich)
- [ ] Matches architecture.md design
- [ ] No unnecessary coupling

### Code Quality

- [ ] Clear, descriptive function names
- [ ] Functions are small and focused
- [ ] No magic probe bytes (documented with comments)
- [ ] Proper error handling (connection failures, timeouts)
- [ ] No commented-out code
- [ ] Package comment documents detection strategy

### Fingerprintx-Specific

- [ ] Type constant alphabetically ordered in types.go
- [ ] Plugin import alphabetically ordered in plugins.go
- [ ] Probe bytes match protocol specification
- [ ] Version extraction uses documented markers
- [ ] CPE generation follows cpe:2.3 format
- [ ] No TODO comments (especially for CPE/version)
- [ ] PortPriority returns true for default ports

### Testing

- [ ] Tests verify detection behavior (not implementation details)
- [ ] Edge cases covered (timeouts, malformed responses)
- [ ] Tests are readable and maintainable
- [ ] No flaky tests

## Issue Categories

When reporting issues, categorize as:

- **Critical (must fix)** - Bugs, incorrect probes, broken detection
- **Important (should fix)** - Code quality, maintainability concerns
- **Suggestion (nice to have)** - Style, minor improvements

## Verdict

**APPROVED** - No critical or important issues
**APPROVED_WITH_NOTES** - Minor suggestions only
**CHANGES_REQUESTED** - Critical or important issues found

## Review Document Structure

```markdown
# Code Quality Review: [Protocol] Fingerprintx Plugin

## Summary

[2-3 sentences on overall quality]

## Strengths

- [What was done well]

## Issues

### Critical

- [File:line] [Description]

### Important

- [File:line] [Description]

### Suggestions

- [File:line] [Description]

## Verdict: [APPROVED|APPROVED_WITH_NOTES|CHANGES_REQUESTED]
```

## Output Format

```json
{
  "agent": "capability-reviewer",
  "output_type": "code-quality-review",
  "protocol": "[PROTOCOL_NAME]",
  "skills_invoked": ["reviewing-capability-implementations", "verifying-before-completion"],
  "status": "complete",
  "verdict": "APPROVED|APPROVED_WITH_NOTES|CHANGES_REQUESTED",
  "critical_issues": 0,
  "important_issues": 0,
  "suggestions": 2,
  "handoff": {
    "next_agent": "orchestrator",
    "context": "Review complete, [verdict]"
  }
}
```
````

If CHANGES_REQUESTED, orchestrator updates feedback scratchpad and returns to Phase 8.
