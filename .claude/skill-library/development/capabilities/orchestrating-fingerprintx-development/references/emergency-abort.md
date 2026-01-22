# Emergency Abort Protocol

**Safe termination of fingerprintx plugin development workflows with state preservation.**

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

### Fingerprintx-Specific Triggers

#### 6. Protocol Research Blocking

- Protocol detection strategy proves unviable
- Cannot obtain sufficient test vectors from Shodan
- Version extraction impossible (closed-source with no markers)

```json
{
  "abort_reason": "protocol_research_blocking",
  "abort_phase": "Phase 3: Codebase Discovery",
  "abort_trigger_detail": "No viable banner pattern found - protocol may require binary parsing"
}
```

#### 7. Critical Compliance Finding

- Domain compliance (Phase 10) reveals fundamental architecture flaw
- Refactoring would require restarting from Phase 7
- Continued development would compound technical debt

```json
{
  "abort_reason": "critical_compliance_finding",
  "abort_phase": "Phase 10: Domain Compliance",
  "abort_trigger_detail": "Plugin lacks required type constant in types.go"
}
```

#### 8. Test Infrastructure Unavailable

- Shodan API unavailable for test vector collection
- Docker not running for container-based tests
- Target service unreachable for live validation

```json
{
  "abort_reason": "test_infrastructure_unavailable",
  "abort_phase": "Phase 13: Testing",
  "abort_trigger_detail": "Docker daemon not running - cannot start test containers"
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
  "abort_reason": "protocol_research_blocking",
  "abort_phase": "Phase 3: Codebase Discovery",
  "abort_trigger_detail": "No viable banner pattern found - protocol may require binary parsing"
}
```

### Step 2: CAPTURE State

**Write current state to MANIFEST.yaml:**

```yaml
workflow_id: "fingerprintx-mysql-20260117"
protocol_name: "{Protocol Name}"
protocol_slug: "{protocol-id}"
status: aborted

phases_completed:
  - "Phase 1: Setup"
  - "Phase 2: Brainstorming"
phases_in_progress:
  - "Phase 3: Codebase Discovery"
phases_pending:
  - "Phase 4: Planning"
  - "Phase 7: Architecture"
  - "Phase 8: Implementation"
  - "Phase 10: Domain Compliance"
  - "Phase 13: Testing"
  - "Phase 14: Review"

current_phase: 3
current_phase_name: "codebase_discovery"

agents_spawned:
  - agent: "Explore"
    phase: "Phase 3"
    status: partial

plugin_files:
  - "pkg/plugins/services/{protocol}/plugin.go"
  - "pkg/plugins/types.go"
  - "pkg/plugins/plugins.go"

uncommitted_changes: true

abort_info:
  aborted: true
  abort_reason: "protocol_research_blocking"
  abort_phase: "Phase 3: Codebase Discovery"
  abort_timestamp: "2026-01-17T15:30:00Z"
  abort_trigger_detail: "No viable banner pattern found - protocol may require binary parsing"
  cleanup_choice: null
  cleanup_performed: false
  can_resume: true
  resume_instructions: "Re-run with binary protocol research approach"
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
echo "State preserved in MANIFEST.yaml. Resume with: /fingerprintx resume {workflow_id}"
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
# Archive artifacts before removing worktree
cp -r {worktree-dir}/{protocol}-fingerprintx/.fingerprintx-development/ \
      .claude/.output/archived/{protocol}-fingerprintx-{timestamp}/

# Remove worktree but preserve output directory
git worktree remove {worktree-dir}/{protocol}-fingerprintx

# Keep MANIFEST.yaml in archived location
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

**Plugin Code Rollback:**

```bash
cd {worktree-dir}/{protocol}-fingerprintx
git checkout -- pkg/plugins/services/{protocol}/
git checkout -- pkg/plugins/types.go
git checkout -- pkg/plugins/plugins.go
git clean -fd pkg/plugins/services/{protocol}/

# Remove worktree
git worktree remove {worktree-dir}/{protocol}-fingerprintx
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
# Force remove worktree (discards all changes)
git worktree remove {worktree-dir}/{protocol}-fingerprintx --force

# Remove OUTPUT_DIR and archives
rm -rf .claude/.output/{protocol}-fingerprintx/
rm -rf .claude/.output/archived/{protocol}-fingerprintx-*/

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

**Workflow**: Fingerprintx: {Protocol Name}
**Abort Reason**: {abort_reason} - {abort_trigger_detail}
**Phases Completed**: X/Y
**Files Modified**: N files (uncommitted)

**Cleanup**: [User choice from Step 3]

**What Happened**:

- Phase 1 (Setup): Complete
- Phase 2 (Brainstorming): Complete
- Phase 3 (Codebase Discovery): Partial - {agent} blocked {N} times

**Recommendations**:

- Review protocol research notes in MANIFEST.yaml
- Consider alternative detection approach (binary vs text)
- Verify Docker/Shodan availability before resuming

[If can_resume: true]
**Resume Command**: /fingerprintx resume {workflow_id}
```

---

## MANIFEST.yaml abort_info Schema

```yaml
abort_info:
  aborted: boolean
  abort_reason: "user_requested" | "escalation_threshold_exceeded" |
               "critical_security_finding" | "unrecoverable_error" |
               "cost_time_exceeded" | "protocol_research_blocking" |
               "critical_compliance_finding" | "test_infrastructure_unavailable"
  abort_phase: string  # e.g., "Phase 3: Codebase Discovery"
  abort_timestamp: string  # ISO 8601
  abort_trigger_detail: string  # Specific error message
  cleanup_choice: "keep_everything" | "keep_artifacts_only" |
                 "rollback_changes" | "full_cleanup" | null
  cleanup_performed: boolean
  can_resume: boolean
  resume_instructions: string  # Optional
```

---

## Fingerprintx-Specific abort_reason Values

| Reason                            | Phase | Description                              |
| --------------------------------- | ----- | ---------------------------------------- |
| `protocol_research_blocking`      | 3     | Cannot develop viable detection strategy |
| `critical_compliance_finding`     | 10    | Plugin architecture fundamentally flawed |
| `test_infrastructure_unavailable` | 13    | Shodan/Docker unavailable                |

---

## Resume Protocol

**When can_resume: true:**

1. User runs: `/fingerprintx resume {workflow_id}`
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

- Complete protocol research thoroughly in Phase 3
- Use checkpoints to validate assumptions early
- Monitor escalation patterns (2 escalations → warning, 3 → abort)
- Track token costs (warn at $5, abort at $10)
- Use timeouts (warn at 1 hour, abort at 2 hours)
- Verify Docker/Shodan availability before Phase 13

**Abort is the safety net, not the plan.**

---

## Related References

- [phase-1-setup.md](phase-1-setup.md) - Records pre_plugin_commit for rollback
- [progress-persistence.md](progress-persistence.md) - MANIFEST.yaml format
- [directory-structure.md](directory-structure.md) - Worktree and artifact locations
