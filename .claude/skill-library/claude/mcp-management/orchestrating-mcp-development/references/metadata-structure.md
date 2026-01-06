# Metadata Structure

## metadata.json Format

Initialize in Phase 0 with:

```json
{
  "service": "{service}",
  "tool": "{tool}",
  "created": "ISO-timestamp",
  "status": "in_progress",
  "current_phase": "discovery",
  "phases": {
    "discovery": { "status": "pending" },
    "architecture": { "status": "pending", "human_approved": false },
    "test_planning": { "status": "pending" },
    "test_implementation": { "status": "pending" },
    "red_gate": { "status": "pending" },
    "implementation": { "status": "pending" },
    "code_review": { "status": "pending", "retry_count": 0 },
    "green_gate": { "status": "pending" },
    "audit": { "status": "pending" },
    "completion": { "status": "pending" }
  }
}
```

## Phase Status Values

- **pending**: Not yet started
- **in_progress**: Currently working
- **completed**: Finished successfully
- **blocked**: Cannot proceed (needs manual intervention)

## Special Fields

- **human_approved** (Phase 2): Set to `true` after AskUserQuestion approval
- **retry_count** (Phase 7): Increments on CHANGES_REQUESTED verdict, max 1
