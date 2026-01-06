# Workflow Examples

**Complete end-to-end scenarios.**

## Example 1: Ad-Hoc Terminal Workflow

```
User: "have frontend-lead review the tanstack migration plan"

frontend-lead:
  1. No feature_directory provided
  2. Check for recent MANIFEST.yaml
  3. None found → create new directory
  4. Generate slug: "tanstack-migration"
  5. Create: .claude/.output/agents/2025-12-30-143022-tanstack-migration/
  6. Write MANIFEST.yaml
  7. Write frontend-lead-architecture-review.md
  8. Return feature_directory in output JSON

---

User: "now have frontend-developer implement phase 0"

Main Claude:
  - Sees feature_directory in previous output
  - Passes it to frontend-developer

frontend-developer:
  1. feature_directory provided → use it directly
  2. Read MANIFEST.yaml for context
  3. Write frontend-developer-implementation.md
  4. Update MANIFEST.yaml with new entry
```

## Example 2: Orchestrated Workflow (/feature)

```
User: "/feature implement tanstack migration"

Orchestrator (feature skill):
  1. Create timestamp-slug directory
  2. Write initial MANIFEST.yaml
  3. Spawn frontend-lead WITH feature_directory
  4. Spawn frontend-developer WITH feature_directory
  5. Spawn frontend-tester WITH feature_directory

Result:
  All agents write to same directory
  MANIFEST.yaml tracks all contributions
```

## Example 3: Multiple Concurrent Features

```
Scenario: Two features in progress within 60 minutes

frontend-lead working on "tanstack-migration"
backend-developer working on "auth-refactor"

Both create separate directories:
- .claude/.output/agents/2025-12-30-143022-tanstack-migration/
- .claude/.output/agents/2025-12-30-150000-auth-refactor/

No collision because discovery protocol uses semantic matching.
```
