# Workflow Handoff Protocol (Integration Development)

**Cross-session resume and sub-workflow integration.**

## Overview

When a skill is invoked as part of a larger workflow (e.g., developing-integrations called from orchestrating-integration-development2), it needs to integrate smoothly without creating orphaned sub-workflows.

## Detection Protocol

**Step 1: Check for Parent Workflow**

```javascript
// Pseudocode - actual implementation varies by tool
if (TodoWrite.exists() && TodoWrite.hasActiveItems()) {
  // Parent workflow exists - integrate
  parent_workflow = true;
} else {
  // No parent - create own tracking
  parent_workflow = false;
}
```

**Step 2: Integrate or Initialize**

| Scenario      | Action                                                          |
| ------------- | --------------------------------------------------------------- |
| Parent exists | Update parent's todo status, return structured output to parent |
| No parent     | Create own TodoWrite tracking for this workflow                 |

## Structured Output Format

When returning to parent workflow:

```json
{
  "status": "complete",
  "workflow_type": "integration_development",
  "outputs": ["client.go", "collector.go", "models.go", "*_test.go"],
  "next_steps": ["Continue to Phase 11 (Code Quality)", "Run P0 compliance checks"],
  "signal": "WORKFLOW_CONTINUATION_REQUIRED"
}
```

**Critical**: Include `WORKFLOW_CONTINUATION_REQUIRED` signal so parent knows to resume its workflow.

## Integration-Specific Handoff Data

When handing off integration development state:

```yaml
handoff:
  vendor_name: "qualys"
  integration_type: "asset_discovery"

  # API state
  api_endpoints_implemented:
    - GET /assets
    - POST /scans
  api_endpoints_remaining:
    - GET /vulnerabilities

  # Authentication (NEVER include actual tokens)
  auth_type: "api_key"
  auth_configured: true
  auth_env_vars: ["QUALYS_API_KEY", "QUALYS_API_SECRET"]

  # Test data setup
  mock_server_running: false
  test_fixtures_created: true
  test_fixtures_location: "testdata/qualys/"

  # P0 compliance status
  p0_compliance:
    VMFilter: "implemented"
    CheckAffiliation: "implemented"
    errgroup: "implemented"
    ValidateCredentials: "pending"

  # Files modified
  files_created:
    - backend/pkg/integrations/qualys/client.go
    - backend/pkg/integrations/qualys/collector/collector.go
  files_modified: []

  # Resume instructions
  resume_at: "Phase 11: Code Quality"
  blocked_on: null
```

## Parent Workflow Continuation

Parent orchestrator must:

1. **Receive** structured output with continuation signal
2. **Check TodoWrite** for remaining pending steps
3. **Resume** at next pending step (don't stop or ask for permission)

### Anti-Pattern (WRONG)

```
developing-integrations completes
→ "Integration implementation complete! Files: ..."
→ STOPS and waits for user ❌
```

### Correct Pattern

```
developing-integrations completes with WORKFLOW_CONTINUATION_REQUIRED
→ Check TodoWrite
→ See "Phase 11: Code Quality" is pending
→ Automatically proceed to Phase 11
→ ... continue through Phase 16
→ "Integration complete" ✅
```

## State Preservation

**Parent workflow should preserve:**

- Original task description
- TodoWrite items created before handoff
- Progress file metadata
- MANIFEST.yaml entries

**Child workflow should preserve:**

- Output directory structure
- Implementation artifacts
- Metadata for traceability
- P0 compliance status

## Cross-Session Resume

When resuming an integration workflow after context loss:

### Step 1: Read Progress File

```bash
Read(".feature-development/MANIFEST.yaml")
```

### Step 2: Identify Resume Point

```yaml
# From MANIFEST.yaml
phases:
  1_setup: { status: "complete" }
  2_triage: { status: "complete" }
  ...
  8_implementation: { status: "in_progress" }  # ← Resume here
```

### Step 3: Restore Context

```bash
# Read relevant artifacts
Read(".feature-development/architecture-plan.md")
Read(".feature-development/discovery.md")
Read(".feature-development/skill-manifest.yaml")
```

### Step 4: Continue Execution

Resume at the incomplete phase, not from the beginning.

## Integration Workflow Sub-Skills

| Sub-Skill               | Output               | Handoff To                      |
| ----------------------- | -------------------- | ------------------------------- |
| developing-integrations | Implementation files | Phase 11: Code Quality          |
| validating-integrations | Compliance report    | Phase 16: Completion            |
| testing-integrations    | Test files, coverage | Phase 14: Coverage Verification |

## Examples

### Integration Development with Architecture

Parent: `orchestrating-integration-development2`
Child: `integration-lead` (architecture)

```
Phase 6: Brainstorming ✅
Phase 7: Architecture (invoke integration-lead) ✅
  → integration-lead creates architecture-plan.md
  → returns {signal: "WORKFLOW_CONTINUATION_REQUIRED"}
Phase 8: Implementation (parent resumes HERE) ← automatic continuation
Phase 9: Design Verification
...
```

### Implementation with Library Skill

Parent: `orchestrating-integration-development2`
Child: `developing-integrations` (LIBRARY)

```
Phase 7: Architecture ✅
Phase 8: Implementation (Read developing-integrations, invoke integration-developer) ✅
  → integration-developer implements client/collector
  → returns implementation summary
  → returns {signal: "WORKFLOW_CONTINUATION_REQUIRED"}
Phase 9: Design Verification (parent resumes HERE)
...
```

---

## Related References

- [progress-persistence.md](progress-persistence.md) - Progress file format
- [checkpoint-configuration.md](checkpoint-configuration.md) - Checkpoint settings
