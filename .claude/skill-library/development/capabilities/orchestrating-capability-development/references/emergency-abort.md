# Emergency Abort Protocol

**Safe termination of capability development workflows with state preservation.**

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

### Capability-Specific Triggers

#### 6. VQL Capability Failures

- Velociraptor parser rejects syntactically valid-looking query
- VQL artifact schema incompatible with target Velociraptor version
- Recursive query causes Velociraptor agent crash

```json
{
  "abort_reason": "vql_capability_failure",
  "abort_phase": "Phase 8: Implementation",
  "abort_trigger_detail": "VQL artifact rejected - unknown plugin 'parse_json_array' in target version"
}
```

#### 7. Nuclei Template Validation Failure

- Template schema changed, existing patterns invalid
- Nuclei engine version incompatible with template syntax
- Template causes Nuclei crash on execution

```json
{
  "abort_reason": "nuclei_template_failure",
  "abort_phase": "Phase 8: Implementation",
  "abort_trigger_detail": "Nuclei v3.0 rejects 'extractors' syntax used in template"
}
```

#### 8. Scanner Binary Missing/Incompatible

- External scanner (nmap, masscan, etc.) not installed
- Scanner version incompatible with Janus wrapper
- Scanner license expired or invalid

```json
{
  "abort_reason": "scanner_unavailable",
  "abort_phase": "Phase 13: Testing",
  "abort_trigger_detail": "masscan binary not found in PATH - required for port scanning capability"
}
```

#### 9. Test Infrastructure Unavailable

- Velociraptor agent unavailable for VQL testing
- Docker not running for container-based tests
- Target test environment unreachable

```json
{
  "abort_reason": "test_infrastructure_unavailable",
  "abort_phase": "Phase 13: Testing",
  "abort_trigger_detail": "Velociraptor server unreachable at localhost:8001 - cannot validate VQL"
}
```

#### 10. Detection Strategy Unviable

- Capability detection approach fundamentally flawed
- False positive rate unacceptable (>30%)
- Cannot distinguish target from similar services

```json
{
  "abort_reason": "detection_strategy_unviable",
  "abort_phase": "Phase 3: Codebase Discovery",
  "abort_trigger_detail": "VQL capability cannot distinguish target software from 5 similar products"
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
  "abort_reason": "vql_capability_failure",
  "abort_phase": "Phase 8: Implementation",
  "abort_trigger_detail": "VQL artifact rejected by Velociraptor parser"
}
```

### Step 2: CAPTURE State

**Write current state to MANIFEST.yaml:**

```yaml
workflow_id: "capability-cloud-storage-detection-20260117"
capability_name: "{Capability Name}"
capability_type: "vql" | "nuclei" | "janus" | "fingerprintx" | "scanner"
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
  - agent: "capability-lead"
    phase: "Phase 2"
    status: complete
  - agent: "capability-developer"
    phase: "Phase 8"
    status: partial

capability_files:
  vql:
    - "modules/chariot-aegis-capabilities/{capability}/*.vql"
  nuclei:
    - "modules/nuclei-templates/{category}/{template}.yaml"
  janus:
    - "modules/janus/pkg/{toolchain}/*.go"

validation_status:
  syntax_valid: true | false
  schema_valid: true | false
  execution_tested: true | false

uncommitted_changes: true

abort_info:
  aborted: true
  abort_reason: "vql_capability_failure"
  abort_phase: "Phase 8: Implementation"
  abort_timestamp: "2026-01-17T15:30:00Z"
  abort_trigger_detail: "VQL artifact rejected by Velociraptor parser"
  cleanup_choice: null
  cleanup_performed: false
  can_resume: true
  resume_instructions: "Check Velociraptor version compatibility, resume from Phase 8"
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
echo "State preserved in MANIFEST.yaml. Resume with: /capability resume {workflow_id}"
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

**VQL Capability Rollback:**

```bash
cd modules/chariot-aegis-capabilities
git checkout -- {capability}/
git clean -fd {capability}/

# Remove worktree
git worktree remove .worktrees/{workflow-id}
```

**Nuclei Template Rollback:**

```bash
cd modules/nuclei-templates
git checkout -- {category}/{template}.yaml

# Remove worktree
git worktree remove .worktrees/{workflow-id}
```

**Janus Tool Chain Rollback:**

```bash
cd modules/janus
git checkout -- pkg/{toolchain}/
git clean -fd pkg/{toolchain}/

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
# VQL capability cleanup
rm -rf modules/chariot-aegis-capabilities/{capability}/

# Nuclei template cleanup
rm -rf modules/nuclei-templates/{category}/{template}.yaml

# Janus cleanup (built binaries)
rm -rf modules/janus/bin/{toolchain}

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

**Workflow**: Capability: {Capability Name}
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
- Check capability type compatibility (VQL/Nuclei/Janus version)
- Consider alternative detection strategy

[If can_resume: true]
**Resume Command**: /capability resume {workflow_id}
```

---

## MANIFEST.yaml abort_info Schema

```yaml
abort_info:
  aborted: boolean
  abort_reason: "user_requested" | "escalation_threshold_exceeded" |
               "critical_security_finding" | "unrecoverable_error" |
               "cost_time_exceeded" | "vql_capability_failure" |
               "nuclei_template_failure" | "scanner_unavailable" |
               "test_infrastructure_unavailable" | "detection_strategy_unviable"
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

1. User runs: `/capability resume {workflow_id}`
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
- Verify scanner/runtime availability before Phase 8

**Abort is the safety net, not the plan.**

---

## Related References

- [progress-persistence.md](progress-persistence.md) - State capture format
