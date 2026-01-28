# Phase 11: Code Quality

**Two-stage gated review with capability-specific reviewer selection.**

---

## Overview

Code Quality validates fingerprintx plugin implementation through sequential gates with fingerprintx-specific reviewer configuration.

**Entry Criteria:** Phase 10 (Domain Compliance) complete.

**Exit Criteria:** Both stages pass (or user explicitly approves).

---

## Fingerprintx Reviewer Selection

| Stage   | Reviewers                                  | Focus                         |
| ------- | ------------------------------------------ | ----------------------------- |
| Stage 1 | `capability-reviewer`                      | Spec compliance only          |
| Stage 2 | `capability-reviewer` + `backend-security` | Quality + Security (parallel) |

---

## Stage 1: Spec Compliance Review

**Spawn SINGLE reviewer focused on spec compliance ONLY.**

```markdown
Task(
subagent_type: "capability-reviewer",
description: "Spec compliance review for {protocol} plugin",
prompt: "
Task: Verify spec compliance

PLAN REQUIREMENTS (from Phase 7 architecture-plan.md):
{requirements list from .fingerprintx-development/plan.md}

IMPLEMENTATION (from Phase 8):
{files modified list from .fingerprintx-development/implementation-summary.md}

YOUR ONLY FOCUS: Does code match plan exactly?

CHECK:

- Nothing missing (all requirements implemented)
- Nothing extra (no unrequested features)
- Detection logic matches architecture
- Version extraction matches design (if applicable)
- Error handling matches specification

DO NOT evaluate: code quality, Go idioms, performance (that's Stage 2)

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

## Stage 2: Quality + Security Review

**PREREQUISITE:** Stage 1 MUST pass before Stage 2.

**Spawn BOTH reviewers in a SINGLE message (parallel):**

### Quality Reviewer

```markdown
Task(
subagent_type: "capability-reviewer",
description: "Code quality review for {protocol} plugin",
prompt: "
Task: Code quality review

PREREQUISITE: Stage 1 passed (spec compliance confirmed)

CHECK:

- Go idioms (proper error handling, idiomatic patterns)
- Plugin pattern adherence (matches existing plugins)
- Detection logic efficiency
- Banner parsing robustness
- Memory safety (no buffer overflows)
- Code organization and comments

SKILLS TO READ (from skill-manifest.yaml):
{skills_by_domain.capabilities.library_skills}

**Example skills:**

- .claude/skill-library/development/capabilities/nerva/writing-nerva-tcp-udp-modules/SKILL.md
- .claude/skill-library/development/backend/go-best-practices/SKILL.md

Return:
{
'verdict': 'APPROVED | APPROVED_WITH_NOTES | CHANGES_REQUESTED',
'quality_score': {0-100},
'issues': [],
'suggestions': []
}
"
)
```

### Security Reviewer (PARALLEL)

```markdown
Task(
subagent_type: "backend-security",
description: "Security review for {protocol} plugin",
prompt: "
Task: Security review

PREREQUISITE: Stage 1 passed (spec compliance confirmed)

CHECK:

- Buffer handling (no overflow on malformed input)
- Input validation (all external data validated before use)
- Timeout handling (no hanging on slow/malicious servers)
- Resource cleanup (connections closed, no leaks)
- Error message safety (no sensitive information leaked)
- Panic prevention (no uncaught panics on bad input)

FINGERPRINTX-SPECIFIC SECURITY CONCERNS:

- Banner parsing must handle zero-length responses
- Must handle responses larger than expected
- Must handle binary responses when expecting text
- Connection timeouts must be enforced
- Read timeouts must be enforced

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

## Quality Score Thresholds for Fingerprintx

| Score  | Interpretation                                                       |
| ------ | -------------------------------------------------------------------- |
| 90-100 | Excellent - idiomatic Go, robust detection, follows existing plugins |
| 70-89  | Good - minor improvements possible, acceptable patterns              |
| 50-69  | Needs work - anti-patterns present, detection may be fragile         |
| <50    | Significant issues - architectural problems, unreliable detection    |

**Minimum passing score:** 70

---

## Fingerprintx-Specific Quality Checks

| Check               | Good Pattern                             | Bad Pattern                       |
| ------------------- | ---------------------------------------- | --------------------------------- |
| Banner length check | `if len(banner) < minLen { return nil }` | Direct index access without check |
| Error propagation   | `return nil` on detection failure        | Panic or error message            |
| Version extraction  | Graceful fallback to empty string        | Panic if version not found        |
| Connection handling | Explicit Close() in defer                | No cleanup on error paths         |
| Timeout             | Context with timeout                     | No timeout, can hang forever      |

---

## Update MANIFEST.yaml

```yaml
phases:
  11_code_quality:
    status: "complete"
    completed_at: "{timestamp}"

review:
  stage1:
    verdict: "SPEC_COMPLIANT"
    retry_count: 0
    agent: "capability-reviewer"

  stage2:
    quality:
      verdict: "APPROVED"
      quality_score: 85
      agent: "capability-reviewer"
    security:
      verdict: "APPROVED"
      vulnerabilities: 0
      agent: "backend-security"
    retry_count: 0

  outputs:
    spec_compliance: ".fingerprintx-development/spec-compliance-review.md"
    code_quality: ".fingerprintx-development/code-quality-review.md"
    security: ".fingerprintx-development/security-review.md"
```

---

## User Report

```markdown
## Code Quality Review Complete

**Protocol:** {protocol}

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

---

## Skip Conditions

| Work Type | Stage 1        | Stage 2 |
| --------- | -------------- | ------- |
| BUGFIX    | Skip (no plan) | Run     |
| SMALL     | Skip (no plan) | Run     |
| MODERATE  | Run            | Run     |
| COMPLEX   | Run            | Run     |

---

## Common Quality Issues

| Issue                  | Fix                                                     |
| ---------------------- | ------------------------------------------------------- |
| No banner length check | Add `if len(response) < minLen { return nil }`          |
| Missing defer Close()  | Add `defer conn.Close()` after successful connection    |
| Hard-coded timeout     | Use context with configurable timeout                   |
| Version regex panic    | Wrap in recovery or check match before accessing groups |
| No package comment     | Add comment explaining detection strategy and ports     |

---

## Related References

- [Phase 10: Domain Compliance](phase-10-domain-compliance.md) - Previous phase
- [Phase 12: Test Planning](phase-12-test-planning.md) - Next phase
- [Quality Scoring](quality-scoring.md) - Quality metrics
