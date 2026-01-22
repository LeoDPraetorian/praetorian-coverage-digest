# Phase 8: Implementation (BATCHED)

Implement ALL wrappers in batches.

**For each batch of tools:**

```typescript
// Batch 1: ['get-issue', 'list-issues', 'create-issue']

Task(subagent_type: 'tool-developer', prompt: 'Implement get-issue wrapper.

Shared patterns: [attach architecture-shared.md]
Tool architecture: [attach tools/get-issue/architecture.md]
Security assessment: [attach security-assessment.md]

Requirements:
- Follow shared patterns exactly
- Implement tool-specific schema from architecture.md
- Use response-utils, sanitize.ts, mcp-client.ts

Output: .claude/tools/{service}/get-issue.ts')

// Spawn similar for list-issues, create-issue in same message
```

Update `MANIFEST.yaml` after each batch:

```json
{
  "per_tool": {
    "get-issue": { "implementation": "complete" },
    "list-issues": { "implementation": "complete" }
  }
}
```

**tool-developer implements wrapper:**

1. Create InputSchema (Zod) per architecture
2. Create FilteredResult interface per token strategy
3. Implement execute() function
4. Add error handling per designed pattern
5. Add security validation per assessment

**Output:** `.claude/tools/{service}/{tool}.ts` for each tool

For implementation checklist, see [../implementation-checklist.md](../implementation-checklist.md).

> **Abort Handling**: If workflow must be aborted mid-batch, see ../troubleshooting.md emergency abort section.
