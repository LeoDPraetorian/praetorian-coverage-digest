---
name: auditing-skills
description: Use when validating skill compliance - reads skills, applies 30-phase rules from phase-details.md (index of split references), reports violations
allowed-tools: Read, Grep, Bash, TodoWrite
---

# Auditing Skills

**Validates skills for structural compliance and quality by reading skill files and checking against documented rules.**

> **You MUST use TodoWrite** to track audit progress for all audits to ensure no phases are skipped.

---

## What This Skill Does

Audits skills across **30 validation phases** by reading skill files and applying rules from phase-details.md (index that routes to split category files).

**Phase categories:**

| Phase Category   | Count | What                   | Example Phases                            |
| ---------------- | ----- | ---------------------- | ----------------------------------------- |
| Deterministic    | 9     | One correct answer     | Allowed tools, File organization          |
| Hybrid           | 6     | Deterministic + Claude | Line count, Broken links, Path resolution |
| Claude-Automated | 12    | Claude decides         | Orphan detection, Integration semantic    |
| Human-Required   | 3     | Human judgment         | TypeScript errors, Bash migration         |
| Validation-Only  | 2     | Detect, no fix         | Header hierarchy                          |
| Gateway-only     | 4     | Gateway skills only    | Structure, Routing, Coverage              |

**Phase criticality levels:**

| Criticality | Count | Agent Requirement            |
| ----------- | ----- | ---------------------------- |
| CRITICAL    | 9     | MUST check every audit       |
| HIGH        | 8     | MUST check every audit       |
| MEDIUM      | 6     | SHOULD check if time permits |
| LOW         | 6     | MAY skip unless triggered    |
| N/A         | 1     | SKIP unless requested        |

**Minimum viable audit = CRITICAL + HIGH phases (17 phases).**

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

**Extract and verify ALL markdown links (MANDATORY for Phase 4):**

<EXTREMELY-IMPORTANT>
You MUST extract ALL markdown links from SKILL.md and verify EACH ONE resolves.

❌ DO NOT assume links are valid because files exist in the directory
❌ DO NOT assume listing files = verifying links
✅ You MUST cross-reference SKILL.md links against actual filesystem

**Extract links:**

```bash
grep -oE '\[[^\]]+\]\([^)]+\)' {skill-location}/SKILL.md | grep -v '^http'
```

**For each extracted relative path, verify it exists:**

```bash
# Example: if link is (references/foo.md), check:
[ -f "{skill-location}/references/foo.md" ] && echo '✅' || echo '❌ MISSING'
```

**Path context matters for .claude/ paths:**

Links starting with `.claude/` are repo-root style paths. These must be verified FROM THE SKILL'S DIRECTORY to detect resolution failures:

```bash
# WRONG: Verifying from repo root (will falsely pass)
cd $REPO_ROOT && [ -f ".claude/skills/..." ]

# CORRECT: Verify from skill's directory (catches broken paths)
cd {skill-location} && [ -f ".claude/skills/..." ] && echo '✅' || echo '❌ BROKEN - path does not resolve from skill location'
```

If a .claude/ path fails from skill location but exists at repo root, the link is broken and needs fixing with proper relative path (e.g., `../../../../../skills/...`).
</EXTREMELY-IMPORTANT>

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

**You MUST read the phase-details.md reference (index) and relevant category files:**

```
Read(.claude/skill-library/claude/skill-management/auditing-skills/references/phase-details.md)
```

This index routes you to category-specific files. Load the overview first, then load specific category files as needed:

1. Read phase-details-overview.md for General Detection Principles
2. Load specific category files for phases you're validating (deterministic, hybrid, automated, human-gateway)
3. Check if skill complies with each phase's requirements
4. Note violations with severity (CRITICAL, WARNING, INFO)
5. Apply **General Detection Principles** from phase-details-overview.md:
   - Skip WRONG examples in code blocks
   - Check code blocks only, not prose explanations
   - Use exact patterns specified per phase
   - Consider context (deterministic vs semantic phases)

**CRITICAL phases (MUST check, blocks completion):**

| Phase | Name                      | Check                                                             |
| ----- | ------------------------- | ----------------------------------------------------------------- |
| 1     | Description Format        | Starts with 'Use when', <120 chars, no block scalars              |
| 3     | Line Count                | SKILL.md AND each file in references/ <500 lines                  |
| 4     | Broken Links              | All markdown links resolve                                        |
| 8     | TypeScript Structure      | Compiles without errors                                           |
| 26    | Reference Content Quality | No empty or placeholder reference files                           |
| 27    | Relative Path Depth       | No deep relative paths (3+ levels of ../)                         |
| 28    | Integration Section       | Has Called-By, Requires, Calls, Pairs-With + skill refs validated |
| 29    | Integration Semantic      | Skill references in correct sections (Requires/Calls/Pairs With)  |
| 30    | Logical Coherence         | No contradictions, complete workflows                             |

**HIGH phases (MUST check, commonly violated):**

| Phase | Name                  | Check                                   |
| ----- | --------------------- | --------------------------------------- |
| 5     | File Organization     | SKILL.md + references/ + scripts/       |
| 10    | Reference Audit       | Referenced skills/agents exist          |
| 13    | State Externalization | TodoWrite for multi-step workflows      |
| 14    | Table Formatting      | Prettier-formatted markdown tables      |
| 18    | Orphan Detection      | Library skills have gateway reference   |
| 20    | Gateway Structure     | (gateway-only) Explains two-tier system |
| 21    | Routing Table Format  | (gateway-only) Tables show full paths   |
| 22    | Path Resolution       | (gateway-only) Routing paths exist      |

**Gateway-specific phases (only for `gateway-*` skills):**

| Phase | Name                 | Check                                            |
| ----- | -------------------- | ------------------------------------------------ |
| 20    | Gateway Structure    | Explains two-tier system                         |
| 21    | Routing Table Format | Tables show full paths not just names            |
| 22    | Path Resolution      | Routing paths exist on filesystem                |
| 23    | Coverage Check       | All library skills appear in exactly one gateway |

### Step 2b: Verification Counters (MANDATORY)

**Prevent superficial audits** by following rigorous verification procedures. Common traps include checking "important phases" only (must check ALL), assuming "looks similar" equals compliance, and conflating Phase 4 (existence) with Phase 27 (path depth).

<EXTREMELY-IMPORTANT>
You MUST read verification-counters.md BEFORE proceeding to Step 3.

```
Read(.claude/skill-library/claude/skill-management/auditing-skills/references/verification-counters.md)
```

This is NOT optional. The counters prevent the exact rationalization traps that cause audit failures. If you skip this reference, you WILL fabricate completion claims.

**Not even when:**

- "I already know the counters" → Read them anyway
- "This is a simple audit" → Simple audits have same traps
- "I'll read it if I need it" → You need it. Read it now.
  </EXTREMELY-IMPORTANT>

**See:** [references/verification-counters.md](references/verification-counters.md) for complete anti-rationalization checklist, phase-specific traps, and required verification actions.

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

For Phase 26 (Reference Content Quality), report EACH stub file as a separate finding (not aggregated). This enables fixing-skills to create granular TodoWrite items.

**See:** [references/phase-26-reporting-examples.md](references/phase-26-reporting-examples.md) for correct vs incorrect reporting patterns and complete examples.

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

After prose findings, output a structured JSON summary for downstream skill consumption (e.g., fixing-skills).

**See:** [references/machine-readable-output.md](references/machine-readable-output.md) for complete format specification and downstream consumer contract.

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

This applies even if structural validation passed with zero issues. Evaluate 9 criteria including description quality (5 dimensions: accuracy, completeness, specificity, discoverability, honesty), skill categorization, gateway membership, tool appropriateness, content density, external documentation, phase numbering hygiene, numeric consistency, and logical coherence.

**See:** [references/semantic-review.md](references/semantic-review.md) for complete checklist, assessment framework, and output format.

---

## Success Criteria

Audit complete when:

1. ✅ All CRITICAL + HIGH phases checked (17 minimum), full audit checks all 29 applicable phases
2. ✅ Findings reported with severity levels
3. ✅ Semantic review performed (9 criteria)
4. ✅ Description quality assessed (5 dimensions)
5. ✅ Fix procedures referenced
6. ✅ TodoWrite tracking used
7. ✅ AskUserQuestion used for post-audit options (if issues found)

<EXTREMELY-IMPORTANT>
**Completion Fabrication Prevention:**
- Do NOT claim "All 29 phases checked" unless you have evidence for each
- Report actual coverage honestly: "Checked phases 1-14 (14 of 29)"
- If you didn't read all phase category files, say so explicitly
- Numeric claims require documented verification
</EXTREMELY-IMPORTANT>

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

**30 validation phases** across 6 categories (Deterministic, Hybrid, Claude-Automated, Human-Required, Validation-Only, Gateway-only).

**For quick phase overview**, see [Phase Quick Reference](references/phase-quick-reference.md).

**For detailed phase documentation**, see [Phase Details Reference](references/phase-details.md) (index routing to split category files).

---

## References

All audit rules and guidance are documented in references/:

- [Phase Details](references/phase-details.md) - Index routing to split category files (READ THIS FIRST, then load specific categories)
- [Phase Quick Reference](references/phase-quick-reference.md) - Phase overview table
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

## Integration

### Called By

- **`creating-skills`** (LIBRARY) - Invokes audit after creation
  - `Read(".claude/skill-library/claude/skill-management/creating-skills/SKILL.md")`

- **`updating-skills`** (LIBRARY) - Invokes audit for compliance
  - `Read(".claude/skill-library/claude/skill-management/updating-skills/SKILL.md")`

- **`fixing-skills`** (LIBRARY) - Invokes audit to identify issues
  - `Read(".claude/skill-library/claude/skill-management/fixing-skills/SKILL.md")`

- **`managing-skills`** (CORE) - Router for audit operations

### Requires (invoke before starting)

None - Entry point skill for validation

### Calls (during execution)

None - Validates using Read tool only

### Pairs With (conditional)

- **`fixing-skills`** (LIBRARY) - Issues found
  - Systematic compliance remediation
  - `Read(".claude/skill-library/claude/skill-management/fixing-skills/SKILL.md")`
