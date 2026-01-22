# Gated Verification

Detailed examples of two-stage verification patterns for multi-agent workflows.

## Overview

Gated verification separates **requirement compliance** (did they do what was asked?) from **quality assessment** (did they do it well?). This prevents wasted effort reviewing work that doesn't meet the basic specification.

## Pattern Structure

```
Implementation Complete
        ↓
┌───────────────────────────────────────┐
│  STAGE 1: Requirement Compliance      │
│  Focus: Does output match spec?       │
│  Verdict: COMPLIANT | NOT_COMPLIANT   │
└─────────────┬─────────────────────────┘
              │
         NOT_COMPLIANT? → Fix loop (max 2) → Escalate
              │
        COMPLIANT
              ↓
┌───────────────────────────────────────┐
│  STAGE 2: Quality + Security (||)     │
│  Focus: Is output well-built?         │
│  Verdict: APPROVED | CHANGES_         │
└─────────────┬─────────────────────────┘
              │
    CHANGES_REQUESTED? → Fix loop (max 1) → Escalate
              │
           APPROVED
              ↓
        Next Phase
```

## Example 1: Code Review After Implementation

### Context

Developer implemented a new API endpoint. Need to verify:

1. Does it implement all requirements from plan.md?
2. Is the code well-structured and secure?

### Stage 1: Spec Compliance Review

**Agent**: `backend-reviewer` (single)

**Prompt**:

```
Task: Verify spec compliance for CreateAsset handler

PLAN REQUIREMENTS (from plan.md):
1. POST /api/assets endpoint
2. Request validation (name, type required)
3. DynamoDB put operation
4. Returns 201 with created asset ID
5. Error handling for duplicates

IMPLEMENTATION:
{from implementation-log.md}

FILES TO REVIEW:
- pkg/handler/handlers/asset/create.go
- pkg/service/asset/service.go

YOUR ONLY FOCUS: Does implementation match plan requirements exactly?

Return verdict: COMPLIANT | NOT_COMPLIANT

DO NOT evaluate:
- Code quality, style, or optimization
- Performance characteristics
- Security (that's Stage 2)

DELIVERABLE:
{
  "verdict": "COMPLIANT",
  "missing_requirements": [],
  "extra_features": [],
  "deviations": []
}
```

**Possible Outcomes**:

```json
// COMPLIANT - proceed to Stage 2
{
  "verdict": "COMPLIANT",
  "missing_requirements": [],
  "extra_features": [],
  "deviations": []
}

// NOT_COMPLIANT - enter fix loop
{
  "verdict": "NOT_COMPLIANT",
  "missing_requirements": ["Error handling for duplicates not implemented"],
  "extra_features": [],
  "deviations": ["Uses PUT instead of POST"]
}
```

### Stage 2: Quality + Security Review (PARALLEL)

**Only runs if Stage 1 = COMPLIANT**

**Agents**: `backend-reviewer` + `backend-security` (parallel)

**Prompt for backend-reviewer**:

```
Task: Code quality review for CreateAsset handler

PREREQUISITE: Stage 1 passed (spec compliance confirmed)

FOCUS: Code quality and maintainability

CHECK:
- Go code quality (error handling, patterns)
- Test coverage (unit + integration)
- Documentation and comments
- Performance implications

FILES:
- pkg/handler/handlers/asset/create.go
- pkg/service/asset/service.go

DELIVERABLE:
{
  "verdict": "APPROVED",
  "quality_score": 85,
  "issues": [],
  "suggestions": []
}
```

**Prompt for backend-security**:

```
Task: Security review for CreateAsset handler

PREREQUISITE: Stage 1 passed (spec compliance confirmed)

FOCUS: Security vulnerabilities

CHECK:
- Input validation (injection prevention)
- Authentication/authorization
- Error message information leakage
- OWASP Top 10 compliance

FILES:
- pkg/handler/handlers/asset/create.go
- pkg/service/asset/service.go

DELIVERABLE:
{
  "verdict": "APPROVED",
  "vulnerabilities": [],
  "recommendations": []
}
```

### Handling Stage 1 NOT_COMPLIANT

**Max 2 retries before escalating**

```typescript
// After Stage 1 returns NOT_COMPLIANT
retry_count = 0

while retry_count < 2 and verdict == "NOT_COMPLIANT":
  // Dispatch developer to fix missing requirements
  Task("backend-developer", "Fix spec compliance issues: {issues}")

  // Re-run Stage 1 spec compliance review
  verdict = Task("backend-reviewer", "Re-verify spec compliance")

  retry_count++

if verdict == "NOT_COMPLIANT":
  // Escalate to user
  AskUserQuestion({
    question: "Spec compliance still failing after 2 attempts. How to proceed?",
    options: [
      "Show me the issues",
      "Proceed anyway (document known gaps)",
      "Revise plan (requirements may be unclear)"
    ]
  })
```

### Handling Stage 2 CHANGES_REQUESTED

**Max 1 retry before escalating**

```typescript
// After Stage 2 returns CHANGES_REQUESTED from either reviewer
if quality_verdict == "CHANGES_REQUESTED" or security_verdict == "CHANGES_REQUESTED":
  // Compile feedback from both reviewers
  feedback = merge(quality_feedback, security_feedback)

  // Dispatch developer to fix
  Task("backend-developer", "Fix quality/security issues: {feedback}")

  // Re-run Stage 2 (both reviewers in parallel)
  quality_verdict = Task("backend-reviewer", "Re-review code quality")
  security_verdict = Task("backend-security", "Re-review security")

  if still_failing:
    // Escalate to user (max 1 retry for Stage 2)
    AskUserQuestion({
      question: "Code quality/security review failing after 1 retry. Proceed?",
      options: ["Show issues", "Proceed anyway", "Cancel"]
    })
```

## Example 2: Test Validation

### Context

Testers implemented tests according to test plan. Need to verify:

1. Does test suite cover all requirements from test-plan.md?
2. Are tests well-written (quality)?

### Stage 1: Plan Adherence

**Agent**: `test-lead`

**Prompt**:

```
Task: Verify test plan adherence

TEST PLAN (from test-plan.md):
- Security functions: 95% coverage (15 tests)
- Business logic: 80% coverage (12 tests)
- Integration paths: 90% coverage (8 tests)

TEST IMPLEMENTATION:
{from test-summary-*.md}

YOUR ONLY FOCUS: Were all tests from plan implemented?

Return verdict: COMPLIANT | NOT_COMPLIANT

DO NOT evaluate quality yet (that's Stage 2)

DELIVERABLE:
{
  "verdict": "COMPLIANT",
  "tests_required": 35,
  "tests_implemented": 35,
  "missing": []
}
```

### Stage 2: Test Quality

**Agent**: `test-lead`

**Prompt**:

```
Task: Validate test quality

PREREQUISITE: Stage 1 passed (all tests from plan implemented)

FOCUS: Test quality and coverage

CHECK:
- Coverage targets met (Security 95%, Business 80%, Integration 90%)
- Anti-patterns avoided (mock-only tests, implementation testing)
- Flakiness risks (time-dependency, race conditions)
- Assertion quality (meaningful assertions)

DELIVERABLE:
{
  "verdict": "APPROVED",
  "quality_score": 85,
  "coverage_met": true,
  "issues": []
}
```

## Example 3: Architecture Review (NO GATING)

**When NOT to use gated verification:**

Architecture review doesn't benefit from two stages because:

- Single-pass evaluation is sufficient
- No separate "compliance vs quality" distinction
- Architectural decisions are holistic

```
Architecture Phase
        ↓
┌───────────────────────────────┐
│  Single-Pass Review           │
│  Agent: frontend-lead         │
│  Focus: All aspects           │
│  Verdict: APPROVED | CHANGES  │
└───────────────────────────────┘
        ↓
   Implementation
```

## Decision Matrix

| Scenario                            | Use Gated?                         | Why                                                                  |
| ----------------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| Code review after implementation    | **Yes**                            | Clear spec exists (plan.md). Separate compliance from quality.       |
| Test validation after writing tests | **Yes**                            | Clear spec exists (test-plan.md). Verify plan first, quality second. |
| Architecture review                 | **No**                             | Holistic decision, no clear compliance spec.                         |
| Documentation review                | **Yes** if requirements doc exists | Can verify completeness before quality.                              |
| Bug fix review                      | **No**                             | Small scope, single-pass sufficient.                                 |
| Security audit                      | **No**                             | Security is inherently holistic.                                     |

## Benefits of Gating

### Without Gating (Wasted Effort)

```
Developer implements 4/5 requirements (missing duplicate handling)
↓
Code reviewer spends 30 minutes reviewing code quality
↓
Security reviewer spends 20 minutes on security analysis
↓
Finally discover: "Wait, duplicate handling is missing"
↓
Start over
```

**Total wasted time**: 50 minutes of quality review on incomplete implementation

### With Gating (Efficient)

```
Developer implements 4/5 requirements (missing duplicate handling)
↓
Spec compliance reviewer: "NOT_COMPLIANT - missing duplicate handling" (5 min)
↓
Developer fixes (10 min)
↓
Spec compliance reviewer: "COMPLIANT" (5 min)
↓
NOW run quality + security in parallel (30 min total)
```

**Time saved**: 20 minutes by catching spec issues before quality review

## Integration with Retry Limits

Gated verification works with the retry limits framework:

```
Stage 1: MAX 2 retries → Escalate
Stage 2: MAX 1 retry → Escalate
```

**Why different limits?**

- Stage 1 (compliance): May need 2 attempts to clarify ambiguous requirements
- Stage 2 (quality): Should pass quickly if spec is right. If quality is bad, likely a deeper issue.

## Metadata Tracking

Track both stages in progress:

```json
{
  "phase": "review",
  "stage1": {
    "verdict": "COMPLIANT",
    "retry_count": 1,
    "completed_at": "2025-01-11T10:30:00Z"
  },
  "stage2": {
    "quality_verdict": "APPROVED",
    "security_verdict": "APPROVED",
    "retry_count": 0,
    "completed_at": "2025-01-11T10:45:00Z"
  }
}
```

## Common Pitfalls

### Pitfall 1: Combining Stages

**WRONG:**

```
"Review the implementation. Check if it matches the plan AND if code quality is good."
```

**Why wrong**: Reviewer will focus on one or the other, likely quality. Missing requirements get overlooked.

**RIGHT:**

```
Stage 1: "Does this match the plan? ONLY focus on requirements."
Stage 2: "Code quality review. Spec compliance already confirmed."
```

### Pitfall 2: Skipping Stage 1

**WRONG:**

```
"The plan is simple, just do quality review."
```

**Why wrong**: Even "simple" plans have requirements that get missed. Stage 1 takes 5 minutes and catches gaps.

### Pitfall 3: Running Stages in Parallel

**WRONG:**

```
// Both at once
Task("backend-reviewer", "Spec compliance")
Task("backend-reviewer", "Code quality")
```

**Why wrong**: If spec compliance fails, quality review was wasted effort.

**RIGHT:**

```
// Sequential stages
verdict = Task("backend-reviewer", "Spec compliance")
if verdict == "COMPLIANT":
  Task("backend-reviewer", "Code quality")
  Task("backend-security", "Security") // These CAN be parallel
```

## Summary

**Use gated verification when:**

1. Clear specification exists (plan, requirements doc)
2. Can separate "did they do what was asked?" from "did they do it well?"
3. Multi-agent workflow with potential rework

**Skip gated verification when:**

1. Holistic single-pass evaluation sufficient
2. Small scope (bug fix, typo)
3. No clear compliance specification exists
