# TDD Verification Reference

**Detailed templates for agent-based TDD verification in skill creation.**

## Why Agent Spawning is Mandatory

Document review is NOT behavioral testing:

| Approach        | What it Tests                       | Validity        |
| --------------- | ----------------------------------- | --------------- |
| Document review | "Does the document contain X?"      | Structure only  |
| Agent spawning  | "Does an agent behave differently?" | Actual behavior |

**The goal of TDD is behavioral change**, not document completeness.

## Phase 1: RED Capture Template

### Task Invocation

```
Task(
  subagent_type: "general-purpose",
  prompt: """
  Scenario: {exact scenario from Phase 1}

  Perform this task. Do NOT load any skills - work from your training data only.

  Document your approach step by step, including:
  - What you check first
  - What commands you would run
  - How you decide what to do next
  - Any assumptions you make
  """
)
```

### Capture Format

After agent completes, document:

```markdown
## RED Phase Capture

**Scenario:** {from Phase 1}

**Agent Output (verbatim):**
```

{paste complete agent response here}

```

**Analysis:**

1. **Approach taken:**
   - {what the agent actually did}
   - {in what order}

2. **Rationalizations used (exact quotes):**
   - "{quote 1}"
   - "{quote 2}"

3. **Violations observed:**
   - {best practice ignored}
   - {pattern missed}

4. **Knowledge gaps:**
   - {what the agent didn't know}
   - {what the agent got wrong}
```

### What to Look For

| Signal        | Example                                          | Indicates              |
| ------------- | ------------------------------------------------ | ---------------------- |
| Random order  | "Let me check the logs... maybe the firewall..." | No systematic approach |
| Assumptions   | "I'm pretty sure it's X"                         | Skipping verification  |
| Shortcuts     | "I'll just restart it"                           | Missing methodology    |
| Missing steps | Jumps from symptom to fix                        | No layer progression   |

## Sub-Phase 1.5: Evaluation File Creation

Create persistent evaluation for regression testing after future updates.

**File**: `{skill-path}/.evals/scenarios.json`

```json
{
  "skill": "{skill-name}",
  "created": "YYYY-MM-DD",
  "evaluations": [
    {
      "name": "primary-scenario",
      "description": "The RED phase scenario that proved the gap",
      "query": "{exact user request that triggers this skill}",
      "expected_behavior": [
        "Agent loads skill before acting",
        "Agent follows {specific pattern from skill}",
        "Agent does NOT {failure behavior observed in RED}"
      ],
      "red_baseline": "{1-2 sentence summary of failure without skill}"
    }
  ]
}
```

**Minimum**: 1 evaluation (the RED scenario). **Recommended**: 3+ covering edge cases.

**Purpose**: Re-run these evaluations after skill updates to catch regressions.

## Phase 8: GREEN Verification Template

### Task Invocation

```
Task(
  subagent_type: "general-purpose",
  prompt: """
  MANDATORY SKILL: Read("{skill-path}/SKILL.md") BEFORE starting any work.

  Scenario: {exact same scenario from Phase 1}

  Instructions:
  1. First, load and read the skill file above
  2. Then perform the task following the skill's guidance exactly
  3. Document your approach step by step, showing how the skill influenced your decisions

  Be explicit about which parts of the skill you're following.
  """
)
```

### Comparison Format

```markdown
## GREEN Phase Verification

**Scenario:** {same as RED}

**Agent Output (verbatim):**
```

{paste complete agent response here}

```

**Side-by-Side Comparison:**

| Aspect | RED (without skill) | GREEN (with skill) |
|--------|---------------------|-------------------|
| First action | {what agent did} | {what agent did} |
| Order of checks | {sequence} | {sequence} |
| Commands used | {list} | {list} |
| Rationalizations | "{quote}" | {quote or "none observed"} |
| Methodology | {ad-hoc/random} | {systematic/skill-guided} |

**Behavioral Changes Observed:**
1. {specific difference 1}
2. {specific difference 2}
3. {specific difference 3}

**Skill Effectiveness:**
- [ ] Agent loaded the skill
- [ ] Agent followed skill guidance
- [ ] Agent behavior changed from RED
- [ ] Original gap is closed
```

## Phase 8.4: Model Compatibility Verification

If the skill will be used across different Claude models, verify compatibility:

| Model      | Characteristic                                | Verification Question                                       |
| ---------- | --------------------------------------------- | ----------------------------------------------------------- |
| **Haiku**  | Faster, needs more guidance                   | Does the skill provide enough context for Haiku to succeed? |
| **Sonnet** | Balanced                                      | Is the skill clear and efficient?                           |
| **Opus**   | Powerful reasoning, dislikes over-explanation | Does the skill avoid unnecessary hand-holding?              |

**Skip if**: Skill is single-model only (e.g., Claude Code with Sonnet default).

**Test method**: Run GREEN verification prompt with each target model and compare results.

## Common Failure Modes

### 1. Agent Doesn't Load Skill

**Symptom:** GREEN behavior identical to RED
**Cause:** Agent ignored MANDATORY SKILL instruction
**Fix:** Make skill loading more explicit in prompt, verify agent mentions skill

### 2. Agent Loads But Doesn't Follow

**Symptom:** Agent acknowledges skill but continues with training-data approach
**Cause:** Skill instructions not compelling enough
**Fix:** Strengthen skill with explicit "NOT EVEN WHEN" counters

### 3. Partial Compliance

**Symptom:** Agent follows some skill guidance, skips other parts
**Cause:** Skill has loopholes or unclear sections
**Fix:** Identify which parts were skipped, add explicit requirements

## AskUserQuestion Template for Phase 8

```
I've tested the skill with the original scenario using actual agent spawning.

**RED (without skill):**
> {2-3 sentence verbatim quote showing failure behavior}

**GREEN (with skill):**
> {2-3 sentence verbatim quote showing improved behavior}

**Behavioral changes observed:**
- {First action changed from X to Y}
- {Order of operations now follows skill guidance}
- {Rationalizations eliminated/reduced}

Does the skill successfully address the gap?

Options:
- Yes, the skill works - proceed to refactor phase
- Partially - need to improve the skill content (specify what's missing)
- No - the skill doesn't help, need to rethink approach
```

## Anti-Patterns

### Document Review Masquerading as Testing

**❌ WRONG:**

```
I verified the skill by checking that:
- Section 1 covers Layer 1 debugging
- Section 2 covers Layer 2 debugging
- The decision tree is complete
```

**Why it's wrong:** This tests document structure, not agent behavior.

### Hypothetical Testing

**❌ WRONG:**

```
With this skill, an agent would:
- Start at Layer 1
- Follow the decision tree
- Document findings at each layer
```

**Why it's wrong:** "Would" is speculation, not observation.

### Abbreviated Testing

**❌ WRONG:**

```
I spawned an agent and it worked correctly.
```

**Why it's wrong:** No verbatim output, no comparison, no evidence.

## Success Criteria

Phase 1 (RED) is complete when:

- [ ] Task tool was invoked (not hypothetical)
- [ ] Agent output is captured verbatim
- [ ] Rationalizations are quoted exactly
- [ ] Failure behavior is documented

Phase 8 (GREEN) is complete when:

- [ ] Task tool was invoked with skill loaded
- [ ] Agent output is captured verbatim
- [ ] Side-by-side comparison with RED is documented
- [ ] Behavioral change is demonstrated (not assumed)

## Post-GREEN Iteration Pattern

For refining skills after initial GREEN passes:

1. **Deploy skill** - Make available for real usage
2. **Observe Claude B** - Fresh agent instances using the skill
3. **Note gaps** - Where does Claude B struggle, miss guidance, or rationalize around rules?
4. **Return to Claude A** - Bring specific observations: 'Claude B forgot to X when Y happened'
5. **Update skill** - Apply targeted fixes
6. **Re-run evaluations** - Use .evals/scenarios.json to verify no regressions
7. **Repeat** - Continue until skill is robust

This Claude A/B pattern catches issues that single-pass testing misses.
