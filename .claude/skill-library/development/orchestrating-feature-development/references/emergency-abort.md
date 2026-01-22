# Emergency Abort Protocol

**Safe termination of feature development workflows with state preservation.**

---

## Abort Triggers

Execute emergency abort when ANY of these conditions occur:

### Generic Triggers

#### 1. User Request

- Explicit commands: 'stop', 'cancel', 'abort'
- User terminates session without completion
- Keyboard interrupt (Ctrl+C)

#### 2. Escalation Threshold Exceeded

- **3+ escalations in same phase** - Pattern of repeated blocks indicates fundamental issue
- Escalations span multiple agent types (not just one struggling agent)

#### 3. Critical Security Finding

- Security reviewer identifies P0/P1 vulnerability
- Immediate remediation required before proceeding
- Continued development would compound security debt

#### 4. Unrecoverable Error

- Agent crashes repeatedly (3+ times on same task)
- System resource exhaustion (OOM, disk full)
- External dependency failure (API unavailable, credentials invalid)

#### 5. Cost/Time Budget Exceeded

- **Token cost >$10** for single workflow
- **Elapsed time >2 hours** without substantial progress
- Rate limits hit, cannot proceed

### Feature-Specific Triggers

#### 6. Build Infrastructure Failure

- **Frontend**: Vite/webpack crashes repeatedly, TypeScript compiler OOM
- **Backend**: Go build fails with unresolvable dependency conflicts
- **Full-stack**: Both frontend and backend builds broken simultaneously

```json
{
  "abort_reason": "build_infrastructure_failure",
  "abort_phase": "Phase 8: Implementation",
  "abort_trigger_detail": "Vite dev server crashes on startup - node_modules corruption suspected"
}
```

#### 7. Test Infrastructure Unavailable

- **E2E**: Playwright browsers fail to install/launch
- **Backend**: Test database unavailable or corrupted
- **Integration**: External test services unreachable

```json
{
  "abort_reason": "test_infrastructure_unavailable",
  "abort_phase": "Phase 13: Testing",
  "abort_trigger_detail": "Playwright chromium binary missing, install fails with EACCES"
}
```

#### 8. Deployment Failure (Backend Features)

- SAM deploy fails repeatedly with CloudFormation errors
- Lambda function size exceeds limits
- API Gateway configuration invalid

```json
{
  "abort_reason": "deployment_failure",
  "abort_phase": "Phase 8: Implementation",
  "abort_trigger_detail": "CloudFormation stack UPDATE_ROLLBACK_COMPLETE - cannot proceed"
}
```

#### 9. Component Library Breaking Change

- chariot-ui-components update breaks existing components
- TanStack Query major version incompatibility
- React version conflict

```json
{
  "abort_reason": "dependency_breaking_change",
  "abort_phase": "Phase 8: Implementation",
  "abort_trigger_detail": "chariot-ui-components@3.0 removed Table component used by feature"
}
```

---

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
  "abort_reason": "build_infrastructure_failure",
  "abort_phase": "Phase 8: Implementation",
  "abort_trigger_detail": "Vite dev server OOM after adding large component tree"
}
```

### Step 2: CAPTURE State

**Write current state to MANIFEST.yaml:**

```yaml
workflow_id: "feature-asset-management-20260117"
feature_name: "{Feature Name}"
feature_type: "frontend" | "backend" | "full-stack"
status: aborted

phases_completed:
  - "Phase 1: Discovery"
  - "Phase 2: Architecture"
phases_in_progress:
  - "Phase 8: Implementation"
phases_pending:
  - "Phase 13: Testing"
  - "Phase 14: Review"

current_phase: 8
current_phase_name: "implementation"

agents_spawned:
  - agent: "Explore"
    phase: "Phase 1"
    status: complete
  - agent: "frontend-lead"
    phase: "Phase 2"
    status: complete
  - agent: "frontend-developer"
    phase: "Phase 8"
    status: partial

affected_files:
  frontend:
    - "modules/chariot/ui/src/components/{Feature}/*.tsx"
  backend:
    - "modules/chariot/backend/pkg/{feature}/*.go"

build_status:
  frontend: "failing" | "passing" | "not_applicable"
  backend: "failing" | "passing" | "not_applicable"

uncommitted_changes: true

abort_info:
  aborted: true
  abort_reason: "build_infrastructure_failure"
  abort_phase: "Phase 8: Implementation"
  abort_timestamp: "2026-01-17T15:30:00Z"
  abort_trigger_detail: "Vite dev server OOM after adding large component tree"
  cleanup_choice: null
  cleanup_performed: false
  can_resume: true
  resume_instructions: "Clear node_modules, reinstall dependencies, resume from Phase 8"
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
echo "State preserved in MANIFEST.yaml. Resume with: /feature resume {workflow_id}"
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

**Frontend Feature Rollback:**

```bash
cd modules/chariot/ui
git checkout -- src/components/{Feature}/
git clean -fd src/components/{Feature}/

# Remove worktree
git worktree remove .worktrees/{workflow-id}
```

**Backend Feature Rollback:**

```bash
cd modules/chariot/backend
git checkout -- pkg/{feature}/
git clean -fd pkg/{feature}/

# Remove worktree
git worktree remove .worktrees/{workflow-id}
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
# Frontend cleanup
rm -rf modules/chariot/ui/node_modules/.vite
rm -rf modules/chariot/ui/dist/

# Backend cleanup (SAM artifacts)
rm -rf modules/chariot/backend/.aws-sam/
sam delete --stack-name chariot-{feature}-dev --no-prompts

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

**Workflow**: Feature: {Feature Name}
**Abort Reason**: {abort_reason} - {abort_trigger_detail}
**Phases Completed**: X/Y
**Files Modified**: N files (uncommitted)

**Cleanup**: [User choice from Step 3]

**What Happened**:

- Phase 1 (Discovery): Complete
- Phase 2 (Architecture): Complete
- Phase 8 (Implementation): Partial - {agent} blocked {N} times

**Recommendations**:

- Review escalation logs in MANIFEST.yaml
- Consider simplifying Phase 8 scope
- Ensure all architecture decisions were captured

[If can_resume: true]
**Resume Command**: /feature resume {workflow_id}
```

---

## MANIFEST.yaml abort_info Schema

```yaml
abort_info:
  aborted: boolean
  abort_reason: "user_requested" | "escalation_threshold_exceeded" |
               "critical_security_finding" | "unrecoverable_error" |
               "cost_time_exceeded" | "build_infrastructure_failure" |
               "test_infrastructure_unavailable" | "deployment_failure" |
               "dependency_breaking_change"
  abort_phase: string  # e.g., "Phase 8: Implementation"
  abort_timestamp: string  # ISO 8601
  abort_trigger_detail: string  # Specific error message
  cleanup_choice: "keep_everything" | "keep_artifacts_only" |
                 "rollback_changes" | "full_cleanup" | null
  cleanup_performed: boolean
  can_resume: boolean
  resume_instructions: string  # Optional
```

---

## Resume Protocol

**When can_resume: true:**

1. User runs: `/feature resume {workflow_id}`
2. Orchestrator loads MANIFEST.yaml
3. Reads `phases_completed`, `phases_pending`, `abort_phase`
4. Skips completed phases
5. Resumes from `abort_phase` with context

**When can_resume: false:**

- Progress state preserved for analysis only
- Cannot automatically resume
- User must manually restart workflow with lessons learned

---

## Prevention vs Abort

**Prefer prevention over abort:**

- Set realistic checkpoints (don't let phases run too long without review)
- Monitor escalation patterns (2 escalations → warning, 3 → abort)
- Track token costs (warn at $5, abort at $10)
- Use timeouts (warn at 1 hour, abort at 2 hours)

**Abort is the safety net, not the plan.**

---

## Related References

- [progress-persistence.md](progress-persistence.md) - State capture format
