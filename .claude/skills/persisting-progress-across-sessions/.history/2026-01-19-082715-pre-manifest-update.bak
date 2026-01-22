---
name: persisting-progress-across-sessions
description: Use when orchestrating long-running tasks that may exceed context window or be interrupted - provides progress file patterns, resume protocols, and lifecycle management for cross-session persistence
allowed-tools: Read, Write, Edit, TodoWrite, Glob, Grep
---

# Persisting Progress Across Sessions

**Enable long-running tasks to survive context exhaustion and session interruptions.**

## Overview

From Anthropic's research on long-running agents: "External memory via 'scratchpad' files enables agents to maintain continuity across context windows and sessions."

Progress persistence is NOT optional for complex orchestrations. Without it:

- Context exhaustion loses all state
- Session interruptions require restart from scratch
- Multi-agent coordination context disappears
- Handoff information between phases is lost

## State Tracking (MANDATORY)

**MUST use TodoWrite BEFORE starting any persistence workflow.**

Progress file management involves multiple steps (check, create, update, cleanup). Without TodoWrite tracking:

- Steps get skipped under time pressure
- Cleanup is forgotten after completion
- Resume protocol steps are missed

**Create TodoWrite items for each lifecycle step.**

## When to Use Progress Files

**Create progress files when:**

- Task spans 3+ phases (architecture + implementation + testing)
- Task may exceed context window (~100k tokens of work)
- Task may be interrupted (long implementation, user breaks)
- Multiple agents contribute to single outcome
- Orchestrator is coordinating sequential/parallel phases

**Skip progress files when:**

- Simple single-phase task
- Task completes in one interaction
- No agent coordination needed
- Quick bug fix or small feature

## Quick Reference

| Lifecycle Stage     | Action                                  | Location                                 |
| ------------------- | --------------------------------------- | ---------------------------------------- |
| Start orchestration | Create progress file                    | `.claude/progress/<domain>-<feature>.md` |
| After each phase    | Update completed phases + agent outputs | Same file                                |
| On blocker          | Document blocker + context              | Same file                                |
| On completion       | Mark complete, archive or delete        | Move to `archived/` or delete            |
| On session resume   | Read file, restore context, continue    | From current phase                       |

## Progress File Location

```
.claude/progress/<domain>-<feature-name>.md

Examples:
- .claude/progress/frontend-asset-filtering.md
- .claude/progress/backend-job-processing.md
- .claude/progress/fullstack-user-auth.md
```

**Directory structure:**

```
.claude/progress/
├── frontend-asset-filtering.md    # Active orchestrations
├── backend-job-processing.md
└── archived/                       # Completed (kept for reference)
    └── frontend-dashboard-2024-01.md
```

## Progress File Structure

````markdown
# Orchestration: <Feature Name>

## Status: in_progress | complete | blocked

## Started: <ISO timestamp>

## Last Updated: <ISO timestamp>

## Overview

Brief description of what this orchestration is accomplishing.

---

## Completed Phases

- [x] **Phase 1: Architecture** - <result summary>
  - Agent: backend-architect
  - Completed: <timestamp>
  - Key decisions: [list]

- [x] **Phase 2: Implementation** - <result summary>
  - Agent: backend-developer
  - Completed: <timestamp>
  - Files created: [list]

## Current Phase

- [ ] **Phase 3: Testing** - <what's in progress>
  - Agent: backend-tester (in progress)
  - Started: <timestamp>
  - Notes: [any context]

## Pending Phases

- [ ] **Phase 4: Code Review**
- [ ] **Phase 5: Security Review**

---

## Context for Resume

Critical information needed to resume from current phase:

### Architecture Decisions

- Pattern: [chosen pattern]
- Database: [schema decisions]
- API: [endpoint design]

### Key File Paths

- Handler: pkg/handler/handlers/asset/create.go
- Service: pkg/service/asset/service.go
- Tests: pkg/handler/handlers/asset/create_test.go

### Dependencies

- Depends on: [services/features]
- Blocks: [downstream work]

### Blockers

- None currently
- OR: Waiting for [specific thing]

---

## Agent Outputs

### <agent-name> (completed)

```json
{
  "status": "complete",
  "summary": "...",
  "files_created": [...]
}
```
````

### <agent-name> (in_progress)

```json
{
  "status": "in_progress",
  "partial_output": "..."
}
```

---

## Error Log

### <timestamp> - <Error Type>

- Phase: [phase name]
- Agent: [agent name]
- Error: [description]
- Resolution: [how resolved or pending]

---

## Notes

Additional context for future sessions:

- User preferences
- Constraints discovered
- Performance targets

````

See [references/file-templates.md](references/file-templates.md) for minimal and detailed templates.

## Resume Protocol

### At Session Start

**Check for existing progress files:**

```bash
ls .claude/progress/*.md 2>/dev/null
````

**If progress file exists:**

1. **Read the file** - Understand current state
2. **Check status** - `in_progress`, `blocked`, or needs restart
3. **Read Context for Resume** - Key decisions, file paths, dependencies
4. **Review Agent Outputs** - What has each agent produced
5. **Check Error Log** - Any unresolved issues
6. **Create TodoWrite** - From pending phases
7. **Resume from current phase** - Don't repeat completed work

### After Each Phase

1. **Mark phase complete** in progress file
2. **Add agent output** to Agent Outputs section
3. **Update current phase** to next pending
4. **Update "Last Updated"** timestamp
5. **Mark TodoWrite item complete**

### On Blocker

1. **Update status** to `blocked`
2. **Document blocker** in Blockers section
3. **Add to Error Log** if error-related
4. **Escalate** via AskUserQuestion if needed

### On Completion

1. **Update status** to `complete`
2. **Add final summary** to Overview
3. **Decision: Archive or Delete**
   - Archive if reference value (move to `archived/`)
   - Delete if no future value
4. **Clean up TodoWrite** - Mark all complete

## Context Compaction Protocol

### Why Compaction Matters

From Anthropic research: "Token usage accounts for 80% of performance variance." Context rot degrades model performance even within technical token limits. The effective context window where models maintain high quality is ~256k tokens - far below advertised maximums.

### Compaction vs Persistence

| Concern     | Purpose                                      | When           |
| ----------- | -------------------------------------------- | -------------- |
| Persistence | Save state to FILES for session resume      | Between sessions |
| Compaction  | Reduce CONTEXT WINDOW to prevent degradation | During session |

Both are needed. Persistence without compaction leads to context rot. Compaction without persistence loses state on interruption.

### Compaction Triggers

Initiate context compaction when ANY of these occur:

| Trigger           | Threshold        | Action                               |
| ----------------- | ---------------- | ------------------------------------ |
| Message count     | > 40 messages    | Summarize completed phases           |
| Phase completion  | Every 3 phases   | Archive phase details to file        |
| Agent output size | > 1000 tokens    | Summarize, store full in progress file |
| Approaching limit | ~80% context used | Aggressive compaction                |

### Compaction Protocol

**Step 1: Identify Compactable Content**

Content that CAN be compacted:
- Completed phase outputs (keep 2-3 line summary)
- Old agent handoff details (keep key decisions only)
- Discovery findings (reference file path instead)
- Architecture rationale (keep decision, not reasoning)

Content that MUST stay in context:
- Current phase details
- Immediate prior phase decisions
- Active blockers
- Key file paths being modified
- User preferences/constraints

**Step 2: Summarize Completed Phases**

Before compaction:
```
Phase 3 (Architecture) completed:
- Agent: frontend-lead
- Output: 2500 token architecture.md with component hierarchy,
  data flow diagrams, integration points, 3 approach comparisons,
  security considerations, tech debt analysis...
[full content]
```

After compaction:
```
Phase 3 (Architecture): Complete
- Decision: Compound component pattern with Zustand
- File: .claude/.output/features/{id}/architecture.md
- Key: Dashboard uses <Dashboard.Widget> children pattern
```

**Step 3: Use File References**

Replace inline content with file references:

Before: [500 lines of discovery findings in context]
After: "See .claude/.output/features/{id}/discovery.md for full findings. Key patterns: TanStack Query for data fetching, MSW for testing."

**Step 4: Update Progress File**

When compacting, ALWAYS update progress file first:
1. Write full content to progress file
2. Verify write succeeded
3. Then summarize in context
4. Add note: "Full details in progress file"

### Pre-Rot Threshold Monitoring

Monitor for these warning signs:

| Warning Sign          | Indicator                                  | Action                              |
| --------------------- | ------------------------------------------ | ----------------------------------- |
| Response quality drop | Vague or repetitive responses              | Immediate compaction                |
| Missed context        | Agent asks about already-discussed topics  | Compaction + re-inject key facts    |
| Instruction drift     | Not following established patterns         | Re-inject critical instructions     |
| Slow responses        | Noticeably longer response times           | Compaction                          |

### Compaction Checklist

Before major phase transitions, verify:

- [ ] Completed phases summarized (not full content)
- [ ] Agent outputs archived to progress file
- [ ] Only current phase has full details in context
- [ ] Key decisions preserved (not just file references)
- [ ] Critical constraints still in context
- [ ] Progress file updated with full details

**For detailed compaction examples, see:** [references/compaction-protocol.md](references/compaction-protocol.md)

## Integration with TodoWrite

Progress files complement TodoWrite:

- **TodoWrite**: Real-time task tracking within session
- **Progress file**: Cross-session persistence

### At Session Start

```markdown
1. Read progress file
2. Create TodoWrite todos from pending phases:
   - [ ] Phase 3: Testing (from progress file)
   - [ ] Phase 4: Code Review (from progress file)
3. Mark completed phases based on progress file
```

### At Phase Completion

```markdown
1. Mark TodoWrite todo complete
2. Update progress file:
   - Move phase from Current to Completed
   - Add agent output
   - Update timestamp
```

## Minimal vs Full Progress Files

### Minimal (Simple Orchestrations)

For 3-4 phase orchestrations:

```markdown
# Orchestration: <Feature Name>

## Status: in_progress

## Last Updated: <timestamp>

## Completed

- [x] Architecture - Tier 2 component pattern
- [x] Implementation - AssetFilter.tsx created

## Current

- [ ] Testing - Unit tests in progress

## Context

- Component: src/sections/assets/components/AssetFilter.tsx
- API: GET /my?resource=asset&status=...

## Agent Output (latest)

{last agent's JSON output}
```

### Full (Complex Orchestrations)

For 5+ phase orchestrations with multiple agents, use the full template from the Progress File Structure section above.

## Lifecycle Management

### Creation Triggers

Create progress file when:

- Starting orchestration with 3+ phases
- User explicitly requests progress tracking
- Task estimated to exceed context window
- Previous session was interrupted mid-task

### Update Triggers

Update progress file:

- After each agent completes
- When blockers encountered
- When scope changes
- After resolving errors
- Every 30 minutes during long phases

### Cleanup Triggers

**Archive (keep for reference):**

- Similar task may occur again
- Contains valuable architecture decisions
- User requests retention

**Delete:**

- Simple task with no reference value
- Information captured elsewhere (PR, commit)
- User requests deletion

## Anti-Patterns

1. **Creating for simple tasks** - Don't create progress files for single-agent work
2. **Forgetting to update** - Update after EVERY phase completion
3. **Missing Context for Resume** - Always include enough to restart without reading all code
4. **Skipping Error Log** - Document all errors for debugging patterns
5. **Never cleaning up** - Archive or delete completed orchestrations
6. **Not reading on resume** - Always read progress file at session start

## Related Skills

- **orchestrating-feature-development** - Uses this skill for progress tracking AND context compaction during 12-phase workflow
- **orchestrating-integration-development** - Uses this skill for progress tracking AND context compaction during 9-phase workflow
- **orchestrating-multi-agent-workflows** - Multi-agent coordination patterns
- **dispatching-parallel-agents** - Parallel agent execution
- **developing-with-subagents** - Same-session subagent patterns
- **writing-plans** - Creating implementation plans

## References

- [File Templates](references/file-templates.md) - Minimal and full progress file templates
- [Resume Checklist](references/resume-checklist.md) - Step-by-step resume protocol
- [Lifecycle Flowchart](references/lifecycle-flowchart.md) - Visual lifecycle diagram
- [Compaction Protocol](references/compaction-protocol.md) - Detailed context compaction examples and workflows
