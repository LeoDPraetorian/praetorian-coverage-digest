# Emergency Abort Protocol

**Safe termination of integration development workflows with state preservation.**

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

### Integration-Specific Triggers

#### 6. Vendor API Authentication Failure

- OAuth token refresh failing repeatedly
- API key revoked or expired
- SSO/SAML integration broken

```json
{
  "abort_reason": "vendor_auth_failure",
  "abort_phase": "Phase 8: Implementation",
  "abort_trigger_detail": "OAuth refresh token rejected - vendor may have revoked access"
}
```

#### 7. Vendor API Breaking Change

- Endpoint removed or renamed
- Response schema changed incompatibly
- Required field added without notice

```json
{
  "abort_reason": "vendor_api_breaking_change",
  "abort_phase": "Phase 8: Implementation",
  "abort_trigger_detail": "GET /api/v2/assets endpoint returns 404 - vendor migrated to v3"
}
```

#### 8. Rate Limiting Blocking

- Vendor 429s on all requests
- Rate limit quota exhausted for billing period
- Cannot complete testing within rate limits

```json
{
  "abort_reason": "rate_limit_blocking",
  "abort_phase": "Phase 13: Testing",
  "abort_trigger_detail": "Vendor rate limit exceeded (1000/hour), resets in 45 minutes"
}
```

#### 9. P0 Compliance Redesign Required

- VMFilter impossible with vendor's data model
- CheckAffiliation cannot be implemented (no org field)
- Pagination not supported by vendor API

```json
{
  "abort_reason": "p0_compliance_impossible",
  "abort_phase": "Phase 10: Domain Compliance",
  "abort_trigger_detail": "Vendor API has no organization/tenant field - CheckAffiliation cannot be implemented"
}
```

#### 10. Credential Security Issue

- Credentials accidentally logged
- Credentials exposed in error message
- Credential storage pattern violates security policy

```json
{
  "abort_reason": "credential_security_issue",
  "abort_phase": "Phase 11: Code Quality",
  "abort_trigger_detail": "Security review found API key logged in debug output"
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
  "abort_reason": "p0_compliance_impossible",
  "abort_phase": "Phase 10: Domain Compliance",
  "abort_trigger_detail": "Vendor API has no organization field - CheckAffiliation impossible"
}
```

### Step 2: CAPTURE State

**Write current state to MANIFEST.yaml:**

```yaml
workflow_id: "integration-qualys-20260117"
vendor_name: "{Vendor Name}"
vendor_slug: "{vendor-id}"
status: aborted

phases_completed:
  - "Phase 1: Discovery"
  - "Phase 2: Architecture"
  - "Phase 8: Implementation"
phases_in_progress:
  - "Phase 10: Domain Compliance"
phases_pending:
  - "Phase 13: Testing"
  - "Phase 14: Review"

current_phase: 10
current_phase_name: "domain_compliance"

agents_spawned:
  - agent: "Explore"
    phase: "Phase 1"
    status: complete
  - agent: "integration-lead"
    phase: "Phase 2"
    status: complete
  - agent: "integration-developer"
    phase: "Phase 8"
    status: complete
  - agent: "integration-reviewer"
    phase: "Phase 10"
    status: partial

integration_files:
  - "modules/chariot/backend/pkg/integrations/{vendor}/{vendor}.go"
  - "modules/chariot/backend/pkg/integrations/{vendor}/client.go"
  - "modules/chariot/backend/pkg/integrations/{vendor}/collector.go"

p0_compliance:
  vmfilter: "pass" | "fail" | "not_checked"
  checkaffiliation: "pass" | "fail" | "not_checked"
  errgroup: "pass" | "fail" | "not_checked"
  pagination: "pass" | "fail" | "not_checked"
  validatecredentials: "pass" | "fail" | "not_checked"
  error_handling: "pass" | "fail" | "not_checked"
  file_size: "pass" | "fail" | "not_checked"

vendor_api_status:
  authenticated: true | false
  rate_limited: true | false
  last_successful_call: "2026-01-17T15:00:00Z"

uncommitted_changes: true

abort_info:
  aborted: true
  abort_reason: "p0_compliance_impossible"
  abort_phase: "Phase 10: Domain Compliance"
  abort_timestamp: "2026-01-17T15:30:00Z"
  abort_trigger_detail: "Vendor API has no organization field - CheckAffiliation impossible"
  cleanup_choice: null
  cleanup_performed: false
  can_resume: false
  resume_instructions: "Contact vendor about org-level filtering, or request P0 waiver"
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
echo "State preserved in MANIFEST.yaml. Resume with: /integration resume {workflow_id}"
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

**Integration Code Rollback:**

```bash
cd modules/chariot/backend
git checkout -- pkg/integrations/{vendor}/
git clean -fd pkg/integrations/{vendor}/

# Remove from registry if added
# Edit pkg/integrations/registry.go to remove vendor import

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
# Remove integration code
rm -rf modules/chariot/backend/pkg/integrations/{vendor}/

# Remove from registry
# Edit pkg/integrations/registry.go to remove vendor import

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

### Credential Cleanup (CRITICAL)

**If credentials were exposed, perform immediately regardless of cleanup choice:**

```bash
# 1. Revoke exposed credentials in vendor portal
# 2. Generate new credentials
# 3. Update secrets manager
# 4. Verify old credentials no longer work
```

### Test Data Cleanup

```bash
# Remove any test data created in vendor system
# Check vendor portal for orphaned resources
```

### Step 5: REPORT Final State

**Present summary to user:**

```markdown
## Workflow Aborted

**Workflow**: Integration: {Vendor Name}
**Abort Reason**: {abort_reason} - {abort_trigger_detail}
**Phases Completed**: X/Y
**Files Modified**: N files (uncommitted)

**Cleanup**: [User choice from Step 3]

**P0 Compliance Status**:

- VMFilter: {pass/fail/not_checked}
- CheckAffiliation: {pass/fail/not_checked}
- errgroup: {pass/fail/not_checked}
- Pagination: {pass/fail/not_checked}

**What Happened**:

- Phase 1 (Discovery): Complete
- Phase 2 (Architecture): Complete
- Phase 8 (Implementation): Complete
- Phase 10 (Domain Compliance): Partial - P0 requirement blocked

**Recommendations**:

- Review P0 compliance failures in MANIFEST.yaml
- Contact vendor for API capabilities clarification
- Consider requesting P0 waiver with justification

[If can_resume: true]
**Resume Command**: /integration resume {workflow_id}
```

---

## MANIFEST.yaml abort_info Schema

```yaml
abort_info:
  aborted: boolean
  abort_reason: "user_requested" | "escalation_threshold_exceeded" |
               "critical_security_finding" | "unrecoverable_error" |
               "cost_time_exceeded" | "vendor_auth_failure" |
               "vendor_api_breaking_change" | "rate_limit_blocking" |
               "p0_compliance_impossible" | "credential_security_issue"
  abort_phase: string  # e.g., "Phase 10: Domain Compliance"
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

1. User runs: `/integration resume {workflow_id}`
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
- Verify vendor API capabilities before Phase 8
- Check rate limits before heavy testing

**Abort is the safety net, not the plan.**

---

## Related References

- [p0-compliance.md](p0-compliance.md) - P0 requirements checklist
- [progress-persistence.md](progress-persistence.md) - State capture format
