# Progress Persistence

**Cross-session state tracking for long-running capability development.**

## Overview

Security capability development may span multiple sessions due to:

- User breaks
- Context window limits (compaction gates)
- External dependencies (waiting for review)

Progress persistence ensures capability development can resume without lost context.

## Progress File Location

The capability progress file is stored at:

```
.capability-development/progress.md
```

## Progress File Structure

```markdown
# Capability Progress: {Capability Name}

## Status: in_progress | blocked | complete

## Current Phase: {N} - {Phase Name}

## Last Updated: {ISO timestamp}

---

## Completed Phases

- [x] **Phase 1: Setup** - Worktree created
  - Completed: 2024-01-15T10:05:00Z

- [x] **Phase 3: Codebase Discovery** - Capability type identified
  - Completed: 2024-01-15T10:20:00Z
  - Capability Type: VQL
  - Technologies: VQL, Go collector, Velociraptor artifacts

- [x] **Phase 7: Architecture Plan** - Plan approved
  - Completed: 2024-01-15T11:00:00Z
  - Tasks: 4 implementation tasks
  - Checkpoint: User approved

## Current Phase

- [ ] **Phase 8: Implementation** - In progress
  - Started: 2024-01-15T11:15:00Z
  - Tasks completed: 2/4
  - Current task: T003 - Add detection logic

## Pending Phases

- [ ] Phase 9: Design Verification
- [ ] Phase 10: Domain Compliance (P0 checks)
- [ ] Phase 11: Code Quality
- [ ] Phase 13: Testing
- [ ] Phase 16: Completion

---

## Resume Context

### Key Decisions

- Using VQL artifact definition pattern
- Detection targets S3 buckets with exposed credentials
- Output maps to Tabularium Risk schema

### Files Modified

- chariot-aegis-capabilities/vql/s3-credential-scanner.vql (created)
- chariot-aegis-capabilities/collectors/s3_collector.go (created)

### Blockers

- None

### Next Action

Complete T003 then run P0 compliance checks
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

When resuming capability development:

1. **Read progress file**

   ```bash
   Read(".capability-development/progress.md")
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

**Critical:** Progress file survives compaction and provides resume context for capability development.

## MANIFEST.yaml vs progress.md

| MANIFEST.yaml           | progress.md                     |
| ----------------------- | ------------------------------- |
| Structured data (YAML)  | Human-readable narrative        |
| Machine-parseable       | Resume context for next session |
| Metrics, status codes   | Decisions, blockers, next steps |
| Updated by orchestrator | Updated at checkpoints          |

Both must stay synchronized for capability workflow tracking.

## Capability-Specific Context

When documenting resume context for capabilities, include:

| Capability Type | Key Context to Document                              |
| --------------- | ---------------------------------------------------- |
| VQL             | Artifact parameters, platform targets, output fields |
| Nuclei          | Matcher patterns, CVE metadata, request count        |
| Janus           | Tool chain sequence, input/output formats            |
| Fingerprintx    | Protocol probes, confidence thresholds               |
| Scanner         | API endpoints, authentication method, rate limits    |

## Related References

- [Directory Structure](directory-structure.md) - File organization
- [Compaction Gates](compaction-gates.md) - Context management triggers
- [Phase 16: Completion](phase-16-completion.md) - Final progress update
- [Capability Types](capability-types.md) - Type-specific documentation needs
