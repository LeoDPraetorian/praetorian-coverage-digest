# Phase 8: Code Review

**Two-stage gated review**: Spec compliance FIRST (blocking gate), then code quality + security (parallel).

## Purpose

Validate implementation through sequential gates:

1. **Stage 1 (BLOCKING)**: Does code match plan? (spec compliance)
2. **Stage 2 (PARALLEL)**: Is code well-built? (quality + security)

**Why two stages?** Catching spec deviations BEFORE quality review prevents wasted effort reviewing code that doesn't meet requirements.

## Two-Stage Review Pattern

```
Implementation Complete
        ↓
┌───────────────────────────────────────┐
│  STAGE 1: Spec Compliance (BLOCKING)  │
│  Agent: frontend-reviewer (single)    │
│  Focus: Code matches plan?            │
│  Verdict: SPEC_COMPLIANT | NOT_       │
└─────────────┬─────────────────────────┘
              │
         NOT_COMPLIANT? ──→ Fix loop (max 2 attempts) ──→ Escalate
              │
        SPEC_COMPLIANT
              ↓
┌───────────────────────────────────────┐
│  STAGE 2: Quality + Security (||)     │
│  Agents: reviewer + security          │
│  Focus: Is code well-built?           │
│  Verdict: APPROVED | CHANGES_         │
└─────────────┬─────────────────────────┘
              │
    CHANGES_REQUESTED? ──→ Fix loop (max 1 attempt) ──→ Escalate
              │
           APPROVED
              ↓
        Test Planning
```

## Stage 1: Spec Compliance Review (BLOCKING GATE)

**Purpose**: Verify implementation matches plan requirements exactly.

**Focus**:
- Nothing missing (all requirements implemented)
- Nothing extra (no unrequested features)
- Correct behavior (matches spec, not "close enough")

**NOT evaluated here**: Code quality, style, performance - that's Stage 2.

## Workflow

### Step 1: Determine Domain

Based on feature domain:

| Feature Type | Stage 1 Reviewer    | Stage 2 Reviewers (parallel)           |
| ------------ | ------------------- | -------------------------------------- |
| Frontend     | `frontend-reviewer` | `frontend-reviewer` + `frontend-security` |
| Backend      | `backend-reviewer`  | `backend-reviewer` + `backend-security`   |
| Full-stack   | Both reviewers      | All 4 reviewers                        |

### Step 2: Stage 1 - Spawn Spec Compliance Reviewer

**CRITICAL:** Spawn SINGLE reviewer focused on spec compliance ONLY.

#### Spec Compliance Prompt

```
Task(
  subagent_type: "frontend-reviewer",
  description: "Spec compliance review for {feature-name}",
  prompt: "[Use SPEC COMPLIANCE template from prompts/reviewer-prompt.md]

Plan Requirements: {from plan.md}
Implementation: {from implementation-log.md}
Files: {files_modified list}

OUTPUT_DIRECTORY: {FEATURE_DIR}

Your ONLY focus: Does code match plan exactly?

MANDATORY SKILLS:
- persisting-agent-outputs

Return verdict: SPEC_COMPLIANT | NOT_COMPLIANT
"
)
```

### Step 3: Evaluate Stage 1 Verdict

**Gate check:**

```python
stage1_verdict = spec_compliance_reviewer.verdict

if stage1_verdict == "SPEC_COMPLIANT":
    proceed_to_stage_2()
elif stage1_verdict == "NOT_COMPLIANT":
    enter_stage1_fix_loop()
```

### Step 4: Stage 1 Fix Loop (MAX 2 ATTEMPTS)

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
          label: "Revise plan",
          description: "Plan may be unclear or incorrect",
        },
        {
          label: "Cancel feature",
          description: "Stop development, revisit design",
        },
      ],
    },
  ],
});
```

**Do NOT retry more than twice.** Escalate to user.

---

## Stage 2: Code Quality + Security Review (PARALLEL)

**PREREQUISITE:** Stage 1 (Spec Compliance) MUST pass before running Stage 2.

**Purpose**: Validate code quality and security after confirming spec compliance.

### Step 5: Spawn Quality + Security Reviewers in Parallel

**CRITICAL:** Spawn ALL Stage 2 reviewers in a SINGLE message.

#### Frontend Feature Pattern

```
# Spawn both in parallel
Task(
  subagent_type: "frontend-reviewer",
  description: "Code quality review for {feature-name}",
  prompt: "[Use CODE QUALITY template from prompts/reviewer-prompt.md]

Architecture: {from architecture.md}
Files: {files_modified}

CHECK:
- Code quality (component size, types)
- React 19 best practices
- Performance implications
- Maintainability

OUTPUT_DIRECTORY: {FEATURE_DIR}

MANDATORY SKILLS:
- persisting-agent-outputs

Return verdict: APPROVED | APPROVED_WITH_NOTES | CHANGES_REQUESTED
"
)

Task(
  subagent_type: "frontend-security",
  description: "Security review for {feature-name}",
  prompt: "Security review implementation:

Security Requirements: {from security-assessment.md}
Files: {files_modified}

CHECK:
- XSS vulnerabilities
- Auth/authz implementation
- Input validation
- Sensitive data handling
- CSRF protection

OUTPUT_DIRECTORY: {FEATURE_DIR}

Return verdict: APPROVED | CHANGES_REQUESTED
"
)
```

### Step 6: Wait for All Stage 2 Reviewers

Both reviewers run in parallel. Wait for ALL to complete.

### Step 7: Evaluate Stage 2 Verdicts

```python
code_quality_verdict = reviewer.verdict
security_verdict = security_reviewer.verdict

if code_quality_verdict in ["APPROVED", "APPROVED_WITH_NOTES"] and security_verdict == "APPROVED":
    proceed_to_phase_7()  # Success!
else:
    enter_stage2_fix_loop()
```

### Step 8: Stage 2 Fix Loop (MAX 1 ATTEMPT)

If ANY Stage 2 reviewer returns `CHANGES_REQUESTED`:

#### Attempt 1: Developer Fixes

1. Compile feedback from both reviewers
2. Dispatch developer to fix quality/security issues
3. Re-run Stage 2 (both reviewers in parallel)
4. If all APPROVED → proceed to Phase 7
5. If still issues → Escalate

#### Escalation After 1 Failure

```typescript
AskUserQuestion({
  questions: [{
    question: "Code quality/security review failing after 1 retry. How should we proceed?",
    header: "Review",
    multiSelect: false,
    options: [
      {
        label: "Show me the issues",
        description: "Display quality/security feedback",
      },
      {
        label: "Proceed anyway",
        description: "Accept current state, document known issues",
      },
      {
        label: "Cancel feature",
        description: "Stop development, revisit design",
      },
    ],
  }]
});
```

**Do NOT retry more than once for Stage 2.** Escalate to user.

---

## Progress Tracking

### Step 9: Update Progress

```json
{
  "phases": {
    "review": {
      "status": "complete",
      "stage1_retries": 1,
      "stage2_retries": 0,
      "agents_used": ["frontend-reviewer", "frontend-security"],
      "outputs": {
        "spec_compliance_review": ".claude/.output/features/{id}/spec-compliance-review.md",
        "code_quality_review": ".claude/.output/features/{id}/code-quality-review.md",
        "security_review": ".claude/.output/features/{id}/security-review.md"
      },
      "verdicts": {
        "spec_compliance": "SPEC_COMPLIANT",
        "code_quality": "APPROVED",
        "security": "APPROVED"
      },
      "completed_at": "2025-12-28T12:30:00Z"
    },
    "test_planning": {
      "status": "in_progress"
    }
  },
  "current_phase": "test_planning"
}
```

### Step 10: Mark TodoWrite Complete

```
TodoWrite: Mark "Phase 8: Code Review" as completed
TodoWrite: Mark "Phase 9: Test Planning" as in_progress
```

## Exit Criteria

✅ Proceed to Phase 9 (Test Planning) when:

- Stage 1: `verdict: "SPEC_COMPLIANT"` achieved
- Stage 2: ALL reviewers returned `verdict: "APPROVED"` (or `"APPROVED_WITH_NOTES"`)
- OR user explicitly approved despite issues
- Review files saved:
  - `spec-compliance-review.md` (Stage 1)
  - `code-quality-review.md` (Stage 2)
  - `security-review.md` (Stage 2)
- Progress file updated with both stage results
- TodoWrite marked complete

❌ Do NOT proceed if:

- Stage 1 NOT_COMPLIANT after 2 attempts without user approval
- Stage 2 CHANGES_REQUESTED after 1 attempt without user approval
- Security findings with severity "critical" unaddressed

## Full-Stack Features

Apply two-stage pattern to BOTH frontend and backend:

**Stage 1: Spec Compliance (Sequential by Domain)**

```
# Frontend spec compliance
Task(subagent_type: "frontend-reviewer", description: "Frontend spec compliance", ...)

# Wait for result. If SPEC_COMPLIANT, proceed to backend

# Backend spec compliance
Task(subagent_type: "backend-reviewer", description: "Backend spec compliance", ...)

# Both must pass before Stage 2
```

**Stage 2: Quality + Security (All Parallel)**

```
# Single message with all four reviewers
Task(subagent_type: "frontend-reviewer", description: "Frontend quality", ...)
Task(subagent_type: "frontend-security", ...)
Task(subagent_type: "backend-reviewer", description: "Backend quality", ...)
Task(subagent_type: "backend-security", ...)
```

**Outputs:**

- `frontend-spec-compliance-review.md` (Stage 1)
- `backend-spec-compliance-review.md` (Stage 1)
- `frontend-code-quality-review.md` (Stage 2)
- `frontend-security-review.md` (Stage 2)
- `backend-code-quality-review.md` (Stage 2)
- `backend-security-review.md` (Stage 2)

**Fix loops**: Apply retry limits per domain (Stage 1: 2 attempts each, Stage 2: 1 attempt each)

## Common Issues

### "Reviewers disagree on severity"

**Solution**: Take the more conservative (higher severity) assessment. Security concerns always take priority.

### "Developer keeps introducing new issues when fixing"

**Solution**: After retry #1, escalate to user. Do not enter infinite loop.

### "Security reviewer flags false positives"

**Expected behavior**. Document the finding with rationale for why it's not a vulnerability. User can approve despite the finding.

### "Should I skip security review for small changes?"

**Answer**: No. Security reviewers run in parallel, adding minimal overhead. Even small changes can introduce vulnerabilities.

## Related References

- [Phase 5: Implementation](phase-6-implementation.md) - Previous phase
- [Phase 8: Test Planning](phase-9-test-planning.md) - Next phase
- [Agent Handoffs](agent-handoffs.md) - JSON handoff format
- [Troubleshooting](troubleshooting.md) - Common issues
