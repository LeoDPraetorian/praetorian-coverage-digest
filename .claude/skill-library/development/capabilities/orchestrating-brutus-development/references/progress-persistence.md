# Progress Persistence

**Cross-session state management via MANIFEST.yaml for Brutus plugin development.**

---

## MANIFEST.yaml Location

```
{worktree-dir}/{protocol}-brutus/.brutus-development/MANIFEST.yaml
```

---

## MANIFEST.yaml Schema

```yaml
# Identity
protocol_name: "SSH"
protocol_slug: "ssh"
orchestration_skill: "orchestrating-brutus-development"
created_at: "2026-01-27T10:00:00Z"
description: |
  Brutus plugin for SSH credential testing with password and key-based auth.

# Status
status: "in-progress" # pending | in-progress | complete | aborted
current_phase: 8
current_phase_name: "implementation"

# Work Classification (from Phase 2)
work_type: "LARGE" # BUGFIX | SMALL | MEDIUM | LARGE

# Phase Tracking
phases:
  1_setup:
    status: "complete"
    completed_at: "2026-01-27T10:05:00Z"
  2_triage:
    status: "complete"
    completed_at: "2026-01-27T10:10:00Z"
  3_codebase_discovery:
    status: "complete"
    completed_at: "2026-01-27T11:00:00Z"
  4_skill_discovery:
    status: "complete"
    completed_at: "2026-01-27T11:15:00Z"
  5_complexity:
    status: "complete"
    completed_at: "2026-01-27T11:30:00Z"
  6_brainstorming:
    status: "complete"
    completed_at: "2026-01-27T12:00:00Z"
    checkpoint_approved: true
  7_architecture_plan:
    status: "complete"
    completed_at: "2026-01-27T13:00:00Z"
    checkpoint_approved: true
  8_implementation:
    status: "in_progress"
    started_at: "2026-01-27T13:30:00Z"
  9_design_verification:
    status: "pending"
    conditional: true
  10_domain_compliance:
    status: "pending"
  11_code_quality:
    status: "pending"
    retry_count: 0
  12_test_planning:
    status: "pending"
    conditional: true
  13_testing:
    status: "pending"
  14_coverage_verification:
    status: "pending"
  15_test_quality:
    status: "pending"
    retry_count: 0
  16_completion:
    status: "pending"

# Brutus-Specific
plugin_type: "key-based" # password-only | key-based
default_port: 22
technologies_detected: ["Go", "brutus patterns"]
skills_mapped:
  - writing-brutus-plugins
  - go-best-practices

# Protocol Research (from Phase 3)
protocol_research:
  auth_strategy: "Password auth with fallback to key-based via KeyPlugin interface"
  auth_methods:
    - "password"
    - "publickey"
  error_classification:
    - "auth_failure: SSH handshake fails with 'authentication failed'"
    - "connection_error: Dial timeout or connection refused"
  dependencies:
    - "golang.org/x/crypto/ssh"

# Complexity Assessment (from Phase 5)
complexity:
  score: 16
  tier: "MODERATE"
  execution_strategy:
    batch_size: "3-5"
    parallelization: "where_independent"

# Brainstorming (from Phase 6)
brainstorming:
  selected_approach: "A"
  approach_name: "Password + Key Auth"
  rationale: "Protocol supports both auth methods"

# Agent Tracking
agents_contributed:
  - agent: "Explore"
    phase: 3
    status: "complete"
  - agent: "capability-lead"
    phase: 7
    status: "complete"
  - agent: "capability-developer"
    phase: 8
    status: "in_progress"

# Artifacts Created
artifacts:
  - path: "triage.md"
    phase: 2
  - path: "discovery.md"
    phase: 3
  - path: "protocol-research.md"
    phase: 3
  - path: "skill-manifest.yaml"
    phase: 4
  - path: "complexity.md"
    phase: 5
  - path: "brainstorming.md"
    phase: 6
  - path: "architecture.md"
    phase: 7
  - path: "plan.md"
    phase: 7

# Feedback Tracking
feedback_iterations: 0

# Worktree Info
worktree:
  path: ".worktrees/ssh-brutus"
  pre_plugin_commit: "abc123def456"

# Abort Info (if aborted)
abort_info:
  aborted: false
```

---

## Lifecycle

### Creation (Phase 1)

MANIFEST.yaml is created in Phase 1: Setup with:

- Identity fields (protocol_name, slug, skill)
- Initial phase status (1_setup: complete)
- Worktree information

### Updates

Update MANIFEST after:

- Each phase completion
- Agent completion
- Artifact creation
- Checkpoint approval
- Status changes

### Resume Protocol

On session resume:

1. **Read MANIFEST.yaml**

   ```bash
   cat .brutus-development/MANIFEST.yaml
   ```

2. **Check status**
   - If `status: aborted` - see abort_info for cleanup options
   - If `status: complete` - nothing to do
   - If `status: in-progress` - resume from current_phase

3. **Restore TodoWrite**

   ```
   For each phase in phases:
     If status == "complete": mark todo completed
     If status == "in_progress": mark todo in_progress
     If status == "pending": mark todo pending
   ```

4. **Continue from current_phase**
   - Load phase reference file
   - Check any partial agent work
   - Resume execution

---

## Key Fields

### status

Global workflow status:

- `pending` - Not started
- `in-progress` - Active development
- `complete` - Successfully finished
- `aborted` - Terminated early (see abort_info)

### current_phase / current_phase_name

Pointer to active phase for resume:

- `current_phase: 8`
- `current_phase_name: "implementation"`

### work_type

Classification from Phase 2 triage:

- Determines which phases execute
- Determines checkpoint frequency

### phases.{N}\_{name}.status

Per-phase status:

- `pending` - Not started
- `in_progress` - Currently executing
- `complete` - Finished successfully
- `skipped` - Bypassed (conditional phase)
- `aborted` - Terminated early

### phases.{N}\_{name}.conditional

Marks phases that may be skipped based on work_type.

### agents_contributed

History of agents spawned, for debugging and context.

---

## Integration with TodoWrite

| MANIFEST Status | TodoWrite Status                    |
| --------------- | ----------------------------------- |
| pending         | pending                             |
| in_progress     | in_progress                         |
| complete        | completed                           |
| skipped         | completed (with "(skipped)" suffix) |

---

## Related References

- [Phase 1: Setup](phase-1-setup.md) - MANIFEST creation
- [Directory Structure](directory-structure.md) - File locations
- [Emergency Abort](emergency-abort.md) - Abort handling
