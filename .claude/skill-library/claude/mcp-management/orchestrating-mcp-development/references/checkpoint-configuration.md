# Checkpoint Configuration

Human approval and progress reporting at strategic points to ensure alignment and catch issues early.

## Overview

Checkpoints in MCP development workflows serve three purposes:

1. **Alignment Checkpoints**: Ensure architecture matches user needs
2. **Progress Checkpoints**: Report status for large services (15+ tools)
3. **Issue Checkpoints**: Mandatory escalation when retry limits exceeded

## Phase-Level Checkpoints (Default)

Human approval required at:

### Phase 3: Shared Architecture

**When:** After both agents (tool-lead + security-lead) complete

**Trigger:** Always required (applies to all service sizes)

**Purpose:** Ensure shared patterns align with user needs before implementing 15+ tools

**Format:**

```typescript
AskUserQuestion({
  questions: [{
    header: "Shared Architecture Approval",
    question: "Review shared architecture for {service} MCP wrappers.\n\n**Tools to wrap:** {N} tools\n\n**Key decisions:**\n- Token optimization: {strategy}\n- Error handling: {pattern}\n- Response filtering: {approach}\n- Security validation: {layers}\n\nApprove these patterns for ALL {N} tools?",
    multiSelect: false,
    options: [
      {
        label: "Approve",
        description: "Proceed with this shared architecture"
      },
      {
        label: "Request changes",
        description: "I have feedback on the patterns"
      },
      {
        label: "Show details",
        description: "View full architecture documentation"
      }
    ]
  }]
})
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

| Service Size | Batch Size | Checkpoint Frequency |
|--------------|------------|---------------------|
| 5-10 tools | 5 tools | After completion (Phase 10) |
| 11-15 tools | 4 tools | After Phase 7 (all tools) |
| 16-20 tools | 4 tools | Every 8 tools (2 batches) |
| 21-30 tools | 3 tools | Every 6 tools (2 batches) |
| 31+ tools | 3 tools | Every 9 tools (3 batches) |

### Progress Report Format

```markdown
## MCP Development Progress Report

**Service:** {service}
**Tools Total:** {N}
**Completed:** {M} of {N} tools ({percentage}%)
**Status:** On track / Issues detected

---

### Completed Tools (Batch {X})

| Tool | Phase 4 | Phase 5 | Phase 6 | Phase 7 | Status |
|------|---------|---------|---------|---------|--------|
| get-issue | ✓ | ✓ | ✓ | ✓ (0 retries) | ✅ APPROVED |
| list-issues | ✓ | ✓ | ✓ | ✓ (1 retry) | ✅ APPROVED |
| create-issue | ✓ | ✓ | ✓ | ✓ (0 retries) | ✅ APPROVED |

### Completed Tools (Batch {X-1})

| Tool | Phase 4 | Phase 5 | Phase 6 | Phase 7 | Status |
|------|---------|---------|---------|---------|--------|
| update-issue | ✓ | ✓ | ✓ | ✓ (0 retries) | ✅ APPROVED |
| delete-issue | ✓ | ✓ | ✓ | ✓ (1 retry) | ✅ APPROVED |
| find-issue | ✓ | ✓ | ✓ | ✓ (0 retries) | ✅ APPROVED |

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
  questions: [{
    header: "Progress Checkpoint",
    question: "[Progress report above]",
    multiSelect: false,
    options: [
      {
        label: "Yes - Continue",
        description: "Proceed with next batch"
      },
      {
        label: "Show details",
        description: "View detailed review reports for completed tools"
      },
      {
        label: "Pause",
        description: "Save progress and pause workflow"
      }
    ]
  }]
})
```

**Handling responses:**

- **Yes - Continue**: Proceed with next batch
- **Show details**: Display review.md files for completed tools, then re-ask
- **Pause**: Save progress to metadata.json, provide resume instructions

### Example: 18-Tool Service

```
Phase 3: Shared architecture → Human checkpoint ✅

Batch 1: Tools 1-4 (get-issue, list-issues, create-issue, update-issue)
  Phase 4: Architecture + testing → Complete
  Phase 5: RED gate → Complete
  Phase 6: Implementation → Complete
  Phase 7: Code review → Complete

Batch 2: Tools 5-8 (delete-issue, find-issue, comment-issue, assign-issue)
  Phase 4: Architecture + testing → Complete
  Phase 5: RED gate → Complete
  Phase 6: Implementation → Complete
  Phase 7: Code review → Complete

→ PROGRESS CHECKPOINT (8 of 18 tools, 44%)

Batch 3: Tools 9-12 (label-issue, search-issues, filter-issues, sort-issues)
  [Continue workflow...]
```

## Issue Threshold Checkpoints (Mandatory)

Mandatory human review when quality issues accumulate.

### Trigger Conditions

| Trigger | Threshold | Checkpoint Type |
|---------|-----------|-----------------|
| Per-tool retries | >2 retries | MANDATORY escalation |
| Cumulative issues | >5 across batches | MANDATORY review |
| Blocked reviews | Any tool BLOCKED | MANDATORY escalation |
| Gate failures | >3 RED/GREEN failures | MANDATORY review |

### Escalation Format: Per-Tool Retries

When a single tool exceeds retry limit:

```typescript
AskUserQuestion({
  questions: [{
    header: "🚨 Retry Limit Exceeded",
    question: "Tool {tool} failed Phase 7 review after 2 retries.\n\n**Issues:**\n{issue_list}\n\n**Review history:**\n- Attempt 1: {issues}\n- Attempt 2: {issues}\n\nThis indicates systemic issues that need manual intervention.",
    multiSelect: false,
    options: [
      {
        label: "Manual fix",
        description: "I'll review and fix the issues manually"
      },
      {
        label: "Adjust architecture",
        description: "Architecture needs revision for this tool"
      },
      {
        label: "Skip tool",
        description: "Defer this tool, continue with others"
      },
      {
        label: "Show diagnostics",
        description: "View complete review reports and implementation"
      }
    ]
  }]
})
```

### Escalation Format: Cumulative Issues

When cumulative issues exceed threshold across batches:

```typescript
AskUserQuestion({
  questions: [{
    header: "🚨 Issue Threshold Exceeded",
    question: "Cumulative issues across {N} batches: {count}/5 threshold.\n\n**Issue breakdown:**\n- Spec compliance violations: {count}\n- Quality issues: {count}\n- Security issues: {count}\n- Gate failures: {count}\n\nThis pattern suggests architectural or process issues.",
    multiSelect: false,
    options: [
      {
        label: "Review architecture",
        description: "Shared patterns may need adjustment"
      },
      {
        label: "Continue with caution",
        description: "Issues are isolated, proceed carefully"
      },
      {
        label: "Pause for analysis",
        description: "Investigate root causes before continuing"
      },
      {
        label: "Show issue details",
        description: "View all issue reports across batches"
      }
    ]
  }]
})
```

### Escalation Format: Blocked Review

When any tool receives BLOCKED verdict:

```typescript
AskUserQuestion({
  questions: [{
    header: "🚨 Critical Review Block",
    question: "Tool {tool} has BLOCKING issues that prevent approval.\n\n**Critical issues:**\n{critical_issue_list}\n\n**Impact:** These issues pose security risks or require architectural changes.\n\n**Review verdict:**\n- Stage 1 (Spec): {verdict}\n- Stage 2 (Quality): {verdict}\n- Stage 2 (Security): {verdict}",
    multiSelect: false,
    options: [
      {
        label: "Revise architecture",
        description: "Update shared/tool-specific architecture to address issues"
      },
      {
        label: "Escalate to team",
        description: "Requires team security/architecture decision"
      },
      {
        label: "Skip tool",
        description: "Cannot safely wrap this tool"
      },
      {
        label: "Show diagnostics",
        description: "View complete security and quality assessments"
      }
    ]
  }]
})
```

## Progress Persistence Integration

For services with **15+ tools** or **estimated duration >2 hours**, integrate with persisting-progress-across-sessions skill.

### When to Invoke

```typescript
// At Phase 0: Setup
if (tools_selected >= 15 || estimated_duration_hours >= 2) {
  // Invoke persisting-progress-across-sessions skill
  Skill(skill: 'persisting-progress-across-sessions', args: 'initialize')

  // Skill will guide:
  // 1. Creating progress.json structure
  // 2. Defining checkpoint save triggers
  // 3. Establishing resume protocol
}
```

### Progress Save Triggers

Save progress.json after:

- Each batch completion (Phases 4, 6, 7)
- Each gate pass (Phases 5, 8, 9)
- Any human checkpoint
- Any escalation event

### Progress File Location

```
.claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{service}/progress.json
```

### Resume Protocol

If session interrupted:

1. User restarts with `/tool-manager resume {service}`
2. Orchestrator reads progress.json
3. Identifies last completed phase
4. Displays resume summary
5. Asks user: "Resume from {phase} (Batch {X})?"
6. Continues workflow from checkpoint

## Example Checkpoint Scenarios

### Scenario 1: 5-Tool Service (No Batch Checkpoints)

```
Phase 3: Architecture → Human checkpoint ✅
Phases 4-7: All 5 tools in single batch
Phase 8: GREEN gate → Complete
Phase 9: Audit → Complete
Phase 10: Completion report
```

**Checkpoints:** 1 (Phase 3 only)

### Scenario 2: 18-Tool Service (With Progress Checkpoints)

```
Phase 3: Architecture → Human checkpoint ✅

Batch 1: Tools 1-4
Batch 2: Tools 5-8
→ Progress checkpoint (8/18 = 44%) ✅

Batch 3: Tools 9-12
Batch 4: Tools 13-16
→ Progress checkpoint (16/18 = 89%) ✅

Batch 5: Tools 17-18
Phase 8: GREEN gate → Complete
Phase 9: Audit → Complete
Phase 10: Completion report
```

**Checkpoints:** 3 (Phase 3 + 2 progress)

### Scenario 3: 28-Tool Service (With Progress + Persistence)

```
Phase 0: Setup → Invoke persisting-progress-across-sessions ✅
Phase 3: Architecture → Human checkpoint ✅

Batch 1-3: Tools 1-9 (3 batches × 3 tools)
→ Progress checkpoint (9/28 = 32%) ✅
→ Progress saved to progress.json

Batch 4-6: Tools 10-18 (3 batches × 3 tools)
→ Progress checkpoint (18/28 = 64%) ✅
→ Progress saved to progress.json

Batch 7-9: Tools 19-27 (3 batches × 3 tools)
→ Progress checkpoint (27/28 = 96%) ✅
→ Progress saved to progress.json

Batch 10: Tool 28
Phase 8: GREEN gate → Complete
Phase 9: Audit → Complete
Phase 10: Completion report
```

**Checkpoints:** 4 (Phase 3 + 3 progress)
**Progress saves:** 9+ (after each batch)

### Scenario 4: Issue Escalation

```
Phase 3: Architecture → Human checkpoint ✅

Batch 1: Tools 1-3
  Tool 2: Review retry (1) → Success

Batch 2: Tools 4-6
  Tool 5: Review retry (1) → Fail
  Tool 5: Review retry (2) → Fail
  → MANDATORY escalation (>2 retries) 🚨

User chooses: "Manual fix"
→ User fixes tool 5 manually
→ Workflow resumes at Batch 3
```

## Related References

- [Rationalization Table](rationalization-table.md) - Checkpoint-related rationalizations
- [Progress Persistence](progress-persistence.md) - Session management for large services
- [Phase 7: Code Review](phase-7-code-review.md) - Review retry logic
- [Critical Rules](critical-rules.md) - Checkpoint requirements
