# Capability Reviewer Prompt Template (Fingerprintx)

Use this template when dispatching capability-reviewer agent in Phase 6.5.

## Two-Stage Review Process

Following the obra/superpowers pattern, code review has TWO stages:

1. **Spec Compliance Review** - Does the code match the protocol research?
2. **Code Quality Review** - Is the code well-built?

**IMPORTANT:** Do NOT start code quality review until spec compliance is confirmed.

## Usage

### Stage 1: Spec Compliance Reviewer

```typescript
Task({
  subagent_type: "capability-reviewer",
  description: "Spec compliance review for [protocol]",
  prompt: `[Use spec compliance template below]`,
});
```

### Stage 2: Code Quality Reviewer

```typescript
Task({
  subagent_type: "capability-reviewer",
  description: "Code quality review for [protocol]",
  prompt: `[Use code quality template below]`,
});
```

---

## Stage 1: Spec Compliance Review Template

````markdown
You are reviewing fingerprintx plugin for SPEC COMPLIANCE: [PROTOCOL_NAME]

## Your Single Focus

Does the implementation match the specification in protocol-research.md?

- Nothing missing (all detection strategies implemented)
- Nothing extra (no unrequested features)
- Correct behavior (matches protocol research, not "close enough")

---

## CRITICAL VERIFICATION RULE

**The implementer may have finished quickly. Their report may be:**

- **Incomplete** - Missing detection strategies they didn't mention
- **Inaccurate** - Claiming detection works when it doesn't
- **Optimistic** - Glossing over edge cases or validation issues

**You MUST verify independently:**

1. **Read the actual code** - Do NOT trust the implementer's summary
2. **Compare line-by-line** - Check each protocol research requirement against actual implementation
3. **Test claims** - If they say "all probes work", verify probe bytes exist and match protocol spec
4. **Look for omissions** - What did they NOT mention? Often more important than what they did

### Verification Checklist

For EACH requirement in protocol research:

| Requirement | Claimed Status | Verified Status | Evidence |
|-------------|----------------|-----------------|----------|
| [req 1]     | [what dev said]| [what you found]| [file:line] |
| [req 2]     | ...            | ...             | ... |

### Red Flags to Watch For

- "Implemented as specified" without details
- Vague summaries ("added the plugin")
- No test file references for detection logic
- Suspiciously fast completion
- Claims about detection accuracy that can't be verified from code
- TODO comments for CPE or version (must be complete)

---

## Protocol Research Requirements

[PASTE the full detection strategy specifications from protocol-research.md]

## Version Matrix (if applicable)

[PASTE the version fingerprint matrix from version-matrix.md, or "N/A - closed-source"]

## Implementation Summary

[PASTE the implementation-log.md summary from developer]

## Files to Review

[LIST of files created by developer]

## Output Directory

OUTPUT_DIRECTORY: [FEATURE_DIR]

## MANDATORY CHECK

For EACH detection strategy in protocol research:

1. Is it implemented? (Yes/No - verify in code, not summary)
2. Does it match the protocol spec exactly? (Yes/No/Deviation noted)
3. Is there anything extra not in the protocol research? (List extras)
4. Are probe bytes correct for the protocol?
5. Is version extraction implemented per version matrix?
6. Is CPE generation complete (no TODO comments)?

## Spec Compliance Checklist

| Requirement | Implemented | Matches Spec | Notes |
| ----------- | ----------- | ------------ | ----- |
| [req 1]     | ✓/✗         | ✓/✗          |       |
| [req 2]     | ✓/✗         | ✓/✗          |       |
| ...         |             |              |       |

## Verdict

**SPEC_COMPLIANT** - All protocol requirements met, nothing extra
**NOT_COMPLIANT** - Issues found (list below)

### Issues (if NOT_COMPLIANT)

**Missing:**

- [Detection strategies not implemented]

**Extra (unrequested):**

- [Features added that weren't in protocol research]

**Deviations:**

- [Behaviors that don't match protocol spec]

**Incomplete:**

- [TODO comments for CPE/version]
- [Hardcoded values that should be extracted]

## Output Format

```json
{
  "agent": "capability-reviewer",
  "output_type": "spec-compliance-review",
  "protocol": "[PROTOCOL_NAME]",
  "feature_directory": "[FEATURE_DIR]",
  "skills_invoked": ["persisting-agent-outputs"],
  "status": "complete",
  "verdict": "SPEC_COMPLIANT|NOT_COMPLIANT",
  "issues_found": [],
  "handoff": {
    "next_agent": "capability-reviewer (code quality)",
    "context": "Spec compliance confirmed, proceed to code quality review"
  }
}
```
````

If NOT_COMPLIANT, orchestrator returns to developer for fixes before code quality review.

---

## Stage 2: Code Quality Review Template

````markdown
You are reviewing fingerprintx plugin for QUALITY: [PROTOCOL_NAME]

**PREREQUISITE:** Spec compliance review must be PASSED before this review.

## Your Focus

Is the code well-built?

- Clean and maintainable
- Follows fingerprintx patterns (5-method interface)
- Proper error handling
- Good test coverage
- No magic numbers or hardcoded values

## Code Quality Checklist

### Architecture & Design
- [ ] Implements 5-method plugin interface correctly
  - `Type() plugins.Protocol`
  - `Priority() int`
  - `Run(conn net.Conn, timeout time.Duration, target plugins.Target) (*plugins.Service, error)`
  - `PortPriority(port uint16) bool`
  - `Name() string`
- [ ] Two-phase detection (detect then enrich)
- [ ] Type constants alphabetically ordered in types.go
- [ ] Plugin import alphabetically ordered in plugin_list.go
- [ ] No unnecessary coupling

### Code Quality
- [ ] Clear, descriptive function names
- [ ] Functions are small and focused
- [ ] No magic probe bytes (documented with comments)
- [ ] Proper error handling (connection failures, timeouts)
- [ ] No commented-out code
- [ ] Package comment documents detection strategy

### Fingerprintx-Specific
- [ ] Probe bytes match protocol specification
- [ ] Version extraction uses documented markers
- [ ] CPE generation follows cpe:2.3 format
- [ ] No TODO comments (especially for CPE/version)
- [ ] PortPriority returns true for default ports

### Testing
- [ ] Tests verify detection behavior (not implementation)
- [ ] Edge cases covered (timeouts, malformed responses)
- [ ] Tests are readable and maintainable
- [ ] No flaky tests

## Files to Review

[LIST of files from implementation]

## Output Directory

OUTPUT_DIRECTORY: [FEATURE_DIR]

Write your review to: [FEATURE_DIR]/code-quality-review.md

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
  "feature_directory": "[FEATURE_DIR]",
  "skills_invoked": ["persisting-agent-outputs"],
  "status": "complete",
  "verdict": "APPROVED|APPROVED_WITH_NOTES|CHANGES_REQUESTED",
  "critical_issues": 0,
  "important_issues": 0,
  "suggestions": 2,
  "handoff": {
    "next_agent": null,
    "context": "Code review approved, ready for validation"
  }
}
```
````

If CHANGES_REQUESTED, orchestrator returns to developer for fixes (max 1 retry).
