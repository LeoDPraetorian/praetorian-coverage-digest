---
name: fixing-skills
description: Use when audit failed - applies fixes based on audit output by routing to appropriate handlers (Deterministic/Hybrid/Claude-Automated/Human-Required)
allowed-tools: Read, Edit, Write, Bash, AskUserQuestion, TodoWrite, Skill
---

# Fixing Skills

**Intelligent compliance remediation by routing audit failures to appropriate fix handlers.**

<EXTREMELY-IMPORTANT>
**You MUST use TodoWrite** to track fix progress when handling multiple issues (2+ compliance failures).

**When to use TodoWrite:**

- 2+ compliance issues to fix
- Multiple phases requiring fixes
- Any scenario where you'd say "next I'll..." (that's a todo)

**Red flags you're skipping TodoWrite:**

- "I'll just fix these quickly"
- "These are simple enough to track mentally"
- "I don't need to track progress for only 3 issues"

**Reality**: Untracked work has ~30% incomplete fix rate. Use TodoWrite.
</EXTREMELY-IMPORTANT>

---

## What This Skill Does

**This skill does NOT define phases** - it applies fixes for violations reported by auditing-skills.

**Single source of truth for phases:**

- Phase definitions → auditing-skills only
- Phase categorization → See [Phase Categorization](.claude/skills/managing-skills/references/patterns/phase-categorization.md)
- Fix procedures → This skill's references/ (only for complex fixes)

**Workflow:**

1. Run auditing-skills → get failure list
2. Backup skill files
3. For each failure, route to appropriate handler based on category
4. Apply fixes
5. Re-run auditing-skills to verify

---

## Quick Reference

| Handler Category | How to Fix                                         | User Interaction      | Example Phases                                         |
| ---------------- | -------------------------------------------------- | --------------------- | ------------------------------------------------------ |
| Deterministic    | Claude applies mechanical transformation           | None (auto-apply)     | Allowed tools, File organization                       |
| Hybrid           | Claude reasoning + confirmation on ambiguous cases | Confirm edge cases    | Broken links, Phantom references                       |
| Claude-Automated | Claude applies with semantic understanding         | None (Claude decides) | Description format, Line count, Integration generation |
| Human-Required   | Provide guidance, user implements                  | Full interaction      | TypeScript errors, Bash migration                      |
| Validation-Only  | Report only, no auto-fix available                 | Manual resolution     | Code block quality, Logical coherence                  |

**See [Phase Categorization](.claude/skills/managing-skills/references/patterns/phase-categorization.md) for which phases belong to each category.**

---

## Workflow

### Step 1: Navigate to Repository Root (MANDATORY)

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

**Cannot proceed without navigating to repo root** ✅

### Step 2: Run Audit

Get the failure list from auditing-skills:

```
Read(".claude/skill-library/claude/skill-management/auditing-skills/SKILL.md")
```

Then audit the target skill. Capture ALL failures with phase numbers.

### Step 3: Create Backup

```bash
mkdir -p {skill-path}/.local
TIMESTAMP=$(date +%Y-%m-%d-%H-%M-%S)
cp {skill-path}/SKILL.md {skill-path}/.local/${TIMESTAMP}-pre-fix.bak
```

### Step 4: Categorize from Audit Output

Read [Phase Categorization](.claude/skills/managing-skills/references/patterns/phase-categorization.md) to understand which handler each failed phase uses.

Group audit failures by handler:

```
Example audit output:
  Phase 2: Allowed tools - invalid tool "InvalidTool"
  Phase 3: Line Count - 612 lines (exceeds 500)
  Phase 4: Broken Links - references/missing.md not found
  Phase 28: Integration Section - missing

Categorization (from phase-categorization.md):
  Deterministic: Phase 2
  Claude-Automated: Phase 3, Phase 28
  Hybrid: Phase 4
```

### Step 5: Apply Fixes by Handler

For each category with failures:

#### 5a. Deterministic Fixes

Claude applies mechanical transformations directly. No confirmation needed.

**See phase-categorization.md for list of deterministic phases.**

#### 5b. Claude-Automated Fixes

Claude applies fixes requiring semantic understanding. No human confirmation needed.

**See phase-categorization.md for list of Claude-Automated phases.**

**Special fix procedures for complex phases:**

| Phase                                 | Procedure                                                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Phase 26: Reference Content Quality   | [references/phase-26-procedure.md](references/phase-26-procedure.md) - Stub population via orchestrating-research          |
| Phase 27: Relative Path Depth         | [references/phase-27-procedure.md](references/phase-27-procedure.md) - Convert cross-skill links to `.claude/` paths       |
| Phase 28: Integration Section         | [references/phase-28-procedure.md](references/phase-28-procedure.md) - Integration generation + skill reference validation |
| Phase 29: Integration Semantic        | [references/phase-29-procedure.md](references/phase-29-procedure.md) - Semantic relationship validation                    |
| Semantic Criterion 7: Phase Numbering | [references/semantic-criterion-7-procedure.md](references/semantic-criterion-7-procedure.md) - Renumber fractional phases  |

#### 5c. Hybrid Fixes

Deterministic parts applied automatically, ambiguous cases need user confirmation.

**See phase-categorization.md for list of hybrid phases.**

#### 5d. Human-Required Fixes

Provide interactive guidance. User implements.

**See phase-categorization.md for list of human-required phases.**

#### 5e. Validation-Only Phases

Cannot auto-fix. Report findings, provide manual resolution guidance.

**See phase-categorization.md for list of validation-only phases.**

**For Phase 30 (Logical Coherence):** See auditing-skills phase-details for manual resolution guidance.

#### 5f. Final Formatting

After all content-generating fixes, apply table formatting:

**See [Table Formatting](.claude/skills/managing-skills/references/table-formatting.md)**

### Step 6: Verify Fixes

Re-run auditing-skills to verify all issues resolved:

```
Read(".claude/skill-library/claude/skill-management/auditing-skills/SKILL.md")
```

**Expected:** All phases pass. If failures remain, return to Step 4.

### Step 7: Update Changelog

See [Changelog Format](.claude/skills/managing-skills/references/patterns/changelog-format.md).

```bash
mkdir -p {skill-path}/.history
```

Document fixes applied with method (Deterministic, Claude-Automated, Hybrid, Manual).

---

## Common Scenarios

| Scenario             | Typical Issues                 | Approach                             |
| -------------------- | ------------------------------ | ------------------------------------ |
| New Skill Cleanup    | Phase 1, 4, 5                  | Deterministic → Hybrid               |
| Over-Long Skill      | Phase 3 (>500 lines)           | Claude-Auto (extract to references/) |
| Legacy Migration     | Missing TodoWrite, cd commands | Claude-Auto                          |
| Missing Integration  | Phase 28                       | Claude-Auto (generate)               |
| Stub Reference Files | Phase 26                       | Claude-Auto (research + populate)    |
| Broken References    | Phase 10                       | Hybrid (registry/fuzzy match)        |
| Logical Issues       | Phase 30                       | Validation-Only (manual)             |

---

## Integration

### Called By

- `managing-skills` (audit → fix workflow delegation)
- `/skill-manager` command (fix operation)
- `creating-skills` (final compliance cleanup)
- `updating-skills` (post-update compliance)

### Requires (invoke before starting)

- **`auditing-skills`** (LIBRARY) - Step 2
  - Identify compliance issues to fix
  - `Read(".claude/skill-library/claude/skill-management/auditing-skills/SKILL.md")`

### Calls (during execution)

- **`auditing-skills`** (LIBRARY) - Steps 2 and 6
  - Get initial issues list and verify fixes
  - `Read(".claude/skill-library/claude/skill-management/auditing-skills/SKILL.md")`

- **`orchestrating-research`** (LIBRARY) - Phase 26 fixes
  - Populate stub reference files
  - `Read(".claude/skill-library/research/orchestrating-research/SKILL.md")`

### Pairs With (conditional)

- **`syncing-gateways`** (LIBRARY) - Phase 23 (coverage gaps)
  - Gateway consistency fixes
  - `Read(".claude/skill-library/claude/skill-management/syncing-gateways/SKILL.md")`

---

## References

- [Phase Categorization](.claude/skills/managing-skills/references/patterns/phase-categorization.md) - Which handler each phase uses
- [Phase 26 Procedure](references/phase-26-procedure.md) - Stub population
- [Phase 27 Procedure](references/phase-27-procedure.md) - Cross-skill path conversion
- [Phase 28 Procedure](references/phase-28-procedure.md) - Integration generation
- [Phase 29 Procedure](references/phase-29-procedure.md) - Integration semantic validation
- [Semantic Criterion 7](references/semantic-criterion-7-procedure.md) - Phase numbering hygiene
- [Common Scenarios](references/common-scenarios.md) - Fix patterns and recommended orders
- [Rationalization Table](references/rationalization-table.md) - Domain-specific rationalizations
