# Phase Categorization

**Single source of truth for audit phase categories and fix responsibility.**

This pattern is referenced by:

- `auditing-skills` - Runs phases in appropriate order
- `fixing-skills` - Routes fixes to appropriate handler (TypeScript CLI vs Claude reasoning)

---

## Overview

The 22-phase skill audit (with Phase 14 sub-phases) uses a **three-tier fix model**:

| Category             | Handler          | Characteristics                           | Phases                                |
| -------------------- | ---------------- | ----------------------------------------- | ------------------------------------- |
| **Deterministic**    | TypeScript CLI   | One correct answer, no judgment           | 2, 5, 6, 7, 12, 14a, 16, 18           |
| **Hybrid**           | CLI + Claude     | Auto-fix part, Claude for ambiguous cases | 4, 10, 19                             |
| **Validation-Only**  | Report only      | Detects issues, no automated fix          | 14b, 14c                              |
| **Claude-Automated** | Claude reasoning | Semantic understanding, no human input    | 1, 3, 11, 13, 15, 17, 21, 22 |
| **Human-Required**   | Human decision   | Genuinely ambiguous, policy decisions     | 8, 9, 20                              |

---

## Deterministic Phases (TypeScript CLI Only)

These phases have exactly one correct answer derivable from rules:

| Phase | Name                 | CLI Action               | Why Deterministic                  |
| ----- | -------------------- | ------------------------ | ---------------------------------- |
| 2     | Allowed-tools field  | Fix comma-separation     | YAML syntax has one correct format |
| 5     | File organization    | Create directories       | Directory structure is prescribed  |
| 6     | Script organization  | Move scripts to scripts/ | Directory structure is prescribed  |
| 7     | Output directories   | Create .output/, .local/ | Standard directories, no choices   |
| 12    | CLI error handling   | Fix exit codes (1→2)     | Exit code convention is prescribed |
| 14a   | Table formatting     | Validate/fix tables      | Markdown table syntax is prescribed|
| 16    | Windows path detection| Fix backslashes         | Path format is deterministic       |
| 18    | Routing table format | Convert names → paths    | Path format is deterministic       |

**Command:** `npm run -w @chariot/fixing-skills fix -- <skill-name>`

**Behavior:** Apply automatically, no user confirmation needed.

---

## Validation-Only Phases (Report Only)

These phases detect issues but provide no automated fix:

| Phase | Name                 | What It Reports              | Why No Auto-Fix                    |
| ----- | -------------------- | ---------------------------- | ---------------------------------- |
| 14b   | Code block quality   | Missing language tags        | Content-aware decision needed      |
| 14c   | Header hierarchy     | Skipped H-levels, orphans    | Structural reorganization required |

**Behavior:** Reports issues for manual resolution. No `--fix` support.

---

## Hybrid Phases (CLI + Claude Reasoning)

These phases combine deterministic CLI auto-fix with Claude reasoning for ambiguous cases:

| Phase | Name                 | CLI Part (Deterministic)       | Claude Part (Ambiguous)                             |
| ----- | -------------------- | ------------------------------ | --------------------------------------------------- |
| 4     | Broken links         | Auto-fix when file exists elsewhere | Fuzzy match + user confirms (create/remove/replace) |
| 10    | Phantom references   | Auto-replace from registry     | Fuzzy match against skills/agents + user confirms   |
| 19    | Broken gateway paths | —                              | Fuzzy match gateway paths + user confirms fix       |

### Hybrid Decision Tree

```
Issue Detected
    │
    ├─ Deterministic case? → CLI auto-fix
    │   (e.g., path exists elsewhere, registry match)
    │
    └─ Ambiguous case? → Claude reasoning
        │
        ├─ Can Claude resolve without human? → Claude-automated
        │   (e.g., typo correction, content generation)
        │
        └─ Genuinely ambiguous? → Ask user
            (e.g., remove vs create decision)
```

### Phase 4: Broken Links (Hybrid)

**CLI handles (deterministic):**

- File exists elsewhere in skill directory → Auto-correct path

**Claude handles (ambiguous - Levenshtein fuzzy matching):**

- File doesn't exist anywhere:
  1. Use Levenshtein distance to find similar files (>40% similarity)
  2. Extract surrounding context (~100 chars) for user to understand intent
  3. Present options:
     - **Create**: Generate placeholder file with TODO content
     - **Remove**: Delete the link reference
     - **Replace**: Use similar file (if found)
  4. User confirms choice, CLI applies

**Example:** Link to `references/workflow.md` → Similar file `references/workflows.md` found (87% match)

### Phase 10: Phantom References (Hybrid)

**CLI handles (deterministic):**

- References in deprecation registry → Auto-replace

**Claude handles (ambiguous - Levenshtein fuzzy matching):**

- References NOT in registry:
  1. Use Levenshtein distance against all existing skills/agents (>60% similarity)
  2. Present top 3 matches with similarity scores
  3. Options:
     - **Replace**: Use suggested match
     - **Remove**: Delete backticks (unquote)
     - **Keep**: Leave unchanged
  4. User confirms, CLI applies

**Example:** `debuging-systematically` → Match `debugging-systematically` (93% similar)

**Filters out false positives:** Ignores npm packages, git commands, common prefixes/suffixes

### Phase 19: Broken Gateway Paths (Hybrid)

**No CLI deterministic part** - All cases are ambiguous.

**Claude handles (Levenshtein fuzzy matching):**

1. Use Levenshtein distance against all existing skill paths (>50% similarity)
2. Weighted scoring: skill name (70%) + full path (30%)
3. Present options:
   - **Fix**: Replace with similar existing path
   - **Remove**: Delete from routing table
   - **Create**: Add TODO comment for missing skill
4. User confirms, CLI applies

**Example:** `.claude/skill-library/development/frontend/using-react-hooks/SKILL.md` (broken)
→ Match `.claude/skill-library/development/frontend/using-react-hook-form-zod/SKILL.md` (68% similar)

---

## Claude-Automated Phases (No Human Input)

These phases require semantic understanding but Claude can handle without human input:

| Phase | Name                   | What Claude Does                                                          |
| ----- | ---------------------- | ------------------------------------------------------------------------- |
| 1     | Description format     | Rewrite to "Use when..." pattern, <120 chars                              |
| 3     | Line count >500        | Identify extraction candidates, create references/                        |
| 11    | cd commands            | Update to REPO_ROOT pattern                                               |
| 13    | TodoWrite missing      | Detect multi-step workflows, add mandate                                  |
| 15    | Orphan detection       | Identify orphaned library skills, suggest agent integrations              |
| 17    | Gateway structure      | Populate from template with gateway-specific details                      |
| 21    | Line number references | Replace `:123` patterns with method signatures or structural descriptions |

### Phase 1: Description Format (Claude-Automated)

**Process:**

1. Read SKILL.md content to understand purpose
2. Identify primary trigger ("Use when...")
3. List key capabilities (2-3 words each)
4. Generate: `Use when {trigger} - {capability1}, {capability2}`
5. Verify <120 characters
6. Apply with Edit tool

**Example:**

```yaml
# Before (too long, wrong format)
description: This skill helps you when you need to create new skills from scratch by guiding you through the complete TDD workflow

# After (Claude-generated)
description: Use when creating skills - TDD workflow (RED-GREEN-REFACTOR) with validation
```

### Phase 3: Line Count >500 (Claude-Automated)

**Process:**

1. Identify sections >50 lines with detailed content
2. Prioritize extraction:
   - Code examples → `examples/`
   - Step-by-step workflows → `references/workflow.md`
   - Troubleshooting → `references/troubleshooting.md`
   - Edge cases → `references/advanced.md`
3. Create reference files with extracted content
4. Replace in SKILL.md with summary + link
5. Verify <500 lines

### Phase 11: cd Commands (Claude-Automated)

**Process:**

1. Find all cd commands: `cd /absolute/path` or `cd relative/path`
2. Determine if cd is to repo-relative location
3. Replace with REPO_ROOT pattern (see [repo-root-detection.md](repo-root-detection.md))
4. Skip cd commands to temp directories or external paths

### Phase 13: TodoWrite Missing (Claude-Automated)

**Process:**

1. Detect multi-step workflow indicators:
   - Numbered phase lists
   - Workflow tables with >3 rows
   - "Step 1", "Step 2", etc. headers
2. If detected, add TodoWrite mandate:
   ```markdown
   **IMPORTANT**: Use TodoWrite to track phases. Steps get skipped without tracking.
   ```
3. Add checklist template if applicable

> **Note:** Section organization, visual readability, and example quality checks are part of the **Post-Audit Semantic Review** process, not numbered CLI phases. See [audit-phases.md](../audit-phases.md#post-audit-semantic-review) for the semantic review checklist.

### Phase 15: Orphan Detection (Claude-Automated)

**Purpose:** Ensure library skills have a discovery path (gateway or agent reference).

**Process:**

1. Check if skill is a library skill (path contains `/skill-library/`)
2. Verify skill appears in at least one:
   - Gateway routing table (`gateway-*/SKILL.md`)
   - Agent frontmatter skills list
   - Agent instructions body
3. If orphaned:
   - Run agent matching algorithm (see [Agent Recommendation Patterns](agent-recommendation-patterns.md))
   - Suggest HIGH confidence agent matches
   - Recommend gateway addition or agent reference

**Detection criteria:**

- Library skill only (core skills are always discoverable)
- Not a gateway skill itself
- Not mentioned in any gateway or agent

**Output:**

```
[WARNING] Library skill has no discovery path (orphaned)
[INFO] Domain: development/frontend
[INFO] Suggested agents: frontend-developer, frontend-architect
[INFO] Fix: Add to gateway-frontend routing table or reference in relevant agent
```

### Phase 17: Gateway Structure (Claude-Automated)

**Process:**

1. Read gateway-template.md
2. Analyze gateway's current routing table
3. Generate "Understanding This Gateway" section:
   - What domain this gateway covers
   - How skills are organized
   - When to use this gateway vs others
4. Add IMPORTANT warning block about two-tier system

### Phase 21: Line Number References (Claude-Automated)

**Purpose:** Replace brittle line number references with durable method signatures or structural descriptions.

**Process:**

1. Detect patterns: `file.ext:123` or `file.ext:123-456`
2. Read the referenced file at that line (if file exists in codebase)
3. Identify the method/function at or near that line
4. Replace with durable pattern:
   - **Method signature:** `file.go` - `func (t *Type) MethodName(...)`
   - **Structural:** `file.go (between Match() and Invoke() methods)`
   - **File only:** `file.go` (if reference is general)
5. Apply with Edit tool

**Example:**

```markdown
# Before (brittle - becomes outdated)

- Nuclei: `capabilities/nuclei/nuclei.go:167-171` (MockCollectors)

# After (durable - stable across refactors)

- Nuclei: `capabilities/nuclei/nuclei.go` - `func (n *Nuclei) MockCollectors(port *model.Port)`
```

**Rationale:**

- Line numbers drift with every code change (inserts, deletions, refactors)
- Method signatures are stable across refactors
- Grep-friendly: `rg "func.*MockCollectors"` finds instantly

**Reference:** See [code-reference-patterns.md](code-reference-patterns.md) for complete guidance.

---

## Human-Required Phases

These phases require genuine human judgment or policy decisions:

| Phase | Name              | Why Human Required                                             |
| ----- | ----------------- | -------------------------------------------------------------- |
| 8     | TypeScript errors | Complex errors need code understanding beyond pattern matching |
| 9     | Bash scripts      | Logic preservation during migration needs human verification   |
| 20    | Coverage gaps     | Cross-gateway decisions affect organization structure          |

### Phase 8: TypeScript Errors (Human-Required)

**Why not automated:**

- Type errors can have multiple valid fixes
- Context-dependent decisions about type narrowing
- May require architectural changes

**Partial automation (future):**

- Common patterns (missing imports, simple type fixes) could be auto-fixed
- Complex errors escalate to human

### Phase 9: Bash Scripts (Human-Required)

**Why not automated:**

- Bash logic needs careful translation
- Side effects must be preserved
- Error handling semantics differ between bash and TypeScript

**Partial automation (future):**

- Simple scripts (grep, find) could be auto-migrated
- Complex scripts with pipes/logic remain manual

### Phase 20: Coverage Gaps (Human-Required)

**Why not automated:**

- Requires cross-gateway coordination
- May affect organizational skill structure
- Policy decisions about gateway boundaries

**Process:** Use `syncing-gateways` skill for manual coordination

---

## Gateway-Specific Phases (17-20)

These phases only run for skills with names starting with `gateway-`:

| Phase | Category         | Fix Handler                                    |
| ----- | ---------------- | ---------------------------------------------- |
| 17    | Claude-Automated | Generate from template                         |
| 18    | Deterministic    | CLI converts names → paths                     |
| 19    | Hybrid           | Claude determines: fix typo, remove, or create |
| 20    | Human-Required   | Use syncing-gateways skill                     |

---

## Fix Responsibility Matrix

| Skill             | Detection         | Deterministic | Hybrid       | Claude-Automated | Human       |
| ----------------- | ----------------- | ------------- | ------------ | ---------------- | ----------- |
| `auditing-skills` | TypeScript CLI    | —             | —            | —                | —           |
| `fixing-skills`   | Uses audit output | CLI           | Claude + CLI | Claude           | Interactive |

**Key insight:** `fixing-skills` is the orchestrator that routes fixes to the appropriate handler.

---

## Quick Reference

```
Deterministic (CLI only):     2, 5, 6, 7, 12, 14a, 16, 18
Hybrid (CLI + Claude):        4, 10, 19
Validation-Only:              14b, 14c
Claude-Automated:             1, 3, 11, 13, 15, 17, 21, 22
Human-Required:               8, 9, 20

Phase 14 sub-phases (Visual/Style):
  Deterministic:  14a (tables)
  Validation:     14b (code blocks), 14c (headers)
  (Section/readability checks → Semantic Review)

Phase 15:
  Orphan detection (Claude-Automated)

Phase 22:
  Context7 staleness check (Claude-Automated)

Gateway phases (17-20):
  Deterministic:  18
  Hybrid:         19
  Claude-Auto:    17
  Human:          20

Hybrid Phases Use Levenshtein Fuzzy Matching:
  Phase 4:  Find similar files (>40% similarity)
  Phase 10: Match against skills/agents (>60% similarity)
  Phase 19: Match gateway paths (>50% similarity)
```

---

## Related

- [Line Count Limits](line-count-limits.md) - Phase 3 thresholds
- [Visual Style Guidelines](visual-style-guidelines.md) - Phase 14 requirements
- [Backup Strategy](backup-strategy.md) - Pre-fix backup procedure
- [Repo Root Detection](repo-root-detection.md) - Phase 11 pattern
- [Agent Recommendation Patterns](agent-recommendation-patterns.md) - Phase 15 algorithm
- [Skill Compliance Contract](../skill-compliance-contract.md) - All requirements
