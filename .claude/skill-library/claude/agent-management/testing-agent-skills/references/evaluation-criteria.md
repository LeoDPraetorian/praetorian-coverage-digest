# Skill Integration Evaluation Criteria

**Purpose**: Detailed criteria for evaluating whether agent correctly used a skill

**When to read**: Step 6 of testing-agent-skills workflow

---

## Three-Tier Evaluation System

Every skill test receives one of three results:

- **PASS** ✅ - Agent correctly integrated and followed skill
- **FAIL** ❌ - Agent didn't use or misused skill
- **PARTIAL** ⚠️ - Agent partially used skill (edge case)

---

## PASS Criteria ✅

### Required Elements (All Must Be True)

1. **Explicit Invocation** (varies by skill type)

   **For CORE skills** (located in `.claude/skills/`):
   ```
   Agent output contains: skill: "{skill-name}"
   OR
   Agent output contains: "I'm using the {skill-name} skill"
   ```

   **For LIBRARY skills** (located in `.claude/skill-library/`):
   ```
   Agent output contains: Read(".claude/skill-library/.../SKILL.md")
   OR
   Agent output contains: "I'm reading the {skill-name} skill"
   OR
   Agent loaded skill via gateway routing
   ```

   > **Why the difference?** Core skills are invoked via `skill: "name"` (Skill tool). Library skills are loaded via `Read("full/path")` (Read tool). Both are valid invocations for their respective types.

2. **Methodology Followed**
   - Agent's actions match skill's instructions
   - Key steps from skill appear in output
   - Agent didn't violate skill's critical rules

3. **Observable Evidence**
   - Output demonstrates skill was actually applied
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

1. **No Invocation/Loading**
   - Agent never mentions skill
   - **Core skill**: No `skill: "{skill-name}"` in output
   - **Library skill**: No `Read(".../SKILL.md")` or skill reference
   - Agent doesn't reference skill at all

2. **Methodology Violated**
   - Agent invoked/loaded skill but ignored instructions
   - Agent violated critical rules
   - Agent skipped required steps

3. **Wrong Approach**
   - Agent used completely different methodology
   - Agent claimed to use skill but evidence shows otherwise

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

| Indicator | Core Skill | Library Skill |
|-----------|------------|---------------|
| Path contains | `.claude/skills/` | `.claude/skill-library/` |
| Invoked via | `skill: "name"` | `Read("full/path")` |
| In agent frontmatter | Yes (listed in `skills:`) | No (accessed via gateway) |
| Discovered via | Skill tool directly | Gateway routing → Read tool |

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
- [ ] Read agent's complete output
- [ ] Applied PASS/FAIL/PARTIAL criteria
- [ ] Documented reasoning with evidence
- [ ] Updated TodoWrite with result
- [ ] Not confusing integration test with pressure test
