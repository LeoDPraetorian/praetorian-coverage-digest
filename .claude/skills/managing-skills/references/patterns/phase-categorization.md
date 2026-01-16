# Phase Categorization

**Single source of truth for audit phase categories and fix responsibility.**

This pattern is referenced by:

- `auditing-skills` - Runs phases in appropriate order
- `fixing-skills` - Routes fixes to appropriate handler based on user interaction needs

For current phase-to-category mapping, see [phase-details.md](.claude/skill-library/claude/skill-management/auditing-skills/references/phase-details.md).

---

## Overview

The skill audit uses a **three-tier fix model**:

| Category             | Handler                | Characteristics                           | Examples                                                                   |
| -------------------- | ---------------------- | ----------------------------------------- | -------------------------------------------------------------------------- |
| **Deterministic**    | Claude (auto-apply)    | One correct answer, no judgment           | Allowed-tools format, directory structure, table formatting, path format   |
| **Hybrid**           | Claude (user confirms) | Auto-fix part, Claude for ambiguous cases | Broken links, phantom references, gateway path resolution                  |
| **Validation-Only**  | Report only            | Detects issues, no automated fix          | Code block quality, header hierarchy                                       |
| **Claude-Automated** | Claude reasoning       | Semantic understanding, no human input    | Description format, line count extraction, TodoWrite mandates, cd commands |
| **Human-Required**   | Human decision         | Genuinely ambiguous, policy decisions     | TypeScript errors, bash script migration, coverage gap coordination        |

---

## Deterministic Phases (Auto-Apply)

These phases have exactly one correct answer derivable from rules:

| Name                   | Claude Action            | Why Deterministic                   |
| ---------------------- | ------------------------ | ----------------------------------- |
| Allowed-tools field    | Fix comma-separation     | YAML syntax has one correct format  |
| File organization      | Create directories       | Directory structure is prescribed   |
| Script organization    | Move scripts to scripts/ | Directory structure is prescribed   |
| Output directories     | Create .output/, .local/ | Standard directories, no choices    |
| CLI error handling     | Fix exit codes (1→2)     | Exit code convention is prescribed  |
| Table formatting       | Validate/fix tables      | Markdown table syntax is prescribed |
| Windows path detection | Fix backslashes          | Path format is deterministic        |
| Routing table format   | Convert names → paths    | Path format is deterministic        |

**How to fix:** Invoke fixing-skills to apply deterministic fixes automatically.

**Behavior:** Apply automatically, no user confirmation needed.

---

## Validation-Only Phases (Report Only)

These phases detect issues but provide no automated fix:

| Name             | What It Reports           | Why No Auto-Fix                    |
| ---------------- | ------------------------- | ---------------------------------- |
| Header hierarchy | Skipped H-levels, orphans | Structural reorganization required |

**Behavior:** Reports issues for manual resolution. No `--fix` support.

---

## Hybrid Phases (User Confirmation)

These phases combine deterministic auto-fix with Claude reasoning for ambiguous cases:

| Name                 | Claude Part (Deterministic)         | Claude Part (Ambiguous)                             |
| -------------------- | ----------------------------------- | --------------------------------------------------- |
| Broken links         | Auto-fix when file exists elsewhere | Fuzzy match + user confirms (create/remove/replace) |
| Phantom references   | Auto-replace from registry          | Fuzzy match against skills/agents + user confirms   |
| Broken gateway paths | —                                   | Fuzzy match gateway paths + user confirms fix       |

### Hybrid Decision Tree

```
Issue Detected
    │
    ├─ Deterministic case? → Claude auto-applies
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

### Broken Links (Hybrid)

**Claude handles (deterministic):**

- File exists elsewhere in skill directory → Auto-correct path

**Claude handles (ambiguous - Levenshtein fuzzy matching):**

- File doesn't exist anywhere:
  1. Use Levenshtein distance to find similar files (>40% similarity)
  2. Extract surrounding context (~100 chars) for user to understand intent
  3. Present options:
     - **Create**: Generate placeholder file with TODO content
     - **Remove**: Delete the link reference
     - **Replace**: Use similar file (if found)
  4. User confirms choice, Claude applies

**Example:** Link to `references/workflow.md` → Similar file `references/workflows.md` found (87% match)

### Phantom References (Hybrid)

**Claude handles (deterministic):**

- References in deprecation registry → Auto-replace

**Claude handles (ambiguous - Levenshtein fuzzy matching):**

- References NOT in registry:
  1. Use Levenshtein distance against all existing skills/agents (>60% similarity)
  2. Present top 3 matches with similarity scores
  3. Options:
     - **Replace**: Use suggested match
     - **Remove**: Delete backticks (unquote)
     - **Keep**: Leave unchanged
  4. User confirms, Claude applies

**Example:** `debuging-systematically` → Match `debugging-systematically` (93% similar)

**Filters out false positives:** Ignores npm packages, git commands, common prefixes/suffixes

### Broken Gateway Paths (Hybrid)

**No deterministic part** - All cases are ambiguous.

**Claude handles (Levenshtein fuzzy matching):**

1. Use Levenshtein distance against all existing skill paths (>50% similarity)
2. Weighted scoring: skill name (70%) + full path (30%)
3. Present options:
   - **Fix**: Replace with similar existing path
   - **Remove**: Delete from routing table
   - **Create**: Add TODO comment for missing skill
4. User confirms, Claude applies

**Example:** `.claude/skill-library/development/frontend/using-react-hooks/SKILL.md` (broken)
→ Match `.claude/skill-library/development/frontend/using-react-hook-form-zod/SKILL.md` (68% similar)

---

## Claude-Automated Phases (No Human Input)

These phases require semantic understanding but Claude can handle without human input:

| Name                      | What Claude Does                                                          |
| ------------------------- | ------------------------------------------------------------------------- |
| Description format        | Rewrite to "Use when..." pattern, <120 chars                              |
| Line count >500           | Identify extraction candidates, create references/                        |
| cd commands               | Update to ROOT pattern                                                    |
| State externalization     | Distinguish stateful workflows from reference docs                        |
| Orphan detection          | Identify orphaned library skills, suggest agent integrations              |
| Gateway structure         | Populate from template with gateway-specific details                      |
| Line number references    | Replace `:123` patterns with method signatures or structural descriptions |
| Code block quality        | Distinguish genuine issues from templates/examples/output/pseudo-code     |
| Reference content quality | Distinguish genuine stubs from templates/examples                         |

### Description Format (Claude-Automated)

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

### Line Count >500 (Claude-Automated)

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

### cd Commands and .claude/ Path Operations (Claude-Automated)

**Process:**

1. Find all bash commands that interact with `.claude/` paths
2. Categorize by operation type:
   - Navigation: `cd .claude/...`
   - Write/create: `mkdir`, `cp`, `mv`, `touch`, `echo ... >`
   - Read-only: `ls`, `cat`, `grep` (INFO only)
3. Check if ROOT calculation precedes the command
4. Replace with ROOT pattern (see [repo-root-detection.md](repo-root-detection.md))
5. Skip commands in "WRONG" example contexts

**Rationale:** Agents running from `.claude/` directory will create nested `.claude/.claude/` directories if paths aren't absolute. This is a real bug that occurred in research skills.

### TodoWrite Missing (Claude-Automated)

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

> **Note:** Section organization, visual readability, and example quality checks are part of the **Post-Audit Semantic Review** process. See [auditing-skills](.claude/skill-library/claude/skill-management/auditing-skills/SKILL.md) for the semantic review checklist.

### Orphan Detection (Claude-Automated)

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

### Gateway Structure (Claude-Automated)

**Process:**

1. Read gateway-template.md
2. Analyze gateway's current Intent Detection and Skill Registry tables
3. Generate canonical gateway sections:
   - EXTREMELY-IMPORTANT block (1% Rule, Skill Announcement)
   - Progressive Disclosure (3-tier loading)
   - Intent Detection (Task Intent → Route To)
   - Skill Registry (Skill | Path | Triggers)
   - Cross-Gateway Routing
   - When to use this gateway vs others
4. Add IMPORTANT warning block about two-tier system

### Line Number References (Claude-Automated)

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

### Code Block Quality (Claude-Automated)

**Purpose:** Detect code blocks that genuinely need language tags while ignoring template code, examples, output, and pseudo-code.

**Process:**

1. Automated detection flags CANDIDATES:
   - Missing language tags → INFO
   - Potential language mismatches → INFO
   - Unknown language tags → INFO
   - Long lines (>120 chars) → WARNING (deterministic)
2. Claude reasons about each candidate's context:
   - Read surrounding text (before/after block)
   - Check file name for template indicators
   - Identify markers ("WRONG:", "Output:", etc.)
   - Classify as: genuine issue, template, example, output, pseudo-code, or meta-discussion
   - Flag only genuine issues (real code needing tags)
3. Apply semantic understanding to avoid false positives:
   - Template code: Intentional placeholders with TODO comments
   - Bad practice examples: After "WRONG:" or "❌" markers
   - Console output: After "Output:", "Result:", or has prompts/timestamps
   - Pseudo-code: Algorithm steps, not executable code
   - Meta-discussion: Discussing code block syntax itself

**Classification Categories:**

- **Genuine missing tag** (FLAG) - Real code needs syntax highlighting
- **Genuine mismatch** (FLAG) - Wrong tag confuses readers
- **Output/console** (IGNORE) - Command results, not code
- **Pseudo-code** (IGNORE) - Algorithm steps, not real code
- **Bad practice example** (IGNORE) - Shows what NOT to do
- **Template placeholder** (IGNORE) - Intentional for users to fill
- **Multi-language/mixed** (IGNORE) - Intentionally shows multiple languages
- **Meta-discussion** (IGNORE) - Code blocks are the subject matter

**Example:**

````markdown
# False Positive (console output)

Output:

```
✓ Phase 1: passed
Done in 2.3s
```

→ IGNORE: Console output, not code

# True Positive (genuine issue)

# API Implementation

```
async function fetchData() {
  return await fetch(url);
}
```

→ FLAG: Should be ```typescript
````

**Reference:** See [phase-15-semantic-review.md](.claude/skill-library/claude/skill-management/auditing-skills/references/phase-15-semantic-review.md) for complete classification guide.

### Reference Content Quality (Claude-Automated)

**Purpose:** Detect genuine incomplete stubs while ignoring template code, examples, and intentional minimal content.

**Process:**

1. Automated detection flags CANDIDATES:
   - Empty files (size === 0) → CRITICAL
   - Small files (size < 100 bytes) → INFO
2. Claude reasons about each candidate's nature:
   - Read file content and surrounding context
   - Classify as: genuine stub, template code, bad practice example, redirect, intentionally minimal, or conceptual discussion
   - Flag only genuine stubs (incomplete work)
3. Apply semantic understanding to avoid false positives:
   - Template code: Intentional placeholders users copy
   - Bad practice examples: Shows what NOT to do
   - Conceptual discussion: TODOs are the subject matter

**Classification Categories:**

- **Genuine stub** (FLAG) - Incomplete work needing content
- **Template code** (IGNORE) - Intentional placeholder for users
- **Bad practice example** (IGNORE) - Shows what NOT to do
- **Redirect file** (IGNORE) - Points elsewhere, complete in purpose
- **Intentionally minimal** (IGNORE) - Brief but complete
- **Conceptual discussion** (IGNORE) - Discusses TODOs as topic

**Example:**

```markdown
# False Positive (template code)

// TODO: Implement actual API call
→ IGNORE: In integration-templates.md, intentional template

# True Positive (genuine stub)

# API Patterns

This section will be completed.
→ FLAG: No substantive content
```

**Reference:** See [phase-26-semantic-review.md](.claude/skill-library/claude/skill-management/auditing-skills/references/phase-26-semantic-review.md) for complete classification guide.

---

## Human-Required Phases

These phases require genuine human judgment or policy decisions:

| Name              | Why Human Required                                             |
| ----------------- | -------------------------------------------------------------- |
| TypeScript errors | Complex errors need code understanding beyond pattern matching |
| Bash scripts      | Logic preservation during migration needs human verification   |
| Coverage gaps     | Cross-gateway decisions affect organization structure          |

### TypeScript Errors (Human-Required)

**Why not automated:**

- Type errors can have multiple valid fixes
- Context-dependent decisions about type narrowing
- May require architectural changes

**Partial automation (future):**

- Common patterns (missing imports, simple type fixes) could be auto-fixed
- Complex errors escalate to human

### Bash Scripts (Human-Required)

**Why not automated:**

- Bash logic needs careful translation
- Side effects must be preserved
- Error handling semantics differ between bash and TypeScript

**Partial automation (future):**

- Simple scripts (grep, find) could be auto-migrated
- Complex scripts with pipes/logic remain manual

### Coverage Gaps (Human-Required)

**Why not automated:**

- Requires cross-gateway coordination
- May affect organizational skill structure
- Policy decisions about gateway boundaries

**Process:** Use `syncing-gateways` skill for manual coordination

---

## Gateway-Specific Phases

These phases only run for skills with names starting with `gateway-`:

| Name              | Category         | Fix Handler                                    |
| ----------------- | ---------------- | ---------------------------------------------- |
| Gateway structure | Claude-Automated | Generate from template                         |
| Routing format    | Deterministic    | Claude converts names → paths                  |
| Broken paths      | Hybrid           | Claude determines: fix typo, remove, or create |
| Coverage gaps     | Human-Required   | Use syncing-gateways skill                     |

---

## Fix Responsibility Matrix

| Skill             | Detection            | Deterministic | Hybrid | Claude-Automated | Human       |
| ----------------- | -------------------- | ------------- | ------ | ---------------- | ----------- |
| `auditing-skills` | Claude (reads skill) | —             | —      | —                | —           |
| `fixing-skills`   | Uses audit output    | Claude        | Claude | Claude           | Interactive |

**Key insight:** `fixing-skills` is the orchestrator that routes fixes to the appropriate handler.

---

## Quick Reference

```
Deterministic (Auto-Apply):
  - Allowed-tools format, directory structure, table formatting, path format

Hybrid (User Confirmation):
  - Broken links, phantom references, gateway path resolution

Validation-Only:
  - Header hierarchy

Claude-Automated:
  - Description format, line count extraction, cd commands, state externalization (TodoWrite)
  - Orphan detection, gateway structure, line number references, Context7 staleness
  - Code block quality (distinguish genuine issues from templates/examples/output)
  - Reference content quality (empty/stub file detection)

Human-Required:
  - TypeScript errors, bash script migration, coverage gap coordination

Gateway-Specific:
  - Deterministic: Routing format
  - Hybrid: Broken paths
  - Claude-Auto: Gateway structure
  - Human: Coverage gaps

Hybrid Phases Use Levenshtein Fuzzy Matching:
  - Broken links: Find similar files (>40% similarity)
  - Phantom references: Match against skills/agents (>60% similarity)
  - Gateway paths: Match gateway paths (>50% similarity)
```

---

## Semantic Review Fixes (Non-Phase)

These fix procedures address issues detected during semantic review that aren't tied to specific audit phases. They're Claude-Automated (no human confirmation needed).

### Section Organization

**When:** Skill missing required sections or sections out of order

**Process:**

1. Check for required sections:
   - Quick Reference (summary table at top)
   - When to Use / Overview (trigger conditions)
   - Workflow / How to Use (main content)
   - Related Skills (cross-references at bottom)
2. If missing section:
   - Generate section header
   - Add placeholder content based on skill purpose
   - Example: `## Related Skills\n\n- [skill-name](path) - Description`
3. If order is wrong:
   - Restructure to logical flow
   - Keep content intact, just reorganize

### Visual Readability

**When:** Skill has readability issues (wall-of-text, missing emphasis, etc.)

**Process:**

1. Identify wall-of-text paragraphs (>5-6 lines without breaks)
   - Break into shorter paragraphs at logical points
   - Convert lists of items to bullet points
2. Add emphasis to key terms:
   - **Bold** for important concepts
   - `code` for technical terms, commands, file names
3. Convert comma-separated items to bullet lists:
   - "A, B, and C" → "- A\n- B\n- C"
4. Add callouts for important notes:
   - `> **Note:** Important information here`
5. Ensure adequate whitespace between sections

### Example Quality (Hybrid)

**When:** Examples appear incomplete during semantic review

**Deterministic part:** Check examples have code blocks with language tags.

**Ambiguous part:** Assess example completeness:

1. Check for before/after pattern in examples
2. Verify examples are self-contained
3. If incomplete, present options:
   - Add "Before:" and "After:" sections (show transformation)
   - Add missing context (make example self-contained)
   - Skip for now (leave example as-is)

See [Visual Style Guidelines](visual-style-guidelines.md) for related patterns.

---

## Related

- [Line Count Limits](line-count-limits.md) - Phase 3 thresholds
- [Visual Style Guidelines](visual-style-guidelines.md) - Phases 14-16 requirements
- [Backup Strategy](backup-strategy.md) - Pre-fix backup procedure
- [Repo Root Detection](repo-root-detection.md) - Phase 11 pattern
- [Agent Recommendation Patterns](agent-recommendation-patterns.md) - Phase 18 algorithm
- [Skill Compliance Contract](../skill-compliance-contract.md) - All requirements
