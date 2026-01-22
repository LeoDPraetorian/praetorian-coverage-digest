# Phase 11: Code Quality

**Two-stage gated review: spec compliance (blocking), then quality + security (parallel).**

---

## Overview

Code Quality validates implementation through sequential gates:

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

## Step 1: Determine Reviewer Agents

Based on `technologies_detected` from Phase 3:

| Domain      | Stage 1 Reviewer       | Stage 2 Reviewers (parallel)                |
| ----------- | ---------------------- | ------------------------------------------- |
| Frontend    | `frontend-reviewer`    | `frontend-reviewer` + `frontend-security`   |
| Backend     | `backend-reviewer`     | `backend-reviewer` + `backend-security`     |
| Full-stack  | Both reviewers         | All 4 reviewers                             |
| Integration | `integration-reviewer` | `integration-reviewer` + `backend-security` |
| Capability  | `capability-reviewer`  | `capability-reviewer` + `backend-security`  |
| MCP Tools   | `tool-reviewer`        | `tool-reviewer` + `backend-security`        |

---

## Step 2: Stage 1 - Spec Compliance Review

**Spawn SINGLE reviewer focused on spec compliance ONLY.**

```markdown
Task(
subagent_type: "{domain}-reviewer",
description: "Spec compliance review",
prompt: "
Task: Verify spec compliance

PLAN REQUIREMENTS (from Phase 7 architecture-plan.md):
{requirements list}

IMPLEMENTATION (from Phase 8):
{files modified list}

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

## Step 4: Stage 2 - Quality + Security Review (PARALLEL)

**PREREQUISITE:** Stage 1 MUST pass before Stage 2.

**Spawn ALL Stage 2 reviewers in SINGLE message:**

```markdown
# Quality reviewer

Task(
subagent_type: "{domain}-reviewer",
description: "Code quality review",
prompt: "
Task: Code quality review

PREREQUISITE: Stage 1 passed (spec compliance confirmed)

CHECK:

- Code quality (patterns, structure)
- Test coverage
- Documentation
- Performance implications
- Maintainability

SKILLS TO READ (from skill-manifest.yaml):
{skills_by_domain.{domain}.library_skills}

Return:
{
'verdict': 'APPROVED | APPROVED_WITH_NOTES | CHANGES_REQUESTED',
'quality_score': {score},
'issues': [],
'suggestions': []
}
"
)

# Security reviewer (PARALLEL)

Task(
subagent_type: "{domain}-security",
description: "Security review",
prompt: "
Task: Security review

PREREQUISITE: Stage 1 passed (spec compliance confirmed)

CHECK:

- Input validation (injection prevention)
- Authentication/authorization
- Error message information leakage
- OWASP Top 10 compliance

Return:
{
'verdict': 'APPROVED | CHANGES_REQUESTED',
'vulnerabilities': [],
'recommendations': []
}
"
)
```

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

## Step 6: Quality Scoring

Stage 2 reviewers return quality_score (0-100):

| Score  | Interpretation     | Action                          |
| ------ | ------------------ | ------------------------------- |
| 90-100 | Excellent          | Proceed immediately             |
| 70-89  | Good, acceptable   | Proceed                         |
| 50-69  | Needs improvement  | Fix loop (respect retry limits) |
| <50    | Significant issues | Escalate to user                |

**Threshold:** 70 (default). Higher for security-critical code.

See [quality-scoring.md](quality-scoring.md) for factor weights by workflow type.

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
    agent: "{domain}-reviewer"

  stage2:
    quality:
      verdict: "APPROVED"
      quality_score: { score }
      agent: "{domain}-reviewer"
    security:
      verdict: "APPROVED"
      vulnerabilities: { count }
      agent: "{domain}-security"
    retry_count: 0

  outputs:
    spec_compliance: "{OUTPUT_DIR}/spec-compliance-review.md"
    code_quality: "{OUTPUT_DIR}/code-quality-review.md"
    security: "{OUTPUT_DIR}/security-review.md"
```

---

## Step 8: Update TodoWrite & Report

```
TodoWrite([
  { content: "Phase 11: Code Quality", status: "completed", activeForm: "Reviewing code quality" },
  { content: "Phase 12: Test Planning", status: "in_progress", activeForm: "Planning tests" },
  // ... rest
])
```

Output to user:

```markdown
## Code Quality Review Complete

**Stage 1 (Spec Compliance):** ✅ SPEC_COMPLIANT

- All requirements implemented
- No deviations from plan

**Stage 2 (Quality + Security):**

- Quality: ✅ APPROVED (score: {score}/100)
- Security: ✅ APPROVED ({count} vulnerabilities)

**Review Outputs:**

- spec-compliance-review.md
- code-quality-review.md
- security-review.md

→ Proceeding to Phase 12: Test Planning
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
- [gated-verification.md](gated-verification.md) - Two-stage pattern details
- [quality-scoring.md](quality-scoring.md) - Quality score calculation
- [delegation-templates-review-skills.md](delegation-templates-review-skills.md) - Reviewer prompts
