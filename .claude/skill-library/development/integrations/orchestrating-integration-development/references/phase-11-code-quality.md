# Phase 11: Code Quality

**Two-stage gated review: spec compliance (blocking), then quality + security (parallel).**

**This file provides:** Complete phase protocol for integration development.

---

## Overview

Code Quality validates implementation through sequential gates:

1. **Stage 1 (BLOCKING):** Does code match architecture plan? (spec compliance)
2. **Stage 2 (PARALLEL):** Is code well-built and secure? (quality + security)

**Why two stages?** Catching spec deviations BEFORE quality review prevents wasted effort reviewing code that doesn't meet requirements.

**Entry Criteria:** Phase 10 (Domain Compliance) complete with P0 passing.

**Exit Criteria:** Both stages pass (or user explicitly approves).

---

## Two-Stage Review Pattern

```
P0 Compliance Complete (Phase 10)
        ↓
┌───────────────────────────────────────┐
│  STAGE 1: Spec Compliance (BLOCKING)  │
│  Agent: integration-reviewer          │
│  Focus: Code matches architecture?    │
│  Verdict: SPEC_COMPLIANT | NOT_       │
└─────────────┬─────────────────────────┘
              │
         NOT_COMPLIANT? → Fix loop (max 2) → Escalate
              │
        SPEC_COMPLIANT
              ↓
┌───────────────────────────────────────┐
│  STAGE 2: Quality + Security (||)     │
│  Agents: backend-reviewer + security  │
│  Focus: Is code well-built?           │
│  Verdict: APPROVED | CHANGES_         │
└─────────────┬─────────────────────────┘
              │
    CHANGES_REQUESTED? → Fix loop (max 1) → Escalate
              │
           APPROVED
              ↓
        Test Planning (Phase 12)
```

---

## Step 1: Stage 1 - Spec Compliance Review

**Spawn SINGLE integration-reviewer focused on spec compliance ONLY.**

```markdown
Task(
subagent_type: "integration-reviewer",
description: "Spec compliance review for {vendor}",
prompt: "
Task: Verify spec compliance for {vendor} integration

ARCHITECTURE PLAN (from Phase 7):
{OUTPUT_DIR}/architecture-plan.md

IMPLEMENTATION FILES:
{list from Phase 8}

P0 COMPLIANCE (from Phase 10):
{OUTPUT_DIR}/p0-compliance-review.md

YOUR ONLY FOCUS: Does code match architecture plan exactly?

CHECK:

- All methods from architecture implemented
- File structure matches file-placement.md
- Auth flow matches architecture
- Pagination matches architecture
- Data mapping matches Tabularium section
- errgroup usage matches concurrency section

DO NOT evaluate: code style, performance, tests (that's Stage 2)

MANDATORY SKILLS:

- integrating-with-{vendor}: Verify compliance with vendor patterns
- developing-integrations: P0 requirements and patterns
- adhering-to-dry
- gateway-integrations
- gateway-backend
- persisting-agent-outputs

OUTPUT_DIRECTORY: {from Phase 1}
OUTPUT: spec-compliance-review.md

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

## Step 2: Stage 1 Fix Loop (MAX 2 ATTEMPTS)

If `verdict: "NOT_COMPLIANT"`:

**Attempt 1:**

1. Dispatch integration-developer with spec compliance issues
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
        { label: "Revise architecture", description: "Architecture plan may be unclear" },
        { label: "Cancel", description: "Stop development" },
      ],
    },
  ],
});
```

---

## Step 3: Stage 2 - Quality + Security Review (PARALLEL)

**PREREQUISITE:** Stage 1 MUST pass before Stage 2.

**Spawn BOTH reviewers in SINGLE message:**

```markdown
# Quality reviewer

Task(
subagent_type: "backend-reviewer",
description: "Code quality review for {vendor}",
prompt: "
Task: Code quality review for {vendor} integration

PREREQUISITE: Stage 1 passed (spec compliance confirmed)

CHECK:

- Code quality (patterns, structure, DRY)
- Error handling quality (beyond P0 minimum)
- Logging presence and quality
- Edge case handling (nil checks, boundaries)
- Performance implications

MANDATORY SKILLS:

- integrating-with-{vendor}: Verify compliance with vendor patterns
- developing-integrations: P0 requirements and patterns
- adhering-to-dry
- gateway-backend
- persisting-agent-outputs

OUTPUT_DIRECTORY: {from Phase 1}
OUTPUT: code-quality-review.md

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
subagent_type: "backend-security",
description: "Security review for {vendor}",
prompt: "
Task: Security review for {vendor} integration

PREREQUISITE: Stage 1 passed (spec compliance confirmed)

CHECK:

- Credential handling (secrets retrieved securely, never logged)
- Input validation (external input validated before use)
- TLS enforcement (HTTPS for all API calls)
- Rate limiting (respects vendor limits)
- Error disclosure (no sensitive data in error messages)
- OWASP Top 10 compliance

OUTPUT_DIRECTORY: {from Phase 1}
OUTPUT: security-review.md

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

## Step 4: Stage 2 Fix Loop (MAX 1 ATTEMPT)

If ANY Stage 2 reviewer returns `CHANGES_REQUESTED`:

1. Compile feedback from both reviewers
2. Dispatch integration-developer to fix quality/security issues
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

## Step 5: Quality Scoring

Stage 2 reviewers return quality_score (0-100):

### Integration-Specific Quality Factors

| Factor        | Weight | Passing Threshold | Notes                           |
| ------------- | ------ | ----------------- | ------------------------------- |
| P0 Compliance | 30%    | 100%              | All 7 requirements (from Ph 10) |
| Code Quality  | 25%    | 70%               | DRY, error handling, naming     |
| Test Coverage | 20%    | 80%               | Mock server coverage            |
| Security      | 15%    | 70%               | Auth handling, input validation |
| Documentation | 10%    | 50%               | Handler comments, README        |

**Score Calculation:**

```
Total = (P0 * 0.30) + (Quality * 0.25) + (Coverage * 0.20) + (Security * 0.15) + (Docs * 0.10)
```

**Score Thresholds:**

| Score | Action                |
| ----- | --------------------- |
| ≥70   | Proceed to testing    |
| 50-69 | Trigger feedback loop |
| <50   | Escalate to user      |

---

## Step 6: Update MANIFEST.yaml

```yaml
phases:
  11_code_quality:
    status: "complete"
    completed_at: "{timestamp}"

review:
  stage1:
    verdict: "SPEC_COMPLIANT"
    retry_count: 0
    agent: "integration-reviewer"

  stage2:
    quality:
      verdict: "APPROVED"
      quality_score: 78
      agent: "backend-reviewer"
    security:
      verdict: "APPROVED"
      vulnerabilities: 0
      agent: "backend-security"
    retry_count: 0

  outputs:
    spec_compliance: "{OUTPUT_DIR}/spec-compliance-review.md"
    code_quality: "{OUTPUT_DIR}/code-quality-review.md"
    security: "{OUTPUT_DIR}/security-review.md"
```

---

## Step 7: Update TodoWrite & Report

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
- No deviations from architecture

**Stage 2 (Quality + Security):**

- Quality: ✅ APPROVED (score: 78/100)
- Security: ✅ APPROVED (0 vulnerabilities)

**Review Outputs:**

- spec-compliance-review.md
- code-quality-review.md
- security-review.md

→ Proceeding to Phase 12: Test Planning
```

---

## Integration-Specific Review Checklist

### Spec Compliance Checklist

| Aspect       | Question                              | Evidence                         |
| ------------ | ------------------------------------- | -------------------------------- |
| Structure    | Files match file-placement.md?        | Compare to architecture          |
| Methods      | Match, Invoke, CheckAffiliation, etc? | All required methods present     |
| Auth flow    | Matches architecture Auth section?    | Token/key handling correct       |
| Pagination   | Matches architecture pagination?      | maxPages or API-provided limit   |
| Data mapping | Transforms match Tabularium mapping?  | Asset/Risk field mapping correct |
| Concurrency  | errgroup matches concurrency section? | SetLimit value, loop capture     |

### Security Review Checklist

| Aspect              | Question                                      |
| ------------------- | --------------------------------------------- |
| Credential handling | Secrets from Job.Secret, never logged?        |
| Input validation    | External API response validated before use?   |
| TLS                 | HTTPS enforced for all API calls?             |
| Rate limiting       | Respects vendor rate limits (SetLimit value)? |
| Error disclosure    | Error messages don't leak sensitive data?     |

---

## Skip Conditions

| Work Type | Stage 1 | Stage 2 |
| --------- | ------- | ------- |
| SMALL     | Skip    | Run     |
| MEDIUM    | Run     | Run     |
| LARGE     | Run     | Run     |

---

## Related References

- [Phase 10: Domain Compliance](phase-10-domain-compliance.md) - Previous phase
- [Phase 12: Test Planning](phase-12-test-planning.md) - Next phase
- [review-output-templates.md](../../orchestrating-integration-development/references/review-output-templates.md) - Review output formats
