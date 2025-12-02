# Fix Operation Workflow

Auto-remediation and interactive fixing for compliance issues.

## Overview

The fix operation handles compliance issues in three ways:
1. **Auto-fixable:** Automatically applied (phases 2,4,5,6,7,10,12)
2. **Specialized CLI:** Delegated to specific tools with guidance (phase 8)
3. **Semantic:** Deferred to manual review via `--suggest` mode (phases 1,3,9,11,13)

## Running Fixes

### Preview Fixes (Dry Run)
```bash
npm run fix -- skill-name --dry-run
```

Shows what would be fixed without applying changes.

### Apply Fixes
```bash
npm run fix -- skill-name
```

Applies all auto-fixable changes.

### Fix Specific Phase
```bash
npm run fix -- skill-name --phase 2
```

Fixes only the specified phase.

## Auto-Fixable Phases

### Phase 2: Allowed-Tools
- Adds baseline tools for skill type
- Removes inappropriate tools
- Sorts alphabetically

### Phase 4: Broken Links
- Removes links to missing files
- Fixes relative path errors

### Phase 5: File Organization
- Creates missing directories (references/, examples/, templates/)

### Phase 6: Script Organization
- Creates package.json from template
- Adds tsconfig.json
- Creates src/ directory

### Phase 7: Output Directories
- Removes output/ directories
- Updates instructions to use /tmp

### Phase 10: Deprecated References
- Replaces deprecated skill names
- Updates to current replacements

### Phase 12: CLI Error Codes
- Adds missing process.exit() calls
- Ensures error logging to stderr

## Claude-Mediated Fixes (Semantic)

Semantic fixes (Phases 1, 3, 9, 11, 13) require user decisions. These are handled through Claude using the `--suggest` mode.

### Suggest Mode

```bash
npm run fix -- skill-name --suggest
```

Outputs structured JSON for Claude to interpret:

```json
{
  "skill": "skill-name",
  "deterministic": { "applied": 2, "details": ["Phase 7: Fixed..."] },
  "semantic": [
    {
      "id": "phase1-description",
      "phase": 1,
      "title": "Skill description could be more detailed",
      "explanation": "Complex skills benefit from longer descriptions...",
      "currentValue": "Current description...",
      "suggestedValue": "Improved description...",
      "options": [
        { "key": "accept", "label": "Accept suggestion" },
        { "key": "skip", "label": "Skip" },
        { "key": "custom", "label": "Custom" }
      ],
      "applyCommand": "npm run fix -- skill-name --apply phase1-description --value \"$VALUE\""
    }
  ],
  "summary": { "deterministicApplied": 2, "semanticPending": 1, "status": "NEEDS_INPUT" }
}
```

Claude then uses `AskUserQuestion` to present options and applies fixes based on user choices.

### Apply Mode

```bash
# Apply with value (for phase1-description)
npm run fix -- skill-name --apply phase1-description --value "new description"

# Apply without value (for phase13-todowrite)
npm run fix -- skill-name --apply phase13-todowrite
```

### Semantic Fix IDs

| ID | Phase | Value Required | Description |
|----|-------|----------------|-------------|
| `phase1-description` | 1 | Yes | Update frontmatter description |
| `phase3-wordcount` | 3 | No | Acknowledge word count issue |
| `phase9-scripts` | 9 | No | Acknowledge non-TypeScript scripts |
| `phase11-command` | 11 | No | Fix cd command portability |
| `phase13-todowrite` | 13 | No | Add TodoWrite mandate |

### Example Claude Workflow

1. Run suggest mode: `npm run fix -- skill-name --suggest`
2. Parse JSON output
3. Auto-apply deterministic fixes (already done)
4. For each semantic suggestion, use AskUserQuestion
5. Based on user choice:
   - **Accept**: Run applyCommand with suggestedValue
   - **Skip**: Move to next suggestion
   - **Custom**: Run applyCommand with user's custom value

## Specialized CLI Fixes

### Phase 8: TypeScript Structure
Delegates to TypeScript compiler:
```bash
npm run build
```

Reports issues, requires manual refactoring.

### Phase 11: Command Portability
Delegates to command validation CLI, requires manual fixes for:
- Hardcoded paths
- Missing repo-root detection
- Platform-specific commands

## Fix Workflow

1. **Run audit first** to identify issues
   ```bash
   npm run audit -- skill-name
   ```

2. **Preview fixes** to see what will change
   ```bash
   npm run fix -- skill-name --dry-run
   ```

3. **Apply auto-fixes**
   ```bash
   npm run fix -- skill-name
   ```

4. **Handle semantic issues** interactively

5. **Re-audit** to verify
   ```bash
   npm run audit -- skill-name
   ```

6. **Manual fixes** for specialized CLIs

## Common Fix Scenarios

### Scenario 1: New Skill Missing Structure
**Issue:** Missing directories and package.json

**Fix:**
```bash
npm run fix -- new-skill
# Creates references/, examples/, templates/
# Creates package.json and tsconfig.json
```

### Scenario 2: Broken Links After Refactor
**Issue:** Links to moved/deleted files

**Fix:**
```bash
npm run fix -- refactored-skill --phase 4
# Removes or updates broken links
```

### Scenario 3: Deprecated Skill References
**Issue:** References to archived skills

**Fix:**
```bash
npm run fix -- old-skill --phase 10
# Updates to replacement skills
```

## Safety Features

### Dry Run Mode
Always preview before applying:
```bash
npm run fix -- skill-name --dry-run
```

### Backup Before Fix
Automatically creates backup in `.local/` directory with timestamp:
```
.claude/skills/skill-name/.local/YYYY-MM-DD-HH-MM-skill-name.bak
```

### Atomic Operations
Each fix is applied atomically - if one fails, others still succeed.

### Audit After Fix
Always re-audit after fixing:
```bash
npm run fix -- skill-name && npm run audit -- skill-name
```

## Related

- [Audit Phases](audit-phases.md)
- [Create Workflow](create-workflow.md)
- [Update Workflow](update-workflow.md)
