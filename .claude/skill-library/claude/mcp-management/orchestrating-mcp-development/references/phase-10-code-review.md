# Phase 9: Code Review Process

Two-stage gated code review ensuring spec compliance before quality assessment.

## Overview

Phase 9 implements a two-stage review process:

1. **Stage 1: Spec Compliance (BLOCKING)** - Single agent validates architecture adherence
2. **Stage 2: Quality + Security (PARALLEL)** - Two agents assess code quality and security

**Critical:** Stage 2 cannot begin until Stage 1 verdict is SPEC_COMPLIANT.

## Stage 1: Spec Compliance (BLOCKING)

### Objective

Validate that the wrapper implementation follows the approved shared architecture and tool-specific design exactly.

### Agent

- **tool-reviewer** (single agent)
- Pattern: Chain-of-thought verification
- MAX_RETRIES: 2 per tool

### Verification Steps (Chain-of-Thought)

The reviewer verifies architecture compliance using a chain-of-thought approach with 5 verification steps.

See [phase-7-checklists.md](phase-7-checklists.md) for the complete Spec Compliance Review template.

### Verdict Options

- **SPEC_COMPLIANT**: Implementation matches architecture - proceed to Stage 2
- **SPEC_VIOLATION**: Implementation deviates from architecture - send back to tool-developer

### Gate Enforcement

```typescript
if (stage1_verdict !== 'SPEC_COMPLIANT') {
  // Send back to tool-developer
  Task(subagent_type: 'tool-developer', prompt: 'Fix spec violations in {tool}.

  Review feedback: [attach tools/{tool}/review-stage1.md]
  Architecture: [attach tools/{tool}/architecture.md]
  Shared patterns: [attach architecture-shared.md]

  Fix and resubmit.')

  // Re-review after fix (MAX_RETRIES: 2)
  if (retry_count < 2) {
    Task(subagent_type: 'tool-reviewer', prompt: 'Re-review {tool} spec compliance.')
  } else {
    // Escalate after 2 retries
    AskUserQuestion({
      questions: [{
        header: "Spec Compliance Blocked",
        question: "Tool {tool} failed spec compliance after 2 retries. How to proceed?",
        options: [
          { label: "Manual review", description: "I'll review and fix manually" },
          { label: "Adjust architecture", description: "Architecture needs revision" },
          { label: "Skip tool", description: "Defer this tool for now" },
        ]
      }]
    })
  }
}
```

### Output

Save Stage 1 review:

```
tools/{tool}/review-stage1.md
```

## Stage 2: Quality + Security (PARALLEL)

### Objective

Assess code quality, maintainability, and security threats in parallel.

### Agents

1. **tool-reviewer** (quality assessment)
   - Pattern: Two-pass self-consistency
   - Focus: Code quality, maintainability, TypeScript best practices

2. **security-lead** (threat analysis)
   - Pattern: Chain-of-thought threat modeling
   - Focus: Security vulnerabilities, input validation, data exposure

### Execution

Both agents spawn in SINGLE message (parallel execution):

```typescript
// Stage 2 can only start if Stage 1 verdict = SPEC_COMPLIANT

Task(subagent_type: 'tool-reviewer', prompt: 'Quality review for {tool}.

Stage 1 verdict: SPEC_COMPLIANT

This is Stage 2: Quality assessment using two-pass self-consistency.

Pass 1: Identify quality issues
Pass 2: Validate findings from different perspective

Review:
- Code quality and maintainability
- TypeScript best practices
- Barrel file anti-patterns (avoiding-barrel-files skill)
- TSDoc documentation (documenting-with-tsdoc skill)
- Error handling completeness
- Edge case handling
- Test coverage adequacy

Output: tools/{tool}/review-quality.md
Verdict: APPROVED | CHANGES_REQUESTED | BLOCKED', run_in_background: true)

Task(subagent_type: 'security-lead', prompt: 'Security review for {tool}.

Stage 1 verdict: SPEC_COMPLIANT

This is Stage 2: Threat analysis using chain-of-thought.

Analyze:
- Input validation completeness
- Injection attack vectors
- Path traversal risks
- XSS vulnerabilities
- Control character handling
- Data exposure risks
- Authentication/authorization bypass

Output: tools/{tool}/review-security.md
Verdict: APPROVED | CHANGES_REQUESTED | BLOCKED', run_in_background: true)
```

### Two-Pass Self-Consistency (tool-reviewer)

The reviewer performs TWO independent passes:

```markdown
## Quality Review: {tool}

### Pass 1: Issue Identification

[Review from maintainability perspective]

Issues found:

1. [Issue]
2. [Issue]

### Pass 2: Validation

[Review from different angle - performance, readability, extensibility]

Confirmed issues:

1. [Issue from Pass 1 - confirmed]
2. [New issue found in Pass 2]

Discarded issues:

- [Issue from Pass 1 that Pass 2 contradicts]

### Consensus

Final issues (both passes agree):

1. [Issue]
2. [Issue]
```

### Chain-of-Thought Threat Analysis (security-lead)

Security lead follows structured threat analysis:

```markdown
## Security Review: {tool}

### Threat 1: SQL/NoSQL Injection

Q: Can user input reach database queries?
A: [YES/NO + analysis]

Q: Are inputs parameterized/sanitized?
A: [YES/NO + code reference]

Verdict: [SECURE | VULNERABLE]

### Threat 2: Path Traversal

Q: Does tool accept file paths?
A: [YES/NO + analysis]

Q: Are paths validated against traversal?
A: [YES/NO + code reference]

Verdict: [SECURE | VULNERABLE]

### Threat 3: XSS

Q: Is output HTML-rendered anywhere?
A: [YES/NO + analysis]

Q: Are outputs sanitized/escaped?
A: [YES/NO + code reference]

Verdict: [SECURE | VULNERABLE]

### Threat 4: Control Character Injection

Q: Are control characters blocked?
A: [YES/NO + Zod refinement check]

Verdict: [SECURE | VULNERABLE]

### Overall Assessment

Critical vulnerabilities: [count]
High-risk issues: [count]
Medium-risk issues: [count]

Verdict: [APPROVED | CHANGES_REQUESTED | BLOCKED]
```

### Verdict Consolidation

Tool passes Stage 2 only if BOTH agents approve:

```typescript
if (quality_verdict === "APPROVED" && security_verdict === "APPROVED") {
  overall_verdict = "APPROVED";
} else if (quality_verdict === "BLOCKED" || security_verdict === "BLOCKED") {
  overall_verdict = "BLOCKED";
} else {
  overall_verdict = "CHANGES_REQUESTED";
}
```

### Retry Logic (MAX 1 RETRY)

Stage 2 allows 1 retry per tool:

```typescript
if (overall_verdict === 'CHANGES_REQUESTED') {
  if (retry_count === 0) {
    // First retry: Fix and re-review
    Task(subagent_type: 'tool-developer', prompt: 'Fix quality/security issues in {tool}.

    Quality feedback: [attach tools/{tool}/review-quality.md]
    Security feedback: [attach tools/{tool}/review-security.md]

    Fix and resubmit.')

    // Re-run Stage 2 (not Stage 1)
    [spawn both agents again in parallel]
  } else {
    // After 1 retry: Escalate
    AskUserQuestion({
      questions: [{
        header: "Code Review Blocked",
        question: "Tool {tool} failed review after 1 retry. Issues:\n\n{quality_issues}\n{security_issues}\n\nHow to proceed?",
        options: [
          { label: "Manual fix", description: "I'll fix these issues manually" },
          { label: "Accept with risks", description: "Proceed despite issues (document risks)" },
          { label: "Skip tool", description: "Defer this tool for now" },
        ]
      }]
    })
  }
}
```

### Output

Save Stage 2 reviews:

```
tools/{tool}/review-quality.md
tools/{tool}/review-security.md
tools/{tool}/review-final.md  # Consolidated verdict
```

## Batch Processing

Phase 9 processes tools in batches (same as Phase 6):

```typescript
// Example: Batch 1 = ['get-issue', 'list-issues', 'create-issue']

for (const tool of batch) {
  // Stage 1: Sequential per tool (blocking)
  await stage1_review(tool);

  if (stage1_verdict === "SPEC_COMPLIANT") {
    // Stage 2: Parallel (quality + security)
    await stage2_review(tool);
  }
}

// Update MANIFEST.yaml after batch completes
```

## Blocked Reviews

If verdict is BLOCKED (critical issues), workflow stops:

```typescript
if (overall_verdict === "BLOCKED") {
  AskUserQuestion({
    questions: [
      {
        header: "Critical Issues Detected",
        question:
          "Tool {tool} has BLOCKING issues:\n\n{issues}\n\nThese require architectural changes or pose critical security risks.",
        options: [
          { label: "Revise architecture", description: "Update architecture to address issues" },
          { label: "Escalate to team", description: "Requires team decision" },
          { label: "Skip tool", description: "Cannot wrap this tool safely" },
        ],
      },
    ],
  });
}
```

## Metadata Updates

Update MANIFEST.yaml after each tool review:

```json
{
  "per_tool": {
    "get-issue": {
      "review": {
        "status": "complete",
        "stage1_verdict": "SPEC_COMPLIANT",
        "stage2_quality_verdict": "APPROVED",
        "stage2_security_verdict": "APPROVED",
        "overall_verdict": "APPROVED",
        "retry_count": 0
      }
    },
    "list-issues": {
      "review": {
        "status": "complete",
        "stage1_verdict": "SPEC_COMPLIANT",
        "stage2_quality_verdict": "CHANGES_REQUESTED",
        "stage2_security_verdict": "APPROVED",
        "overall_verdict": "CHANGES_REQUESTED",
        "retry_count": 1
      }
    }
  }
}
```

## Related References

- [Phase 9: Checklists](phase-7-checklists.md) - Complete review checklists for all stages
- [Phase 9: Review Examples](phase-7-examples.md) - Example review feedback and verdicts
- [Rationalization Table](rationalization-table.md) - Review-specific rationalizations
- [Checkpoint Configuration](checkpoint-configuration.md) - Escalation triggers
- [Critical Rules](critical-rules.md) - Review verdict requirements
