# Compliance Audit Phases

Complete reference for all compliance validation phases.

## Overview

The audit validates skills against structural, semantic, and operational requirements across 22 phases. Some phases are auto-fixable, others require manual intervention. See [Adding New Phases](#adding-new-phases) for the checklist when extending.

**After structural audit completes, Claude performs semantic review.** See [Post-Audit Semantic Review](#post-audit-semantic-review).

## Phase Categories

### Auto-Fixable (Deterministic)

Phases 2, 4, 5, 6, 7, 10, 12, 14a, 16, 18 - can be automatically fixed via CLI

### Validation-Only (No Auto-Fix)

Phases 14b, 14c - detect issues but auto-fix is error-prone

### Semantic (Deferred)

Phases 1, 3, 9, 13, 15, 17, 21 - require human judgment

### Specialized CLI

Phases 8, 11 - use dedicated validation tools

### Gateway-Specific

Phases 17-20 - only apply to gateway-\* skills

## Phase Reference

### Phase 1: Description Format ⚠️ Semantic

**Validates:** Frontmatter description follows conventions

**Requirements:**

- Starts with "Use when"
- Clear, actionable trigger
- Specific context
- No marketing language

**Examples:**

- ✅ "Use when creating React components with TypeScript"
- ✅ "Use when debugging production issues systematically"
- ❌ "Amazing tool for React development"
- ❌ "Helps with debugging"

**Why deferred:** Requires understanding skill purpose

**See:** [phase-01-description.md](phase-01-description.md)

---

### Phase 2: Allowed-Tools Field ✅ Auto-fixable

**Validates:** Frontmatter lists appropriate tools for skill type

**Requirements:**

- Tool-wrapper skills: Only wrapped tool + TodoWrite
- Reasoning skills: Read, Grep, Glob, Bash, TodoWrite minimum
- Hybrid skills: Appropriate mix

**Auto-fix:**

- Adds missing baseline tools
- Removes inappropriate tools
- Sorts alphabetically

**See:** [phase-02-allowed-tools.md](phase-02-allowed-tools.md)

---

### Phase 3: Word Count ⚠️ Semantic

**Validates:** SKILL.md length matches skill type

**Requirements:**

- < 300 lines: Simple reasoning or tool-wrapper
- 300-500 lines: Complex reasoning or hybrid
- > 500 lines: Should be split or moved to references/

**Why deferred:** Requires understanding if length is justified

**See:** [phase-03-word-count.md](phase-03-word-count.md)

---

### Phase 4: Broken Links ✅ Auto-fixable

**Validates:** All internal links resolve

**Requirements:**

- Markdown links to existing files
- Relative paths from SKILL.md
- No 404s

**Auto-fix:**

- Removes links to missing files
- Fixes relative path errors
- Updates moved file references

**See:** [phase-04-broken-links.md](phase-04-broken-links.md)

---

### Phase 5: File Organization ✅ Auto-fixable

**Validates:** Required directories exist

**Requirements:**

- references/ (for progressive disclosure)
- examples/ (for complete workflows)
- templates/ (for reusable patterns)

**Auto-fix:**

- Creates missing directories
- Warns if empty but doesn't fail

**See:** [phase-05-file-organization.md](phase-05-file-organization.md)

---

### Phase 6: Script Organization ✅ Auto-fixable

**Validates:** scripts/ directory follows conventions

**Requirements:**

- package.json with @chariot/skill-name
- tsconfig.json for TypeScript
- src/ for implementation
- No build artifacts in git

**Auto-fix:**

- Creates package.json from template
- Adds tsconfig.json
- Creates src/ directory
- Adds .gitignore

**See:** [phase-06-script-organization.md](phase-06-script-organization.md)

---

### Phase 7: Output Directory Pattern ✅ Auto-fixable

**Validates:** Runtime outputs use .local/ directory pattern

**Requirements:**

- Skills teach patterns, don't generate files
- Generated content goes to /tmp
- No persistent output in skill directories

**Auto-fix:**

- Removes output/ directories
- Updates instructions to use /tmp

**See:** [phase-07-output-directories.md](phase-07-output-directories.md)

---

### Phase 8: TypeScript Project Structure 🔧 Specialized CLI

**Validates:** TypeScript project structure, compilation, and test execution

**Structure Checks:**

- package.json in scripts/ subdirectory (not skill root)
- scripts/.gitignore exists with dist/, \*.log exclusions
- scripts/tsconfig.json exists
- scripts/src/ directory exists
- Git-based path resolution (no hardcoded relative paths)

**Compilation Checks:**

- Runs `tsc --noEmit` to verify zero TypeScript errors
- Reports error count and first few error messages on failure

**Vitest Configuration:**

- tsconfig.json must have `"types": ["vitest/globals", "node"]`
- Required for describe/test/expect globals without imports

**Test Execution (100% Pass Required):**

- Runs `npm run test:unit` (or `npm test` if no test:unit script)
- CRITICAL failure if any tests fail
- Reports failure count and first few failure messages

**Validation:** Runs tsc and test suite
**Fix:** Manual refactoring required

**See:** [phase-08-typescript-structure.md](phase-08-typescript-structure.md)

---

### Phase 9: Non-TypeScript Script Migration ⚠️ Semantic

**Validates:** Inline bash replaced with TypeScript CLIs

**Requirements:**

- No heredocs with 50+ lines of bash
- Complex logic in TypeScript, not bash
- Orchestration only in skill instructions

**Why deferred:** Requires deciding if bash is justified

**See:** [phase-09-bash-migration.md](phase-09-bash-migration.md)

---

### Phase 10: Reference Audit ✅ Auto-fixable

**Validates:** No references to archived skills

**Requirements:**

- No mentions of deprecated skills
- Update to replacement skills
- Check deprecation registry

**Auto-fix:**

- Replaces deprecated skill names
- Updates to current replacements

**See:** [phase-10-reference-audit.md](phase-10-reference-audit.md)

---

### Phase 11: Command Example Audit 🔧 Specialized CLI

**Validates:** Commands work across environments

**Requirements:**

- Repo-root detection (findProjectRoot)
- No hardcoded paths
- Cross-platform compatibility
- Workspace-aware npm commands

**Validation:** Calls command validation CLI
**Fix:** Manual refactoring required

**See:** [phase-11-command-examples.md](phase-11-command-examples.md)

---

### Phase 12: CLI Error Handling ✅ Auto-fixable

**Validates:** CLIs return proper exit codes

**Requirements:**

- process.exit(0) on success
- process.exit(1) on failure
- No silent failures
- Error messages to stderr

**Auto-fix:**

- Adds missing exit codes
- Ensures error logging

**See:** [phase-12-cli-errors.md](phase-12-cli-errors.md)

---

### Phase 13: State Externalization ⚠️ Semantic

**Validates:** No persistent state in skill files

**Requirements:**

- Configuration via npm workspaces
- State in /tmp or project files
- No SQLite/JSON files in skill dirs
- Stateless skill execution

**Why deferred:** Requires architectural review

**See:** [phase-13-state-externalization.md](phase-13-state-externalization.md)

---

### Phase 14: Visual/Style (Mixed)

**Contains sub-phases 14a, 14b, 14c that run together when using `--phase 14`.**

#### Phase 14a: Table Formatting ✅ Auto-fixable

**Validates:** Markdown tables are formatted with Prettier

**Requirements:**

- Tables formatted according to Prettier markdown rules
- Consistent column alignment
- Proper header separators

**Auto-fix:** Runs `prettier --write` on the skill file

#### Phase 14b: Code Block Quality ⚠️ Validation-only

**Validates:** Code blocks have language identifiers

**Requirements:**

- All code blocks specify language (\`typescript, \`bash, etc.)
- No bare \`\`\` blocks without language

**Why no auto-fix:** Auto-detecting programming languages from code snippets is unreliable and could introduce incorrect language tags

#### Phase 14c: Header Hierarchy ⚠️ Validation-only

**Validates:** Headers follow proper nesting

**Requirements:**

- No skipped heading levels (h1 → h3 without h2)
- Consistent structure throughout document

**Why no auto-fix:** Restructuring headers risks breaking document organization and content flow

---

### Phase 15: Orphan Detection ⚠️ Semantic

**Validates:** Library skills are referenced by at least one gateway

**Requirements:**

- Library skills must be in a gateway routing table
- No "orphan" skills that agents can't discover

**Why deferred:** May require judgment on which gateway is appropriate

---

### Phase 16: Windows Path Detection ✅ Auto-fixable

**Validates:** No Windows-style backslash paths in skills

**Requirements:**

- All paths use forward slashes (POSIX-style)
- No `C:\path\to\file` patterns
- No `.\relative\path` patterns
- Cross-platform path compatibility

**Auto-fix:**

- Converts backslashes to forward slashes
- Preserves path semantics
- CLI: `npm run fix -- <skill-name> --phase 16`

**Why this matters:**

- Skills may be authored on Windows but run on macOS/Linux
- Backslash paths break on non-Windows systems
- Forward slashes work universally

**See:** [phase-16-windows-paths.md](phase-16-windows-paths.md)

---

### Phase 17: Gateway Structure ⚠️ Semantic (Gateway-only)

**Validates:** Gateway skills have required structure

**Requirements:**

- Two-tier explanation section present
- Routing table section present
- Usage instructions present

**Applies to:** `gateway-*` skills only

---

### Phase 18: Routing Table Format ✅ Auto-fixable (Gateway-only)

**Validates:** Gateway routing tables use correct format

**Requirements:**

- Full paths (`.claude/skill-library/.../SKILL.md`), not just skill names
- Alphabetically sorted entries
- Valid markdown table structure

**Auto-fix:**

- Expands skill names to full `.claude/skill-library/.../SKILL.md` paths
- Sorts entries alphabetically
- CLI: `npm run fix -- <skill-name> --phase 18`

**Applies to:** `gateway-*` skills only

---

### Phase 19: Path Resolution ⚠️ Semantic (Gateway-only)

**Validates:** All paths in routing table resolve to existing files

**Requirements:**

- Every path in routing table points to existing SKILL.md
- No broken references to deleted/moved skills

**Applies to:** `gateway-*` skills only

---

### Phase 20: Coverage Check ⚠️ Semantic (Gateway-only)

**Validates:** Gateway covers all skills in its domain

**Requirements:**

- All library skills in gateway's category are listed
- No gaps in coverage

**Applies to:** `gateway-*` skills only

---

### Phase 21: Line Number References ⚠️ Semantic

**Validates:** Code references use durable patterns

**Requirements:**

- Avoid hardcoded line numbers (`:123`)
- Prefer function/class names for references
- Line numbers become stale as code evolves

**Why deferred:** Requires judgment on reference context

---

### Phase 22: Context7 Staleness ⚠️ Semantic

**Validates:** Context7-sourced documentation is up-to-date

**Requirements:**

- Checks for `.local/context7-source.json` metadata file
- Validates `fetchedAt` date is within 30 days
- Returns WARNING if documentation is stale (>30 days old)

**Applies to:** Library skills created with context7 data (e.g., `using-tanstack-query`, `using-shadcn-ui`)

**Why WARNING, not CRITICAL:**

- Stale docs may still be mostly accurate
- Doesn't prevent skill from loading
- Users should refresh but skill remains functional

**Recommendation when stale:**

```bash
npm run update -- <skill-name> --refresh-context7 --context7-data /path/to/new.json
```

**Why deferred:** Requires judgment on whether to refresh immediately or continue with existing docs

---

## Running Audits

### Audit Single Skill

```bash
npm run audit -- skill-name
```

### Audit All Skills

```bash
npm run audit
```

### Audit Specific Phase

```bash
npm run audit -- skill-name --phase 2
```

### Audit with Verbosity

```bash
npm run audit -- skill-name --verbose
```

## Fixing Issues

### Auto-fix All Fixable Phases

```bash
npm run fix -- skill-name
```

### Preview Fixes (Dry Run)

```bash
npm run fix -- skill-name --dry-run
```

### Fix Specific Phase

```bash
npm run fix -- skill-name --phase 2
```

### Fix All Skills

```bash
npm run fix
```

## Interpreting Results

### ✅ PASS

All requirements met, no action needed

### ⚠️ WARN

Non-critical issue, consider fixing

### ❌ FAIL

Critical issue, must fix before deployment

### 🔧 DEFERRED

Semantic issue, requires manual review

## Compliance Levels

### Level 1: Deployable

- All auto-fixable phases pass
- No critical failures
- Semantic issues documented

### Level 2: Production-Ready

- All phases pass
- No warnings
- Full progressive disclosure

### Level 3: Best Practice

- All phases pass
- Comprehensive examples
- Complete test coverage
- Pressure-tested

## Adding New Phases

When adding a new audit phase (e.g., Phase 23), follow this checklist:

### 1. Implementation (Required)

- [ ] Create `scripts/src/lib/phases/phase{N}-{name}.ts`
- [ ] Implement `validate(skill)` method returning `AuditIssue[]`
- [ ] Implement `run(skillsDir, options?)` method for batch processing
- [ ] Add unit tests in `scripts/src/lib/phases/__tests__/phase{N}-*.test.ts`

### 2. Registration (Required)

- [ ] Import phase in `scripts/src/lib/phase-registry.ts`
- [ ] Add to `PHASE_REGISTRY` array with appropriate metadata
- [ ] `PHASE_COUNT` will auto-calculate from registry (no manual update needed)

### 3. Fix Support (If Auto-Fixable)

- [ ] Register in `scripts/src/fix.ts` FIXERS array
- [ ] Add `fixPhase{N}()` method in audit-engine.ts
- [ ] Document auto-fix behavior

### 4. Documentation (Required)

- [ ] Add section to this file (`references/audit-phases.md`)
- [ ] Create detailed reference: `references/phase-{NN}-{name}.md`
- [ ] Update SKILL.md table if phase count in description (now dynamic via PHASE_COUNT)

### Why PHASE_REGISTRY Matters

The `PHASE_REGISTRY` in `phase-registry.ts` is the **single source of truth** for all phases.

`PHASE_COUNT` is **automatically calculated** from the registry:
```typescript
export const PHASE_COUNT = Math.max(...PHASE_REGISTRY.map(p => p.number));
```

When you add a new phase (e.g., Phase 23), just add it to `PHASE_REGISTRY`. The count updates automatically, and CLI validation adjusts without any manual changes.

### Phase Numbering Convention

- Phases 1-13: Core structural validation
- Phase 14: Visual/style validation (sub-phases 14a, 14b, 14c)
- Phases 15-16: Additional structural validation
- Phases 17-20: Gateway-specific validation
- Phase 21: Line number references
- Phase 22: Context7 staleness
- New phases: Append sequentially (23, 24, etc.)

Never renumber existing phases - this breaks historical audit references and documentation.

---

## Post-Audit Semantic Review

**After the structural audit (Phases 1-22) completes, Claude MUST perform semantic review.**

The structural audit catches what code can detect. But code cannot reason about:

- Whether a skill is categorized correctly (frontend vs backend vs testing)
- Whether gateway membership is correct
- Whether the description effectively helps discovery
- Whether tools are appropriate for the skill's actual purpose

### Semantic Review Checklist

After reviewing structural audit output, Claude performs these checks:

#### 1. Description Quality (CSO - Claude Search Optimization)

**Ask yourself:**

- Does the description include key trigger terms users would mention?
- Is the complexity level appropriate for this skill?
- Are there important keywords missing that would improve discovery?
- Is it specific enough to differentiate from similar skills?
- Does it explain both WHAT and WHEN clearly?

**Example issue:** Skill about "ESLint configuration" with description "Use when linting code" is too generic. Should mention "ESLint", "TypeScript", "JavaScript", specific patterns.

#### 2. Skill Categorization

**Ask yourself:**

- Is this a frontend skill? (React, TypeScript, CSS, UI, components)
- Is this a backend skill? (Go, AWS, API, Lambda, DynamoDB)
- Is this a testing skill? (unit tests, e2e tests, Playwright, Vitest)
- Is this a security skill? (auth, credentials, vulnerabilities)
- Is this a tooling skill? (MCP, CLI, automation)

**Example issue:** Skill named `eslint-smart` that lints TypeScript/React code is clearly a **frontend** skill but may not be categorized as such.

#### 3. Gateway Membership

**Based on categorization, check gateway membership:**

| Category     | Gateway                | Check Path                                     |
| ------------ | ---------------------- | ---------------------------------------------- |
| Frontend     | `gateway-frontend`     | `.claude/skills/gateway-frontend/SKILL.md`     |
| Backend      | `gateway-backend`      | `.claude/skills/gateway-backend/SKILL.md`      |
| Testing      | `gateway-testing`      | `.claude/skills/gateway-testing/SKILL.md`      |
| Security     | `gateway-security`     | `.claude/skills/gateway-security/SKILL.md`     |
| MCP Tools    | `gateway-mcp-tools`    | `.claude/skills/gateway-mcp-tools/SKILL.md`    |
| Integrations | `gateway-integrations` | `.claude/skills/gateway-integrations/SKILL.md` |

**Ask yourself:**

- Should this skill be listed in a gateway?
- Is it listed in the CORRECT gateway(s)?
- Is it missing from a gateway it should be in?

**Example issue:** `eslint-smart` is a frontend linting skill but not listed in `gateway-frontend`. Agent using `gateway-frontend` would never discover it.

#### 4. Tool Appropriateness

**Ask yourself:**

- Given the skill's PURPOSE, are the allowed-tools appropriate?
- Should read-only analysis skills have Write/Edit tools?
- Should Bash be scoped more narrowly? (e.g., `Bash(git:*)` instead of `Bash`)
- Are there tools enabling operations the skill shouldn't perform?

**Example issue:** Skill for "code review" has `Write, Edit` in allowed-tools but should be read-only analysis.

#### 5. Content Density Assessment

**For skills with word count warnings (>500 lines):**

- Is the length justified by essential content density?
- What sections could be extracted to references/?
- Are there redundant examples or repetitive explanations?
- Is progressive disclosure being used appropriately?

#### 6. Section Organization

**Ask yourself:**

- Does the skill have required sections?
  - Quick Reference (summary table)
  - When to Use (triggers)
  - Workflow/How to Use (main content)
  - Related Skills (cross-references)
- Is the section order logical?
- Are any critical sections missing?

**Example issue:** Skill is missing "Related Skills" section - users can't discover similar/complementary skills.

**Fix:** Add `## Related Skills` section with links to similar skills.

#### 7. Visual Readability

**Ask yourself:**

- Are there wall-of-text paragraphs (>5-6 lines without breaks)?
- Are key terms properly emphasized with **bold** or `code`?
- Are comma-separated lists that should be bullet points?
- Is there adequate whitespace between sections?
- Do callouts use consistent format (`> **Note:**`)?

**Example issue:** Paragraph at line 45 is 8 lines of dense text without breaks.

**Fix:** Break into shorter paragraphs, add bullet points for lists, emphasize key terms.

#### 8. Example Quality

**Ask yourself:**

- Do code examples have language tags (```typescript, ```bash)?
- Are before/after examples paired properly?
- Are examples self-contained (can be understood without external context)?
- Do examples match the skill's actual purpose?

**Example issue:** Code example shows React pattern but skill is about Go backend.

**Fix:** Replace with relevant example or clarify context.

### Reporting Semantic Issues

After semantic review, report findings in this format:

```markdown
## Semantic Review Findings

### Skill Categorization

- **Current:** Not categorized
- **Should be:** Frontend (lints TypeScript/React code)
- **Action:** Add to gateway-frontend routing table

### Gateway Membership

- **Missing from:** gateway-frontend
- **Action:** Add skill path to gateway-frontend SKILL.md

### Description Quality

- **Issue:** Missing key term "ESLint" in description
- **Current:** "Use when linting code - smart file detection"
- **Suggested:** "Use when linting TypeScript/JavaScript with ESLint - smart file detection, only lints modified files"

### Tool Appropriateness

- ✅ Tools appropriate for skill purpose
```

### When to Skip Semantic Review

Skip semantic review ONLY if:

- Running `--phase N` for a specific structural phase
- Skill is a simple tool-wrapper with minimal content (<50 lines, single tool wrapper)

**Note:** Semantic review is mandatory even when structural phases pass with zero warnings, as code cannot detect categorization, gateway membership, or tool appropriateness issues.

### Integration with Fix Command

Semantic issues cannot be auto-fixed. After identifying issues:

1. **Gateway membership:** Manually update gateway SKILL.md
2. **Description quality:** Use `npm run fix -- skill-name --apply phase1-description --value "new description"`
3. **Categorization:** Update skill location or gateway references

## Related

- [Fix Workflow](fix-workflow.md)
- [Create Workflow](create-workflow.md)
- [Update Workflow](update-workflow.md)
- [Semantic Review Reference](#post-audit-semantic-review)
