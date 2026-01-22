# Verification Counters

**Mandatory verification procedures to prevent superficial audits.**

---

## Selective Execution Counter

If you think: "I'll check the important phases" → WRONG. You MUST check ALL phases explicitly. Create TodoWrite items for each. Read phase-details.md IN FULL (no truncation). Do NOT mark complete until all verified.

---

## Completion Fabrication Counter

If you think: "I've checked the key things, I can claim I checked everything"

Reality: Claiming "All X validated" when you only checked Y is a **LIE**. This undermines trust in ALL your outputs. The user cannot verify your claims - they trust you to be accurate.

**Required action:**

- ONLY claim what you actually did: "Checked phases 1, 3, 4, 10, 13, 26, 28 (7 of 31)"
- If you didn't read all phase files, say so: "Did not load phase-details-automated.md"
- Numeric claims MUST be verifiable: "All 30 phases" requires 30 documented checks
- When uncertain, understate: "Approximately X phases" not "All X phases"

**Not even when:**

- "The key phases passed" → Still report actual coverage
- "It would look incomplete" → Accurate incomplete > fabricated complete
- "User wants confidence" → Confidence from lies is worthless

---

## Superficial Verification Counter

If you think: "This section looks similar to the requirement, PASS"

Reality: "Looks similar" is NOT compliance. You MUST verify against the EXACT criteria in phase-details.md.

---

## Common Verification Traps

### Phase 28 Trap: Related Skills ≠ Integration Section

- "Related Skills" = flat list (OLD format, FAILS Phase 28)
- "Integration" = 4 subsections: Called By, Requires, Calls, Pairs With (REQUIRED)
- You MUST verify ALL FOUR subsections exist, not just "skill relationships exist"

### Phase 4 Trap: Seeing a Path ≠ Path Resolves

- Skill location: `.claude/skill-library/{category}/{skill}/SKILL.md`
- Link target: `.claude/skills/...` (repo-root style)
- These do NOT resolve from skill-library location without `../../../..`
- You MUST mentally trace the path from the skill's directory

---

## Anti-Rationalization Checklist (MANDATORY for each phase)

| Phase | Superficial Check (WRONG)                  | Rigorous Check (REQUIRED)                                                         |
| ----- | ------------------------------------------ | --------------------------------------------------------------------------------- |
| ALL   | "All 30 phases checked" (without evidence) | Document each phase checked; claim ONLY verified coverage                         |
| 28    | "Has skill references"                     | "Has ## Integration with ### Called By, ### Requires, ### Calls, ### Pairs With"  |
| 4     | "Files exist in directory"                 | "Extract links from SKILL.md, verify EACH link target exists on filesystem"       |
| 27    | "Paths resolve (Phase 4)"                  | "Verify cross-skill links use `.claude/` format; ANY `../` to other skills FAILS" |
| 26    | "Reference files exist"                    | "Read each file; content is substantive, not placeholders"                        |
| 13    | "Mentions TodoWrite"                       | "Has STRONG mandate: 'You MUST use TodoWrite'"                                    |

---

## Phase Conflation Trap

Phase 4 and Phase 27 are DISTINCT validations:

- **Phase 4**: Does the path resolve to an existing file? (existence check)
- **Phase 27**: Does the path use full `.claude/` format for cross-skill links? (format check)

A path can **PASS Phase 4** (file exists) but **FAIL Phase 27** (uses relative path to another skill). Do NOT skip Phase 27 because Phase 4 passed.

**Example that passes Phase 4 but fails Phase 27:**

```markdown
[brainstorming](../../brainstorming/SKILL.md)
```

- Phase 4: ✅ PASS - file exists at that relative path
- Phase 27: ❌ FAIL - must use `.claude/skills/brainstorming/SKILL.md` instead

**Key distinction:**

- Within same skill (e.g., `references/foo.md`): Relative paths allowed
- To other skills (e.g., `../../other-skill/`): MUST use `.claude/` paths

---

## Required Action

For EACH phase, verify against the SPECIFIC criteria in phase-details.md, not your mental model of "what compliance looks like."
