# Checkpoint Configuration

Human approval and progress reporting at strategic points to ensure alignment and catch issues early.

## Inherits From

This file extends checkpoint patterns from:

- `orchestrating-multi-agent-workflows/references/checkpoint-configuration.md` (checkpoint primitives, formats)
- `orchestrating-multi-agent-workflows/references/orchestration-guards.md` (threshold definitions)

See those files for base checkpoint mechanics and retry limits. This file provides MCP-specific extensions and overrides.

## Overview

Checkpoints in MCP development workflows serve three purposes:

1. **Alignment Checkpoints**: Ensure architecture matches user needs
2. **Progress Checkpoints**: Report status for large services (15+ tools)
3. **Issue Checkpoints**: Mandatory escalation when retry limits exceeded

## Phase-Level Checkpoints (Default)

Human approval required at:

### Phase 5: Shared Architecture

**When:** After both agents (tool-lead + security-lead) complete

**Trigger:** Always required (applies to all service sizes)

**Purpose:** Ensure shared patterns align with user needs before implementing 15+ tools

**Format:**

```typescript
AskUserQuestion({
  questions: [
    {
      header: "Shared Architecture Approval",
      question:
        "Review shared architecture for {service} MCP wrappers.\n\n**Tools to wrap:** {N} tools\n\n**Key decisions:**\n- Token optimization: {strategy}\n- Error handling: {pattern}\n- Response filtering: {approach}\n- Security validation: {layers}\n\nApprove these patterns for ALL {N} tools?",
      multiSelect: false,
      options: [
        {
          label: "Approve",
          description: "Proceed with this shared architecture",
        },
        {
          label: "Request changes",
          description: "I have feedback on the patterns",
        },
        {
          label: "Show details",
          description: "View full architecture documentation",
        },
      ],
    },
  ],
});
```

**Attachments to provide:**

- `architecture-shared.md`
- `security-assessment.md`
- Summary of tools to be wrapped

**Handling responses:**

- **Approve**: Proceed to Phase 4
- **Request changes**: Spawn tool-lead again with feedback
- **Show details**: Display full architecture files, then re-ask

**Why critical:** Architecture misalignment affects ALL tools in the service. Catching issues here prevents rework on 15+ wrappers.

## Batch-Level Checkpoints (For Large Services)

When service has **>15 tools**, add progress reports during implementation.

### Trigger Conditions

> **Batch Sizing & Thresholds**: See `orchestrating-multi-agent-workflows/references/checkpoint-configuration.md` for base batch sizing patterns and `orchestrating-multi-agent-workflows/references/orchestration-guards.md` for retry thresholds. MCP-specific batch sizes below:

| Service Size | Batch Size | Checkpoint Frequency        |
| ------------ | ---------- | --------------------------- |
| 5-10 tools   | 5 tools    | After completion (Phase 12) |
| 11-15 tools  | 4 tools    | After Phase 9 (all tools)   |
| 16-20 tools  | 4 tools    | Every 8 tools (2 batches)   |
| 21-30 tools  | 3 tools    | Every 6 tools (2 batches)   |
| 31+ tools    | 3 tools    | Every 9 tools (3 batches)   |

### Progress Report Format

```markdown
## MCP Development Progress Report

**Service:** {service}
**Tools Total:** {N}
**Completed:** {M} of {N} tools ({percentage}%)
**Status:** On track / Issues detected

---

### Completed Tools (Batch {X})

| Tool         | Phase 6 | Phase 7 | Phase 8 | Phase 9       | Status      |
| ------------ | ------- | ------- | ------- | ------------- | ----------- |
| get-issue    | ✓       | ✓       | ✓       | ✓ (0 retries) | ✅ APPROVED |
| list-issues  | ✓       | ✓       | ✓       | ✓ (1 retry)   | ✅ APPROVED |
| create-issue | ✓       | ✓       | ✓       | ✓ (0 retries) | ✅ APPROVED |

### Completed Tools (Batch {X-1})

| Tool         | Phase 6 | Phase 7 | Phase 8 | Phase 9       | Status      |
| ------------ | ------- | ------- | ------- | ------------- | ----------- |
| update-issue | ✓       | ✓       | ✓       | ✓ (0 retries) | ✅ APPROVED |
| delete-issue | ✓       | ✓       | ✓       | ✓ (1 retry)   | ✅ APPROVED |
| find-issue   | ✓       | ✓       | ✓       | ✓ (0 retries) | ✅ APPROVED |

---

### Issues Encountered

**Batch {X}:**

- list-issues: Initial Zod schema missing control character validation (fixed in retry)

**Batch {X-1}:**

- delete-issue: Response filtering not achieving 80% reduction (fixed in retry)

**Cumulative Issues:** 2 (threshold: 5)

---

### Next Steps

**Phase 4-7:** Tools {list} (Batch {X+1})

**Estimated time:** {N} minutes per tool × {batch_size} tools = {total} minutes

**Continue?** [Yes / Show details / Pause]
```

### User Response Options

```typescript
AskUserQuestion({
  questions: [
    {
      header: "Progress Checkpoint",
      question: "[Progress report above]",
      multiSelect: false,
      options: [
        {
          label: "Yes - Continue",
          description: "Proceed with next batch",
        },
        {
          label: "Show details",
          description: "View detailed review reports for completed tools",
        },
        {
          label: "Pause",
          description: "Save progress and pause workflow",
        },
      ],
    },
  ],
});
```

**Handling responses:**

- **Yes - Continue**: Proceed with next batch
- **Show details**: Display review.md files for completed tools, then re-ask
- **Pause**: Save progress to MANIFEST.yaml, provide resume instructions

### Example: 18-Tool Service

```
Phase 5: Shared architecture → Human checkpoint ✅

Batch 1: Tools 1-4 (get-issue, list-issues, create-issue, update-issue)
  Phase 6: Architecture + testing → Complete
  Phase 7: RED gate → Complete
  Phase 8: Implementation → Complete
  Phase 9: Code review → Complete

Batch 2: Tools 5-8 (delete-issue, find-issue, comment-issue, assign-issue)
  Phase 6: Architecture + testing → Complete
  Phase 7: RED gate → Complete
  Phase 8: Implementation → Complete
  Phase 9: Code review → Complete

→ PROGRESS CHECKPOINT (8 of 18 tools, 44%)

Batch 3: Tools 9-12 (label-issue, search-issues, filter-issues, sort-issues)
  [Continue workflow...]
```

## Issue Threshold Checkpoints (Mandatory)

Mandatory human review when quality issues accumulate.

### Trigger Conditions

| Trigger           | Threshold             | Checkpoint Type      |
| ----------------- | --------------------- | -------------------- |
| Per-tool retries  | >2 retries            | MANDATORY escalation |
| Cumulative issues | >5 across batches     | MANDATORY review     |
| Blocked reviews   | Any tool BLOCKED      | MANDATORY escalation |
| Gate failures     | >3 RED/GREEN failures | MANDATORY review     |

### Escalation Format: Per-Tool Retries

When a single tool exceeds retry limit:

```typescript
AskUserQuestion({
  questions: [
    {
      header: "🚨 Retry Limit Exceeded",
      question:
        "Tool {tool} failed Phase 9 review after 2 retries.\n\n**Issues:**\n{issue_list}\n\n**Review history:**\n- Attempt 1: {issues}\n- Attempt 2: {issues}\n\nThis indicates systemic issues that need manual intervention.",
      multiSelect: false,
      options: [
        {
          label: "Manual fix",
          description: "I'll review and fix the issues manually",

## Extended Escalation Procedures

For emergency abort protocol, rationalization counters, and escalation approval tracking, see: [checkpoint-configuration-escalation.md](checkpoint-configuration-escalation.md)
```
