# Phase 7: Code Review

**Two-stage gated review**: Spec compliance FIRST (blocking gate), then code quality (sequential).

## Purpose

Validate implementation through sequential gates:

1. **Stage 1 (BLOCKING)**: Does code match architecture? (spec compliance)
2. **Stage 2 (SEQUENTIAL)**: Is code well-built? (quality)

**Why two stages?** Catching spec deviations BEFORE quality review prevents wasted effort reviewing code that doesn't meet requirements.

## Quick Reference

| Aspect         | Details                                                  |
| -------------- | -------------------------------------------------------- |
| **Agent**      | capability-reviewer                                      |
| **Input**      | architecture.md, implementation-log.md, code files       |
| **Output**     | spec-compliance-review.md, code-quality-review.md        |
| **Checkpoint** | Stage 1: MAX 3 RETRIES, Stage 2: MAX 3 RETRIES           |

## Two-Stage Review Pattern

```
Phase 6: Implementation Completion Review
        ↓
┌───────────────────────────────────────┐
│  STAGE 1: Spec Compliance (BLOCKING)  │
│  Agent: capability-reviewer (single)  │
│  Focus: Code matches architecture?    │
│  Verdict: SPEC_COMPLIANT | NOT_       │
└─────────────┬─────────────────────────┘
              │
         NOT_COMPLIANT? ──→ Fix loop (max 3 attempts) ──→ Escalate
              │
        SPEC_COMPLIANT
              ↓
┌───────────────────────────────────────┐
│  STAGE 2: Code Quality (SEQUENTIAL)   │
│  Agent: capability-reviewer           │
│  Focus: Is code well-built?           │
│  Verdict: APPROVED | CHANGES_         │
└─────────────┬─────────────────────────┘
              │
    CHANGES_REQUESTED? ──→ Fix loop (max 3 attempts) ──→ Escalate
              │
           APPROVED
              ↓
        Phase 8: Testing
```

## Stage 1: Spec Compliance Review (BLOCKING GATE)

**Purpose**: Verify implementation matches architecture requirements exactly.

**Focus**:
- Nothing missing (all requirements implemented)
- Nothing extra (no unrequested features)
- Correct behavior (matches spec, not "close enough")

**NOT evaluated here**: Code quality, style, performance - that's Stage 2.

### Step 1: Spawn Spec Compliance Reviewer

**CRITICAL:** Spawn SINGLE reviewer focused on spec compliance ONLY.

```typescript
Task({
  subagent_type: "capability-reviewer",
  description: "Spec compliance review for {capability-name}",
  prompt: `[Use SPEC COMPLIANCE template from prompts/reviewer-prompt.md]

    Architecture Requirements: {from architecture.md}
    Implementation: {from implementation-log.md}
    Files: {files_modified list}

    OUTPUT_DIRECTORY: {CAPABILITY_DIR}

    Your ONLY focus: Does code match architecture exactly?

    MANDATORY SKILLS:
    - persisting-agent-outputs

    Return verdict: SPEC_COMPLIANT | NOT_COMPLIANT
  `
});
```

### Step 2: Evaluate Stage 1 Verdict

**Gate check:**

```python
stage1_verdict = spec_compliance_reviewer.verdict

if stage1_verdict == "SPEC_COMPLIANT":
    proceed_to_stage_2()
elif stage1_verdict == "NOT_COMPLIANT":
    enter_stage1_fix_loop()
```

### Step 3: Stage 1 Fix Loop (MAX 3 ATTEMPTS)

If `verdict: "NOT_COMPLIANT"`:

#### Attempt 1: Developer Fixes

1. Dispatch developer with spec compliance issues
2. Re-run Stage 1 spec compliance review
3. If SPEC_COMPLIANT → proceed to Stage 2
4. If still NOT_COMPLIANT → Attempt 2

#### Attempt 2: Developer Fixes Again

1. Dispatch developer with remaining issues
2. Re-run Stage 1 spec compliance review
3. If SPEC_COMPLIANT → proceed to Stage 2
4. If still NOT_COMPLIANT → Attempt 3

#### Attempt 3: Developer Fixes Third Time

1. Dispatch developer with remaining issues
2. Re-run Stage 1 spec compliance review
3. If SPEC_COMPLIANT → proceed to Stage 2
4. If still NOT_COMPLIANT → Escalate

#### Escalation After 3 Failures

```typescript
AskUserQuestion({
  questions: [{
    question: "Spec compliance failing after 3 attempts. How should we proceed?",
    header: "Spec Review",
    multiSelect: false,
    options: [
      {
        label: "Show me the issues",
        description: "Display spec compliance issues for debugging"
      },
      {
        label: "Proceed to Stage 2 anyway",
        description: "Accept deviations, document in tech debt"
      },
      {
        label: "Revise architecture",
        description: "Architecture may be unclear or incorrect"
      },
      {
        label: "Cancel capability",
        description: "Stop development, revisit design"
      }
    ]
  }]
});
```

**Do NOT retry more than twice.** Escalate to user.

---

## Stage 2: Code Quality Review (SEQUENTIAL)

**PREREQUISITE:** Stage 1 (Spec Compliance) MUST pass before running Stage 2.

**Purpose**: Validate code quality after confirming spec compliance.

### Step 4: Spawn Code Quality Reviewer

```typescript
Task({
  subagent_type: "capability-reviewer",
  description: "Code quality review for {capability-name}",
  prompt: `[Use CODE QUALITY template from prompts/reviewer-prompt.md]

    Architecture: {from architecture.md}
    Files: {files_modified}

    CHECK:
    - Code quality (structure, types)
    - Capability-type best practices
    - Performance implications
    - Maintainability

    OUTPUT_DIRECTORY: {CAPABILITY_DIR}

    MANDATORY SKILLS:
    - persisting-agent-outputs
    - adhering-to-dry
    - adhering-to-yagni

    Return verdict: APPROVED | APPROVED_WITH_NOTES | CHANGES_REQUESTED
  `
});
```

### Step 5: Evaluate Stage 2 Verdict

```python
code_quality_verdict = reviewer.verdict

if code_quality_verdict in ["APPROVED", "APPROVED_WITH_NOTES"]:
    proceed_to_phase_6()  # Success!
else:
    enter_stage2_fix_loop()
```

### Step 6: Stage 2 Fix Loop (MAX 3 ATTEMPTS)

If reviewer returns `CHANGES_REQUESTED`:

#### Attempt 1: Developer Fixes

1. Compile feedback from reviewer
2. Dispatch developer to fix quality issues
3. Re-run Stage 2 (code quality review)
4. If APPROVED → proceed to Phase 7
5. If still issues → Attempt 2

#### Attempt 2: Developer Fixes Again

1. Compile feedback from reviewer
2. Dispatch developer to fix quality issues
3. Re-run Stage 2 (code quality review)
4. If APPROVED → proceed to Phase 7
5. If still issues → Attempt 3

#### Attempt 3: Developer Fixes Third Time

1. Compile feedback from reviewer
2. Dispatch developer to fix quality issues
3. Re-run Stage 2 (code quality review)
4. If APPROVED → proceed to Phase 7
5. If still issues → Escalate

#### Escalation After 3 Failures

```typescript
AskUserQuestion({
  questions: [{
    question: "Code quality review failing after 3 retries. How should we proceed?",
    header: "Review",
    multiSelect: false,
    options: [
      {
        label: "Show me the issues",
        description: "Display quality feedback"
      },
      {
        label: "Proceed anyway",
        description: "Accept current state, document known issues"
      },
      {
        label: "Cancel capability",
        description: "Stop development, revisit design"
      }
    ]
  }]
});
```

**Do NOT retry more than once for Stage 2.** Escalate to user.

---

## Progress Tracking

### Step 7: Update Progress

```json
{
  "phases": {
    "review": {
      "status": "complete",
      "stage1_retries": 1,
      "stage2_retries": 0,
      "agents_used": ["capability-reviewer"],
      "outputs": {
        "spec_compliance_review": ".claude/.output/capabilities/{id}/spec-compliance-review.md",
        "code_quality_review": ".claude/.output/capabilities/{id}/code-quality-review.md"
      },
      "verdicts": {
        "spec_compliance": "SPEC_COMPLIANT",
        "code_quality": "APPROVED"
      },
      "completed_at": "2026-01-08T12:30:00Z"
    },
    "testing": {
      "status": "in_progress"
    }
  },
  "current_phase": "testing"
}
```

### Step 8: Mark TodoWrite Complete

```
TodoWrite: Mark "Phase 7: Code Review" as completed
TodoWrite: Mark "Phase 8: Testing" as in_progress
```

## Exit Criteria

✅ Proceed to Phase 8 (Testing) when:

- Stage 1: `verdict: "SPEC_COMPLIANT"` achieved
- Stage 2: Reviewer returned `verdict: "APPROVED"` (or `"APPROVED_WITH_NOTES"`)
- OR user explicitly approved despite issues
- Review files saved:
  - `spec-compliance-review.md` (Stage 1)
  - `code-quality-review.md` (Stage 2)
- Progress file updated with both stage results
- TodoWrite marked complete

❌ Do NOT proceed if:

- Stage 1 NOT_COMPLIANT after 3 attempts without user approval
- Stage 2 CHANGES_REQUESTED after 3 attempts without user approval

## Review Checklist by Type

### VQL Capabilities

- [ ] Query syntax valid and efficient
- [ ] Artifact collection targets correct files/registry keys
- [ ] Detection logic matches architecture specification
- [ ] Output format produces expected JSON structure
- [ ] Performance considerations addressed (LIMIT, filtering)
- [ ] Edge cases handled (empty files, permission denied)

### Nuclei Templates

- [ ] Template ID and metadata complete
- [ ] HTTP requests match architecture plan
- [ ] Matchers correctly validate vulnerability presence
- [ ] Extractors capture required data (if specified)
- [ ] Severity and CVE/CWE correctly assigned
- [ ] False positive mitigation implemented

### Janus Tool Chains

- [ ] Tool sequence matches architecture plan
- [ ] Data passing between tools implemented correctly
- [ ] Error handling and recovery for tool failures
- [ ] Result aggregation logic correct
- [ ] Unit tests cover core logic
- [ ] Interface contracts followed

### Fingerprintx Modules

- [ ] 5-method interface implemented correctly
- [ ] Type constant added to types.go
- [ ] Plugin registered in plugin_list.go
- [ ] Network protocol implementation correct
- [ ] Version extraction logic matches architecture
- [ ] CPE generation follows format
- [ ] Edge cases handled (timeouts, malformed responses)

### Scanner Integrations

- [ ] HTTP client authentication implemented
- [ ] API endpoints called correctly
- [ ] Result normalization to Chariot model correct
- [ ] Rate limiting and pagination handled
- [ ] Error handling (timeouts, auth failures, rate limits)
- [ ] Data mapping complete (all scanner fields)

## Common Issues

### "Reviewers disagree on severity"

**Solution**: Take the more conservative (higher severity) assessment.

### "Developer keeps introducing new issues when fixing"

**Solution**: After retry limit, escalate to user. Do not enter infinite loop.

### "Should I skip Stage 2 for small changes?"

**Answer**: No. Stage 2 runs sequentially, adding minimal overhead. Even small changes can introduce quality issues.

## Related References

- [Phase 5: Implementation](phase-5-implementation.md) - Previous phase
- [Phase 6: Implementation Completion](phase-6-implementation-review.md) - Completeness check before review
- [Phase 8: Testing](phase-8-testing.md) - Next phase
- [Prompts: Reviewer](prompts/reviewer-prompt.md) - Stage 1 + Stage 2 templates
- [Quality Standards](quality-standards.md) - Quality criteria by capability type
- [Agent Handoffs](agent-handoffs.md) - Handoff format and retry logic
- [Troubleshooting](troubleshooting.md) - Review failure patterns
