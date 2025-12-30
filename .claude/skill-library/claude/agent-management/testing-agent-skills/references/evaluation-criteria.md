# Skill Integration Evaluation Criteria

**Purpose**: Detailed criteria for evaluating whether agent correctly used a skill

**When to read**: Step 6 of testing-agent-skills workflow

---

## CRITICAL: Verify via Output Files, Not Response Summary

**The agent's response summary is unreliable.** Agents may claim to have invoked skills without actually doing so. The authoritative record is the **output file's JSON metadata block**.

### Verification Method

1. **Check if file was created** - Look for `.claude/features/{date}-{slug}/` directory
2. **Read the output file** - Use `Read` tool on the agent's main output file
3. **Find JSON metadata block** - Located at the end of the output file
4. **Verify metadata fields** - Check `skills_invoked` and `library_skills_read` arrays

### What to Check

```json
{
  "skills_invoked": ["developing-with-tdd", ...],      // Core skills invoked
  "library_skills_read": [".../SKILL.md", ...],       // Library skills loaded
  "feature_directory": ".claude/features/..."         // Must be present
}
```

**If no output file exists** (agent returned inline text only): **FAIL** immediately.

---

## Three-Tier Evaluation System

Every skill test receives one of three results:

- **PASS** ✅ - Agent correctly integrated and followed skill
- **FAIL** ❌ - Agent didn't use or misused skill
- **PARTIAL** ⚠️ - Agent partially used skill (edge case)

---

## PASS Criteria ✅

### Required Elements (All Must Be True)

1. **Verified in Output File Metadata** (varies by skill type)

   **For CORE skills** (located in `.claude/skills/`):

   ```json
   // In output file's JSON metadata block:
   "skills_invoked": ["skill-name", ...]  // skill-name MUST be in this array
   ```

   **For LIBRARY skills** (located in `.claude/skill-library/`):

   ```json
   // In output file's JSON metadata block:
   "library_skills_read": [".claude/skill-library/.../SKILL.md", ...]  // Path MUST be in this array
   ```

   > **Why check metadata?** Response summaries are unreliable. The JSON metadata block at the end of output files is the authoritative record of what skills were actually invoked/loaded.

2. **Methodology Followed** (visible in output file content)
   - Agent's actions match skill's instructions
   - Key steps from skill appear in output file
   - Agent didn't violate skill's critical rules

3. **Observable Evidence** (in output file, not response summary)
   - Output file demonstrates skill was actually applied
   - Not just mentioned but actively followed
   - Results align with skill's expected outcomes

### Example: developing-with-tdd

**Agent output showing PASS**:

```
I'll use the developing-with-tdd skill for this feature.

1. RED Phase - Write failing test first:
[Agent writes test code]

2. Verify test fails:
[Agent runs test, shows failure]

3. GREEN Phase - Minimal implementation:
[Agent writes code to pass test]

4. Verify test passes:
[Agent runs test, shows success]
```

**Why PASS**:

- ✅ Explicit invocation: "I'll use the developing-with-tdd skill"
- ✅ Methodology: Followed RED-GREEN sequence
- ✅ Evidence: Test code before implementation code, verified failure/success

---

## FAIL Criteria ❌

### Any of These Indicates FAIL

1. **No Output File Created**
   - Agent returned inline text only (no file in `.claude/features/`)
   - This is an **automatic FAIL** - no further evaluation needed

2. **Missing or Incomplete Metadata**
   - Output file has no JSON metadata block
   - `skills_invoked` array doesn't contain the skill name (for core skills)
   - `library_skills_read` array doesn't contain the skill path (for library skills)

3. **Methodology Violated** (in output file content)
   - Agent invoked/loaded skill but ignored instructions
   - Agent violated critical rules
   - Agent skipped required steps

4. **Wrong Approach**
   - Agent used completely different methodology
   - Agent claimed to use skill but output file shows otherwise

### Example: developing-with-tdd

**Agent output showing FAIL**:

```
I'll implement the password validation function.

[Agent writes implementation code first]

Here's the function:
function validatePassword(pwd) { ... }

Now let me add some tests:
[Agent writes tests after implementation]
```

**Why FAIL**:

- ❌ No skill invocation
- ❌ Methodology violated: Implemented before testing
- ❌ Tests written AFTER (not TDD)

---

## PARTIAL Criteria ⚠️

### Edge Cases (Requires Judgment)

1. **Implicit Following Without Invocation**
   - Agent followed methodology correctly
   - Agent didn't explicitly invoke skill
   - Output shows skill principles were applied

2. **Invoked But Incomplete**
   - Agent invoked skill
   - Agent followed most steps
   - Agent skipped non-critical parts

3. **Hybrid Approach**
   - Agent invoked skill
   - Agent adapted methodology (not violated)
   - Justification for adaptation was reasonable

### Example: developing-with-tdd

**Agent output showing PARTIAL**:

```
I'll implement this feature using TDD principles.

[Agent writes test code]

Let me verify this fails:
[Shows test failure]

Now implementing:
[Writes implementation]

Test now passes ✅
```

**Why PARTIAL**:

- ⚠️ No explicit skill invocation (`skill: "developing-with-tdd"`)
- ✅ Methodology followed: Test first, verify failure, implement, verify pass
- ✅ Demonstrates TDD understanding

**Decision needed**: Is explicit invocation required?

- **Yes** → Treat as FAIL, update agent to invoke explicitly
- **No** → Accept PARTIAL as acceptable

---

## Skill-Specific Evaluation Guides

### developing-with-tdd

**PASS indicators**:

- Test written BEFORE implementation
- Test verified to FAIL (RED phase shown)
- Implementation makes test pass (GREEN phase shown)
- Explicit invocation or clear TDD methodology

**FAIL indicators**:

- Implementation written first
- Tests added after (or not at all)
- No RED phase verification
- Claimed "manual testing" instead

### debugging-systematically

**PASS indicators**:

- Investigated root cause before fixing
- Used debugging methodology (logs, breakpoints, reproduction)
- Didn't apply quick fix without understanding
- Verified fix resolves root issue

**FAIL indicators**:

- Applied fix without investigation
- Guessed at solution
- Skipped root cause analysis
- "Seems to work now" without verification

### verifying-before-completion

**PASS indicators**:

- Ran verification commands before claiming done
- Showed command output
- Verified tests pass, build succeeds, etc.
- Only claimed complete after evidence

**FAIL indicators**:

- Claimed complete without verification
- "I'm confident this works" without proof
- Skipped running tests/build
- "It should work" instead of "Tests pass ✅"

---

## Library Skill Evaluation Guide

Library skills (in `.claude/skill-library/`) are loaded via Read tool, not Skill tool.

### Example: frontend-tanstack (Library Skill)

**Agent output showing PASS** ✅:

```
I need to implement data fetching for the user profile.

Let me load the TanStack Query patterns:
Read(".claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md")

Following the skill's patterns:
[Agent implements useQuery with proper queryKey, error handling, staleTime]
```

**Why PASS**:

- ✅ Explicit loading: `Read(".../frontend-tanstack/SKILL.md")`
- ✅ Methodology followed: Used patterns from the skill
- ✅ Evidence: Query implementation matches skill's recommended patterns

**Agent output showing FAIL** ❌:

```
I'll implement data fetching with TanStack Query.

[Agent writes useQuery without loading the skill]
[Agent uses incorrect caching strategy]
[Agent doesn't follow platform wrapper pattern]
```

**Why FAIL**:

- ❌ No skill loading (no Read tool call for skill)
- ❌ Methodology violated: Didn't follow platform patterns
- ❌ Evidence contradicts skill requirements

### Identifying Library vs Core Skills

| Indicator            | Core Skill                | Library Skill               |
| -------------------- | ------------------------- | --------------------------- |
| Path contains        | `.claude/skills/`         | `.claude/skill-library/`    |
| Invoked via          | `skill: "name"`           | `Read("full/path")`         |
| In agent frontmatter | Yes (listed in `skills:`) | No (accessed via gateway)   |
| Discovered via       | Skill tool directly       | Gateway routing → Read tool |

### Gateway-Routed Library Skills

When agent uses gateway to find library skill:

```
Agent: "I'll use gateway-frontend to find the right pattern..."
[Agent reads gateway]
Agent: "For TanStack Query, I'll read the skill at..."
[Agent reads library skill]
```

This is **PASS** - gateway routing is the correct pattern for library skills.

---

## When Evaluation is Unclear

### Ambiguous Cases

If you can't determine PASS/FAIL/PARTIAL:

1. **Read the skill again** - Review requirements
2. **Read agent output again** - Look for evidence
3. **Check for implicit following** - Methodology might be there without invocation
4. **Default to PARTIAL** - When genuinely unclear, PARTIAL is safer than PASS

### Ask These Questions

- Did the agent explicitly invoke the skill? (Yes = likely PASS, No = check implicit)
- Did the agent's actions match skill methodology? (Yes = at least PARTIAL)
- Did the agent violate any critical rules? (Yes = FAIL regardless of invocation)

### When to Ask User

If evaluating for someone else (not your own agent test):

```
"The agent followed TDD methodology but didn't explicitly invoke the skill.
Should I count this as PASS or PARTIAL?"
```

---

## Evaluation Template

Use this template when documenting results:

```markdown
Skill: {skill-name}
Result: PASS/FAIL/PARTIAL

Evidence:

- Invocation: [Quote where agent invoked or note absence]
- Methodology: [Describe how agent followed/violated]
- Key observations: [Critical evidence for decision]

Reasoning:
[Why you assigned this result - 1-2 sentences]
```

**Example**:

```markdown
Skill: developing-with-tdd
Result: PASS ✅

Evidence:

- Invocation: Agent said "I'll use the developing-with-tdd skill"
- Methodology: Wrote test first, verified RED, implemented, verified GREEN
- Key observations: Test file created before implementation file (timestamps)

Reasoning:
Agent explicitly invoked skill and followed RED-GREEN-REFACTOR cycle correctly.
All TDD requirements met.
```

---

## Common Mistakes

### ❌ Evaluating Too Leniently

**Mistake**: "Agent mentioned TDD, so PASS"

**Reality**: Mentioning ≠ following. Check actual behavior.

**Fix**: Look for evidence, not just keywords.

### ❌ Evaluating Too Strictly

**Mistake**: "Agent didn't say exact words 'skill: developing-with-tdd', so FAIL"

**Reality**: Implicit following can be valid.

**Fix**: Check if methodology was followed, not just exact invocation phrasing.

### ❌ Not Reading the Skill First

**Mistake**: Evaluate based on your memory of what skill requires

**Reality**: Skill may have updated since you last read it

**Fix**: Always read the skill before evaluating (Step 4)

### ❌ Mixing Up Test Types

**Mistake**: "Agent didn't resist time pressure, so FAIL"

**Reality**: That's pressure testing (testing-skills-with-subagents), not integration testing

**Fix**: Integration = "Did agent use skill?" not "Did agent resist pressure?"

---

## Quality Checklist

Before finalizing evaluation:

- [ ] Read the skill being tested
- [ ] Checked if output file was created in `.claude/features/`
- [ ] Read the agent's OUTPUT FILE (not just response summary)
- [ ] Found and parsed JSON metadata block at end of output file
- [ ] Verified `skills_invoked` / `library_skills_read` arrays contain required skills
- [ ] Applied PASS/FAIL/PARTIAL criteria based on metadata
- [ ] Documented reasoning with evidence from output file
- [ ] Updated TodoWrite with result
- [ ] Not confusing integration test with pressure test

**Remember**: The response summary the agent returns to you is unreliable. Always verify via the actual output file.
