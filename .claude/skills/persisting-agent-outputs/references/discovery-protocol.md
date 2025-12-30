# Discovery Protocol

**Complete algorithm for finding/creating feature directories.**

## Priority System

Agents use this 3-tier priority system:

### Tier 1: Explicit Parameter (PREFERRED)

```typescript
// Orchestrator or main Claude passes feature_directory
if (taskPrompt.includes("feature_directory:")) {
  const dir = extractFeatureDirectory(taskPrompt);
  if (directoryExists(dir)) {
    return dir;
  }
}
```

**When this happens:**
- Orchestrated workflows (`/feature` command)
- Main Claude spawning subsequent agents in a workflow

**Advantage:** No ambiguity, fastest, most reliable.

### Tier 2: Recent Directory Fallback

```bash
# Find MANIFEST.yaml files modified in last 60 minutes
find .claude/features -name "MANIFEST.yaml" -mmin -60 -type f
```

**Scenarios:**

| Found | Action |
|-------|--------|
| **0 files** | Proceed to Tier 3 (create new) |
| **1 file** | Use this directory (no ambiguity) |
| **2+ files** | Read each MANIFEST.yaml, semantic match against task description |

**Semantic matching algorithm:**

```typescript
function findBestMatch(manifestFiles: string[], taskDescription: string): string {
  const scores = manifestFiles.map(file => {
    const manifest = readYAML(file);
    const nameScore = similarity(manifest.feature_name, taskDescription);
    const descScore = similarity(manifest.description, taskDescription);
    const slugScore = similarity(manifest.feature_slug, extractKeywords(taskDescription));

    return {
      file,
      score: (nameScore * 0.4) + (descScore * 0.4) + (slugScore * 0.2)
    };
  });

  return scores.sort((a, b) => b.score - a.score)[0].file;
}
```

### Tier 3: Create New Directory

```bash
# You are the first agent working on this feature
TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")
SLUG=$(generateSlug(taskDescription))

mkdir -p .claude/features/${TIMESTAMP}-${SLUG}
```

**When this happens:**
- No feature_directory parameter
- No recent MANIFEST.yaml found
- You are the first agent

## Edge Cases

### Multiple Active Features

**Scenario:** Two features being worked on simultaneously within 60 minutes.

**Solution:** Semantic matching (Tier 2) selects best match. If confidence < 70%, ask user:

```
I found 2 active feature directories:
1. tanstack-migration (created 15 min ago)
2. user-auth-refactor (created 30 min ago)

Which feature is this task related to?
```

### Stale Directories

**Scenario:** MANIFEST.yaml from yesterday still exists.

**Solution:** 60-minute window excludes stale directories. They don't interfere with Tier 2.

### Directory Creation Race Condition

**Scenario:** Two agents spawn simultaneously, both create directories.

**Solution:** Acceptable. Orchestrators should pass `feature_directory`. Ad-hoc spawns are rare enough that duplicate directories are handled by human cleanup.

## Implementation Examples

### Example 1: Orchestrated Workflow

```typescript
// Orchestrator spawns agents
const featureDir = `.claude/features/${timestamp}-${slug}`;

spawnAgent("frontend-lead", {
  prompt: `Review plan. feature_directory: ${featureDir}`,
});

spawnAgent("frontend-developer", {
  prompt: `Implement phase 0. feature_directory: ${featureDir}`,
});

// Both agents use Tier 1 (explicit parameter)
```

### Example 2: Ad-Hoc First Agent

```typescript
// User: "have frontend-lead review tanstack plan"

frontend-lead:
  1. Check for feature_directory parameter → NOT FOUND
  2. Search for recent MANIFEST.yaml → NONE FOUND
  3. Create new directory: .claude/features/2025-12-30-143022-tanstack-migration/
  4. Write MANIFEST.yaml
  5. Return feature_directory in output
```

### Example 3: Ad-Hoc Subsequent Agent

```typescript
// User: "now have frontend-developer implement phase 0"

Main Claude sees previous output included feature_directory

Main Claude spawns:
  feature_directory: ".claude/features/2025-12-30-143022-tanstack-migration"

frontend-developer:
  1. Check for feature_directory parameter → FOUND
  2. Use provided directory (Tier 1)
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Agent creates duplicate directory | Missing feature_directory param | Main Claude should extract from previous agent output |
| Agent can't find directory | >60 min since last MANIFEST update | Pass feature_directory explicitly or accept new directory creation |
| Wrong directory selected | Poor semantic match | Improve slug generation, add keywords to MANIFEST description |

## Related

- [Slug Generation](slug-generation.md) - How to create descriptive slugs
- [MANIFEST Structure](manifest-structure.md) - What makes a good description
- [Workflow Examples](workflow-examples.md) - End-to-end scenarios
