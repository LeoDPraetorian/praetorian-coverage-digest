# Critical Rules

## Parallel Execution is MANDATORY

**Phase 3 (Architecture):** Spawn mcp-tool-lead + security-lead in SINGLE message
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
    "next_agent": "mcp-tool-developer" | "mcp-tool-reviewer" | "mcp-tool-tester",
    "context": "Key decisions, blockers, or requirements for next phase"
  }
}
```

The orchestrator uses this to:

- Track phase completion in metadata.json
- Pass context to next agent
- Detect when to escalate (blocked status)
- Trigger feedback loops (CHANGES_REQUESTED verdict)
