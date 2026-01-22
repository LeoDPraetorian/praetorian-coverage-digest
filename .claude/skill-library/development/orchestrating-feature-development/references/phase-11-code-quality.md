# Phase 11: Code Quality

**Two-stage gated review: spec compliance (blocking), then quality + security (parallel).**

---

## Overview

Code Quality validates feature implementation through sequential gates:

1. **Stage 1 (BLOCKING):** Does code match plan? (spec compliance)
2. **Stage 2 (PARALLEL):** Is code well-built? (quality + security)

**Why two stages?** Catching spec deviations BEFORE quality review prevents wasted effort reviewing code that doesn't meet requirements.

**Entry Criteria:** Phase 10 (Domain Compliance) complete.

**Exit Criteria:** Both stages pass (or user explicitly approves).

---

## Two-Stage Review Pattern

```
Implementation Complete
        ↓
┌───────────────────────────────────────┐
│  STAGE 1: Spec Compliance (BLOCKING)  │
│  Agent: {domain}-reviewer (single)    │
│  Focus: Code matches plan?            │
│  Verdict: SPEC_COMPLIANT | NOT_       │
└─────────────┬─────────────────────────┘
              │
         NOT_COMPLIANT? → Fix loop (max 2) → Escalate
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
    CHANGES_REQUESTED? → Fix loop (max 1) → Escalate
              │
           APPROVED
              ↓
        Test Planning
```

---

## Step 1: Feature-Specific Reviewer Selection

Based on `feature_type` from Phase 3:

| Feature Type | Stage 1 Reviewer    | Stage 2 Reviewers (parallel)              |
| ------------ | ------------------- | ----------------------------------------- |
| Frontend     | `frontend-reviewer` | `frontend-reviewer` + `frontend-security` |
| Backend      | `backend-reviewer`  | `backend-reviewer` + `backend-security`   |
| Full-stack   | Both reviewers      | All 4 reviewers (parallel)                |

---

## Step 2: Stage 1 - Spec Compliance Review

**Spawn SINGLE reviewer focused on spec compliance ONLY.**

### Frontend Feature

```markdown
Task(
subagent_type: "frontend-reviewer",
description: "Spec compliance review for {feature}",
prompt: "
Task: Verify spec compliance

PLAN REQUIREMENTS (from Phase 7 architecture-plan.md Part 2):
{requirements list from .feature-development/architecture-plan.md}

IMPLEMENTATION (from Phase 8):
{files modified list from .feature-development/implementation-summary.md}

YOUR ONLY FOCUS: Does code match plan exactly?

CHECK:

- Nothing missing (all requirements implemented)
- Nothing extra (no unrequested features)
- Correct behavior (matches spec)

DO NOT evaluate: code quality, style, performance (that's Stage 2)

Return:
{
'verdict': 'SPEC_COMPLIANT | NOT_COMPLIANT',
'missing_requirements': [],
'extra_features': [],
'deviations': []
}
"
)
```

### Backend Feature

```markdown
Task(
subagent_type: "backend-reviewer",
description: "Spec compliance review for {feature}",
prompt: "
Task: Verify spec compliance

PLAN REQUIREMENTS (from Phase 7):
{requirements list}

IMPLEMENTATION (from Phase 8):
{files modified list}

YOUR ONLY FOCUS: Does code match plan exactly?

CHECK:

- Nothing missing (all requirements implemented)
- Nothing extra (no unrequested features)
- Correct behavior (matches spec)
- Handler signatures match spec

DO NOT evaluate: code quality, style, performance (that's Stage 2)

Return:
{
'verdict': 'SPEC_COMPLIANT | NOT_COMPLIANT',
'missing_requirements': [],
'extra_features': [],
'deviations': []
}
"
)
```

---

## Step 3: Stage 1 Fix Loop (MAX 2 ATTEMPTS)

If `verdict: "NOT_COMPLIANT"`:

**Attempt 1:**

1. Dispatch developer with spec compliance issues
2. Re-run Stage 1 spec compliance review
3. If SPEC_COMPLIANT → proceed to Stage 2
4. If still NOT_COMPLIANT → Attempt 2

**Attempt 2:**

1. Dispatch developer with remaining issues
2. Re-run Stage 1 review
3. If SPEC_COMPLIANT → proceed to Stage 2
4. If still NOT_COMPLIANT → **Escalate**

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Spec compliance failing after 2 attempts. How to proceed?",
      header: "Spec Review",
      multiSelect: false,
      options: [
        { label: "Show me the issues", description: "Display spec compliance issues" },
        {
          label: "Proceed to Stage 2 anyway",
          description: "Accept deviations, document tech debt",
        },
        { label: "Revise plan", description: "Plan may be unclear or incorrect" },
        { label: "Cancel", description: "Stop development" },
      ],
    },
  ],
});
```

---

## Step 4: Stage 2 - Quality + Security Review

**PREREQUISITE:** Stage 1 MUST pass before Stage 2.

**Spawn ALL Stage 2 reviewers in a SINGLE message.**

### Frontend Feature (Stage 2)

```markdown
# Quality reviewer

Task(
subagent_type: "frontend-reviewer",
description: "Code quality review for {feature}",
prompt: "
Task: Code quality review

PREREQUISITE: Stage 1 passed (spec compliance confirmed)

CHECK:

- React patterns (hooks, components, state)
- TypeScript type safety
- Performance implications (re-renders, memoization)
- Accessibility (keyboard navigation, ARIA)
- Test coverage implications

SKILLS TO READ (from skill-manifest.yaml):
{skills_by_domain.frontend.library_skills}

Return:
{
'verdict': 'APPROVED | APPROVED_WITH_NOTES | CHANGES_REQUESTED',
'quality_score': {0-100},
'issues': [],
'suggestions': []
}
"
)

# Security reviewer (PARALLEL)

Task(
subagent_type: "frontend-security",
description: "Security review for {feature}",
prompt: "
Task: Security review

PREREQUISITE: Stage 1 passed (spec compliance confirmed)

CHECK:

- XSS prevention (user input rendering)
- CSRF protection
- Sensitive data exposure (console logs, error messages)
- Authentication/authorization checks
- Secure storage (localStorage vs sessionStorage)

Return:
{
'verdict': 'APPROVED | CHANGES_REQUESTED',
'vulnerabilities': [],
'recommendations': []
}
"
)
```

### Backend Feature (Stage 2)

```markdown
# Quality reviewer

Task(
subagent_type: "backend-reviewer",
description: "Code quality review for {feature}",
prompt: "
Task: Code quality review

PREREQUISITE: Stage 1 passed (spec compliance confirmed)

CHECK:

- Go idioms and patterns
- Error handling (wrapping, logging)
- Concurrency safety (mutex, channels)
- API design (handler signatures, response format)
- Test coverage implications

SKILLS TO READ (from skill-manifest.yaml):
{skills_by_domain.backend.library_skills}

Return:
{
'verdict': 'APPROVED | APPROVED_WITH_NOTES | CHANGES_REQUESTED',
'quality_score': {0-100},
'issues': [],
'suggestions': []
}
"
)

# Security reviewer (PARALLEL)

Task(
subagent_type: "backend-security",
description: "Security review for {feature}",
prompt: "
Task: Security review

PREREQUISITE: Stage 1 passed (spec compliance confirmed)

CHECK:

- Input validation (SQL injection, command injection)
- Authentication/authorization
- Error message information leakage
- OWASP Top 10 compliance
- Sensitive data handling (logging, responses)

Return:
{
'verdict': 'APPROVED | CHANGES_REQUESTED',
'vulnerabilities': [],
'recommendations': []
}
"
)
```

### Full-Stack Feature (Stage 2)

Spawn ALL 4 reviewers in parallel:

- `frontend-reviewer`
- `frontend-security`
- `backend-reviewer`
- `backend-security`

---

## Step 5: Stage 2 Fix Loop (MAX 1 ATTEMPT)

If ANY Stage 2 reviewer returns `CHANGES_REQUESTED`:

1. Compile feedback from both reviewers
2. Dispatch developer to fix quality/security issues
3. Re-run Stage 2 (both reviewers in parallel)
4. If all APPROVED → proceed to Phase 12
5. If still issues → **Escalate**

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Code quality/security review failing after 1 retry. How to proceed?",
      header: "Review",
      multiSelect: false,
      options: [
        { label: "Show me the issues", description: "Display quality/security feedback" },
        { label: "Proceed anyway", description: "Accept current state, document known issues" },
        { label: "Cancel", description: "Stop development" },
      ],
    },
  ],
});
```

---

## Step 6: Quality Score Thresholds for Features

| Score  | Frontend Interpretation                    | Backend Interpretation                          |
| ------ | ------------------------------------------ | ----------------------------------------------- |
| 90-100 | Excellent - clean hooks, typed, accessible | Excellent - idiomatic Go, proper error handling |
| 70-89  | Good - minor improvements                  | Good - acceptable patterns                      |
| 50-69  | Needs work - anti-patterns present         | Needs work - error handling gaps                |
| <50    | Significant issues - refactor needed       | Significant issues - architectural problems     |

**Minimum passing score:** 70

---

## Step 7: Update MANIFEST.yaml

```yaml
phases:
  11_code_quality:
    status: "complete"
    completed_at: "{timestamp}"

review:
  stage1:
    verdict: "SPEC_COMPLIANT"
    retry_count: 0
    agent: "frontend-reviewer" # or backend-reviewer

  stage2:
    quality:
      verdict: "APPROVED"
      quality_score: 85
      agent: "frontend-reviewer"
    security:
      verdict: "APPROVED"
      vulnerabilities: 0
      agent: "frontend-security"
    retry_count: 0

  outputs:
    spec_compliance: ".feature-development/spec-compliance-review.md"
    code_quality: ".feature-development/code-quality-review.md"
    security: ".feature-development/security-review.md"
```

---

## Step 8: Update TodoWrite & User Report

```markdown
## Code Quality Review Complete

**Feature Type:** Frontend

**Stage 1 (Spec Compliance):** SPEC_COMPLIANT

- All requirements implemented
- No deviations from plan

**Stage 2 (Quality + Security):**

- Quality: APPROVED (score: 85/100)
- Security: APPROVED (0 vulnerabilities)

**Review Outputs:**

- spec-compliance-review.md
- code-quality-review.md
- security-review.md

Proceeding to Phase 12: Test Planning
```

Update TodoWrite:

```
TodoWrite([
  { content: "Phase 11: Code Quality", status: "completed", activeForm: "Reviewing code quality" },
  { content: "Phase 12: Test Planning", status: "in_progress", activeForm: "Planning tests" },
  // ... rest
])
```

---

## Edge Cases

### Reviewers Disagree on Severity

**Solution:** Take the more conservative (higher severity) assessment. Security concerns always take priority.

### Developer Introduces New Issues When Fixing

**Solution:** After retry limit, escalate to user. Do NOT enter infinite loop.

### Security Reviewer Flags False Positives

**Expected behavior.** Document the finding with rationale for why it's not a vulnerability. User can approve despite the finding.

### Skip Security Review for Small Changes?

**Answer:** No. Security reviewers run in parallel, adding minimal overhead. Even small changes can introduce vulnerabilities.

---

## Skip Conditions

| Work Type | Stage 1        | Stage 2 |
| --------- | -------------- | ------- |
| BUGFIX    | Skip (no plan) | Run     |
| SMALL     | Skip (no plan) | Run     |
| MEDIUM    | Run            | Run     |
| LARGE     | Run            | Run     |

---

## Related References

- [Phase 10: Domain Compliance](phase-10-domain-compliance.md) - Previous phase
- [Phase 12: Test Planning](phase-12-test-planning.md) - Next phase
