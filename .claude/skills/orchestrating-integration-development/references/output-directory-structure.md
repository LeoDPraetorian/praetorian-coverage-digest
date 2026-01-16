# Output Directory Structure

**Complete file structure for integration development workflow artifacts.**

## Directory Layout

```
.claude/.output/integrations/YYYYMMDD-HHMMSS-{vendor-name}/
├── metadata.json                    # Workflow status, vendor, type, phases
├── MANIFEST.yaml                    # File inventory with descriptions
├── design.md                        # Phase 1: Requirements and scope
├── skill-summary.md                 # Phase 2: Extracted from integrating-with-* skill
├── discovery.md                     # Phase 2: Codebase patterns found
├── file-placement.md                # Phase 2: Where to create new files
├── discovery-summary.json           # Phase 2: Structured discovery results
├── architecture.md                  # Phase 3: Design with P0 Checklist
├── implementation-log.md            # Phase 4: Developer activity log
├── p0-compliance-review.md          # Phase 4.5: P0 verification results
├── spec-compliance-review.md        # Phase 5: Spec compliance review
├── code-quality-review.md           # Phase 5: Quality review
├── security-review.md               # Phase 5: Security review
├── test-plan.md                     # Phase 6: Test strategy
├── test-validation.md               # Phase 6: Test validation results
└── frontend-integration-log.md      # Phase 7: Frontend changes (if applicable)
```

## metadata.json Schema

The `metadata.json` file tracks workflow progress and phase decisions.

### Core Schema

```json
{
  "vendor": "shodan",
  "integration_type": "asset_discovery",
  "status": "in_progress",
  "created_at": "2025-01-14T10:00:00Z",
  "phases": {
    "phase-0": { "status": "complete", "timestamp": "2025-01-14T10:00:00Z" },
    "phase-1": { "status": "complete", "timestamp": "2025-01-14T10:15:00Z" },
    "phase-2": { "status": "in_progress", "started_at": "2025-01-14T10:30:00Z" }
  }
}
```

### Phase 8 (Frontend Integration) Schema

For Phase 8, the schema tracks whether the phase was executed or skipped:

**When Phase 8 is SKIPPED**:

```json
{
  "vendor": "shodan",
  "integration_type": "asset_discovery",
  "status": "in_progress",
  "phases": {
    "phase-8": {
      "status": "skipped",
      "skip_reason": "service account only, no user config needed",
      "decided_at": "phase-3",
      "decided_by": "architecture.md Frontend Requirements section",
      "timestamp": "2025-01-14T12:00:00Z"
    }
  }
}
```

**When Phase 8 is EXECUTED**:

```json
{
  "vendor": "shodan",
  "integration_type": "asset_discovery",
  "status": "in_progress",
  "phases": {
    "phase-8": {
      "status": "complete",
      "decided_at": "phase-3",
      "decided_by": "architecture.md Frontend Requirements section",
      "files_created": [
        "modules/chariot/ui/src/types.ts (enum added)",
        "modules/chariot/ui/public/integrations/shodan-dark.svg",
        "modules/chariot/ui/public/integrations/shodan-light.svg",
        "modules/chariot/ui/src/hooks/useIntegration.tsx (case added)"
      ],
      "timestamp": "2025-01-14T12:30:00Z"
    }
  }
}
```

## File Descriptions

| File                      | Phase | Purpose                                           |
| ------------------------- | ----- | ------------------------------------------------- |
| metadata.json             | 0     | Workflow state and phase tracking                 |
| MANIFEST.yaml             | 0     | Human-readable file inventory                     |
| design.md                 | 1     | Integration requirements and scope                |
| skill-summary.md          | 2     | API patterns from integrating-with-{vendor} skill |
| discovery.md              | 2     | Codebase patterns for implementation              |
| file-placement.md         | 2     | Target file locations                             |
| discovery-summary.json    | 2     | Structured discovery data                         |
| architecture.md           | 3     | Implementation plan with P0 checklist             |
| implementation-log.md     | 4     | Developer activity and decisions                  |
| p0-compliance-review.md   | 4.5   | P0 validation results                             |
| spec-compliance-review.md | 5     | Implementation vs. spec verification              |
| code-quality-review.md    | 5     | Code quality assessment                           |
| security-review.md        | 5     | Security vulnerability assessment                 |
| test-plan.md              | 6     | Test strategy and coverage plan                   |
| test-validation.md        | 6     | Test execution results and coverage               |
| frontend-integration-log.md | 7   | Frontend changes (if applicable)                  |

## Related References

- [Phase 0: Setup](phase-0-setup.md) - Initial directory creation
- [persisting-agent-outputs](.claude/skills/persisting-agent-outputs) - Output directory patterns
- [Agent Handoffs](agent-handoffs.md) - Agent metadata format
