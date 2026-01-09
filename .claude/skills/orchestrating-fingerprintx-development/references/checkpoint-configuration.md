# Checkpoint Configuration

Human approval is required at strategic points to ensure alignment and catch issues early.

## Phase-Level Checkpoints (Default)

Human approval required at:
- **Phase 1 (Requirements Gathering)**: Confirm protocol and source availability via AskUserQuestion
- **Phase 3 (Protocol Research)**: BLOCKING gate - research document must pass checklist before proceeding
- **Phase 4 (Version Marker Research)**: CONDITIONAL gate - version matrix must pass checklist (if open-source)

## Validation-Level Checkpoints (For Long Validation)

Phase 7 (Validation) has 5 sub-phases. Add intermediate checkpoints:

| Trigger | Checkpoint Type |
|---------|----------------|
| Docker prerequisite fails | **Mandatory** human approval to skip or install |
| Shodan API key missing | **Mandatory** human approval to skip or configure |
| After 3 sub-phases complete (before Shodan) | Progress report + optional review |
| Any sub-phase fails validation | **Mandatory** human review |

## Checkpoint Report Format

```markdown
## Validation Progress Checkpoint

**Completed:** Sub-phases 1-3 of 5
**Status:** On track / Issues detected

### Sub-Phase Summaries
- 7.1 Build Verification: go build, go vet passed ✓
- 7.2 Unit Test Execution: All tests pass, 85% coverage ✓
- 7.3 Docker Container Testing: Tested MySQL 5.7, 8.0, 8.4 (1 version failed) ⚠️

### Issues Encountered
- 7.3: MySQL 8.4 detection failed (version marker changed in 8.4.0)
- Fix: Updated version regex to handle new format

### Next Steps
- 7.4: Live Shodan validation (requires API key)
- 7.5: Combined validation report

**Continue?** [Yes / Show details / Pause]
```

## Prerequisite Failure Checkpoints

When Docker or Shodan prerequisites fail, MUST prompt user:

### Docker Unavailable

```typescript
AskUserQuestion({
  questions: [{
    question: "Docker is required for Phase 7.3 multi-version testing but is unavailable. How to proceed?",
    header: "Prerequisite",
    multiSelect: false,
    options: [
      {
        label: "Install/start Docker and retry (Recommended)",
        description: "Ensures version detection accuracy across versions"
      },
      {
        label: "Skip Docker testing and document limitation",
        description: "Reduces plugin confidence level"
      }
    ]
  }]
})
```

### Shodan API Key Missing

```typescript
AskUserQuestion({
  questions: [{
    question: "Shodan API key is required for Phase 7.4 live validation but is not configured. How to proceed?",
    header: "Prerequisite",
    multiSelect: false,
    options: [
      {
        label: "Configure API key and retry (Recommended)",
        description: "Validates detection against real-world deployments"
      },
      {
        label: "Skip live validation and document limitation",
        description: "Reduces plugin confidence level"
      }
    ]
  }]
})
```

## Related References

- [Phase 7: Validation](../orchestrating-fingerprintx-development/SKILL.md#phase-7-validation)
- [Phase 7 Prerequisite Checks](../orchestrating-fingerprintx-development/SKILL.md#mandatory-prerequisite-checks-cannot-skip-silently)
