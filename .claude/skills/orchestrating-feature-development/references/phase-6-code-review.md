# Phase 6: Code Review

Review implementation by spawning code reviewer + security reviewer agents in parallel. Includes explicit feedback loop with MAX 1 RETRY before escalating to user.

## Purpose

Validate implementation quality before testing by:

- Reviewing code quality and best practices (code reviewer)
- Identifying security vulnerabilities (security reviewer)
- Ensuring architecture adherence
- Providing actionable feedback for developer

## Why Parallel Code + Security Review?

**Code Reviewer** (frontend-reviewer or backend-reviewer) focuses on:

- Plan adherence
- Code quality (component size, types, imports)
- React 19 / Go best practices
- Performance implications
- Maintainability

**Security Reviewer** (frontend-security or backend-security) focuses on:

- XSS vulnerabilities
- Auth/authz implementation
- Input validation
- Sensitive data handling
- OWASP Top 10 compliance

**Together**: Comprehensive validation that catches both quality issues AND security vulnerabilities before testing.

## Workflow

### Step 1: Determine Reviewer Types

Based on feature domain:

| Feature Type | Code Reviewer       | Security Reviewer       | Total |
| ------------ | ------------------- | ----------------------- | ----- |
| Frontend     | `frontend-reviewer` | `frontend-security`     | 2     |
| Backend      | `backend-reviewer`  | `backend-security`      | 2     |
| Full-stack   | Both code reviewers | Both security reviewers | 4     |

### Step 2: Spawn All Reviewers in Parallel

**CRITICAL:** Spawn ALL reviewers in a SINGLE message.

#### Frontend Feature Pattern

```
Task(
  subagent_type: "frontend-reviewer",
  description: "Review {feature-name} implementation",
  prompt: "Review implementation against architecture plan:

Architecture: {content from .claude/features/{id}/architecture.md}
Files modified: {from implementation-log.md}

CHECK:
- Plan adherence
- Code quality (component size <300 lines, proper types)
- React 19 best practices
- Performance implications
- Import organization

DELIVERABLE:
Save review to: .claude/features/{id}/review.md

Return JSON:
{
  'status': 'complete',
  'verdict': 'APPROVED|CHANGES_REQUESTED|BLOCKED',
  'summary': 'What was reviewed',
  'issues': [
    { 'severity': 'high|medium|low', 'file': 'path', 'description': '...' }
  ],
  'recommendations': ['improvement 1', 'improvement 2']
}
"
)

Task(
  subagent_type: "frontend-security",
  description: "Security review {feature-name}",
  prompt: "Security review implementation:

Security requirements: {from .claude/features/{id}/security-assessment.md}
Files modified: {from implementation-log.md}

CHECK:
- XSS vulnerabilities
- Auth/authz implementation
- Input validation
- Sensitive data handling
- CSRF protection

DELIVERABLE:
Save review to: .claude/features/{id}/security-review.md

Return JSON:
{
  'status': 'complete',
  'verdict': 'APPROVED|CHANGES_REQUESTED|BLOCKED',
  'summary': 'What was reviewed',
  'security_findings': [
    { 'severity': 'critical|high|medium|low', 'type': 'XSS|AUTH|...', 'file': 'path', 'description': '...' }
  ]
}
"
)
```

### Step 3: Wait for All Reviewers

All reviewers run in parallel. Wait for ALL to complete.

### Step 4: Evaluate Verdicts

Check verdicts from all reviewers:

```python
# Pseudocode
code_verdict = code_reviewer.verdict
security_verdict = security_reviewer.verdict

if code_verdict == "APPROVED" and security_verdict == "APPROVED":
    # SUCCESS - Proceed to Phase 7
    proceed_to_testing()
elif any_verdict == "BLOCKED":
    # BLOCKER - Escalate immediately
    escalate_to_user()
else:
    # CHANGES_REQUESTED - Enter feedback loop
    enter_feedback_loop()
```

### Step 5: Feedback Loop (MAX 1 RETRY)

If ANY reviewer returned `verdict: "CHANGES_REQUESTED"`:

#### Retry #1: Developer Fixes

1. **Compile all feedback:**

   ```markdown
   # Review Feedback for {feature-name}

   ## Code Review Issues

   {from review.md}

   ## Security Issues

   {from security-review.md}
   ```

2. **Spawn developer to fix:**

   ```
   Task(
     subagent_type: "frontend-developer",
     description: "Fix review feedback for {feature-name}",
     prompt: "Fix the following review feedback:

   FEEDBACK:
   {compiled feedback from both reviews}

   ORIGINAL ARCHITECTURE:
   {architecture.md content}

   Fix all issues and return updated implementation.
   "
   )
   ```

3. **Re-spawn reviewers (retry #1):**

   ```
   # Increment retry_count in metadata.json
   Task(subagent_type: "frontend-reviewer", ...)
   Task(subagent_type: "frontend-security", ...)
   ```

4. **Re-evaluate verdicts**

#### After Retry #1: Escalate if Still Failing

If ANY reviewer STILL returns `verdict: "CHANGES_REQUESTED"` after retry:

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Reviews still failing after 1 retry. How should we proceed?",
      header: "Review",
      multiSelect: false,
      options: [
        {
          label: "Show me the issues",
          description: "Display remaining review feedback",
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
    },
  ],
});
```

**Do NOT retry more than once.** Escalate to user.

### Step 6: Update Progress

```json
{
  "phases": {
    "review": {
      "status": "complete",
      "retry_count": 1,
      "agents_used": ["frontend-reviewer", "frontend-security"],
      "outputs": {
        "review": ".claude/features/{id}/review.md",
        "security_review": ".claude/features/{id}/security-review.md"
      },
      "verdicts": {
        "code": "APPROVED",
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

### Step 7: Mark TodoWrite Complete

```
TodoWrite: Mark "Phase 6: Code Review" as completed
TodoWrite: Mark "Phase 7: Test Planning" as in_progress
```

## Exit Criteria

✅ Proceed to Phase 7 (Test Planning) when:

- ALL reviewers returned `verdict: "APPROVED"`
- OR user explicitly approved despite issues
- Review files saved (review.md, security-review.md)
- Progress file updated
- TodoWrite marked complete

❌ Do NOT proceed if:

- Any reviewer returned `verdict: "BLOCKED"`
- CHANGES_REQUESTED after retry without user approval
- Security findings with severity "critical" unaddressed

## Full-Stack Features

Spawn ALL FOUR reviewers in parallel:

```
# Single message with all four reviewers
Task(subagent_type: "frontend-reviewer", ...)
Task(subagent_type: "frontend-security", ...)
Task(subagent_type: "backend-reviewer", ...)
Task(subagent_type: "backend-security", ...)
```

**Outputs:**

- `.claude/features/{id}/review.md` (frontend code review)
- `.claude/features/{id}/security-review.md` (frontend security)
- `.claude/features/{id}/backend-review.md` (backend code review)
- `.claude/features/{id}/backend-security-review.md` (backend security)

**Feedback loop for full-stack**: If issues exist in BOTH domains:

- Spawn BOTH developers to fix in parallel
- Re-spawn ALL FOUR reviewers

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

- [Phase 5: Implementation](phase-5-implementation.md) - Previous phase
- [Phase 7: Test Planning](phase-7-test-planning.md) - Next phase
- [Agent Handoffs](agent-handoffs.md) - JSON handoff format
- [Troubleshooting](troubleshooting.md) - Common issues
