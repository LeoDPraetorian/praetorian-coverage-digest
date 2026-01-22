# Emergency Abort Protocol

**Safe termination of multi-agent orchestration workflows with state preservation.**

## Abort Triggers

Execute emergency abort when ANY of these conditions occur:

### 1. User Request

- Explicit commands: 'stop', 'cancel', 'abort'
- User terminates session without completion
- Keyboard interrupt (Ctrl+C)

### 2. Escalation Threshold Exceeded

- **3+ escalations in same phase** - Pattern of repeated blocks indicates fundamental issue
- Escalations span multiple agent types (not just one struggling agent)

### 3. Critical Security Finding

- Security reviewer identifies P0/P1 vulnerability
- Immediate remediation required before proceeding
- Continued development would compound security debt

### 4. Unrecoverable Error

- Agent crashes repeatedly (3+ times on same task)
- System resource exhaustion (OOM, disk full)
- External dependency failure (API unavailable, credentials invalid)

### 5. Cost/Time Budget Exceeded

- **Token cost >$10** for single workflow
- **Elapsed time >2 hours** without substantial progress
- Rate limits hit, cannot proceed

## Abort Flow (5 Steps)

### Step 1: STOP All Work

**Immediately cease all agent activity:**

```typescript
// Cancel pending Task calls
stopAllPendingAgents();

// Do NOT spawn new agents
// Do NOT continue with next phase
```

**Log abort trigger:**

```json
{
  "abort_timestamp": "2026-01-17T15:30:00Z",
  "abort_reason": "escalation_threshold_exceeded",
  "abort_phase": "Phase 3: Implementation",
  "abort_trigger_detail": "3 escalations in implementation phase"
}
```

### Step 2: CAPTURE State

**Write current state to MANIFEST.yaml:**

```yaml
workflow_id: "feature-asset-management-20260117"
status: aborted
phases_completed:
  - "Phase 1: Discovery"
  - "Phase 2: Architecture"
phases_in_progress:
  - "Phase 3: Implementation"
phases_pending:
  - "Phase 4: Testing"
  - "Phase 5: Review"
agents_spawned:
  - agent: "Explore"
    phase: "Phase 1"
    status: complete
  - agent: "frontend-lead"
    phase: "Phase 2"
    status: complete
  - agent: "frontend-developer"
    phase: "Phase 3"
    status: partial
files_modified:
  - "src/components/Asset/AssetList.tsx"
  - "src/hooks/useAssets.ts"
uncommitted_changes: true
abort_info:
  aborted: true
  abort_reason: "escalation_threshold_exceeded"
  abort_phase: "Phase 3: Implementation"
  abort_timestamp: "2026-01-17T15:30:00Z"
  cleanup_choice: null
  cleanup_performed: false
  can_resume: true
  resume_instructions: "Re-run orchestration, skip to Phase 3 with context from MANIFEST.yaml"
```

### Step 3: PRESENT Cleanup Options

**Use AskUserQuestion to present cleanup choices:**

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Workflow aborted. How should we handle the work in progress?",
      header: "Cleanup",
      multiSelect: false,
      options: [
        {
          label: "Keep everything",
          description: "Preserve all changes and state. Can resume later with full context.",
        },
        {
          label: "Keep artifacts only",
          description: "Save output files but delete git worktree. Cannot resume orchestration.",
        },
        {
          label: "Rollback changes",
          description: "Git reset to pre-workflow state. Lose all work but clean slate.",
        },
        {
          label: "Full cleanup",
          description: "Delete all artifacts, worktree, and uncommitted changes. Complete removal.",
        },
      ],
    },
  ],
});
```

### Step 4: EXECUTE Cleanup

Based on user choice, perform cleanup:

#### Option 1: Keep Everything

```bash
# No cleanup - everything remains as-is
echo "State preserved in MANIFEST.yaml. Resume with: /orchestrate resume {workflow_id}"
```

**Sets:**

```json
{
  "cleanup_choice": "keep_everything",
  "cleanup_performed": false,
  "can_resume": true
}
```

#### Option 2: Keep Artifacts Only

```bash
# Remove worktree but preserve output directory
git worktree remove .worktrees/{workflow-id}

# Keep OUTPUT_DIR
# Keep MANIFEST.yaml
```

**Sets:**

```json
{
  "cleanup_choice": "keep_artifacts_only",
  "cleanup_performed": true,
  "can_resume": false
}
```

#### Option 3: Rollback Changes

```bash
# Stash or discard uncommitted changes
git reset --hard HEAD

# Remove worktree
git worktree remove .worktrees/{workflow-id}

# Keep OUTPUT_DIR for analysis
```

**Sets:**

```json
{
  "cleanup_choice": "rollback_changes",
  "cleanup_performed": true,
  "can_resume": false
}
```

#### Option 4: Full Cleanup

```bash
# Remove worktree
git worktree remove .worktrees/{workflow-id}

# Remove OUTPUT_DIR
rm -rf .claude/.output/{workflow-slug}/

# Remove progress file
rm .claude/.output/progress/{workflow-id}.json
```

**Sets:**

```json
{
  "cleanup_choice": "full_cleanup",
  "cleanup_performed": true,
  "can_resume": false
}
```

### Step 5: REPORT Final State

**Present summary to user:**

```markdown
## Workflow Aborted

**Workflow**: Feature: Asset Management
**Abort Reason**: Escalation threshold exceeded (3+ escalations in Phase 3)
**Phases Completed**: 2/5 (Discovery, Architecture)
**Files Modified**: 2 files (uncommitted)

**Cleanup**: [User choice from Step 3]

**What Happened**:

- Phase 1 (Discovery): Complete
- Phase 2 (Architecture): Complete
- Phase 3 (Implementation): Partial - frontend-developer blocked 3 times

**Recommendations**:

- Review escalation logs in MANIFEST.yaml
- Consider simplifying Phase 3 scope
- Ensure all architecture decisions were captured

[If can_resume: true]
**Resume Command**: /orchestrate resume feature-asset-management-20260117
```

## MANIFEST.yaml abort_info Schema

```yaml
abort_info:
  aborted: boolean
  abort_reason: "user_requested" | "escalation_threshold_exceeded" |
               "critical_security_finding" | "unrecoverable_error" |
               "cost_time_exceeded"
  abort_phase: string  # e.g., "Phase 3: Implementation"
  abort_timestamp: string  # ISO 8601
  cleanup_choice: "keep_everything" | "keep_artifacts_only" |
                 "rollback_changes" | "full_cleanup" | null
  cleanup_performed: boolean
  can_resume: boolean
  resume_instructions: string  # Optional
```

## Resume Protocol

**When can_resume: true:**

1. User runs: `/orchestrate resume {workflow_id}`
2. Orchestrator loads MANIFEST.yaml
3. Reads `phases_completed`, `phases_pending`, `abort_phase`
4. Skips completed phases
5. Resumes from `abort_phase` with context

**When can_resume: false:**

- Progress state preserved for analysis only
- Cannot automatically resume
- User must manually restart workflow with lessons learned

## Prevention vs Abort

**Prefer prevention over abort:**

- Set realistic checkpoints (don't let phases run too long without review)
- Monitor escalation patterns (2 escalations → warning, 3 → abort)
- Track token costs (warn at $5, abort at $10)
- Use timeouts (warn at 1 hour, abort at 2 hours)

**Abort is the safety net, not the plan.**
