# TDD Methodology for Skills

How Test-Driven Development principles apply to creating skill documentation.

## Core Principle

**Writing skills IS Test-Driven Development applied to process documentation.**

Same Iron Law: **NO SKILL WITHOUT A FAILING TEST FIRST**

## TDD Mapping

| TDD Concept             | Skill Creation                                  |
| ----------------------- | ----------------------------------------------- |
| **Test case**           | Pressure scenario with subagent                 |
| **Production code**     | Skill document (SKILL.md)                       |
| **Test fails (RED)**    | Agent violates rule without skill               |
| **Test passes (GREEN)** | Agent complies with skill present               |
| **Refactor**            | Close loopholes while maintaining compliance    |
| **Write test first**    | Run baseline BEFORE writing skill               |
| **Watch it fail**       | Document exact rationalizations                 |
| **Minimal code**        | Write skill addressing specific violations only |
| **Watch it pass**       | Verify agent now complies                       |
| **Refactor cycle**      | Find new rationalizations → plug → re-verify    |

## RED-GREEN-REFACTOR Cycle

### RED: Write Failing Test (Baseline)

**Run pressure scenario WITHOUT the skill.**

**Document:**

- What choices did agent make?
- What rationalizations did agent use? (verbatim quotes)
- Which pressures triggered violations?
- What patterns emerge across test runs?

**This is "watch the test fail"** - you MUST see what agents naturally do before writing the skill.

**Required skill:** Use [pressure-testing-skill-content](../pressure-testing-skill-content/SKILL.md) for complete testing methodology.

### GREEN: Write Minimal Skill

**Write skill that addresses those SPECIFIC rationalizations only.**

Don't add extra content for hypothetical cases.

**Run same scenarios WITH skill present.**

Agent should now comply.

**Minimal means:**

- Address observed violations only
- Don't anticipate future violations
- Don't add "nice to have" sections
- Stick to what baseline testing revealed

### REFACTOR: Close Loopholes

**Agent found new rationalization?**

- Add explicit counter
- Re-test until bulletproof
- Build rationalization table
- Create red flags list

**Iterate 3-6 cycles:**

1. Find rationalization
2. Add counter
3. Re-test
4. Repeat until no new violations

## Testing Different Skill Types

### Discipline-Enforcing Skills

**Examples:** TDD, verifying-before-completion, design-before-coding

**Test with:**

- Academic questions: "Do they understand the rules?"
- Pressure scenarios: "Do they comply under stress?"
- Combined pressures: time + sunk cost + exhaustion
- Identify and counter rationalizations

**Success:** Agent follows rule under maximum pressure

### Technique Skills

**Examples:** condition-based-waiting, tracing-root-causes

**Test with:**

- Application scenarios: "Can they apply technique?"
- Variation scenarios: "Do they handle edge cases?"
- Missing information: "Do instructions have gaps?"

**Success:** Agent successfully applies technique to new scenario

### Pattern Skills

**Examples:** reducing-complexity, information-hiding

**Test with:**

- Recognition: "Do they know when pattern applies?"
- Application: "Can they use the mental model?"
- Counter-examples: "Do they know when NOT to apply?"

**Success:** Agent correctly identifies when/how to apply pattern

### Reference Skills

**Examples:** API docs, command references

**Test with:**

- Retrieval: "Can they find right information?"
- Application: "Can they use what they found?"
- Gap testing: "Are common use cases covered?"

**Success:** Agent finds and correctly applies reference

## The Iron Law

```
NO SKILL WITHOUT A FAILING TEST FIRST
```

**Applies to:**

- ✅ New skills
- ✅ Edits to existing skills
- ✅ "Simple additions"
- ✅ "Just adding a section"
- ✅ "Documentation updates"

**No exceptions:**

- Wrote skill before testing? → Delete it. Start over.
- Edited without testing? → Same violation.
- Don't keep untested changes as "reference"
- Don't "adapt" while running tests
- Delete means delete

**Required background:** The [developing-with-tdd](../developing-with-tdd/SKILL.md) skill explains why this matters.

## Common Rationalizations

| Excuse                         | Reality                                           |
| ------------------------------ | ------------------------------------------------- |
| "Skill is obviously clear"     | Clear to you ≠ clear to agents. Test it.          |
| "It's just a reference"        | References have gaps. Test retrieval.             |
| "Testing is overkill"          | Untested skills have issues. Always.              |
| "I'll test if problems emerge" | Problems = agents can't use skill. Test BEFORE.   |
| "Too tedious to test"          | Less tedious than debugging bad skill later.      |
| "I'm confident it's good"      | Overconfidence guarantees issues. Test anyway.    |
| "Academic review is enough"    | Reading ≠ using. Test application.                |
| "No time to test"              | Deploying untested wastes MORE time fixing later. |

**All of these mean: Test before deploying. No exceptions.**

## Bulletproofing Against Rationalization

Skills that enforce discipline need to resist loopholes.

### 1. Close Every Loophole Explicitly

**❌ Weak:**

```markdown
Write code before test? Delete it.
```

**✅ Strong:**

```markdown
Write code before test? Delete it. Start over.

**No exceptions:**

- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Don't look at it
- Delete means delete
```

### 2. Address "Spirit vs Letter"

Add foundational principle:

```markdown
**Violating the letter of the rules is violating the spirit of the rules.**
```

Cuts off entire class of rationalizations.

### 3. Build Rationalization Table

Capture excuses from baseline testing:

```markdown
| Excuse               | Reality                                    |
| -------------------- | ------------------------------------------ |
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after"    | Tests-after prove nothing.                 |
```

Every excuse agents make goes in table.

### 4. Create Red Flags List

Help agents self-check:

```markdown
## Red Flags - STOP and Start Over

- Code before test
- "I already manually tested"
- "Tests-after achieve same purpose"
- "It's about spirit not ritual"
- "This is different because..."

**All mean: Delete code. Start over with TDD.**
```

## Deployment Checklist

**Use TodoWrite for EACH item:**

**RED Phase:**

- [ ] Create pressure scenarios (3+ combined pressures)
- [ ] Run WITHOUT skill - document baseline verbatim
- [ ] Identify rationalization patterns

**GREEN Phase:**

- [ ] Name: letters, numbers, hyphens only
- [ ] Frontmatter: name + description (max 1024 chars)
- [ ] Description: "Use when..." with triggers
- [ ] Third person voice
- [ ] Keywords for search
- [ ] Clear overview
- [ ] Address baseline failures
- [ ] Run WITH skill - verify compliance

**REFACTOR Phase:**

- [ ] Identify NEW rationalizations
- [ ] Add explicit counters
- [ ] Build rationalization table
- [ ] Create red flags list
- [ ] Re-test until bulletproof

**Quality:**

- [ ] Flowcharts only if non-obvious
- [ ] Quick reference table
- [ ] Common mistakes section
- [ ] No narrative storytelling
- [ ] Supporting files for tools/heavy reference

**Deploy:**

- [ ] Commit to git
- [ ] Push changes
- [ ] Consider contributing back

## STOP Before Next Skill

**After writing ANY skill, STOP and complete deployment.**

**Do NOT:**

- Create multiple skills in batch
- Move to next before verifying current
- Skip testing because "batching is efficient"

**Why:** Deploying untested skills = deploying untested code

## Summary

**TDD for skills means:**

1. Test first (baseline without skill)
2. Watch it fail (document rationalizations)
3. Write minimal (address observed violations)
4. Watch it pass (verify compliance)
5. Refactor (close loopholes)
6. Stop (deploy before next)

Same discipline as code. Same benefits.

**Required background:** [developing-with-tdd](../developing-with-tdd/SKILL.md) skill for fundamental RED-GREEN-REFACTOR cycle.
