# Phase Details Reference

Detailed explanations of all 28 audit phases.

## Architecture Note

Phase files use **semantic names** (e.g., `table-formatting.ts`) and classes use **semantic names** (e.g., `TableFormattingPhase`). Phase numbers are assigned only in `phase-registry.ts`.

**To renumber phases:** Update ONLY `phase-registry.ts`. No file renames or class renames needed.

**Key files:**

- `phase-registry.ts` - Single source of truth for phase numbers and metadata
- `getPhaseName()` - Generates display names (e.g., "Phase 14: Table Formatting")

## General Detection Principles

These principles apply across all phases when auditing skills:

### 1. Skip Teaching Content (WRONG/❌ Examples)

When checking code patterns, commands, or references, SKIP content that is deliberately showing BAD PRACTICE examples for teaching purposes.

**Markers indicating teaching content:**

- Preceded by "WRONG:", "❌", "Bad:", "Anti-pattern:", "Problem:" (within 5 lines)
- In a before/after comparison showing the fix
- Explicitly labeled as "do NOT do this"
- Part of documentation explaining why something is problematic

**Example:**

```markdown
# ❌ WRONG: Creates nested directories

mkdir -p .claude/.output/research/output

# ✅ CORRECT: Use ROOT

ROOT="$(git rev-parse ...)"
mkdir -p "$ROOT/.claude/.output/research/output"
```

→ Do NOT flag the first command - it's teaching content, not a real violation.

### 2. Only Audit Code Blocks (For Command Patterns)

When checking for bash command patterns (Phase 11), only examine content inside fenced code blocks with `bash or `sh language tags.

**Rationale:** Prose text discussing commands ("use mkdir to create directories") should not be flagged. Only actual executable command examples matter.

**How to detect code blocks:**

- Track ``` opening/closing markers
- Check language tag (bash, sh, shell)
- Examine only content between the markers

### 3. Check Context for ROOT Calculation

When flagging commands with .claude/ paths (Phase 11), check if ROOT was calculated first.

**Acceptable patterns:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
mkdir -p "$ROOT/.claude/.output/research/output"
```

```bash
ROOT="$(git rev-parse ...)"
cd "$ROOT"
mkdir -p .claude/.output/research/output  # OK - already in repo root
```

**How to check:**

- Look at current line for ROOT= or $ROOT
- Look at preceding line for ROOT calculation
- If found, do NOT flag the .claude/ path

### 4. Severity Context Matters

Some issues are context-dependent:

- Missing language tag on code block showing OUTPUT → INFO (not code, just results)
- Missing language tag on actual code example → WARNING (needs syntax highlighting)
- Line number reference in teaching content → INFO (teaching about the anti-pattern)
- Line number reference in actual navigation → WARNING (will become stale)

### 5. Template vs Real Content

Some files are templates or examples that intentionally have placeholders:

- File named _-template.md or _-example.md
- Content with {placeholder} syntax
- TODO comments indicating "fill this in"

These should be treated differently than production skills.

## Phase 1: Description Format

**Checks:**

**Name validation:**

- Lowercase letters, numbers, hyphens only
- Maximum 64 characters
- No leading/trailing hyphens
- No consecutive hyphens

**Description validation:**

- ✅ Starts with "Use when" or "Use this skill when"
- ✅ No block scalars (`|` or `>`)
- ✅ <120 characters (warning if >120, <1024)
- ✅ Third-person voice (no "you", "your")
- ✅ Appropriate length for complexity (200-800 chars based on skill type)

**Why It Matters:**

**CRITICAL: Claude Code cannot parse YAML block scalars.**

When a skill uses block scalars (`>-`, `|`, `>`), Claude sees an **empty description**. The skill exists but Claude doesn't know when to use it.

**Historical impact:** 116 of 147 skills (79%) had broken descriptions using block scalars.

**Common failures:**

```yaml
# ❌ WRONG: Block scalar - Claude sees empty description
description: >-
  Use when creating skills

# ❌ WRONG: First person
description: I help you create skills

# ❌ WRONG: Second person
description: Use when you need to process data...

# ✅ CORRECT: Single-line, third-person, keyword-rich
description: Use when creating skills - guides through TDD workflow with RED-GREEN-REFACTOR phases, progressive disclosure patterns, and compliance validation
```

**Edge Cases:**

- **Multi-Domain Skills**: Include comprehensive keywords for all areas covered
- **Migration Skills**: Include version numbers and breaking changes
- **Error-Driven Skills**: Include actual error messages users will see

**Auto-Fix:** ❌ Not auto-fixable - requires semantic understanding

## Phase 2: Allowed Tools

**Checks:** Frontmatter has valid `allowed-tools` field

**Severity:** INFO

**Auto-fix:** Yes - Intelligently detects skill type and suggests appropriate tools

**Why It Matters:** The `allowed-tools` field is **REQUIRED** for all skills. It defines which tools the skill can use when activated, enforcing least-privilege access control.

**Valid Tools:**

```
Read, Write, Edit, MultiEdit, Bash, Grep, Glob, WebFetch, WebSearch,
TodoWrite, TodoRead, NotebookEdit, NotebookRead, LS
```

**Tool Selection Guidelines:**

| Skill Purpose           | Suggested Tools           |
| ----------------------- | ------------------------- |
| Documentation/Reference | Read                      |
| Code modification       | Read, Write, Edit, Bash   |
| Testing/Validation      | Read, Bash, Grep, Glob    |
| Web research            | Read, WebFetch, WebSearch |
| Task management         | TodoWrite, TodoRead       |
| Search/Analysis         | Read, Grep, Glob          |
| MCP integration         | Read, Bash, WebFetch      |

**Common failures:**

```yaml
# ❌ WRONG: Missing allowed-tools
---
name: my-skill
description: Use when...
---
# ❌ WRONG: Invalid tool names
---
name: my-skill
allowed-tools: Read, Write, InvalidTool
---
# ✅ CORRECT: Includes valid allowed-tools
---
name: my-skill
description: Use when...
allowed-tools: Read, Write, Bash, Grep
---
```

## Phase 3: Line Count (Critical)

See [Line Count Limits](.claude/skills/managing-skills/references/patterns/line-count-limits.md) for complete thresholds, validation script, and extraction strategy.

**Quick reference:** <350 safe, 350-450 caution, 450-500 warning, >500 FAIL (must extract).

**Skill Type Classification** (auto-detected or frontmatter override):

- **Reasoning Skills**: Process-driven, Claude is the engine (1000-2000 words optimal)
- **Tool Wrapper Skills**: CLI-driven, Claude just executes (200-600 words optimal)
- **Hybrid Skills**: Mix of reasoning and tools (600-1200 words optimal)

**Why Different Thresholds:**

**Code vs. Context Trade-off**: When logic moves from prompt (Claude's context) to TypeScript (CLI scripts), word count requirements change dramatically.

**Detection Heuristics:**

| Indicator            | Pattern                                   | Suggests Type |
| -------------------- | ----------------------------------------- | ------------- |
| CLI execution        | `npm run audit`, `scripts/*.ts`           | tool-wrapper  |
| Process headers      | `## Phase 1`, `RED-GREEN-REFACTOR`        | reasoning     |
| Sequential language  | "first", "then", "next", "step 1"         | reasoning     |
| Both patterns        | CLI commands + process workflow           | hybrid        |
| Frontmatter override | `skill-type: tool-wrapper` in frontmatter | (override)    |

**Severity Matrix:**

| Skill Type   | Word Count | Threshold    | Severity | Rationale                                   |
| ------------ | ---------- | ------------ | -------- | ------------------------------------------- |
| Reasoning    | <800       | Warning min  | WARNING  | Insufficient guidance for complex reasoning |
| Reasoning    | 1000-2000  | Optimal      | PASS     | Appropriate detail for process-driven       |
| Reasoning    | >2500      | Critical max | CRITICAL | Needs progressive disclosure                |
| Tool Wrapper | <150       | Warning min  | WARNING  | Missing essential CLI documentation         |
| Tool Wrapper | 200-600    | Optimal      | PASS     | Concise, high signal-to-noise               |
| Tool Wrapper | >800       | Critical max | CRITICAL | Over-explaining automated logic             |
| Hybrid       | <400       | Warning min  | WARNING  | Insufficient for mixed approach             |
| Hybrid       | 600-1200   | Optimal      | PASS     | Balanced reasoning + tools                  |
| Hybrid       | >1500      | Critical max | CRITICAL | Extract to references/                      |

## Phase 4: Broken Links

**Checks:** All markdown links resolve to actual files

**Auto-fix:** Yes - Multiple strategies:

1. **Path Correction**: File exists, wrong path (searches for file and corrects link)
2. **Stub Creation**: File doesn't exist (creates placeholder in references/)
3. **Case Correction**: Wrong case (normalizes to lowercase)
4. **Fuzzy Matching**: Typo in filename (suggests closest match)

**Why It Matters:**

- Claude cannot load referenced content
- Progressive disclosure fails
- Users get 404 errors
- Documentation fragmentation

## Phase 5: File Organization

See [File Organization](.claude/skills/managing-skills/references/file-organization.md) for complete requirements.

**Required structure:**

```
skill-name/
├── SKILL.md
├── references/
│   └── (reference files)
├── examples/
│   └── (example files)
└── scripts/ (optional)
    ├── src/
    ├── package.json
    └── tsconfig.json
```

## Phase 6: Script Organization

**Checks:** Python/bash/shell scripts are in `scripts/` subdirectory, not at skill root

**Severity:** WARNING

**Auto-fix:** Yes - Moves scripts to `scripts/` subdirectory

**Rationale:** Per official docs: "Place utilities in a dedicated scripts/ subdirectory"

**Script types detected:**

- Shell: `.sh`, `.bash`, `.zsh`, `.fish`
- Python: `.py`
- Ruby: `.rb`
- Perl: `.pl`, `.pm`

**Common failures:**

```
skill-name/
├── SKILL.md
└── audit.sh          # ❌ WRONG: Script at root

# ✅ CORRECT: Script in subdirectory
skill-name/
├── SKILL.md
└── scripts/
    └── audit.sh
```

## Phase 7: Output Directory

**Checks:** Runtime artifacts are in `.local/` or `.output/`, not in `references/`

**Severity:** INFO

**Auto-fix:** Yes - Creates `.local/` directory structure with proper .gitignore

**Runtime patterns detected:**

- `audit-*.md`, `report-*.txt`, `run-*.log`
- Test results: `test-results-*.json`
- TDD artifacts: `tdd-validation-*.md`, `baseline-failures.md`

**TDD Artifacts Detection** (should be in .local/, NOT references/):

**Filename patterns (specific result indicators):**

- `tdd-validation-*`, `tdd-results-*`, `tdd-test-*`
- `baseline-failures`, `baseline-test-*`, `baseline-results`
- `pressure-test-results-*`, `pressure-test-[0-9]+`
- `green-phase-results`, `red-phase-results`, `red-phase-failures`
- `quality-check-results`, `test-scenario-results`, `validation-results`

**Content patterns (actual test output, not teaching):**

- "Agent response (verbatim):" - captured agent transcripts
- "Test run: YYYY-MM-DD" - dated test results
- "| Status | PASS |" or "| Result | FAIL |" - tabular results
- "Test Case N: PASS/FAIL" - numbered test results

**Important:** Teaching docs about TDD methodology (like `tdd-methodology.md`) are NOT flagged. Only actual test output artifacts with verbatim transcripts or dated results are detected.

**Standard .gitignore template:**

```gitignore
# Runtime artifacts (git-ignored)
audit-results-*.md
test-output-*.log
temp/
*.tmp

# Exception: CHANGELOG.md is git-tracked
!CHANGELOG.md
```

**Rationale:** TDD artifacts document HOW skill was validated, not HOW to use it. They belong in gitignored `.local/`, not committed `references/`.

**Common failures:**

```
references/
├── api-guide.md           # ✅ Evergreen - teaches usage
├── tdd-validation.md      # ❌ Should be in .local/
├── baseline-failures.md   # ❌ Should be in .local/
└── pressure-test-*.md     # ❌ Should be in .local/

# ✅ CORRECT: Test artifacts in .local/
.local/
├── .gitignore
├── CHANGELOG.md           # Exception: git-tracked
├── tdd-validation.md      # git-ignored
└── baseline-failures.md   # git-ignored
```

## Phase 8: TypeScript Structure (If scripts/ exists)

**Checks:**

- `tsc` compiles without errors
- `vitest` types resolve
- All tests pass (100%)

**Test Scoping Behavior:**

Phase 8 intelligently scopes test execution based on audit mode:

**Single-Skill Audit** (`npm run audit -- skill-name`):

- **Runs only tests for the specific skill being audited**
- Command: `npx vitest run skills/skill-name/scripts`
- Fast execution (~23 tests for skill-manager)
- Prevents false negatives from unrelated test failures

**All-Skills Audit** (`npm run audit`):

- **Runs all tests across the entire workspace**
- Command: `npm run test:unit` (102+ test files)
- Comprehensive validation
- Detects issues affecting multiple skills

**Why:** Before v1.1.0, Phase 8 ran ALL workspace tests (102+ files) even when auditing a single skill, causing false negatives from unrelated test failures. Now tests are scoped to the skill being audited.

**Example Impact:**

```bash
# Before v1.0.0
npm run audit -- skill-manager
# Ran 102 test files (all MCP tools, all skills)
# Failed due to 3 unrelated currents tool test failures
# ❌ False negative: skill-manager tests were actually passing

# After v1.1.0
npm run audit -- skill-manager
# Runs only 23 skill-manager tests
# ✅ Accurate result: only tests relevant to skill-manager
```

**Why It Matters:** Broken TypeScript = broken skill functionality

## Phase 9: Bash→TypeScript Migration

**Checks:** Detects ALL non-TypeScript scripts and recommends migration

**Severity:** WARNING (not INFO) - Cross-platform compatibility is critical

**Auto-fix:** No - Requires manual rewrite

**Rationale:**

- **Cross-platform:** Shell scripts don't work on Windows without WSL
- **Testing:** Vitest infrastructure set up for TypeScript, not pytest/bash
- **Consistency:** Standardize on TypeScript for all skill tooling

**Script types flagged:**

- Shell: `.sh`, `.bash`, `.zsh`, `.fish` - Not cross-platform
- Python: `.py` - No testing infrastructure
- JavaScript: `.js`, `.mjs`, `.cjs` - No type safety
- Ruby: `.rb` - No testing infra
- Perl: `.pl`, `.pm` - No testing infra
- PHP: `.php` - No testing infra

**Shell Script Complexity Analysis:**

```
Shell migration effort - Simple (1): scripts/validate.sh (<30 lines, no pipes)
Shell migration effort - Moderate (1): scripts/setup.sh (30-100 lines OR has pipes)
Shell migration effort - Complex (1): scripts/deploy.sh (>100 lines OR pipes + git + npm)
```

**Migration Priority Matrix:**

| Language      | Issue              | Priority |
| ------------- | ------------------ | -------- |
| Shell         | Not cross-platform | HIGH     |
| Python        | No vitest testing  | HIGH     |
| JavaScript    | No type safety     | MEDIUM   |
| Ruby/Perl/PHP | No testing infra   | HIGH     |

**Example recommendation:**

```
Found: scripts/audit.sh (Simple: 25 lines, no pipes)
Recommendation: Migrate to scripts/src/audit.ts for cross-platform compatibility
```

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

## Phase 15: Code Block Quality

**Category:** Claude-Automated (Two-layer architecture)

**Checks:**

- Missing language tags on code blocks
- Mismatched language tags (content doesn't match tag)
- Unknown language tags
- Lines excessively long (>120 chars)

**Severity:**

- INFO for missing/mismatched tags (candidates for Claude review)
- WARNING for long lines (deterministic)

**Auto-fix:** No - Requires semantic understanding of context

**Architecture:**

- **Layer 1 (TypeScript):** Flags CANDIDATES (missing tags, potential mismatches)
- **Layer 2 (Claude):** Semantic classification using [phase-15-semantic-review.md](phase-15-semantic-review.md)

**Rationale:**

Context matters. The same missing language tag can be:

- Genuine issue (real code needs syntax highlighting)
- Template code (intentional placeholder for users)
- Bad practice example (showing what NOT to do)
- Console output (command results, not code)
- Pseudo-code (algorithm steps, not executable)
- Meta-discussion (discussing code blocks themselves)

TypeScript detects patterns but cannot understand context. Claude classifies each candidate based on surrounding text, file name, and purpose.

**Common failures:**

````markdown
# ❌ GENUINE ISSUE: Missing tag on real code

```
async function fetchData() {
  return await fetch(url);
}
```

→ Should be: ```typescript

# ✅ NOT AN ISSUE: Console output (intentionally untagged)

Output:

```
✓ Phase 1: passed
✓ Phase 2: passed
Done in 2.3s
```

→ This is console output, not code

# ✅ NOT AN ISSUE: Bad practice example

❌ WRONG:

```
Phase 3.5: Extra validation
```

→ Showing what NOT to do, intentionally incorrect
````

**See also:** [phase-15-semantic-review.md](phase-15-semantic-review.md) for complete classification guide.

## Phase 16: Header Hierarchy

**Checks:**

- Single H1 (`#` Title) at top
- No skipped levels (H1 → H3 without H2)
- Consistent ATX style (`#` not underlines)
- No orphan headers (header with no following content)

**Severity:** INFO

**Auto-fix:** No - Restructuring headers risks breaking content

**Common failures:**

```markdown
# Title

### Section # ❌ WRONG: Skipped H2

# Title

## Section # ✅ CORRECT: Proper nesting
```

## Phase 17: Prose Phase References

**Checks:** Prose phase references match canonical phase list

**What it detects:**

- Stale references like "Phase 4 (implementation)" when Phase 4 is now "Architecture"
- Missing phase numbers referenced in text
- Name hints that don't match the canonical phase name

**Example failure:**

```markdown
Return to Phase 4 (implementation) to fix.
```

When Phase 4 is actually "Architecture" (implementation moved to Phase 5).

**Why:** After phase renumbering (adding/removing phases), prose references become stale while markdown links get caught by Phase 4 (Broken Links).

**Severity:** WARNING (doesn't break functionality)

**Fix:** Validation-Only - requires semantic understanding to fix correctly

**Exclusions:**

- `.history/CHANGELOG` files (historical)
- Code blocks (examples)
- Cross-skill references

## Phase 18: Orphan Detection

**Checks:** Library skills have a discovery path (gateway or agent reference)

**Severity:** WARNING

**Auto-fix:** No - Requires semantic judgment

**Rationale:** Skills without discovery paths are invisible in the two-tier system

**What it detects:**

- Library skills NOT listed in any gateway
- Library skills NOT referenced by any agent
- Suggests appropriate gateways based on skill domain

**Common failures:**

```
Skill: .claude/skill-library/frontend/my-component-skill/SKILL.md
Issue: No gateway lists this skill
Recommendation: Add to gateway-frontend routing table
```

## Phase 19: Windows Paths

**Checks:** All paths use forward slashes (POSIX-style)

**What it detects:**

- No Windows-style backslash paths (`C:\path\to\file`)
- No relative backslash paths (`.\folder\file`)
- Cross-platform path compatibility

**Severity:** WARNING

**Auto-fix:** Yes - Converts backslashes to forward slashes

**Rationale:** Forward slashes work on ALL platforms (including Windows), backslashes only work on Windows

**Pattern Detection:**

```typescript
// Matches: C:\path, .\path, \path
const backslashPathPattern = /(?:[a-zA-Z]:\\|\.\\|\\)[\w\\/.-]+/g;
```

**Common failures:**

```bash
# ❌ WRONG: Absolute Windows paths
See the config at C:\Users\dev\project\.claude\skills\

# ❌ WRONG: Relative backslash paths
Reference: .\references\patterns.md

# ❌ WRONG: Mixed backslash paths
Path: .claude\skills\my-skill\SKILL.md

# ✅ CORRECT: Unix-style paths (work everywhere)
cd .claude/skills/my-skill
Reference: ./references/patterns.md
```

**Edge Cases:**

**1. Escape Sequences (Not Paths)**

```markdown
Use `\n` for newlines and `\t` for tabs.
```

These are NOT converted - they're escape sequences, not paths.

**2. Regex Patterns**

```typescript
const pattern = /path\\to\\file/;
```

Backslashes in regex are intentional - review manually.

**3. Windows-Specific Documentation**

If documenting Windows behavior specifically, backslash paths may be intentional. Add comment:

```markdown
<!-- Windows-specific example, backslashes intentional -->

C:\Program Files\MyApp
```

## Phase 20: Gateway Structure

**Checks:** Gateway skills explain the two-tier system

**Severity:** CRITICAL

**Auto-fix:** No - Requires manual documentation

**Gateway-only:** Only applies to `gateway-*` skills

**Validates:**

- Has `<EXTREMELY-IMPORTANT>` block with 1% Rule and Skill Announcement
- Has "Progressive Disclosure" section with 3-tier explanation
- Has "Intent Detection" table (Task Intent | Route To)
- Has "Routing Algorithm" numbered steps
- Has "Skill Registry" tables with Skill | Path | Triggers columns
- Has "Cross-Gateway Routing" table
- Has "Loading Skills" section with Read tool example

**Rationale:** Gateway skills must teach agents how to use the two-tier system

## Phase 21: Routing Table Format

**Checks:** Gateway routing tables show full paths, not just skill names

**Severity:** WARNING

**Auto-fix:** Yes - Expands skill names to full paths

**Gateway-only:** Only applies to `gateway-*` skills

**Common failures:**

```markdown
# ❌ WRONG: Just skill name

| Need    | Skill               |
| ------- | ------------------- |
| Testing | testing-with-vitest |

# ✅ CORRECT: Full path

| Need    | Skill Path                                                 |
| ------- | ---------------------------------------------------------- |
| Testing | .claude/skill-library/testing/testing-with-vitest/SKILL.md |
```

## Phase 22: Path Resolution

**Checks:** All paths in gateway routing tables exist on filesystem

**Severity:** WARNING

**Auto-fix:** Hybrid - Fuzzy match broken paths, suggest corrections

**Gateway-only:** Only applies to `gateway-*` skills

**Hybrid behavior:**

- No deterministic auto-fix (removal could break gateway)
- Fuzzy match against existing skill paths
- Options: fix to similar path, remove entry, mark for creation

**Example ambiguous case:**

```
Path: .claude/skill-library/testing/vitest-testing/SKILL.md
Issue: Path not found
Similar paths:
  1. .claude/skill-library/testing/testing-with-vitest/SKILL.md (score: 0.85)
  2. .claude/skill-library/testing/vitest-mocking/SKILL.md (score: 0.72)
```

## Phase 23: Coverage Check

**Checks:** All library skills appear in exactly one gateway (no orphans, no duplicates)

**Severity:** INFO

**Auto-fix:** No - Requires human judgment

**Gateway-only:** Only applies to `gateway-*` skills

**Rationale:** Ensures every library skill is discoverable through exactly one gateway

**What it detects:**

- Library skills listed in multiple gateways
- Library skills not listed in any gateway
- Gateway coverage gaps by domain

## Phase 24: Line Number References

**Category:** Claude-Automated

**Checks:** No hardcoded line numbers in file references (semantic classification required)

**Severity:** INFO (candidates) - TypeScript flags patterns, Claude classifies

**Auto-fix:** No - Claude reasoning determines genuine issues vs teaching content

**Rationale:** Line numbers drift with every code change, creating maintenance debt

**Two-Layer Architecture:**

- **Layer 1 (TypeScript)**: Flag CANDIDATES with line number patterns
  - Detects `file.go:123` or `file.go:123-456` patterns
  - Provides context: surrounding lines, file name, WRONG markers
  - Severity: INFO (not WARNING)
- **Layer 2 (Claude)**: Classify each candidate semantically
  - Genuine hardcoded line number → FLAG
  - Bad practice example (after WRONG/❌) → IGNORE
  - Teaching content (discussing line numbers) → IGNORE
  - Template/placeholder (using :LINE) → IGNORE
  - Historical reference (was at line X) → IGNORE
  - Tool output example (grep, stack trace) → IGNORE

**What it detects:**

- `file.go:123` patterns
- `file.ts:456-789` patterns
- Line number ranges in references

**False positives avoided:**

- Bad practice examples showing what NOT to do
- Teaching content discussing why line numbers are problematic
- Template patterns using placeholders like `:LINE`
- Historical references ("was at line 89, now refactored")
- Tool output examples (grep results, stack traces)

**Recommended patterns:**

```markdown
# ❌ WRONG: Line numbers become outdated

See file.go:123-127 for implementation

# ✅ CORRECT: Structural descriptions are durable

See file.go - func (t \*Type) MethodName(...)
See file.go (between Match() and Invoke() methods)
```

**Reference:** See [phase-24-semantic-review.md](phase-24-semantic-review.md) for classification guide

## Phase 25: Context7 Staleness

**Checks:** Context7-sourced documentation is <30 days old

**Severity:** WARNING

**Auto-fix:** No - Requires re-fetching documentation

**Rationale:** Frontend/backend libraries evolve rapidly, stale docs lead to outdated recommendations

**What it validates:**

- `.local/context7-source.json` exists and has valid `fetchedAt` date
- Documentation age is ≤30 days

**Resolution:**

```bash
npm run update -- <skill> --refresh-context7 --context7-data /path/to/new.json
```

## Phase 26: Reference Content Quality

**Checks:** Reference files contain actual content vs placeholders/stubs

### Anti-Rationalization Warning (READ THIS FIRST)

<EXTREMELY-IMPORTANT>
**You MUST read every reference file.** Not grep. Not check sizes. ACTUALLY READ.

| Rationalization Trap                  | Reality                                                                 |
| ------------------------------------- | ----------------------------------------------------------------------- |
| "Files exist, so Phase 26 passes"     | Existence ≠ Content. Phase 4 checks existence. Phase 26 checks CONTENT. |
| "Files are 500+ bytes, not empty"     | 500 bytes of `[TO BE POPULATED]` = FAIL                                 |
| "I'll grep for placeholder patterns"  | Grep misses edge cases. Reading is the only verification.               |
| "I already listed the files"          | Listing ≠ Reading. You must `Read()` each file.                         |
| "There are 12 files, that's too many" | Read them anyway. This is not negotiable.                               |

**The only acceptable verification:** `Read({skill-location}/references/{each-file}.md)` for EVERY file.
</EXTREMELY-IMPORTANT>

### Verification Steps (MANDATORY)

1. **List reference files:**

   ```bash
   find {skill-location}/references -name "*.md" | sort
   ```

2. **Read EACH file** (not optional):

   ```
   Read({skill-location}/references/file1.md)
   Read({skill-location}/references/file2.md)
   ... (continue for ALL files)
   ```

3. **For each file, evaluate:**
   - Does it have ACTUAL explanatory content?
   - Or is it just headers + placeholders?

### What it detects:

- Empty files (0 bytes) - **CRITICAL**
- TODO stub headers (`# TODO`, `## TODO`) - **WARNING**
- TODO stub verbs (`TODO: add`, `TODO: implement`, `TODO: document`) - **WARNING**
- Placeholder brackets (`[TO BE POPULATED: ...]`, `[TBD]`, `[CONTENT HERE]`) - **WARNING**
- Placeholder text (`placeholder`, `coming soon`, `TBD:`, `to be added`) - **WARNING**
- Structure-only files (headers + ToC but no actual content) - **WARNING**
- Minimal content (<100 bytes) - **INFO**

### Example failures:

```markdown
# ❌ FAIL: Empty file (0 bytes)

# Severity: CRITICAL

# ❌ FAIL: TODO stub header

# TODO: Document this pattern

# Severity: WARNING

# ❌ FAIL: Placeholder brackets (COMMON PATTERN)

## Client Setup

[TO BE POPULATED: Creating and configuring client]

## Common Operations

[TO BE POPULATED: API operation examples]

# Severity: WARNING - This is a stub file disguised as structure

# ❌ FAIL: Structure-only (headers but no content)

# API Reference

## Table of Contents

- [Setup](#setup)
- [Usage](#usage)

## Setup

## Usage

# Severity: WARNING - All headers, no actual content
```

### Why This Phase Exists

Skills with empty or stub reference files are fundamentally incomplete. Phase 4 checks if links resolve (files exist). Phase 26 checks if those files have REAL CONTENT.

**The failure mode we're preventing:** A skill promises 12 detailed reference documents, but 10 of them are just headers with `[TO BE POPULATED]` placeholders. The skill LOOKS complete but IS NOT.

### Acceptable Patterns

- Enhancement TODOs at END of otherwise complete files (e.g., `TODO: Consider adding X as future enhancement`)
- Placeholder in teaching examples showing what NOT to do
- Template files explicitly named `*-template.md`

### Severity

- Empty files = **CRITICAL** (blocks PASSED status)
- Structure-only stubs = **WARNING**
- TODO stubs = **WARNING** (allows PASSED WITH WARNINGS)
- Placeholder brackets = **WARNING**
- Minimal content = **INFO**

**Fix:** Validation-Only - requires human judgment to populate with actual content

## Phase 27: Relative Path Depth

**Checks:** Markdown links don't use deep relative paths (3+ levels of `../`)

**Severity:** CRITICAL

**Auto-fix:** Yes - Converts to repo-root paths

**Rationale:** Deep relative paths like `../../../../skills/managing-skills/references/foo.md` are fragile, break when files reorganize, and make skills unmaintainable. Skills with 3+ levels of `../` MUST convert to repo-root paths (`.claude/skills/...`) before achieving PASSED status.

**What it detects:**

- Links with 3+ levels of `../` (e.g., `../../../foo.md`)
- Calculates repo-root equivalent path
- Suggests conversion to `.claude/...` format

**Example failures:**

```markdown
# ❌ WRONG: Deep relative path (4 levels)

[Repository Root Navigation](../../../../skills/managing-skills/references/patterns/repo-root-detection.md)

# ✅ CORRECT: Repo-root path

[Repository Root Navigation](.claude/skills/managing-skills/references/patterns/repo-root-detection.md)
```

**Distinction from Phase 4 (Broken Links):**

- **Phase 4:** Does the target file exist? (broken vs working link)
- **Phase 27:** Is the path pattern robust? (fragile vs maintainable)

A link can pass Phase 4 (file exists) but fail Phase 27 (path too deep).

**Exceptions:**

- External URLs (`http://`, `https://`) - ignored
- Same directory or one level up (`.`, `../`) - allowed
- Two levels (`../../`) - borderline, allowed

**Fix behavior:**

```bash
# Dry-run mode shows what would change
npm run fix -- <skill> --phase 27 --dry-run

# Apply fixes
npm run fix -- <skill> --phase 27 --apply
```

**Fix category:** Hybrid

- TypeScript deterministically calculates repo-root path
- Claude verifies the suggested path is correct

## Phase 28: Integration Section

**Category:** Claude-Automated

**Checks:** Skill has a complete Integration section documenting dependencies

**Severity:** CRITICAL

**Auto-fix:** Hybrid - Claude analyzes skill content to generate Integration section

**Rationale:** Skills without Integration sections become orphaned or have undocumented dependencies. The Integration section makes skill composition explicit and traceable.

### Required Structure

Every skill MUST include an Integration section with these subsections:

```markdown
## Integration

### Called By

[What invokes this skill - commands, agents, or other skills]

- `/command-name` - Command entry point
- `skill-name` - Parent skill
- `agent-name` agent (Step/Phase N)

### Requires (invoke before starting)

| Skill        | When  | Purpose                        |
| ------------ | ----- | ------------------------------ |
| `skill-name` | Start | Why this skill is needed first |

### Calls (during execution)

| Skill        | Phase/Step | Purpose              |
| ------------ | ---------- | -------------------- |
| `skill-name` | Phase N    | What this skill does |

### Pairs With (conditional)

| Skill        | Trigger        | Purpose    |
| ------------ | -------------- | ---------- |
| `skill-name` | When condition | Why paired |
```

### Validation Rules

1. **Section Exists**: Skill has `## Integration` heading
2. **Called By Present**: Has `### Called By` subsection (can be "None - entry point skill")
3. **Requires Present**: Has `### Requires` subsection (can be "None - standalone skill")
4. **Calls Present**: Has `### Calls` subsection (can be "None - terminal skill")
5. **Pairs With Present**: Has `### Pairs With` subsection (can be "None")

### What it detects:

- Missing Integration section entirely - **CRITICAL**
- Missing Called By subsection - **WARNING**
- Missing Requires subsection - **WARNING**
- Missing Calls subsection - **WARNING**
- Missing Pairs With subsection - **INFO**
- "Related Skills" present but no Integration section - **WARNING** (suggests migration)

### Example failures:

```markdown
# ❌ FAIL: No Integration section

## Related Skills

- skill-1
- skill-2

# Severity: CRITICAL - Has flat list but no structured Integration

# ❌ FAIL: Partial Integration section

## Integration

### Called By

- orchestrating-feature-development (Phase 4)

# Severity: WARNING - Missing Requires, Calls, Pairs With

# ✅ PASS: Complete Integration section

## Integration

### Called By

- `orchestrating-feature-development` (Phase 4)
- `/feature` command

### Requires (invoke before starting)

| Skill                      | When  | Purpose                   |
| -------------------------- | ----- | ------------------------- |
| `persisting-agent-outputs` | Start | Discover output directory |

### Calls (during execution)

| Skill           | Phase/Step | Purpose           |
| --------------- | ---------- | ----------------- |
| `brainstorming` | Phase 1    | Design refinement |

### Pairs With (conditional)

| Skill                      | Trigger        | Purpose             |
| -------------------------- | -------------- | ------------------- |
| `debugging-systematically` | Complex issues | Root cause analysis |
```

### Why This Phase Exists

Based on analysis of [obra/superpowers](https://github.com/obra/superpowers), skills with explicit Integration sections:

1. **Are never orphaned** - Called By section shows what uses them
2. **Have clear dependencies** - Requires section documents prerequisites
3. **Form traceable chains** - Calls section shows the full workflow
4. **Enable tooling** - Automated dependency checking possible

The old "Related Skills" pattern was a flat list with no structure:

- No indication of when to use each
- No hierarchy (required vs optional)
- No call direction (who calls whom)

### Migration from Related Skills

If skill has "Related Skills" but no Integration section:

1. Analyze the skill content to determine actual relationships
2. Find `skill: "X"` and `Read(".../X/SKILL.md")` invocations → Calls section
3. Search for skills that reference this skill → Called By section
4. Find "MUST invoke X first" patterns → Requires section
5. Find conditional invocations → Pairs With section
6. Generate Integration section from analysis
7. Remove or consolidate Related Skills section

### Fix Behavior

```
Audit found: Missing Integration section
Fix category: Claude-Automated

Claude will:
1. Analyze skill content for skill references
2. Search codebase for what invokes this skill
3. Identify required vs optional dependencies
4. Generate Integration section
5. Insert before "Related Skills" or at end of skill
```

### Exceptions

- **Template files** (`*-template.md`) - Integration section is a placeholder
- **Gateway skills** - Have routing tables instead of Integration (different structure)

## Related

- [Phase Categorization](.claude/skills/managing-skills/references/patterns/phase-categorization.md)
