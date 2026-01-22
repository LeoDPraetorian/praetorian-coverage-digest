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

## Integration Note

**This skill provides the PROTOCOL for cross-session persistence.** The FILE FORMAT is defined by `persisting-agent-outputs` (MANIFEST.yaml schema). Always invoke `persisting-agent-outputs` skill to discover/create the output directory.

## Quick Reference

| Lifecycle Stage     | Action                                  | Location                                    |
| ------------------- | --------------------------------------- | ------------------------------------------- |
| Start orchestration | Create output directory + MANIFEST.yaml | `.claude/.output/{type}/{id}/MANIFEST.yaml` |
| After each phase    | Update MANIFEST.yaml phases + agents    | Same file                                   |
| On blocker          | Update status to "blocked"              | Same file                                   |
| On completion       | Mark status "complete", cleanup         | Delete directory or keep for reference      |
| On session resume   | Find MANIFEST.yaml, restore context     | From current_phase                          |

## Progress File Location

State is persisted in MANIFEST.yaml within output directories:

```
.claude/.output/{type}/{id}/MANIFEST.yaml

Where {type} is:
- features/       # Feature development workflows
- capabilities/   # Capability development workflows
- research/       # Research tasks
- mcp-wrappers/   # MCP wrapper development
- agents/         # Standalone agent outputs (fallback)
```

**Directory structure example:**

```
.claude/.output/features/2026-01-15-143022-asset-filter/
├── MANIFEST.yaml                              # Cross-session state
├── frontend-lead-architecture.md              # Agent artifacts
├── frontend-developer-implementation.md
└── frontend-tester-test-plan.md
```

## Progress File Structure (MANIFEST.yaml)

Cross-session state is stored in MANIFEST.yaml. Schema defined by `persisting-agent-outputs`.

```yaml
# MANIFEST.yaml - Cross-session state
feature_name: "Asset Filter Component"
feature_slug: "asset-filter"
created_at: "2026-01-15T14:30:22Z"
created_by: "orchestrating-feature-development"
description: |
  Implement asset filtering with status, severity, and date filters.

status: "in-progress" # in-progress | complete | blocked
current_phase: "implementation"

# Phase tracking (orchestrated workflows)
phases:
  setup:
    status: "complete"
    timestamp: "2026-01-15T14:30:22Z"
  brainstorming:
    status: "complete"
    timestamp: "2026-01-15T14:45:00Z"
    approved: true
  architecture:
    status: "complete"
    timestamp: "2026-01-15T15:00:00Z"
    agent: "frontend-lead"
  implementation:
    status: "in_progress"
    timestamp: "2026-01-15T15:30:00Z"
    agent: "frontend-developer"
  review:
    status: "pending"
  testing:
    status: "pending"

# Verification results
verification:
  build: "PASS"
  tests: "NOT_RUN"
  review: "PENDING"

# Agent contributions (all workflows)
agents_contributed:
  - agent: "frontend-lead"
    artifact: "architecture.md"
    timestamp: "2026-01-15T15:00:00Z"
    status: "complete"
  - agent: "frontend-developer"
    artifact: "frontend-developer-implementation.md"
    timestamp: "2026-01-15T15:30:00Z"
    status: "in_progress"

# Artifact index
artifacts:
  - path: "architecture.md"
    type: "architecture"
    agent: "frontend-lead"
  - path: "frontend-developer-implementation.md"
    type: "implementation"
    agent: "frontend-developer"
```

**See:** [references/file-templates.md](references/file-templates.md) for minimal and full templates.
**See:** [persisting-agent-outputs/references/manifest-structure.md](../persisting-agent-outputs/references/manifest-structure.md) for complete field definitions.

## Resume Protocol

### At Session Start

**Check for MANIFEST.yaml files (recent work):**

```bash
# Find MANIFEST.yaml files modified in last 24 hours
find .claude/.output -name 'MANIFEST.yaml' -mmin -1440 2>/dev/null
```

**If MANIFEST.yaml found:**

1. **Read MANIFEST.yaml** - Get `current_phase` and `phases` status
2. **Check status** - `in-progress`, `blocked`, or `complete`
3. **Reconstruct TodoWrite** - From phases with status != 'complete'
4. **Load artifacts** - From `agents_contributed` array
5. **Resume from current_phase** - Don't repeat completed phases

### After Each Phase

1. **Update MANIFEST.yaml phases** - Set phase status to "complete"
2. **Add to agents_contributed** - Record agent and artifact
3. **Update current_phase** - To next pending phase
4. **Update verification** - If build/tests ran
5. **Mark TodoWrite item complete**

### On Blocker

1. **Update status** to `blocked` in MANIFEST.yaml
2. **Document blocker** in blocked agent's metadata (blocked_reason field)
3. **Escalate** via AskUserQuestion if needed

### On Completion

1. **Update status** to `complete` in MANIFEST.yaml
2. **Update verification** with final results
3. **Decision: Keep or Delete**
   - Keep if reference value
   - Delete directory if no future value
4. **Clean up TodoWrite** - Mark all complete

## Context Compaction Protocol

### Why Compaction Matters

From Anthropic research: "Token usage accounts for 80% of performance variance." Context rot degrades model performance even within technical token limits. The effective context window where models maintain high quality is ~256k tokens - far below advertised maximums.

### Compaction vs Persistence

| Concern     | Purpose                                      | When             |
| ----------- | -------------------------------------------- | ---------------- |
| Persistence | Save state to FILES for session resume       | Between sessions |
| Compaction  | Reduce CONTEXT WINDOW to prevent degradation | During session   |

Both are needed. Persistence without compaction leads to context rot. Compaction without persistence loses state on interruption.

### Compaction Triggers

Initiate context compaction when ANY of these occur:

| Trigger           | Threshold         | Action                                 |
| ----------------- | ----------------- | -------------------------------------- |
| Message count     | > 40 messages     | Summarize completed phases             |
| Phase completion  | Every 3 phases    | Archive phase details to file          |
| Agent output size | > 1000 tokens     | Summarize, store full in progress file |
| Approaching limit | ~80% context used | Aggressive compaction                  |

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

| Warning Sign          | Indicator                                 | Action                           |
| --------------------- | ----------------------------------------- | -------------------------------- |
| Response quality drop | Vague or repetitive responses             | Immediate compaction             |
| Missed context        | Agent asks about already-discussed topics | Compaction + re-inject key facts |
| Instruction drift     | Not following established patterns        | Re-inject critical instructions  |
| Slow responses        | Noticeably longer response times          | Compaction                       |

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

MANIFEST.yaml complements TodoWrite:

- **TodoWrite**: Real-time task tracking within session
- **MANIFEST.yaml**: Cross-session persistence

### At Session Start

```markdown
1. Read MANIFEST.yaml (current_phase, phases)
2. Create TodoWrite todos from phases where status != "complete":
   - [ ] Phase: implementation (from phases.implementation.status)
   - [ ] Phase: review (from phases.review.status)
3. Mark completed phases based on MANIFEST.yaml
```

### At Phase Completion

```markdown
1. Mark TodoWrite todo complete
2. Update MANIFEST.yaml:
   - Set phases.{phase}.status = "complete"
   - Add to agents_contributed array
   - Update current_phase to next pending
```

## Minimal vs Full MANIFEST.yaml

### Minimal (Ad-hoc Agent Work)

For standalone agent tasks without orchestration:

```yaml
feature_name: "Quick Bug Fix"
feature_slug: "auth-token-refresh-fix"
created_at: "2026-01-15T14:30:22Z"
created_by: "backend-developer"
description: Fix token refresh race condition.
status: "complete"

agents_contributed:
  - agent: "backend-developer"
    artifact: "backend-developer-implementation.md"
    timestamp: "2026-01-15T14:35:00Z"
    status: "complete"

artifacts:
  - path: "backend-developer-implementation.md"
    type: "implementation"
    agent: "backend-developer"
```

### Full (Orchestrated Workflows)

For 5+ phase orchestrations with multiple agents, include optional orchestration fields (phases, current_phase, verification). See Progress File Structure section above.

## Lifecycle Management

### Creation Triggers

Create output directory + MANIFEST.yaml when:

- Starting orchestration with 3+ phases
- User explicitly requests progress tracking
- Task estimated to exceed context window
- Previous session was interrupted mid-task

**Creation:** Orchestration skill creates `.claude/.output/{type}/{id}/` and initial MANIFEST.yaml.

### Update Triggers

Update MANIFEST.yaml:

- After each agent completes (agents_contributed array)
- After each phase completes (phases object)
- When blockers encountered (status → "blocked")
- When verification runs (verification object)
- Every 30 minutes during long phases

### Cleanup Triggers

**Keep (reference value):**

- Contains valuable architecture decisions
- May need to resume interrupted work
- User requests retention

**Delete:**

- Simple task with no reference value
- Information captured elsewhere (PR, commit)
- User requests deletion
- `rm -rf .claude/.output/{type}/{id}/`

## Anti-Patterns

1. **Creating for simple tasks** - Don't create output directories for single-agent quick tasks
2. **Forgetting to update** - Update MANIFEST.yaml after EVERY phase completion
3. **Missing phases field** - Always include phases for orchestrated workflows
4. **Separate metadata files** - Use MANIFEST.yaml as single source of truth (no progress.json)
5. **Never cleaning up** - Delete completed output directories when no longer needed
6. **Not reading on resume** - Always find and read MANIFEST.yaml at session start

## Related Skills

- **persisting-agent-outputs** (CORE) - Defines MANIFEST.yaml schema and directory discovery protocol. Always invoke this skill to discover/create output directories.
- **orchestrating-feature-development** - Uses this skill for progress tracking AND context compaction during 12-phase workflow
- **orchestrating-capability-development** - Uses this skill for progress tracking during capability workflows
- **orchestrating-integration-development** - Uses this skill for progress tracking AND context compaction during 9-phase workflow
- **orchestrating-multi-agent-workflows** - Multi-agent coordination patterns
- **dispatching-parallel-agents** - Parallel agent execution
- **developing-with-subagents** - Same-session subagent patterns
- **writing-plans** - Creating implementation plans

## References

- [File Templates](references/file-templates.md) - Minimal and full MANIFEST.yaml templates
- [Resume Checklist](references/resume-checklist.md) - Step-by-step resume protocol
- [Lifecycle Flowchart](references/lifecycle-flowchart.md) - Visual lifecycle diagram
- [Compaction Protocol](references/compaction-protocol.md) - Detailed context compaction examples and workflows
- [MANIFEST Structure](../persisting-agent-outputs/references/manifest-structure.md) - Complete MANIFEST.yaml field definitions
