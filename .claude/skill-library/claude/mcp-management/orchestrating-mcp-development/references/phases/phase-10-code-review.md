# Phase 12: Code Review

Batched execution (3-5 tools per batch):

- Spawn tool-reviewer for each tool
- Two-stage review:
  - Stage 1: Spec compliance (architecture requirements)
  - Stage 2: Code quality (TypeScript, patterns, security)

**Retry Limit:** Max 1 retry per tool before escalation

**Output:**

- tools/{tool}/review.md
