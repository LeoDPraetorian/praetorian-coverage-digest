# Phase 9: Code Review (BATCHED, MAX 1 RETRY PER TOOL)

Review ALL wrappers in batches.

**For each batch of tools:**

```typescript
Task(subagent_type: 'tool-reviewer', prompt: 'Review get-issue wrapper.

Shared patterns: [attach architecture-shared.md]
Tool architecture: [attach tools/get-issue/architecture.md]
Implementation: [attach .claude/tools/{service}/get-issue.ts]

Checklist:
- Follows shared patterns
- Token optimization matches architecture
- Security sanitization implemented
- Uses infrastructure (response-utils, sanitize.ts)

Output: .claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{service}/tools/get-issue/review.md
Verdict: APPROVED | CHANGES_REQUESTED | BLOCKED')
```

**Retry Logic:** If CHANGES_REQUESTED for a tool:

1. tool-developer fixes that specific tool
2. tool-reviewer re-reviews ONCE
3. If still failing, escalate via AskUserQuestion

Update `MANIFEST.yaml`:

```json
{
  "per_tool": {
    "get-issue": {
      "review": { "status": "complete", "verdict": "APPROVED" }
    }
  }
}
```

**tool-reviewer MUST load:**

- .claude/skill-library/development/typescript/avoiding-barrel-files/SKILL.md
- .claude/skill-library/development/typescript/documenting-with-tsdoc/SKILL.md

**Review checklist:**

- [ ] Token optimization matches architecture (80-99% reduction)
- [ ] Error handling follows designed pattern
- [ ] Input validation matches Zod schema design
- [ ] Security sanitization implemented
- [ ] No barrel file anti-patterns
- [ ] TSDoc documentation present
- [ ] No hardcoded values
- [ ] Uses response-utils for truncation/filtering (not manual substring)
- [ ] Uses sanitize.ts validators in Zod schema (not custom regex)
- [ ] Imports from @claude/testing in test file (not manual mocks)
- [ ] Follows existing wrapper patterns from .claude/tools/

**Verdict:** APPROVED | CHANGES_REQUESTED | BLOCKED

**Output:** `tools/{tool}/review.md` for each tool (all must be APPROVED)

For complete tool-reviewer prompt, see [../agent-prompts.md](../agent-prompts.md#tool-reviewer).

> **Abort Handling**: If workflow must be aborted mid-batch, see ../troubleshooting.md emergency abort section.
