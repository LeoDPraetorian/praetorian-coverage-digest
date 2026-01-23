# Workflow Handoff (Fingerprintx Development)

Protocol for integrating with parent workflows and handling cross-session resume.

## Overview

When this skill is invoked as part of a larger workflow, it needs to integrate smoothly without creating orphaned sub-workflows.

## Detection Protocol

### Step 1: Check for Parent Workflow

```javascript
if (TodoWrite.exists() && TodoWrite.hasActiveItems()) {
  // Parent workflow exists - integrate
  parent_workflow = true;
} else {
  // No parent - create own tracking
  parent_workflow = false;
}
```

### Step 2: Integrate or Initialize

| Scenario      | Action                                                          |
| ------------- | --------------------------------------------------------------- |
| Parent exists | Update parent's todo status, return structured output to parent |
| No parent     | Create own TodoWrite tracking for this workflow                 |

## Structured Output Format

When returning to parent workflow:

```json
{
  "status": "complete",
  "workflow_type": "fingerprintx-development",
  "outputs": [
    "{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/{protocol}.go",
    "{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/{protocol}_test.go"
  ],
  "quality_metrics": {
    "detection_accuracy": 98,
    "version_extraction": 92,
    "test_coverage": 82
  },
  "next_steps": ["Register in plugins.go", "Add type constant"],
  "signal": "WORKFLOW_CONTINUATION_REQUIRED"
}
```

**Critical**: Include `WORKFLOW_CONTINUATION_REQUIRED` signal so parent knows to resume.

## Fingerprintx-Specific Handoff Data

When handing off to or from this workflow, preserve:

| Data Type              | Location                                    | Purpose                        |
| ---------------------- | ------------------------------------------- | ------------------------------ |
| Protocol research      | `.fingerprintx-development/research.md`     | RFC findings, response formats |
| Test targets           | `.fingerprintx-development/test-targets.md` | Docker compose, test instances |
| Detection samples      | `.fingerprintx-development/samples/`        | Response captures for testing  |
| Architecture decisions | `.fingerprintx-development/architecture.md` | Probe design choices           |

## Parent Workflow Continuation

Parent orchestrator must:

1. **Receive** structured output with continuation signal
2. **Check TodoWrite** for remaining pending steps
3. **Resume** at next pending step (don't stop or ask for permission)

### Anti-Pattern (WRONG)

```
fingerprintx workflow completes
→ "Plugin complete! Detection rate: 98%..."
→ STOPS and waits for user ❌
```

### Correct Pattern

```
fingerprintx workflow completes with WORKFLOW_CONTINUATION_REQUIRED
→ Check TodoWrite
→ See "Step 5: Integration tests" is pending
→ Automatically proceed to Step 5
→ ... continue through remaining steps
→ "Development complete" ✅
```

## State Preservation

**Parent workflow preserves:**

- Original task description
- TodoWrite items created before handoff
- Progress file metadata
- MANIFEST.yaml entries

**This workflow preserves:**

- Output directory structure (`.fingerprintx-development/`)
- Protocol research artifacts
- Test fixtures and samples
- Architecture decisions

## Cross-Session Resume

When resuming a fingerprintx workflow in a new session:

### Step 1: Read MANIFEST.yaml

```yaml
workflow:
  status: "in_progress"
  current_phase: 8
  completed_phases: [1, 2, 3, 4, 5, 6, 7]
  pending_phases: [8, 9, 10, 11, 12, 13, 14, 15, 16]
```

### Step 2: Load Phase Context

```bash
# Read last completed phase output
cat .fingerprintx-development/agents/phase-7-architecture.md

# Read current phase progress
cat .fingerprintx-development/progress.md
```

### Step 3: Resume Execution

```
Phase 8: Implementation (in_progress)
→ Read architecture.md for task list
→ Check which tasks completed
→ Resume from first incomplete task
```

## Related References

- [progress-persistence.md](progress-persistence.md) - Cross-session state management
- [directory-structure.md](directory-structure.md) - Output directory layout
