# Phase Categorization

**Single source of truth for audit phase categories and fix responsibility.**

This pattern is referenced by:

- `auditing-skills` - Runs phases in appropriate order
- `fixing-skills` - Routes fixes to appropriate handler (TypeScript CLI vs Claude reasoning)

---

## Overview

The 21-phase skill audit (with Phase 14 sub-phases) uses a **three-tier fix model**:

| Category             | Handler          | Characteristics                           | Phases                             |
| -------------------- | ---------------- | ----------------------------------------- | ---------------------------------- |
| **Deterministic**    | TypeScript CLI   | One correct answer, no judgment           | 2, 5, 7, 14a, 14b, 14c, 18         |
| **Hybrid**           | CLI + Claude     | Auto-fix part, Claude for ambiguous cases | 4, 6, 10, 12, 14f, 19              |
| **Claude-Automated** | Claude reasoning | Semantic understanding, no human input    | 1, 3, 11, 13, 14d, 14e, 15, 17, 21 |
| **Human-Required**   | Human decision   | Genuinely ambiguous, policy decisions     | 8, 9, 20                           |

---

## Deterministic Phases (TypeScript CLI Only)

These phases have exactly one correct answer derivable from rules:

| Phase | Name                 | CLI Action               | Why Deterministic                   |
| ----- | -------------------- | ------------------------ | ----------------------------------- |
| 2     | Allowed-tools field  | Fix comma-separation     | YAML syntax has one correct format  |
| 5     | File organization    | Create directories       | Directory structure is prescribed   |
| 7     | Output directories   | Create .output/, .local/ | Standard directories, no choices    |
| 14a   | Table formatting     | Validate/fix tables      | Markdown table syntax is prescribed |
| 14b   | Code block quality   | Add language tags        | Language detection is pattern-based |
| 14c   | Header hierarchy     | Fix level skipping       | Hierarchy rules are deterministic   |
| 18    | Routing table format | Convert names → paths    | Path format is deterministic        |

**Command:** `npm run -w @chariot/fixing-skills fix -- <skill-name>`

**Behavior:** Apply automatically, no user confirmation needed.

### Phase 14a-c: Visual/Style (Deterministic)

See [Visual Style Guidelines](visual-style-guidelines.md) for detailed requirements.

**Phase 14a (Table Formatting):**

- Validates header rows have separators (`|---|---|`)
- Checks column count consistency
- Validates alignment indicators (`:---`, `---:`, `:---:`)

**Phase 14b (Code Block Quality):**

- Detects missing language tags
- Suggests language based on content patterns
- Warns on excessively long lines (>120 chars)

**Phase 14c (Header Hierarchy):**

- Ensures single H1 at top
- Detects skipped levels (H1 → H3)
- Identifies orphan headers (no content)

---

## Hybrid Phases (CLI + Claude Reasoning)

These phases have deterministic parts but may need Claude for ambiguous cases:

| Phase | Name                 | CLI Part                     | Claude Part                                         |
| ----- | -------------------- | ---------------------------- | --------------------------------------------------- |
| 4     | Broken links         | Correct wrong paths          | Create meaningful content for missing files         |
| 6     | Missing scripts      | Create boilerplate (opt-in)  | Decide if scripts/ is even needed                   |
| 10    | Phantom references   | Registry-based replacements  | Fuzzy matching for typos, suggest corrections       |
| 12    | CLI error handling   | Fix exit codes (1→2)         | Generate contextual error messages                  |
| 14f   | Example quality      | Validate code block presence | Assess example completeness, before/after pattern   |
| 19    | Broken gateway paths | —                            | Determine: typo fix, remove entry, or create skill? |

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

**CLI handles:**

- File exists but path is wrong → Correct path automatically

**Claude handles:**

- File doesn't exist anywhere:
  - Analyze link text context
  - Generate meaningful placeholder content
  - Or suggest removing the reference

### Phase 6: Missing Scripts (Hybrid - Opt-in)

**Changed behavior:** No longer auto-creates boilerplate.

**Claude handles:**

- Analyze skill content to determine if scripts/ is needed
- If skill has CLI commands: Ask user if scripts/ should be created
- If no CLI indicators: Skip silently

### Phase 10: Phantom References (Hybrid)

**CLI handles:**

- References in deprecation registry → Replace automatically

**Claude handles:**

- References not in registry:
  - Fuzzy match against existing skills
  - Suggest: "Did you mean `debugging-skills`?"
  - Let user confirm correction or removal

### Phase 12: CLI Error Handling (Hybrid)

**CLI handles:**

- Exit code changes: `process.exit(1)` → `process.exit(2)` in catch blocks

**Claude handles:**

- Error message generation:
  - Analyze CLI purpose from code
  - Generate contextual messages: "Tool Error - {skill}: Failed to {action}"

### Phase 19: Broken Gateway Paths (Hybrid - Claude-Primary)

**No CLI auto-fix.** Removal is often wrong.

**Claude handles all cases:**

1. Fuzzy match against existing skills
2. Present options: correct path, remove entry, or note skill needs creation
3. Apply user's choice

---

## Claude-Automated Phases (No Human Input)

These phases require semantic understanding but Claude can handle without human input:

| Phase | Name                   | What Claude Does                                                          |
| ----- | ---------------------- | ------------------------------------------------------------------------- |
| 1     | Description format     | Rewrite to "Use when..." pattern, <120 chars                              |
| 3     | Line count >500        | Identify extraction candidates, create references/                        |
| 11    | cd commands            | Update to REPO_ROOT pattern                                               |
| 13    | TodoWrite missing      | Detect multi-step workflows, add mandate                                  |
| 14d   | Section organization   | Verify required sections, suggest additions                               |
| 14e   | Visual readability     | Identify wall-of-text, suggest formatting improvements                    |
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

### Phase 14d: Section Organization (Claude-Automated)

**Purpose:** Ensure skills have required sections in logical order.

**Process:**

1. Identify required sections:
   - Quick Reference (summary table)
   - When to Use (triggers)
   - Workflow/How to Use (main content)
   - Related Skills (cross-references)
2. Check section order is logical
3. If missing sections:
   - Generate section headers with placeholder content
   - Suggest content based on skill purpose
4. Apply with Edit tool

**Output:**

```
[WARNING] Missing "Related Skills" section
[INFO] Suggested: Add ## Related Skills with links to similar skills
```

### Phase 14e: Visual Readability (Claude-Automated)

**Purpose:** Identify readability issues and suggest formatting improvements.

**Process:**

1. Detect wall-of-text paragraphs (>5-6 lines without breaks)
2. Identify missing emphasis on key terms
3. Find comma-separated lists that should be bullet points
4. Check for adequate whitespace between sections
5. Verify callouts use consistent format (`> **Note:**`)
6. Generate formatted alternatives

**Output:**

```
[INFO] Paragraph at line 45 is 8 lines - consider breaking up
[INFO] List at line 67 could use bullet points for readability
```

### Phase 14f: Example Quality (Hybrid)

**Purpose:** Validate example quality with deterministic checks + Claude assessment.

**CLI Part:**

- Check examples have code blocks with language tags
- Verify before/after examples have both parts

**Claude Part:**

- Assess if examples are self-contained
- Check if examples match skill purpose
- Suggest improvements for incomplete examples

See [Visual Style Guidelines](visual-style-guidelines.md) for complete requirements.

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
Deterministic (CLI only):     2, 5, 7, 14a, 14b, 14c, 18
Hybrid (CLI + Claude):        4, 6, 10, 12, 14f, 19
Claude-Automated:             1, 3, 11, 13, 14d, 14e, 15, 17
Human-Required:               8, 9, 20

Phase 14 sub-phases (Visual/Style):
  Deterministic:  14a (tables), 14b (code blocks), 14c (headers)
  Claude-Auto:    14d (sections), 14e (readability)
  Hybrid:         14f (examples)

Phase 15:
  Orphan detection (Claude-Automated)

Gateway phases (17-20):
  Deterministic:  18
  Hybrid:         19
  Claude-Auto:    17
  Human:          20
```

---

## Related

- [Line Count Limits](line-count-limits.md) - Phase 3 thresholds
- [Visual Style Guidelines](visual-style-guidelines.md) - Phase 14 requirements
- [Backup Strategy](backup-strategy.md) - Pre-fix backup procedure
- [Repo Root Detection](repo-root-detection.md) - Phase 11 pattern
- [Agent Recommendation Patterns](agent-recommendation-patterns.md) - Phase 15 algorithm
- [Skill Compliance Contract](../skill-compliance-contract.md) - All requirements
