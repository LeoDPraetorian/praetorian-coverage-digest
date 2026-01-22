# Critical Rules

## Inherits From

- `orchestrating-multi-agent-workflows/references/orchestration-guards.md` (retry limits, escalation protocol, rationalization prevention)

This document extends core orchestration guards with MCP-specific rules. For foundational retry limits, escalation menus, and rationalization patterns, see the core guards document.

## Parallel Execution is MANDATORY

**Phase 5 (Architecture):** Spawn tool-lead + security-lead in SINGLE message
**Phase 10 (Code Review):** Can add parallel security review if needed

**DO NOT spawn sequentially when parallel is possible.**

## Human Checkpoints are MANDATORY

**Phase 2 (Brainstorming):** Get design approval for tool requirements and token optimization goals
**Phase 4 (Planning):** Get approval for implementation plan covering all tool wrappers
**Phase 5 (Architecture):** Get architecture approval before implementation begins

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

- Phase 7 (Test Planning): Tests must fail (RED phase of TDD)
- Phase 11 (Testing): Tests must pass with ≥80% coverage (GREEN phase of TDD)
- Phase 12 (Audit): ≥10/11 phases must pass

**Cannot proceed without passing gates.**

## Retry Limits

> **Retry Limits**: Uses `inter_phase` limits from `.claude/config/orchestration-limits.yaml`. MCP workflow uses 1 retry for code review (Phase 10) per tool before escalation.

**MCP-Specific Override Rationale**: MCP tool wrappers are simpler than full-stack features (typical wrapper: 100-200 lines). Code review cycles converge faster. Using 1 retry instead of the core default (2 retries) prevents over-iteration on minor style issues while maintaining quality gates.

> **Escalation Protocol**: See orchestration-guards.md for full escalation menu (Show issues / Proceed anyway / Revise approach / Cancel). MCP-specific triggers below.

**Phase 12 (Code Review) Escalation Triggers:**

- After 1 retry with CHANGES_REQUESTED
- Security concerns flagged by tool-reviewer
- Architecture mismatch detected

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

- Track phase completion in MANIFEST.yaml
- Pass context to next agent
- Detect when to escalate (blocked status)
- Trigger feedback loops (CHANGES_REQUESTED verdict)

## Blocked Agent Routing

When agent returns `status: "blocked"` with `blocked_reason`, route per this table:

| Blocked Reason          | Route To        | Action                          |
| ----------------------- | --------------- | ------------------------------- |
| security_concern        | security-lead   | Re-assess security requirements |
| architecture_decision   | tool-lead       | Clarify architecture            |
| missing_requirements    | AskUserQuestion | Get user input                  |
| test_failures           | tool-tester     | Debug test issues               |
| out_of_scope            | AskUserQuestion | Confirm scope                   |
| schema_discovery_failed | tool-lead       | Alternative discovery approach  |
| unknown                 | AskUserQuestion | Manual assessment               |

**Critical Rules:**

- Do NOT try to fix agent's work manually
- Do NOT ask blocked agent to continue
- Spawn NEW agent with resolution context
- Include full context from artifacts (architecture.md, schema-discovery.md)
