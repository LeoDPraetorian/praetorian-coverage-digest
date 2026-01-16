# Phase 1: Setup

Create isolated worktree for feature development and initialize metadata.

## Step 1: Create Isolated Worktree (REQUIRED)

**REQUIRED SUB-SKILL:** Read and follow `using-git-worktrees` skill

1. Read the skill:
   ```
   Read(.claude/skill-library/workflow/using-git-worktrees/SKILL.md)
   ```

2. Follow the skill's directory selection process (checks .worktrees/, worktrees/, CLAUDE.md)

3. Create worktree with feature branch:
   ```bash
   # Generate feature name from user request
   FEATURE_NAME=$(echo "user request" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g' | cut -c1-30)

   # Create worktree
   git worktree add .worktrees/$FEATURE_NAME -b feature/$FEATURE_NAME
   cd .worktrees/$FEATURE_NAME
   ```

4. Run project setup (auto-detected by skill):
   - npm install (if package.json)
   - go mod download (if go.mod)
   - pip install (if requirements.txt)

5. Verify clean baseline:
   ```bash
   npm test  # or appropriate test command
   ```

6. Report worktree ready:
   ```
   Worktree ready at .worktrees/{feature-name}
   Tests passing (X tests)
   Ready for Phase 2: Brainstorming
   ```

## Step 2: Create Feature Output Directory

**REQUIRED SUB-SKILL:** `persisting-agent-outputs`

Within the worktree, create the output directory:

```bash
FEATURE_ID="$(date -u +%Y-%m-%d-%H%M%S)-$FEATURE_NAME"
mkdir -p .claude/.output/features/$FEATURE_ID
```

All phase outputs go here:
- design.md (Phase 2)
- discovery.md (Phase 3)
- plan.md (Phase 4)
- architecture.md (Phase 5)
- etc.

## Step 3: Record Starting Point (for potential rollback)

Before any changes, record the current commit in the worktree for potential rollback during abort:

```bash
cd .worktrees/{feature-name}
PRE_FEATURE_COMMIT=$(git rev-parse HEAD)
```

This commit SHA will be stored in progress.json to enable the "Rollback changes" cleanup option if the feature is aborted. See [Emergency Abort Protocol](emergency-abort.md) for details.

## Step 4: Initialize Progress File

Create progress.json for cross-session persistence:

```json
{
  "feature_id": "{feature-id}",
  "feature_name": "{Feature Name}",
  "created": "{timestamp}",
  "current_phase": "setup",
  "status": "in_progress",
  "worktree": {
    "path": ".worktrees/{feature-name}",
    "pre_feature_commit": "{commit-sha}",
    "created_at": "{timestamp}"
  },
  "phases": {
    "setup": { "status": "complete" },
    "brainstorming": { "status": "pending" },
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

## User Opt-Out (Rare)

If user explicitly requests no worktree:
1. Document in progress.json: `"worktree": "opted-out-by-user"`
2. Proceed in main workspace
3. Note increased conflict risk for parallel phases

## Related References

- [Feature Directory Structure](directory-structure.md)
- [Progress Persistence](progress-persistence.md)
