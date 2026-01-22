# Progress Persistence

**Cross-session state tracking for long-running feature development.**

## Overview

Features may span multiple sessions due to:

- User breaks
- Context window limits (compaction gates)
- External dependencies (waiting for review)

Progress persistence ensures resumption without lost context.

## Progress File Location

```
.feature-development/progress.md
```

## Progress File Structure

```markdown
# Feature Progress: {Feature Name}

## Status: in_progress | blocked | complete

## Current Phase: {N} - {Phase Name}

## Last Updated: {ISO timestamp}

---

## Completed Phases

- [x] **Phase 1: Setup** - Worktree created
  - Completed: 2024-01-15T10:05:00Z

- [x] **Phase 3: Codebase Discovery** - 8 patterns identified
  - Completed: 2024-01-15T10:20:00Z
  - Technologies: React, TypeScript, TanStack Query

- [x] **Phase 7: Architecture Plan** - Plan approved
  - Completed: 2024-01-15T11:00:00Z
  - Tasks: 5 implementation tasks
  - Checkpoint: User approved

## Current Phase

- [ ] **Phase 8: Implementation** - In progress
  - Started: 2024-01-15T11:15:00Z
  - Tasks completed: 2/5
  - Current task: T003 - Add filter hook

## Pending Phases

- [ ] Phase 9: Design Verification
- [ ] Phase 11: Code Quality
- [ ] Phase 13: Testing
- [ ] Phase 16: Completion

---

## Resume Context

### Key Decisions

- Using TanStack Query for filter state
- Filters persist in URL params
- Debounced input (300ms)

### Files Modified

- src/hooks/useAssetFilters.ts (created)
- src/sections/assets/AssetList.tsx (modified)

### Blockers

- None

### Next Action

Complete T003 then spawn reviewer
```

## When to Update Progress

| Event               | Action                                    |
| ------------------- | ----------------------------------------- |
| Phase starts        | Add to "Current Phase"                    |
| Phase completes     | Move to "Completed Phases"                |
| Compaction gate     | Update "Resume Context"                   |
| Blocker encountered | Set status to "blocked", document blocker |
| Session ends        | Ensure progress.md is current             |

## Resume Protocol

When resuming a feature:

1. **Read progress file**

   ```bash
   Read(".feature-development/progress.md")
   ```

2. **Verify current state**
   - Check MANIFEST.yaml matches progress.md
   - Verify files mentioned actually exist

3. **Identify next action**
   - Current phase + next step
   - Any documented blockers

4. **Continue from checkpoint**
   - Load relevant phase reference
   - Resume with documented context

## Integration with Compaction Gates

At each compaction gate (after phases 3, 8, 13):

1. Update progress.md with full context
2. Document key decisions and file paths
3. Ensure MANIFEST.yaml current_phase is accurate
4. Proceed with compaction

**Critical:** Progress file survives compaction and provides resume context.

## MANIFEST.yaml vs progress.md

| MANIFEST.yaml           | progress.md                     |
| ----------------------- | ------------------------------- |
| Structured data (YAML)  | Human-readable narrative        |
| Machine-parseable       | Resume context for next session |
| Metrics, status codes   | Decisions, blockers, next steps |
| Updated by orchestrator | Updated at checkpoints          |

Both must stay synchronized.

## Related References

- [Directory Structure](directory-structure.md) - File organization
- [Compaction Gates](compaction-gates.md) - Context management triggers
- [Phase 16: Completion](phase-16-completion.md) - Final progress update
