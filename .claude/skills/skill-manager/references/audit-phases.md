# Compliance Audit Phases

Complete reference for all compliance validation phases.

## Overview

The audit validates skills against structural, semantic, and operational requirements across multiple phases (currently 13). Some phases are auto-fixable, others require manual intervention. See [Adding New Phases](#adding-new-phases) for the checklist when extending.

## Phase Categories

### Auto-Fixable (Deterministic)
Phases 2, 4, 5, 6, 7, 10, 12 - can be automatically fixed

### Semantic (Deferred)
Phases 1, 3, 9, 13 - require human judgment

### Specialized CLI
Phases 8, 11 - use dedicated validation tools

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
- scripts/.gitignore exists with dist/, *.log exclusions
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

When adding a new audit phase (e.g., Phase 14), follow this checklist:

### 1. Implementation (Required)
- [ ] Create `scripts/src/lib/phases/phase{N}-{name}.ts`
- [ ] Implement `validate(skill)` method returning `AuditIssue[]`
- [ ] Implement `run(skillsDir, options?)` method for batch processing
- [ ] Add unit tests in `scripts/src/lib/phases/__tests__/phase{N}-*.test.ts`

### 2. Registration (Required)
- [ ] Import phase in `scripts/src/lib/audit-engine.ts`
- [ ] Add to `runFull()` method's phase execution list
- [ ] Add to `runFullForSingleSkill()` method
- [ ] Add to `phaseRunners` in `runSinglePhaseForSkill()`
- [ ] Add to `validateSingleSkill()` if applicable
- [ ] **Update `PHASE_COUNT` constant** (single source of truth for CLI validation)

### 3. Fix Support (If Auto-Fixable)
- [ ] Register in `scripts/src/fix.ts` FIXERS array
- [ ] Add `fixPhase{N}()` method in audit-engine.ts
- [ ] Document auto-fix behavior

### 4. Documentation (Required)
- [ ] Add section to this file (`references/audit-phases.md`)
- [ ] Create detailed reference: `references/phase-{NN}-{name}.md`
- [ ] Update SKILL.md table if phase count in description (now dynamic via PHASE_COUNT)

### Why PHASE_COUNT Matters

The `PHASE_COUNT` constant in `audit-engine.ts` is the **single source of truth** for:
- CLI validation (`--phase` argument range checking)
- CLI help text (`Audit specific phase (1-N)`)
- Error messages

When you add Phase 14, update `PHASE_COUNT = 14` and all CLI validation automatically adjusts. No need to hunt for hardcoded "13" references.

### Phase Numbering Convention

- Phases 1-9: Core structural validation
- Phases 10-13: Advanced/specialized validation
- New phases: Append sequentially (14, 15, etc.)

Never renumber existing phases - this breaks historical audit references and documentation.

## Related

- [Fix Workflow](fix-workflow.md)
- [Create Workflow](create-workflow.md)
- [Update Workflow](update-workflow.md)
