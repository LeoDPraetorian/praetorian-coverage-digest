# Phase Details: Deterministic Phases (1-2, 5-9)

Parent: [phase-details-overview.md](phase-details-overview.md)

These phases have objective, automated detection criteria. No human judgment required.

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

**Quick reference:** <350 safe, 350-450 caution, 450-500 warning, >500 overage (graduated severity).

**This phase validates TWO types of files:**

1. **SKILL.md** - Main skill file must be <500 lines
2. **Reference Files** - Each file in references/ must be <500 lines

### SKILL.md Line Count Check

**Graduated Severity for Line Count Overage:**

| Overage  | Lines   | Severity | Rationale                                     |
| -------- | ------- | -------- | --------------------------------------------- |
| Trivial  | 501-510 | INFO     | Minor cleanup, consolidate a few lines        |
| Minor    | 511-550 | WARNING  | Should extract content to references/         |
| Moderate | 551-600 | WARNING  | Needs progressive disclosure refactor         |
| Major    | >600    | CRITICAL | Must extract substantial content, blocks PASS |

**Severity calculation:**

- overage = line_count - 500
- overage <= 0: PASS
- overage 1-10: INFO (trivial)
- overage 11-100: WARNING (minor to moderate)
- overage >100: CRITICAL (major)

**Skill Type Classification** (auto-detected or frontmatter override):

- **Reasoning Skills**: Process-driven, Claude is the engine (1000-2000 words optimal)
- **Tool Wrapper Skills**: CLI-driven, Claude just executes (200-600 words optimal)
- **Hybrid Skills**: Mix of reasoning and tools (600-1200 words optimal)

**Why Different Thresholds:**

**Code vs. Context Trade-off**: When logic moves from prompt (Claude's context) to external scripts, word count requirements change dramatically.

**Detection Heuristics:**

| Indicator            | Pattern                                   | Suggests Type |
| -------------------- | ----------------------------------------- | ------------- |
| CLI execution        | `npx vitest`, scripts in `scripts/`       | tool-wrapper  |
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
| Hybrid       | <500       | Warning min  | WARNING  | Insufficient for mixed approach             |
| Hybrid       | 600-1200   | Optimal      | PASS     | Balanced reasoning + tools                  |
| Hybrid       | >1500      | Critical max | CRITICAL | Extract to references/                      |

### Reference Files Line Count Check

**Checks:** Each file in references/ directory is under 500 lines

**Severity:** Graduated based on percentage overage

| Status  | Lines   | % Over Limit | Severity | Rationale                          |
| ------- | ------- | ------------ | -------- | ---------------------------------- |
| Safe    | <400    | -            | PASS     | No action needed                   |
| Caution | 400-450 | <10%         | INFO     | Consider splitting for next change |
| Warning | 451-500 | <20%         | WARNING  | Plan split before adding content   |
| Overage | >500    | ≥20%         | WARNING  | Should split into multiple files   |

**Why percentage-based criticality?** Line overages are normal during development. Criticality is based on how far over the limit (percentage), not absolute values. Files >500 lines should be split, but aren't automatically CRITICAL unless significantly oversized (>600 lines = 20% over).

**Auto-fix:** No - Requires semantic understanding to split content logically

**Detection:**

```bash
# Check SKILL.md
wc -l {skill-location}/SKILL.md

# Check all reference files
find {skill-location}/references -name '*.md' -exec wc -l {} \; | awk '$1 > 500 {print "WARNING:", $0}'
```

**Split Strategy:**

When a reference file exceeds 500 lines:

1. Identify logical sections (by H2 headers)
2. Create separate files for each major section
3. Update parent file to link to split files
4. Ensure each split file has proper parent link

**Example:** phase-details.md at 1,950 lines should split into:

- phase-details-deterministic.md (Phases 1-9)
- phase-details-hybrid.md (Phases 10-14)
- phase-details-automated.md (Phases 15-25)
- phase-details-human-gateway.md (Phases 26-30)

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

### Verification Procedure (MANDATORY)

<EXTREMELY-IMPORTANT>
Listing files in a directory does NOT verify links. You must:

1. **Extract** all markdown links from SKILL.md
2. **Resolve** each path relative to skill location
3. **Verify** each target file exists

**The trap:** Auditor lists `examples/` → sees 1 file exists → marks Phase 4 PASS
**Reality:** SKILL.md links to 3 example files → 2 are missing → Phase 4 FAIL

**Extraction command:**

```bash
grep -oE '\[[^\]]+\]\([^)]+\)' {skill-location}/SKILL.md
```

**Common link locations to verify:**

- `references/*.md` - Progressive disclosure content
- `examples/*.md` - Usage examples
- `scripts/*.ts` - CLI tool references
- Cross-skill paths like `.claude/skills/other-skill/...`

**Path Resolution Context:**

Links within the same skill (e.g., `references/foo.md`) are verified relative to the skill's directory.

Links to other skills must use full `.claude/` paths (per Phase 27). These are verified from the repo root:

```bash
# From repo root, verify full path exists
[ -f ".claude/skills/brainstorming/SKILL.md" ] && echo '✅' || echo '❌'
```

**Distinction from Phase 27:**

- **Phase 4:** Does the file exist at the path specified? (existence check)
- **Phase 27:** Does the path use proper format for cross-skill links? (format check)

Both phases must pass - a link to another skill must use `.claude/` format (Phase 27) AND must resolve to an existing file (Phase 4).
</EXTREMELY-IMPORTANT>

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

**Single-Skill Audit:**

- **Runs only tests for the specific skill being audited**
- Command: `npx vitest run skills/skill-name/scripts`
- Fast execution
- Prevents false negatives from unrelated test failures

**All-Skills Audit:**

- **Runs all tests across the entire workspace**
- Command: `npm run test:unit`
- Comprehensive validation
- Detects issues affecting multiple skills

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
