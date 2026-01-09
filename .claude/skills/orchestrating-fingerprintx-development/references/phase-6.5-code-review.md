# Phase 6.5: Code Review

**Two-stage gated review**: Spec compliance FIRST (blocking gate), then code quality (single agent).

## Purpose

Validate implementation through sequential gates:

1. **Stage 1 (BLOCKING)**: Does code match protocol research? (spec compliance)
2. **Stage 2**: Is code well-built? (code quality)

**Why two stages?** Catching spec deviations BEFORE quality review prevents wasted effort reviewing code that doesn't meet protocol requirements.

## Two-Stage Review Pattern

```
Testing Complete
        ↓
┌───────────────────────────────────────┐
│  STAGE 1: Spec Compliance (BLOCKING)  │
│  Agent: capability-reviewer (single)  │
│  Focus: Code matches protocol research│
│  Verdict: SPEC_COMPLIANT | NOT_       │
└─────────────┬─────────────────────────┘
              │
         NOT_COMPLIANT? ──→ Fix loop (max 2 attempts) ──→ Escalate
              │
        SPEC_COMPLIANT
              ↓
┌───────────────────────────────────────┐
│  STAGE 2: Quality Review              │
│  Agent: capability-reviewer           │
│  Focus: Is code well-built?           │
│  Verdict: APPROVED | CHANGES_         │
└─────────────┬─────────────────────────┘
              │
    CHANGES_REQUESTED? ──→ Fix loop (max 1 attempt) ──→ Escalate
              │
           APPROVED
              ↓
        Validation (Phase 7)
```

## Stage 1: Spec Compliance Review (BLOCKING GATE)

**Purpose**: Verify implementation matches protocol research requirements exactly.

**Focus**:
- Nothing missing (all detection strategies implemented)
- Nothing extra (no unrequested features)
- Correct behavior (matches protocol research, not "close enough")

**NOT evaluated here**: Code quality, style, performance - that's Stage 2.

### Step 1: Spawn Spec Compliance Reviewer

**CRITICAL:** Spawn SINGLE reviewer focused on spec compliance ONLY.

#### Spec Compliance Prompt

```
Task(
  subagent_type: "capability-reviewer",
  description: "Spec compliance review for {protocol}-fingerprintx",
  prompt: "[Use SPEC COMPLIANCE template from prompts/reviewer-prompt.md]

Protocol Research Requirements: {from protocol-research.md}
Version Matrix (if applicable): {from version-matrix.md}
Implementation: {from implementation-log.md}
Files: {files_created list}

OUTPUT_DIRECTORY: {FEATURE_DIR}

Your ONLY focus: Does code match protocol research exactly?

MANDATORY SKILLS:
- persisting-agent-outputs

Return verdict: SPEC_COMPLIANT | NOT_COMPLIANT
"
)
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

### Step 3: Stage 1 Fix Loop (MAX 2 ATTEMPTS)

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
4. If still NOT_COMPLIANT → Escalate

#### Escalation After 2 Failures

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Spec compliance failing after 2 attempts. How should we proceed?",
      header: "Spec Review",
      multiSelect: false,
      options: [
        {
          label: "Show me the issues",
          description: "Display spec compliance issues for debugging",
        },
        {
          label: "Proceed to Stage 2 anyway",
          description: "Accept deviations, document in tech debt",
        },
        {
          label: "Revise protocol research",
          description: "Protocol research may be unclear or incorrect",
        },
        {
          label: "Cancel plugin development",
          description: "Stop development, revisit protocol research",
        },
      ],
    },
  ],
});
```

**Do NOT retry more than twice.** Escalate to user.

---

## Stage 2: Code Quality Review

**PREREQUISITE:** Stage 1 (Spec Compliance) MUST pass before running Stage 2.

**Purpose**: Validate code quality after confirming spec compliance.

### Step 4: Spawn Code Quality Reviewer

```
Task(
  subagent_type: "capability-reviewer",
  description: "Code quality review for {protocol}-fingerprintx",
  prompt: "[Use CODE QUALITY template from prompts/reviewer-prompt.md]

Protocol Research: {from protocol-research.md}
Files: {files_created}

CHECK:
- Code quality (function size, naming, types)
- Fingerprintx patterns (5-method interface compliance)
- Error handling
- Maintainability
- No TODO comments for CPE or version

OUTPUT_DIRECTORY: {FEATURE_DIR}

MANDATORY SKILLS:
- persisting-agent-outputs

Return verdict: APPROVED | APPROVED_WITH_NOTES | CHANGES_REQUESTED
"
)
```

### Step 5: Evaluate Stage 2 Verdict

```python
code_quality_verdict = reviewer.verdict

if code_quality_verdict in ["APPROVED", "APPROVED_WITH_NOTES"]:
    proceed_to_phase_7()  # Success!
else:
    enter_stage2_fix_loop()
```

### Step 6: Stage 2 Fix Loop (MAX 1 ATTEMPT)

If reviewer returns `CHANGES_REQUESTED`:

#### Attempt 1: Developer Fixes

1. Dispatch developer to fix quality issues
2. Re-run Stage 2 code quality review
3. If APPROVED → proceed to Phase 7
4. If still issues → Escalate

#### Escalation After 1 Failure

```typescript
AskUserQuestion({
  questions: [{
    question: "Code quality review failing after 1 retry. How should we proceed?",
    header: "Review",
    multiSelect: false,
    options: [
      {
        label: "Show me the issues",
        description: "Display quality feedback",
      },
      {
        label: "Proceed anyway",
        description: "Accept current state, document known issues",
      },
      {
        label: "Cancel plugin development",
        description: "Stop development, revisit approach",
      },
    ],
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
    "code_review": {
      "status": "complete",
      "stage1_retries": 0,
      "stage2_retries": 0,
      "agent_used": "capability-reviewer",
      "outputs": {
        "spec_compliance_review": ".claude/.output/capabilities/{id}/spec-compliance-review.md",
        "code_quality_review": ".claude/.output/capabilities/{id}/code-quality-review.md"
      },
      "verdicts": {
        "spec_compliance": "SPEC_COMPLIANT",
        "code_quality": "APPROVED"
      },
      "completed_at": "2026-01-09T01:00:00Z"
    },
    "validation": {
      "status": "in_progress"
    }
  },
  "current_phase": "validation"
}
```

### Step 8: Mark TodoWrite Complete

```
TodoWrite: Mark "Phase 6.5: Code Review" as completed
TodoWrite: Mark "Phase 7: Validation" as in_progress
```

## Exit Criteria

✅ Proceed to Phase 7 (Validation) when:

- Stage 1: `verdict: "SPEC_COMPLIANT"` achieved
- Stage 2: Reviewer returned `verdict: "APPROVED"` (or `"APPROVED_WITH_NOTES"`)
- OR user explicitly approved despite issues
- Review files saved:
  - `spec-compliance-review.md` (Stage 1)
  - `code-quality-review.md` (Stage 2)
- Progress file updated with both stage results
- TodoWrite marked complete

❌ Do NOT proceed if:

- Stage 1 NOT_COMPLIANT after 2 attempts without user approval
- Stage 2 CHANGES_REQUESTED after 1 attempt without user approval
- Critical code quality issues unaddressed (magic numbers in probes, hardcoded CPEs, etc.)

## Common Issues

### "Reviewer keeps finding new issues"

**Solution**: After retry #1 for Stage 2, escalate to user. Do not enter infinite loop.

### "Should I skip code review for simple protocols?"

**Answer**: No. Code review catches issues that tests miss (maintainability, patterns, edge cases). Even simple protocols benefit.

### "Protocol is closed-source, can I skip spec compliance?"

**Answer**: No. Spec compliance verifies implementation matches YOUR protocol research (whatever detection strategies you documented), not just open-source protocols.

## Related References

- [Phase 6: Testing](../orchestrating-fingerprintx-development/SKILL.md#phase-6-testing) - Previous phase
- [Phase 7: Validation](../orchestrating-fingerprintx-development/SKILL.md#phase-7-validation) - Next phase
- [Prompts: reviewer-prompt.md](prompts/reviewer-prompt.md) - Reviewer templates
- [Troubleshooting](troubleshooting.md) - Common issues
