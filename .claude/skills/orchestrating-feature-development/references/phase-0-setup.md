# Phase 0: Setup

Create feature workspace with semantic naming and initialize metadata.

## Workspace Creation

```bash
FEATURE_NAME="<semantic-abbreviation>"  # e.g., "asset-filtering"
FEATURE_ID="$(date +%Y-%m-%d-%H%M%S)-${FEATURE_NAME}"
FEATURE_DIR=".claude/.output/features/${FEATURE_ID}"

mkdir -p "${FEATURE_DIR}"
```

## Semantic Naming Rules

- 2-4 words describing the feature, lowercase with hyphens
- Examples: `asset-filtering`, `dark-mode-toggle`, `settings-refactor`

## Initialize metadata.json

```json
{
  "feature_id": "2025-12-28-100000-asset-filtering",
  "description": "Original feature description",
  "created": "2025-12-28T10:00:00Z",
  "status": "in_progress",
  "current_phase": "brainstorming",
  "phases": {
    "brainstorming": { "status": "in_progress" },
    "discovery": {
      "status": "pending",
      "frontend_complete": false,
      "backend_complete": false
    },
    "planning": { "status": "pending" },
    "architecture": {
      "status": "pending",
      "tech_debt_identified": [],
      "human_decision": null
    },
    "implementation": { "status": "pending" },
    "review": { "status": "pending", "retry_count": 0 },
    "test_planning": { "status": "pending" },
    "testing": { "status": "pending" },
    "validation": { "status": "pending", "retry_count": 0 },
    "completion": { "status": "pending" }
  }
}
```

## Related References

- [Feature Directory Structure](directory-structure.md)
- [Progress Persistence](progress-persistence.md)
