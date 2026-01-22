# Phase Details: Hybrid Phases (3-4, 10, 22-23, 27)

Parent: [phase-details-overview.md](phase-details-overview.md)

These phases combine automated detection with contextual judgment. Claude applies rules but considers intent and teaching examples.

## Phase 10: Reference Audit (Deprecation Registry)

**Checks:**

- Skills/agents/commands referenced in skill body still exist
- No references to deprecated/renamed skills
- No references to removed commands
- Compliance with deprecation registry

**Deprecation Registry Location:** `.claude/skill-library/lib/deprecation-registry.json`

**Registry Schema:**

```json
{
  "skills": {
    "old-skill-name": {
      "new": "new-skill-name",
      "reason": "Why it changed"
    }
  },
  "agents": {
    "old-agent-name": {
      "new": "new-agent-name",
      "reason": "Renamed for consistency"
    }
  },
  "commands": {
    "/old-command": {
      "new": "/new-command",
      "reason": "Consolidated functionality"
    }
  }
}
```

**Example failure:**

```markdown
Use skill: "old-skill-name"

# old-skill-name was renamed to new-skill-name
```

**Auto-fix:** Yes - Replaces references using registry mappings

## Phase 11: Command Audit

**Checks:** Bash command examples use correct patterns

**Severity:** WARNING

**Auto-fix:** No - Requires manual update

**Validates:**

- CRITICAL: `--prefix .claude/skills/skill-name` without `/scripts` suffix
- WARNING: `cd .claude/...` without repo-root detection
- WARNING: `npm run --prefix` with relative path assuming cwd is repo root
- WARNING: Write/create commands with `.claude/` paths without ROOT calculation

**Rationale:** Commands must work from any directory in repo, not assume cwd. Agents running from `.claude/` directory will create nested `.claude/.claude/` directories if paths aren't absolute.

**Common failures:**

```bash
# ❌ WRONG: Assumes cwd is repo root
npm run --prefix .claude/skill-library/my-skill/scripts audit

# ✅ CORRECT: Uses repo-root detection
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
npm run --prefix .claude/skill-library/my-skill/scripts audit

# ❌ WRONG: Creates nested .claude/.claude/ when run from .claude/
mkdir -p .claude/.output/research/${TIMESTAMP}
cp file.txt .claude/output/
mv data.json .claude/results/
touch .claude/state/marker.txt
echo "data" > .claude/logs/output.log

# ✅ CORRECT: Always use $ROOT for .claude/ paths
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
mkdir -p "$ROOT/.claude/.output/research/${TIMESTAMP}"
cp file.txt "$ROOT/.claude/output/"
mv data.json "$ROOT/.claude/results/"
touch "$ROOT/.claude/state/marker.txt"
echo "data" > "$ROOT/.claude/logs/output.log"
```

**Detection logic:**

1. Find bash/sh code blocks
2. Check for write/create commands: `mkdir`, `cp`, `mv`, `touch`, `echo ... >`
3. Flag if command uses `.claude/` path without preceding ROOT calculation
4. Read-only commands (`ls`, `cat`, `grep`) with `.claude/` paths are INFO only

**Evidence of bug:** Research skills created `.claude/.claude/.output/research/` directories when using `mkdir -p .claude/.output/research/${TIMESTAMP}` while running from `.claude/` directory.

**The Required ROOT Pattern:**

```bash
ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null); ROOT="${ROOT:-$(git rev-parse --show-toplevel)}"
cd "$ROOT/.claude/skills/skill-name/scripts" && npm run command
```

**Why this works:**

- `--show-superproject-working-tree`: Returns super-repo root when in submodule
- Returns empty string (not error) when not in submodule
- `${ROOT:-$(fallback)}`: Uses fallback if empty
- `--show-toplevel`: Gets repo root for non-submodule case
- Works from ANY directory (root, submodules, nested paths)

## Phase 12: CLI Error Handling

**Checks:** TypeScript CLI tools use exit code 2 for tool errors vs exit 1 for violations

**Severity:** WARNING

**Auto-fix:** Yes - Updates catch blocks to use exit code 2

**Exit code standard:**

- **Exit 0:** Success (audit completed, no critical issues)
- **Exit 1:** Violations found (audit completed, found issues)
- **Exit 2:** Tool error (could not run - invalid args, file not found)

**Rationale:** Distinguishes validation failures from tool failures

**Exit Code Decision Tree:**

```
Is this a catch block or error handler?
├─ YES → Is it catching tool/runtime errors?
│        ├─ YES → exit(2) + "Tool Error" message
│        └─ NO → Check what it's handling
└─ NO → Is this reporting violations?
         ├─ YES → exit(1) + "Found Issues" message
         └─ NO → exit(0) (success)
```

**Common failures:**

```typescript
// ❌ WRONG: Uses exit 1 for tool error
} catch (error) {
  console.error('Error:', error);
  process.exit(1);  // Same as violations - can't distinguish!
}

// ❌ WRONG: Invalid argument uses exit 1
if (!validPhase(phase)) {
  console.error(`Invalid phase: ${phase}`);
  process.exit(1);  // Tool error, not violation!
}

// ✅ CORRECT: Uses exit 2 for tool error
} catch (error) {
  console.error('⚠️ Tool Error - Audit could not run');
  process.exit(2);
}

// ✅ CORRECT: Violations use exit 1
if (results.violations > 0) {
  console.log('❌ Found Issues');
  process.exit(1);
}

// ✅ CORRECT: Success uses exit 0
console.log('✅ Validation Passed');
process.exit(0);
```

**Testing Exit Codes:**

```bash
# Should exit 2 for invalid option
npm run dev -- audit --invalid-option
echo "Exit: $?"  # Should be 2

# Should exit 0 for successful audit (no issues)
npm run dev -- audit --skill compliant-skill
echo "Exit: $?"  # Should be 0

# Should exit 1 for violations found
npm run dev -- audit --skill skill-with-issues
echo "Exit: $?"  # Should be 1
```

## Phase 13: State Externalization

**Checks:** Multi-step skills use TodoWrite for tracking

**Why:** Mental tracking = steps get skipped

**Pattern:**

```markdown
**IMPORTANT**: Use TodoWrite to track phases.

1. Phase 1: Task description
2. Phase 2: Another task
```

## Phase 14: Table Formatting

**Checks:** Markdown tables are formatted with Prettier

**Severity:** WARNING

**Auto-fix:** Yes - Runs `prettier --write` on SKILL.md

**Rationale:** Consistent table formatting improves readability and reduces diff noise

**See:** [Table Formatting](.claude/skills/managing-skills/references/table-formatting.md) for centralized requirements
