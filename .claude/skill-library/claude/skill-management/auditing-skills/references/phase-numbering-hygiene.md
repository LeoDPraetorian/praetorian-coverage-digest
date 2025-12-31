# Phase Numbering Hygiene

**Semantic review criterion 7: Detecting fractional major phase numbering in skills.**

---

## What This Checks

Skills should use **sequential integer phase numbering** (Phase 1, 2, 3, 4...) for major phases. Fractional phase numbers (Phase 3.5, Phase 5.4) create maintenance debt and numbering confusion.

**This criterion detects:**
- Fractional MAJOR phase numbers in headings (`##`, `###`)
- Pattern: `Phase X.Y` or `Phase X.YZ` where X and Y are digits

**This criterion does NOT flag:**
- Sub-steps within phases (e.g., `### Step 7.1`, `### Step 7.2`)
- Sub-steps represent decomposition of a major step, not phase insertion
- Example acceptable: `## Step 7` contains `### Step 7.1`, `### Step 7.2`, `### Step 7.3`

---

## Why This Matters

**Historical Problem:**
- `creating-skills` CHANGELOG historically referenced Phase 5.3, 5.4, 2.3
- `managing-skills/references/patterns/changelog-format.md` line 7 references Phase 5.4
- Pattern emerged where Claude would insert "Phase 3.5" instead of renumbering Phase 4→5, 5→6

**Maintenance Impact:**
- Fractional phases accumulate over time (3.5, 3.75, 3.875...)
- Unclear ordering (is Phase 3.5 before or after Phase 3.75?)
- Cross-reference drift (mentions of "Phase 4" ambiguous)

**Correct Approach:**
When adding a phase between Phase 3 and Phase 4:
1. Renumber: Phase 4→5, Phase 5→6, Phase 6→7, etc.
2. Insert new content as Phase 4
3. Update ALL references to renumbered phases

---

## Detection Pattern

**Scan these locations:**
1. SKILL.md
2. All files under `references/` directory

**Look for:**
```regex
^##+ (Phase|Step) \d+\.\d+
```

**Examples that trigger WARNING:**

```markdown
## Phase 3.5: Additional Validation
```

```markdown
### Phase 5.4: Create Changelog
```

```markdown
## Step 2.3: Backup Files
```

**Examples that are ACCEPTABLE:**

```markdown
## Step 7: Progressive Disclosure

### Step 7.1: Create Directory
### Step 7.2: Initialize Files
### Step 7.3: Configure Settings
```

**Why acceptable:** Sub-steps (7.1, 7.2, 7.3) decompose `## Step 7`, they don't represent insertions between major steps.

---

## Detection Logic

**Step 1: Extract heading level and text**
```
Heading: "## Phase 3.5: Additional Step"
Level: 2 (##)
Text: "Phase 3.5: Additional Step"
```

**Step 2: Check for fractional pattern**
```
Pattern match: "Phase 3.5" → MATCH (X=3, Y=5)
```

**Step 3: Determine if it's a sub-step**

Check if there's a parent heading at the same or higher level without fractional numbering:

```markdown
## Phase 3: Main Phase          ← Parent (level 2, integer)
### Phase 3.5: Sub-task          ← Child (level 3, fractional)
```

**If parent exists at level ≤ child:** This is a sub-step decomposition (ACCEPTABLE)

**If no parent exists:** This is a fractional major phase (FLAG WARNING)

---

## When to Flag

| Pattern                          | Heading Level | Parent?     | Action       | Reason                                |
| -------------------------------- | ------------- | ----------- | ------------ | ------------------------------------- |
| `## Phase 3.5`                   | 2             | No          | **WARNING**  | Fractional major phase                |
| `## Step 5.4`                    | 2             | No          | **WARNING**  | Fractional major step                 |
| `### Phase 3.5` under `## Phase 3` | 3           | Yes (lvl 2) | **OK**       | Sub-step decomposition                |
| `### Step 7.1` under `## Step 7` | 3             | Yes (lvl 2) | **OK**       | Sub-step decomposition                |
| `## Phase 3` then `## Phase 3.5` | 2             | No          | **WARNING**  | Same level, fractional insertion      |

---

## Output Format

**When fractional major phase detected:**

```json
{
  "severity": "WARNING",
  "criterion": "Phase Numbering Hygiene",
  "issue": "Fractional phase numbering detected: Phase 3.5 at line 45 in SKILL.md",
  "recommendation": "Renumber phases sequentially (Phase 3.5→4, Phase 4→5, etc.) and update all cross-references"
}
```

**For multiple violations:**

```json
{
  "severity": "WARNING",
  "criterion": "Phase Numbering Hygiene",
  "issue": "Fractional phase numbering detected in 3 locations: Phase 3.5 (SKILL.md:45), Step 5.4 (references/workflow.md:123), Phase 2.3 (SKILL.md:89)",
  "recommendation": "Renumber all phases sequentially and update cross-references throughout skill"
}
```

**When all phases are properly numbered:**

No finding (don't add to findings array)

---

## Severity Level

**Always use WARNING** (not CRITICAL or INFO):
- Doesn't block functionality (skill still loads)
- Impacts maintainability (creates confusion over time)
- Should be fixed but not urgent

---

## Related

- [updating-skills Phase Numbering Rule](../../updating-skills/SKILL.md#step-36-phase-numbering-rule-mandatory)
- [updating-skills Phase 4b Workflow](../../updating-skills/references/update-workflow.md#phase-4b-inline-edit)
- [Phase Categorization](../../../../skills/managing-skills/references/patterns/phase-categorization.md)
