# Critical Rules

## Parallel Execution is MANDATORY

**Phase 3 (Architecture):** Spawn tool-lead + security-lead in SINGLE message
**Phase 8 (Review):** Can add parallel security review if needed

**DO NOT spawn sequentially when parallel is possible.**

## Human Checkpoint is MANDATORY

After Phase 3, you MUST use AskUserQuestion to get architecture approval:

```yaml
AskUserQuestion:
  questions:
    - header: "Architecture"
      question: "Approve the wrapper architecture design?"
      multiSelect: false
      options:
        - label: "Approve"
          description: "Proceed with implementation"
        - label: "Request Changes"
          description: "Modify architecture first"
```

## CLI Gates are NON-NEGOTIABLE

- Phase 6 (RED): Tests must fail
- Phase 9 (GREEN): Tests must pass with ≥80% coverage
- Phase 10 (Audit): ≥10/11 phases must pass

**Cannot proceed without passing gates.**

## Feedback Loop: MAX 1 Retry

Phase 8 code review: If CHANGES_REQUESTED, fix and re-review ONCE. After 1 retry, escalate to user via AskUserQuestion.

## Structured Handoff Format

All Task agents must return structured JSON for orchestrator parsing:

```json
{
  "status": "complete" | "blocked" | "needs_review",
  "summary": "1-2 sentence description of what was accomplished",
  "files_created": ["path/to/file1.ts", "path/to/file2.ts"],
  "verdict": "APPROVED" | "CHANGES_REQUESTED" | "BLOCKED",
  "handoff": {
    "next_agent": "tool-developer" | "tool-reviewer" | "tool-tester",
    "context": "Key decisions, blockers, or requirements for next phase"
  }
}
```

The orchestrator uses this to:

- Track phase completion in metadata.json
- Pass context to next agent
- Detect when to escalate (blocked status)
- Trigger feedback loops (CHANGES_REQUESTED verdict)

## Blocked Agent Routing

When agent returns `status: "blocked"` with `blocked_reason`, route per this table:

| Blocked Reason            | Route To               | Action                           |
| ------------------------- | ---------------------- | -------------------------------- |
| security_concern          | security-lead          | Re-assess security requirements  |
| architecture_decision     | tool-lead          | Clarify architecture             |
| missing_requirements      | AskUserQuestion        | Get user input                   |
| test_failures             | tool-tester        | Debug test issues                |
| out_of_scope              | AskUserQuestion        | Confirm scope                    |
| schema_discovery_failed   | tool-lead          | Alternative discovery approach   |
| unknown                   | AskUserQuestion        | Manual assessment                |

**Critical Rules:**
- Do NOT try to fix agent's work manually
- Do NOT ask blocked agent to continue
- Spawn NEW agent with resolution context
- Include full context from artifacts (architecture.md, schema-discovery.md)
