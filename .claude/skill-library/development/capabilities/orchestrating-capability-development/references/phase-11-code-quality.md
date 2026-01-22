# Phase 11: Code Quality

**Two-stage gated review with capability-specific reviewer selection.**

---

## Overview

Code Quality validates capability implementation through sequential gates with capability-specific reviewer configuration.

**Entry Criteria:** Phase 10 (Domain Compliance) complete.

**Exit Criteria:** Both stages pass (or user explicitly approves).

---

## Capability-Specific Reviewer Selection

Based on `capability_type` from Phase 3:

| Capability Type | Stage 1 Reviewer      | Stage 2 Reviewers (parallel)                                    |
| --------------- | --------------------- | --------------------------------------------------------------- |
| VQL             | `capability-reviewer` | `capability-reviewer` + `security-lead`                         |
| Nuclei          | `capability-reviewer` | `capability-reviewer` + `security-lead`                         |
| Janus           | `capability-reviewer` | `capability-reviewer` + `backend-reviewer`                      |
| Fingerprintx    | `capability-reviewer` | `capability-reviewer` + `backend-reviewer`                      |
| Scanner         | `capability-reviewer` | `capability-reviewer` + `backend-reviewer` + `backend-security` |

---

## Stage 1: Spec Compliance Review

**Spawn SINGLE reviewer focused on spec compliance ONLY.**

```markdown
Task(
subagent_type: "capability-reviewer",
description: "Spec compliance review for {capability-name}",
prompt: "
Task: Verify spec compliance for capability implementation

PLAN REQUIREMENTS (from Phase 7 architecture.md):
{requirements list from .capability-development/plan.md}

IMPLEMENTATION (from Phase 8):
{files modified list from .capability-development/implementation-summary.md}

CAPABILITY TYPE: {vql|nuclei|janus|fingerprintx|scanner}

YOUR ONLY FOCUS: Does capability match architecture exactly?

CHECK:

- Nothing missing (all requirements implemented)
- Nothing extra (no unrequested features)
- Correct behavior (matches spec)
- Capability-type patterns followed (see checklist below)

CAPABILITY-SPECIFIC CHECKLIST:
{Include type-specific checklist from Section 'Review Checklists by Type'}

DO NOT evaluate: code quality, style, performance (that's Stage 2)

MANDATORY SKILLS:

- persisting-agent-outputs

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

**Spawn ALL Stage 2 reviewers in a SINGLE message.**

### VQL/Nuclei Capabilities (Stage 2)

**Quality reviewer (`capability-reviewer`):** Check query/template structure, detection accuracy, performance, maintainability. Skills: `adhering-to-dry`, `adhering-to-yagni`.

**Security reviewer (`security-lead`):** Check detection accuracy, false positive potential, edge case handling, capability security.

See [prompts/reviewer-prompt.md](prompts/reviewer-prompt.md) for full prompt templates.

### Go Capabilities (Janus/Fingerprintx/Scanner - Stage 2)

**Quality reviewer (`capability-reviewer`):** Check Go idioms, error handling, concurrency safety, interface design. Skills: `adhering-to-dry`, `adhering-to-yagni`.

**Backend reviewer (`backend-reviewer`):** Check Go idioms, Chariot patterns, API client patterns, concurrency patterns.

**Scanner security (`backend-security` - Scanner only):** Check credential handling, API auth, input validation, error leakage, rate limits.

See [prompts/reviewer-prompt.md](prompts/reviewer-prompt.md) for full prompt templates.

---

## Quality Score Thresholds for Capabilities

| Score  | Interpretation                                                          |
| ------ | ----------------------------------------------------------------------- |
| 90-100 | Excellent - efficient queries, accurate detection, clean implementation |
| 70-89  | Good - functional with minor improvements                               |
| 50-69  | Needs work - detection issues or code quality problems                  |
| <50    | Significant issues - redesign or major refactor needed                  |

**Minimum passing score:** 70

---

## Review Checklists by Type

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

---

## Update MANIFEST.yaml

```yaml
phases:
  11_code_quality:
    status: "complete"
    completed_at: "{timestamp}"
    capability_type: "{vql|nuclei|janus|fingerprintx|scanner}"

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
    backend:
      verdict: "APPROVED" # (if applicable)
      quality_score: 82
      agent: "backend-reviewer"
    security:
      verdict: "APPROVED" # (if applicable)
      vulnerabilities: 0
      agent: "security-lead"
    retry_count: 0

  outputs:
    spec_compliance: ".capability-development/spec-compliance-review.md"
    code_quality: ".capability-development/code-quality-review.md"
    security: ".capability-development/security-review.md"
```

---

## User Report

```markdown
## Code Quality Review Complete

**Capability Type:** {type}

**Stage 1 (Spec Compliance):** SPEC_COMPLIANT

- All requirements implemented
- No deviations from architecture

**Stage 2 (Quality + Security):**

- Quality: APPROVED (score: 85/100)
- Backend: APPROVED (score: 82/100) # if applicable
- Security: APPROVED (0 vulnerabilities) # if applicable

**Review Outputs:**

- spec-compliance-review.md
- code-quality-review.md
- security-review.md

→ Proceeding to Phase 12: Test Planning
```

---

## Retry Protocol

**Stage 1 Fix Loop:**

- MAX 3 retries for spec compliance issues
- Track in MANIFEST: `review.stage1.retry_count`
- After max retries: escalate via AskUserQuestion

**Stage 2 Fix Loop:**

- MAX 3 retries for quality issues
- Track in MANIFEST: `review.stage2.retry_count`
- After max retries: escalate via AskUserQuestion

**Fix loop pattern:**

1. Re-spawn capability-developer with reviewer feedback
2. Re-run applicable stage review
3. Increment retry counter

---

## Skip Conditions

| Work Type | Stage 1        | Stage 2 |
| --------- | -------------- | ------- |
| BUGFIX    | Skip (no plan) | Run     |
| SMALL     | Skip (no plan) | Run     |
| MEDIUM    | Run            | Run     |
| LARGE     | Run            | Run     |

---

## Common Issues

### "Reviewers disagree on severity"

**Solution**: Take the more conservative (higher severity) assessment.

### "Developer keeps introducing new issues when fixing"

**Solution**: After retry limit, escalate to user. Do not enter infinite loop.

### "Detection accuracy concerns from security reviewer"

**Solution**: This is CRITICAL for capabilities. May require return to Phase 7 (Architecture) to redesign detection logic.

### "Should I skip Stage 2 for simple VQL changes?"

**Answer**: No. Stage 2 runs sequentially, adding minimal overhead. Even simple detection changes can introduce false positives.

---

## Related References

- [Phase 10: Domain Compliance](phase-10-domain-compliance.md) - Previous phase
- [Phase 12: Test Planning](phase-12-test-planning.md) - Next phase
- [Quality Standards](quality-standards.md) - Capability-specific quality metrics
- [prompts/reviewer-prompt.md](prompts/reviewer-prompt.md) - Reviewer prompt template
