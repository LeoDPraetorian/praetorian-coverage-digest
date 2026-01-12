# Phase 7: Code Review Process

Two-stage gated code review ensuring spec compliance before quality assessment.

## Overview

Phase 7 implements a two-stage review process:

1. **Stage 1: Spec Compliance (BLOCKING)** - Single agent validates architecture adherence
2. **Stage 2: Quality + Security (PARALLEL)** - Two agents assess code quality and security

**Critical:** Stage 2 cannot begin until Stage 1 verdict is SPEC_COMPLIANT.

## Stage 1: Spec Compliance (BLOCKING)

### Objective

Validate that the wrapper implementation follows the approved shared architecture and tool-specific design exactly.

### Agent

- **mcp-tool-reviewer** (single agent)
- Pattern: Chain-of-thought verification
- MAX_RETRIES: 2 per tool

### Verification Steps (Chain-of-Thought)

The reviewer MUST verify each step explicitly:

```markdown
## Spec Compliance Review: {tool}

### Step 1: Architecture Pattern Match
Q: Does the implementation use the error handling pattern from architecture-shared.md?
A: [YES/NO + evidence]

Q: Does the Zod schema match the design from tools/{tool}/architecture.md?
A: [YES/NO + schema comparison]

Q: Does the response filtering match the token optimization strategy?
A: [YES/NO + field comparison]

### Step 2: Token Budget Compliance
Q: What token reduction was achieved?
A: [raw count vs filtered count]

Q: Does this meet the 80-99% reduction target?
A: [YES/NO + percentage]

### Step 3: Infrastructure Usage
Q: Does the wrapper use response-utils for truncation/filtering?
A: [YES/NO + import check]

Q: Does the wrapper use sanitize.ts for input validation?
A: [YES/NO + Zod schema check]

Q: Does the wrapper use mcp-client.ts for MCP calls?
A: [YES/NO + callMCPTool check]

### Step 4: Security Pattern Match
Q: Are all input fields sanitized per security-assessment.md?
A: [YES/NO + field-by-field check]

Q: Are control characters blocked?
A: [YES/NO + refinement check]

### Step 5: Type Safety
Q: Are all types explicitly defined (no `any`)?
A: [YES/NO + type check]

Q: Does FilteredResult interface match architecture?
A: [YES/NO + interface comparison]

### Verdict
[SPEC_COMPLIANT | SPEC_VIOLATION]

### Issues (if SPEC_VIOLATION)
1. [Specific issue with file:line]
2. [Specific issue with file:line]
```

### Verdict Options

- **SPEC_COMPLIANT**: Implementation matches architecture - proceed to Stage 2
- **SPEC_VIOLATION**: Implementation deviates from architecture - send back to mcp-tool-developer

### Gate Enforcement

```typescript
if (stage1_verdict !== 'SPEC_COMPLIANT') {
  // Send back to mcp-tool-developer
  Task(subagent_type: 'mcp-tool-developer', prompt: 'Fix spec violations in {tool}.

  Review feedback: [attach tools/{tool}/review-stage1.md]
  Architecture: [attach tools/{tool}/architecture.md]
  Shared patterns: [attach architecture-shared.md]

  Fix and resubmit.')

  // Re-review after fix (MAX_RETRIES: 2)
  if (retry_count < 2) {
    Task(subagent_type: 'mcp-tool-reviewer', prompt: 'Re-review {tool} spec compliance.')
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

1. **mcp-tool-reviewer** (quality assessment)
   - Pattern: Two-pass self-consistency
   - Focus: Code quality, maintainability, TypeScript best practices

2. **security-lead** (threat analysis)
   - Pattern: Chain-of-thought threat modeling
   - Focus: Security vulnerabilities, input validation, data exposure

### Execution

Both agents spawn in SINGLE message (parallel execution):

```typescript
// Stage 2 can only start if Stage 1 verdict = SPEC_COMPLIANT

Task(subagent_type: 'mcp-tool-reviewer', prompt: 'Quality review for {tool}.

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

### Two-Pass Self-Consistency (mcp-tool-reviewer)

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
if (quality_verdict === 'APPROVED' && security_verdict === 'APPROVED') {
  overall_verdict = 'APPROVED'
} else if (quality_verdict === 'BLOCKED' || security_verdict === 'BLOCKED') {
  overall_verdict = 'BLOCKED'
} else {
  overall_verdict = 'CHANGES_REQUESTED'
}
```

### Retry Logic (MAX 1 RETRY)

Stage 2 allows 1 retry per tool:

```typescript
if (overall_verdict === 'CHANGES_REQUESTED') {
  if (retry_count === 0) {
    // First retry: Fix and re-review
    Task(subagent_type: 'mcp-tool-developer', prompt: 'Fix quality/security issues in {tool}.

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

Phase 7 processes tools in batches (same as Phase 6):

```typescript
// Example: Batch 1 = ['get-issue', 'list-issues', 'create-issue']

for (const tool of batch) {
  // Stage 1: Sequential per tool (blocking)
  await stage1_review(tool)

  if (stage1_verdict === 'SPEC_COMPLIANT') {
    // Stage 2: Parallel (quality + security)
    await stage2_review(tool)
  }
}

// Update metadata.json after batch completes
```

## Review Checklist

### Stage 1: Spec Compliance

- [ ] Error handling pattern matches architecture-shared.md
- [ ] Zod schema matches tools/{tool}/architecture.md
- [ ] Response filtering achieves 80-99% token reduction
- [ ] Uses response-utils (not manual string manipulation)
- [ ] Uses sanitize.ts validators in Zod schema
- [ ] Uses mcp-client.ts for MCP calls
- [ ] FilteredResult interface matches architecture
- [ ] No `any` types
- [ ] Security sanitization per security-assessment.md

### Stage 2: Quality

- [ ] No barrel file anti-patterns
- [ ] TSDoc documentation present and complete
- [ ] Error handling covers all failure modes
- [ ] Edge cases handled (null, empty, malformed)
- [ ] No hardcoded values (use config)
- [ ] Follows existing wrapper patterns
- [ ] TypeScript strict mode compliant
- [ ] Proper type inference (no redundant type annotations)

### Stage 2: Security

- [ ] All input fields sanitized
- [ ] Control characters blocked via Zod refinements
- [ ] No injection vulnerabilities
- [ ] No path traversal risks
- [ ] No XSS vectors
- [ ] Sensitive data not logged
- [ ] Rate limiting considered
- [ ] Authentication/authorization validated

## Blocked Reviews

If verdict is BLOCKED (critical issues), workflow stops:

```typescript
if (overall_verdict === 'BLOCKED') {
  AskUserQuestion({
    questions: [{
      header: "Critical Issues Detected",
      question: "Tool {tool} has BLOCKING issues:\n\n{issues}\n\nThese require architectural changes or pose critical security risks.",
      options: [
        { label: "Revise architecture", description: "Update architecture to address issues" },
        { label: "Escalate to team", description: "Requires team decision" },
        { label: "Skip tool", description: "Cannot wrap this tool safely" },
      ]
    }]
  })
}
```

## Metadata Updates

Update metadata.json after each tool review:

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

## Example Review Feedback

### Stage 1: SPEC_VIOLATION

```markdown
## Spec Compliance Review: list-issues

### Verdict: SPEC_VIOLATION

### Issues

1. **Error handling pattern mismatch**
   - File: `.claude/tools/linear/list-issues.ts:45-50`
   - Expected: Result<T, E> pattern from architecture-shared.md
   - Actual: try-catch with throw
   - Fix: Wrap in Result.ok() / Result.err()

2. **Response filtering incomplete**
   - File: `.claude/tools/linear/list-issues.ts:72`
   - Expected: 95% token reduction (architecture: 2000 → 100 tokens)
   - Actual: 60% reduction (2000 → 800 tokens)
   - Fix: Apply field whitelist from architecture.md section 3.2

3. **Manual string truncation**
   - File: `.claude/tools/linear/list-issues.ts:68`
   - Expected: truncateForContext() from response-utils
   - Actual: .substring(0, 500)
   - Fix: Import and use response-utils.truncateForContext()
```

### Stage 2: CHANGES_REQUESTED

```markdown
## Quality Review: list-issues

### Pass 1 Issues
1. Missing TSDoc for FilteredIssue interface
2. Hardcoded page size (100)
3. No handling for pagination errors

### Pass 2 Issues
1. TSDoc missing (confirmed)
2. Hardcoded page size (confirmed) - should use config
3. Pagination errors (confirmed) - rate limiting not handled
4. NEW: Type assertion bypasses type safety (line 82)

### Consensus Issues
1. Add TSDoc to FilteredIssue interface
2. Move page size to configuration
3. Handle rate limit errors from pagination
4. Remove type assertion, use proper type guards
```

```markdown
## Security Review: list-issues

### Threat Analysis

#### Injection (SECURE)
No database queries, MCP handles all data access.

#### Path Traversal (N/A)
Tool does not accept file paths.

#### XSS (VULNERABLE)
Output includes issue.description which may contain HTML.
No sanitization before returning to Claude.

**Risk:** High
**Fix:** Sanitize HTML in description field before returning.

#### Control Characters (SECURE)
Zod schema blocks control characters via .refine(noControlChars).

### Verdict: CHANGES_REQUESTED

### Critical Issues
1. XSS risk in issue.description field (HIGH)

### Required Fixes
1. Add HTML sanitization to description field using sanitize.ts
```

## Related References

- [Rationalization Table](rationalization-table.md) - Review-specific rationalizations
- [Checkpoint Configuration](checkpoint-configuration.md) - Escalation triggers
- [Agent Prompts](agent-prompts.md) - Complete reviewer prompts
- [Critical Rules](critical-rules.md) - Review verdict requirements
