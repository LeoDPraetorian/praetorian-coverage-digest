# Clarification Protocol

Extended examples of handling agent clarification requests in multi-agent workflows.

## Overview

The clarification protocol distinguishes between "I'm stuck" (`blocked`) and "I need input" (`needs_clarification`). Agents request clarification when they have specific questions that, once answered, allow them to proceed.

---

## Navigation

This document is split for progressive loading. Load sections as needed:

| Section          | File                                                                     | Content                                                                     |
| ---------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Main (this file) | clarification-protocol.md                                                | Overview, status comparison, format, categories, summary                    |
| Examples         | [clarification-protocol-examples.md](clarification-protocol-examples.md) | 4 detailed workflow examples (requirement, dependency, architecture, scope) |
| Advanced         | [clarification-protocol-advanced.md](clarification-protocol-advanced.md) | Mixed questions, clarification vs blocked, anti-patterns                    |

---

## Status Comparison

| Status                | Meaning                                            | Orchestrator Action                      |
| --------------------- | -------------------------------------------------- | ---------------------------------------- |
| `blocked`             | Cannot proceed, need different agent               | Route to next agent via routing table    |
| `needs_clarification` | Have specific questions, can proceed once answered | Answer questions, re-dispatch same agent |
| `needs_review`        | Work done, want human validation                   | Present to user                          |
| `complete`            | Task finished successfully                         | Mark complete, proceed                   |

## Clarification Request Format

```json
{
  "status": "needs_clarification",
  "questions": [
    {
      "category": "requirement|dependency|architecture|scope",
      "question": "Specific question text",
      "options": ["Option A", "Option B"],
      "impact": "Why this matters for the task"
    }
  ],
  "partial_work": "What agent completed before needing clarification"
}
```

## Question Categories

### requirement

Questions about what the user wants.

**Example**:

```json
{
  "category": "requirement",
  "question": "Should the filter dropdown show all statuses or only active ones?",
  "options": ["All statuses", "Only active statuses"],
  "impact": "Affects UX and data loading performance"
}
```

**Orchestrator action**: Use `AskUserQuestion` to get user's decision

### dependency

Questions about technical dependencies or system state.

**Example**:

```json
{
  "category": "dependency",
  "question": "Does the backend /assets endpoint support status filtering?",
  "options": ["Yes", "No", "Unknown - need to check"],
  "impact": "May need backend work first or client-side filtering"
}
```

**Orchestrator action**: Research codebase, read API documentation

### architecture

Questions about design decisions that need architect input.

**Example**:

```json
{
  "category": "architecture",
  "question": "Should we use Zustand for filter state or keep it local?",
  "options": ["Zustand (global)", "Local state", "Query params"],
  "impact": "Affects state management complexity and URL sharing"
}
```

**Orchestrator action**: Spawn architect lead agent to decide

### scope

Questions about what's in/out of scope for the task.

**Example**:

```json
{
  "category": "scope",
  "question": "Should I also add sorting to the table while implementing filters?",
  "options": ["Yes, add sorting", "No, filters only"],
  "impact": "Increases implementation time by ~30%"
}
```

**Orchestrator action**: Check plan.md, ask user if unclear

---

## Summary

**Use `needs_clarification` when:**

- Agent has specific questions
- Questions, once answered, unblock agent
- Categories: requirement, dependency, architecture, scope

**Orchestrator response by category:**

- `requirement` → AskUserQuestion
- `dependency` → Research codebase
- `architecture` → Spawn architect lead
- `scope` → Check plan, ask user if unclear

**Format requirements:**

- Specific question text
- 2-4 concrete options
- Impact statement (why it matters)
- Max 3-4 questions per request

**Re-dispatch format:**

```
CLARIFICATION ANSWERS:
Q1: [question]
→ A1: [answer with context]

Q2: [question]
→ A2: [answer with context]

Now proceed with original task using these answers.

[Original task context]
```

---

## Next Steps

- **For detailed examples**: See [clarification-protocol-examples.md](clarification-protocol-examples.md)
- **For advanced patterns**: See [clarification-protocol-advanced.md](clarification-protocol-advanced.md)
