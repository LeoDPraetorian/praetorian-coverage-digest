# Semantic Review

**Mandatory semantic evaluation after structural validation completes.**

This applies even if structural validation passed with zero issues.

---

## Semantic Checklist

Evaluate against these 9 criteria:

1. **Description Quality** - MANDATORY detailed assessment (see below)
2. **Skill Categorization** - Is category correct (frontend/backend/testing/security/tooling/claude)?
3. **Gateway Membership** - Should skill be in a gateway? Correct gateway(s)?
4. **Tool Appropriateness** - Are allowed-tools appropriate for purpose?
5. **Content Density** - If >500 lines, is length justified?
6. **External Documentation** - Do library skills link to official docs?
7. **Phase Numbering Hygiene** - Are phases numbered sequentially (no fractional)?
8. **Numeric Consistency** - Are counts consistent across all mentions? (see below)
9. **Logical Coherence** - Does the skill make sense as a coherent whole?

---

## Description Quality Assessment (MANDATORY)

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

---

## Phase Numbering Hygiene

**Check for fractional major phase numbers** (e.g., Phase 3.5, Phase 5.4) in headings.

**Scan:** SKILL.md and all files under `references/` directory

**Pattern:** `## Phase X.Y` or `## Step X.Y` where X and Y are digits (in headings, not sub-steps)

**Acceptable:** Sub-steps within phases (e.g., `### Step 7.1` under `## Step 7`)

**Flag as WARNING:** Fractional major phases should be renumbered sequentially

See [Phase Numbering Hygiene](phase-numbering-hygiene.md) for examples.

---

## Numeric Consistency Check

**If a skill claims a specific count** (e.g., '30 phases', '5 criteria', '8 steps'), verify that count is consistent across ALL mentions in SKILL.md and references/.

**Detection:**

```bash
# Find all numeric claims about phases/steps/criteria
grep -n '[0-9]\+ \(phase\|step\|criteria\|rule\)' {skill-location}/SKILL.md
```

**Flag as WARNING** if the same concept has different counts in different locations (e.g., "30 phases" in one place, "29 phases" in another).
