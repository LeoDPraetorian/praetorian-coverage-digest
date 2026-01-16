---
name: auditing-skills
description: Use when validating skill compliance - reads skills, applies 29-phase rules from phase-details.md, reports violations
allowed-tools: Read, Grep, Bash, TodoWrite
---

# Auditing Skills

**Validates skills for structural compliance and quality by reading skill files and checking against documented rules.**

> **You MUST use TodoWrite** to track audit progress for all audits to ensure no phases are skipped.

---

## What This Skill Does

Audits skills across **29 validation phases** by reading skill files and applying rules from phase-details.md.

**Phase categories:**

| Phase Category   | Count | What                   | Example Phases                    |
| ---------------- | ----- | ---------------------- | --------------------------------- |
| Deterministic    | 9     | One correct answer     | Description format, Line count    |
| Hybrid           | 4     | Deterministic + Claude | Broken links, Path resolution     |
| Claude-Automated | 11    | Claude decides         | Orphan detection, Integration     |
| Human-Required   | 3     | Human judgment         | TypeScript errors, Bash migration |
| Validation-Only  | 2     | Detect, no fix         | Header hierarchy                  |
| Gateway-only     | 4     | Gateway skills only    | Structure, Routing, Coverage      |

**Why this matters:** Structural issues prevent skills from loading correctly. Progressive disclosure keeps skills under 500 lines. Semantic issues impact maintainability and usability.

---

## When to Use

- After editing any skill file
- Before committing skill changes
- When debugging skill loading issues
- User says "audit the X skill"
- As part of create/update workflows (automatic)

---

## How to Audit

### Step 1: Read the Skill

**Navigate to repository root first:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

**Read the skill file:**

```
Read({skill-location}/SKILL.md)
```

**List supporting files:**

```bash
find {skill-location} -type f -name "*.md" | sort
find {skill-location}/scripts -type f 2>/dev/null | sort
find {skill-location}/examples -type f 2>/dev/null | sort
```

**READ ALL REFERENCE FILES (MANDATORY for Phase 26):**

<EXTREMELY-IMPORTANT>
You MUST read EVERY file in the `references/` directory. Not just list them. Not just check their sizes. ACTUALLY READ THEM.

❌ DO NOT assume file existence = content quality
❌ DO NOT assume non-zero bytes = real content
❌ DO NOT use grep as a shortcut to "check for placeholders"
✅ You MUST invoke `Read()` on each reference file

**Why this is mandatory:**

- A 600-byte file can be 100% placeholder text
- File size tells you nothing about content quality
- Grep patterns miss edge cases like `[TO BE POPULATED: ...]`
- The ONLY way to verify content is to READ it

**For each reference file:**

```
Read({skill-location}/references/{filename}.md)
```

Then evaluate: Does this file contain ACTUAL content or just structure/placeholders?
</EXTREMELY-IMPORTANT>

**Determine skill type:**

- Core: `.claude/skills/{name}/`
- Library: `.claude/skill-library/{category}/{name}/`
- Gateway: skill name starts with `gateway-`

### Step 2: Apply Rules from phase-details.md

**You MUST read the phase-details.md reference:**

```
Read(.claude/skill-library/claude/skill-management/auditing-skills/references/phase-details.md)
```

For each of the 29 phases documented there:

1. Check if skill complies with that phase's requirements
2. Note violations with severity (CRITICAL, WARNING, INFO)
3. Apply **General Detection Principles** from phase-details.md:
   - Skip WRONG examples in code blocks
   - Check code blocks only, not prose explanations
   - Use exact patterns specified per phase
   - Consider context (deterministic vs semantic phases)

**Critical phases to check:**

| Phase | Name                      | Check                                                |
| ----- | ------------------------- | ---------------------------------------------------- |
| 1     | Description Format        | Starts with "Use when", <120 chars, no block scalars |
| 3     | Line Count                | <500 lines hard limit                                |
| 4     | Broken Links              | All markdown links resolve                           |
| 10    | Reference Audit           | Referenced skills/agents exist                       |
| 13    | State Externalization     | TodoWrite for multi-step workflows                   |
| 14    | Table Formatting          | Prettier-formatted markdown tables                   |
| 16    | Header Hierarchy          | Proper H1→H2→H3 nesting, single H1                   |
| 18    | Orphan Detection          | Library skills have gateway or agent reference       |
| 24    | Line Number References    | No hardcoded line numbers (use method names)         |
| 26    | Reference Content Quality | No empty or placeholder reference files              |
| 28    | Integration Section       | Has Called-By, Requires, Calls structure             |

**Gateway-specific phases (only for `gateway-*` skills):**

| Phase | Name                 | Check                                            |
| ----- | -------------------- | ------------------------------------------------ |
| 20    | Gateway Structure    | Explains two-tier system                         |
| 21    | Routing Table Format | Tables show full paths not just names            |
| 22    | Path Resolution      | Routing paths exist on filesystem                |
| 23    | Coverage Check       | All library skills appear in exactly one gateway |

### Step 3: Report Findings

**Format your findings as:**

```
# Audit Results: {skill-name}

## Structural Issues ({count})

[CRITICAL] Phase 3: Line Count - Skill has 612 lines, exceeds 500 line limit
Location: SKILL.md
Recommendation: Extract detailed content to references/

[WARNING] Phase 14: Table Formatting - Tables not Prettier-formatted
Location: SKILL.md:45-52, SKILL.md:89-96
Recommendation: Run prettier on markdown tables

[INFO] Phase 2: Allowed Tools - Using Bash tool without clear justification
Location: Frontmatter
Recommendation: Document why Bash is needed or remove from allowed-tools
```

**Phase 26 Per-File Reporting (MANDATORY):**

For Phase 26 (Reference Content Quality), you MUST report EACH stub file as a separate finding. Do NOT aggregate multiple stubs into a single finding.

```
# ❌ WRONG - Aggregated (fixing-skills cannot enumerate)
[CRITICAL] Phase 26: Reference Content Quality - 3 stub files detected
Location: references/
Recommendation: Populate stub files via research

# ✅ CORRECT - Per-file (fixing-skills can create TodoWrite per file)
[CRITICAL] Phase 26: Genuine stub - workflow.md
Location: references/workflow.md
Content: 12 lines, mostly headers, no substantive content
Recommendation: Populate via orchestrating-research

[CRITICAL] Phase 26: Genuine stub - api-reference.md
Location: references/api-reference.md
Content: Empty file (0 bytes)
Recommendation: Populate via orchestrating-research

[CRITICAL] Phase 26: Genuine stub - patterns.md
Location: references/patterns.md
Content: Contains '[Content to be added]' placeholder
Recommendation: Populate via orchestrating-research
```

**Why per-file reporting matters:**
- fixing-skills creates one TodoWrite item per finding
- Aggregated findings result in single 'Fix Phase 26' item
- Per-file findings enable 'Populate workflow.md', 'Populate api-reference.md', etc.
- This ensures ALL stubs get tracked and populated

**Phase 26 Example (Multiple Stubs):**

When multiple stub files are detected, report each separately:

```
[CRITICAL] Phase 26: Genuine stub - workflow.md
Location: references/workflow.md
Content: File exists but only contains '# Workflow' header (1 line)
Classification: Genuine stub (not template, not redirect)
Recommendation: Populate via orchestrating-research with query 'workflow patterns for {skill-topic}'

[CRITICAL] Phase 26: Genuine stub - api-reference.md
Location: references/api-reference.md
Content: Empty file (0 bytes)
Classification: Genuine stub
Recommendation: Populate via orchestrating-research with Context7 source

[WARNING] Phase 26: Near-stub - patterns.md
Location: references/patterns.md
Content: 45 lines but 30 are code block structure, only 15 lines of prose
Classification: Borderline - has structure but lacks examples
Recommendation: Expand with concrete examples from research
```

## Semantic Issues ({count})

[WARNING] Description Quality - Missing specific trigger terms
Location: Frontmatter description field
Recommendation: Add keywords like "TanStack Query", "mutations", "cache invalidation"

[INFO] Phase Numbering Hygiene - Found fractional phase number
Location: SKILL.md:125 ("## Phase 5.4")
Recommendation: Renumber as Phase 6, increment subsequent phases
```

**Severity levels:**

- **CRITICAL** - Blocks skill from loading or causes errors
- **WARNING** - Degrades quality or maintainability
- **INFO** - Best practice recommendations

After reporting, you MUST use AskUserQuestion to offer fix options (see Post-Audit Actions).

### Step 3b: Machine-Readable Summary (MANDATORY)

After prose findings, output a structured JSON summary for downstream skill consumption:

```markdown
## Machine-Readable Summary

\`\`\`json
{
  "skill_name": "example-skill",
  "skill_path": ".claude/skill-library/category/example-skill",
  "audit_timestamp": "2026-01-12T15:30:00Z",
  "summary": {
    "critical": 2,
    "warning": 3,
    "info": 1
  },
  "phase_26_stubs": [
    {
      "file": "references/workflow.md",
      "reason": "12 lines, mostly headers",
      "severity": "CRITICAL"
    },
    {
      "file": "references/api-reference.md",
      "reason": "Empty file (0 bytes)",
      "severity": "CRITICAL"
    }
  ],
  "phases_failed": [3, 14, 26],
  "phases_passed": [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 24, 25, 28]
}
\`\`\`
```

**Required fields:**
- `skill_name`: Skill being audited
- `skill_path`: Full path for fixing-skills to locate files
- `phase_26_stubs`: Array of stub files with paths and reasons (CRITICAL for fixing-skills)
- `phases_failed`: List of failed phase numbers
- `summary`: Count by severity

**Why structured output matters:**
- fixing-skills can programmatically extract stub file list
- No text parsing required for TodoWrite enumeration
- Enables future automation and reporting tools

### Step 4: Reference Fix Procedures

For each issue category, reference the appropriate fix procedure:

**Deterministic fixes** (clear correct answer):

- Phase 2: Allowed Tools → Remove invalid tool names
- Phase 5: File Organization → Move files to correct directories
- Phase 14: Table Formatting → Run prettier

**Hybrid fixes** (need reasoning):

- Phase 4: Broken Links → Investigate if file moved or deleted
- Phase 22: Path Resolution → Check if routing table paths exist

**Claude-automated fixes** (Claude decides):

- Phase 1: Description Format → Rewrite to start with "Use when"
- Phase 13: State Externalization → Add TodoWrite mandate
- Phase 18: Orphan Detection → Add skill to gateway routing table

**Human-required fixes** (judgment needed):

- Phase 8: TypeScript Structure → Fix compilation errors
- Phase 9: Bash→TypeScript Migration → Assess migration value
- Phase 23: Coverage Check → Decide which gateway owns skill

---

## Semantic Review (MANDATORY)

**After reporting structural findings, you MUST perform semantic review.**

This applies even if structural validation passed with zero issues.

### Semantic Checklist

Evaluate against these 8 criteria:

1. **Description Quality** - MANDATORY detailed assessment (see below)
2. **Skill Categorization** - Is category correct (frontend/backend/testing/security/tooling/claude)?
3. **Gateway Membership** - Should skill be in a gateway? Correct gateway(s)?
4. **Tool Appropriateness** - Are allowed-tools appropriate for purpose?
5. **Content Density** - If >500 lines, is length justified?
6. **External Documentation** - Do library skills link to official docs?
7. **Phase Numbering Hygiene** - Are phases numbered sequentially (no fractional)?
8. **Logical Coherence** - Does the skill make sense as a coherent whole?

### Description Quality Assessment (MANDATORY)

**You MUST evaluate every skill's description against 5 criteria:**

Read the full assessment framework:

```
Read(.claude/skill-library/claude/skill-management/auditing-skills/references/description-quality-assessment.md)
```

**Required evaluation:**

- **Accuracy** - Does description match actual behavior?
- **Completeness** - Are key capabilities mentioned?
- **Specificity** - Does it include concrete trigger terms?
- **Discoverability** - Will search find this skill?
- **Honesty** - Are limitations acknowledged?

**Output format:**

```
## Semantic Review

Description Quality: [PASS/WARNING/CRITICAL]
- Accuracy: ✅ Matches skill behavior
- Completeness: ⚠️ Missing mention of error handling patterns
- Specificity: ✅ Includes "TanStack Query", "mutations"
- Discoverability: ⚠️ Should mention "cache invalidation" for search
- Honesty: ✅ Acknowledges framework-specific patterns

Recommendation: Add "cache invalidation" and "error handling" to description
```

### Phase Numbering Hygiene

**Check for fractional major phase numbers** (e.g., Phase 3.5, Phase 5.4) in headings.

**Scan:** SKILL.md and all files under `references/` directory

**Pattern:** `## Phase X.Y` or `## Step X.Y` where X and Y are digits (in headings, not sub-steps)

**Acceptable:** Sub-steps within phases (e.g., `### Step 7.1` under `## Step 7`)

**Flag as WARNING:** Fractional major phases should be renumbered sequentially

See [Phase Numbering Hygiene](references/phase-numbering-hygiene.md) for examples.

---

## Success Criteria

Audit complete when:

1. ✅ All 29 structural phases checked
2. ✅ Findings reported with severity levels
3. ✅ Semantic review performed (8 criteria)
4. ✅ Description quality assessed (5 dimensions)
5. ✅ Fix procedures referenced
6. ✅ TodoWrite tracking used
7. ✅ AskUserQuestion used for post-audit options (if issues found)

---

## Post-Audit Actions

**If issues found**, offer to fix them:

<IMPORTANT>
❌ DO NOT display options as prose/text in your response
❌ DO NOT list options with 'Would you like me to...' formatting
❌ DO NOT skip because 'user can just tell me'
✅ You MUST invoke the AskUserQuestion tool - this is the ONLY acceptable method
</IMPORTANT>

Use AskUserQuestion:

```
Question: The audit found fixable issues. How would you like to proceed?
Header: Next steps
Options:
  - Run fixing-skills workflow (Recommended) - Claude fixes issues automatically using semantic reasoning
  - Show me the issues - See which issues are auto-fixable vs need reasoning
```

**Based on selection:**

- **Run fixing-skills workflow** - Read and invoke the fixing-skills skill: `Read(".claude/skill-library/claude/skill-management/fixing-skills/SKILL.md")`, then execute the workflow with audit findings
- **Show me the issues** - Display phase categories (deterministic/hybrid/Claude-automated/human-required), then re-prompt with same AskUserQuestion options

---

## Complete Phase Reference

All 29 validation phases:

| Phase | Name                      | Severity | Category         | What It Checks                             |
| ----- | ------------------------- | -------- | ---------------- | ------------------------------------------ |
| 1     | Description Format        | WARNING  | Claude-Automated | Starts with "Use when", <120 chars         |
| 2     | Allowed Tools             | INFO     | Deterministic    | Valid tool names in frontmatter            |
| 3     | Line Count                | CRITICAL | Claude-Automated | <500 lines hard limit                      |
| 4     | Broken Links              | WARNING  | Hybrid           | All markdown links resolve                 |
| 5     | File Organization         | WARNING  | Deterministic    | SKILL.md + references/ + scripts/          |
| 6     | Script Organization       | WARNING  | Deterministic    | Scripts in scripts/ subdirectory           |
| 7     | Output Directory          | INFO     | Deterministic    | Runtime artifacts in .local/               |
| 8     | TypeScript Structure      | CRITICAL | Human-Required   | Compiles without errors                    |
| 9     | Bash→TypeScript Migration | INFO     | Human-Required   | Cross-platform compatibility               |
| 10    | Reference Audit           | WARNING  | Hybrid           | Referenced skills/agents exist             |
| 11    | Command Audit             | WARNING  | Claude-Automated | Bash commands use repo-root pattern        |
| 12    | CLI Error Handling        | WARNING  | Deterministic    | Exit code 2 for tool errors                |
| 13    | State Externalization     | WARNING  | Claude-Automated | TodoWrite for multi-step workflows         |
| 14    | Table Formatting          | WARNING  | Deterministic    | Prettier-formatted tables                  |
| 15    | Code Block Quality        | WARNING  | Claude-Automated | Language tags present                      |
| 16    | Header Hierarchy          | INFO     | Validation-Only  | Proper H1→H2→H3 nesting                    |
| 17    | Prose Phase References    | WARNING  | Validation-Only  | Phase references match canonical names     |
| 18    | Orphan Detection          | WARNING  | Claude-Automated | Library skills have gateway reference      |
| 19    | Windows Paths             | WARNING  | Deterministic    | No Windows backslash paths                 |
| 20    | Gateway Structure         | CRITICAL | Human-Required   | Gateway explains two-tier system           |
| 21    | Routing Table Format      | WARNING  | Deterministic    | Gateway tables show full paths             |
| 22    | Path Resolution           | WARNING  | Hybrid           | Gateway paths exist on filesystem          |
| 23    | Coverage Check            | INFO     | Hybrid           | All library skills in exactly one gateway  |
| 24    | Line Number References    | WARNING  | Claude-Automated | No hardcoded line numbers                  |
| 25    | Context7 Staleness        | WARNING  | Claude-Automated | Context7 docs <30 days old                 |
| 26    | Reference Content Quality | CRITICAL | Claude-Automated | No empty or placeholder files (report EACH file separately) |
| 28    | Integration Section       | CRITICAL | Claude-Automated | Has Called-By, Requires, Calls, Pairs-With |
| 29    | Logical Coherence         | WARNING  | Claude-Automated | Workflow logic, contradictions, missing steps, alignment |

**For detailed phase documentation**, see [Phase Details Reference](references/phase-details.md).

---

## Downstream Skill Contract

auditing-skills output is consumed by fixing-skills. This contract defines the expected format:

**Phase 26 Contract:**

| Field | Format | Example | Consumer |
|-------|--------|---------|----------|
| Finding header | `[CRITICAL] Phase 26: Genuine stub - {filename}` | `[CRITICAL] Phase 26: Genuine stub - workflow.md` | fixing-skills parses filename |
| Location | `Location: references/{filename}` | `Location: references/workflow.md` | fixing-skills uses for file operations |
| JSON stub array | `phase_26_stubs[].file` | `"references/workflow.md"` | fixing-skills iterates for TodoWrite |

**fixing-skills expectations:**
1. Each stub file appears as separate finding (not aggregated)
2. Location field contains relative path from skill root
3. JSON summary includes `phase_26_stubs` array with all stub files
4. Stub file paths are consistent between prose and JSON

**Breaking changes:**
If auditing-skills output format changes, fixing-skills Phase 26 procedure must be updated to match.

---

## References

All audit rules and guidance are documented in references/:

- [Phase Details](references/phase-details.md) - Complete rules for all 28 phases (READ THIS FIRST)
- [Description Quality Assessment](references/description-quality-assessment.md) - 5-criteria evaluation framework
- [Phase Numbering Hygiene](references/phase-numbering-hygiene.md) - Sequential numbering rules
- [Common Failure Patterns](references/common-failure-patterns.md) - Quick fixes for frequent issues
- [Library Skill Patterns](references/library-skill-patterns.md) - Specialized validation for library skills
- [Semantic Review Output](references/semantic-review-output.md) - Output format specifications

**Phase-specific semantic guidance:**

- [Phase 13 Semantic Review](references/phase-13-semantic-review.md) - State externalization patterns
- [Phase 15 Semantic Review](references/phase-15-semantic-review.md) - Code block quality patterns
- [Phase 24 Semantic Review](references/phase-24-semantic-review.md) - Line number reference patterns
- [Phase 26 Semantic Review](references/phase-26-semantic-review.md) - Reference content quality

**Cross-cutting references:**

- [Phase Categorization](.claude/skills/managing-skills/references/patterns/phase-categorization.md) - Fix categories
- [Skill Compliance Contract](.claude/skills/managing-skills/references/skill-compliance-contract.md) - Requirements

---

## Related Skills

- `creating-skills` - Create new skills (invokes audit after creation)
- `updating-skills` - Update existing skills (invokes audit for compliance)
- `fixing-skills` - Fix audit issues systematically
- `managing-skills` - Router for all skill operations
