# TDD Validator Pattern

**Separates execution (Witness) from judgment (Validator) to eliminate self-assessment bias.**

## Problem

When agents both execute AND judge their own execution:
- Agent may rationalize expected outcome without genuine attempt
- Verdict aligns with expectation rather than evidence
- When Witness knows what we're measuring, they unconsciously optimize for/against it

## Solution: Witness + Validator Separation

| Role | Responsibility | Knows | Returns |
|------|----------------|-------|---------|
| **Witness** | Execute scenario, report facts | Task ONLY | Approach, Outcome |
| **Validator** | Judge if outcome matches expectation | Expected outcome + transcript | Verdict with evidence |
| **Orchestrator** | Coordinate workflow | Verdicts only | User-facing summary |

## Orchestrator Role

**Does:**
- Constructs blind Witness prompt
- Spawns Witness agent → receives summary
- Verifies output file exists (`ls`, not `Read`)
- Spawns Validator agent → receives verdict

**Does NOT:**
- Read witness output files (red-test.md, green-test.md) - NOT EVEN to "verify" or "check"
- Analyze witness behavior
- Make judgments ("Good", "Perfect", "This shows...")

**Common Rationalizations (ALL REJECTED):**
- ❌ "Just checking if file exists" → Use `ls -lh`, not `Read`
- ❌ "Verifying Witness captured right scenario" → Validator does this
- ❌ "Reading first few lines won't hurt" → Any reading invalidates the test
- ❌ "Quick peek to troubleshoot" → If troubleshooting needed, re-run Witness

**After Witness Returns** - Handle race condition, then spawn Validator:

1. **Verify file exists** (race condition mitigation):
   ```bash
   ls -lh {OUTPUT_DIR}/red-test.md  # or green-test.md
   ```
   If file doesn't exist: Witness hasn't finished writing. Wait 5 seconds and check again.

2. **Immediately spawn Validator** in SAME response (after file confirmed)

Do NOT:
- Read the witness output file content
- Wait for user input
- Analyze or judge witness behavior

❌ NOT ACCEPTABLE: "Just a quick glance", "Reading first 10 lines", "Scanning for errors", "Checking if file exists" (use `ls`, don't Read)

## RED Phase (Prove Gap Exists)

### Step 1: RED Witness

<EXTREMELY-IMPORTANT>
## Witness Prompt Must Be Truly Blind

The prompt must contain ONLY:
- The task to perform
- Output file location

The prompt must NOT contain:
- What we expect to happen or are measuring
- The hypothesis or gap we're testing
- "failure", "struggle", "problem", "gap", "difficulty"
- Why we're running this test
- **Categories to report on** (no "Note any X")
- **Priming questions** (no "What was hard?")

**Why:** If Witness knows we expect failure OR is told what categories to observe, they unconsciously:
- Give up earlier than normal
- Report difficulties more prominently
- Frame observations to match expected categories

The Witness should attempt the task as a normal user request.
</EXTREMELY-IMPORTANT>

### Truly Blind RED Witness Template

```
Task(subagent_type: "general-purpose", prompt: "
  TASK: {task description}

  Execute this task using whatever resources you have available.
  Document what you did step by step.

  Write your execution transcript to {OUTPUT_DIR}/red-test.md

  Return only:
  - APPROACH: What you did (3-5 sentences)
  - OUTCOME: Final state achieved
")
```

**Key:** No "Note any difficulties", no "DIFFICULTIES" return field. Validator infers gaps from transcript.

### Template Usage Enforcement

**You MUST use these templates VERBATIM.** Do not paraphrase, summarize, or write your own.

❌ NOT ACCEPTABLE:
- "I'll write a similar prompt" → Use the template exactly
- "I understand the pattern, so..." → Understanding ≠ compliance
- "This is basically the same" → Basically ≠ exactly
- Reading the template then writing custom prompt
- Adding file paths, hints, or scaffolding instructions
- "I already wrote a prompt before reading this" → Discard it, use template
- "My existing prompt is valid" → Prior work does not count as compliance

✅ REQUIRED:
- Copy template
- Fill in ONLY the `{placeholders}`
- Do not add fields, context, or instructions
- Do not modify structure or wording

### Pre-Spawn Verification (MANDATORY)

Before spawning Witness, paste your complete prompt and verify:

| Check | Your Prompt |
|-------|-------------|
| Uses template structure exactly | ☐ |
| Only `{placeholders}` were modified | ☐ |
| No added instructions/context | ☐ |
| Returns ONLY: APPROACH, OUTCOME | ☐ |
| No bias words (struggle, fail, gap, etc.) | ☐ |

**Cannot spawn until all checks pass.**

### Bias Prevention Checklist

Before spawning Witness, verify prompt contains NONE of:

**Bias words:** struggle, fail, difficulty, gap, trouble, problem, issue, wrong, challenge, confusion

**Category priming:** "Note any uncertainties", "What information did you need?", any instruction to categorize experience

**Outcome priming:** Expected outcomes, success/failure criteria, what skill is supposed to fix

### Example: Good vs Bad

❌ **BAD (Category priming):**
```
TASK: Create a skill for code review patterns.
Note any uncertainties encountered or places where you needed guidance.
Return: APPROACH, OUTCOME, UNCERTAINTIES
```
Problem: "Note any uncertainties" and "UNCERTAINTIES" field prime the Witness.

✅ **GOOD (Truly Blind):**
```
TASK: Create a skill for code review patterns.
Document what you did step by step.
Write transcript to {OUTPUT_DIR}/red-test.md
Return: APPROACH, OUTCOME
```

### Step 2: RED Validator

Analyzes transcript with informed context. **Also validates Witness prompt was blind.**

```
Task(subagent_type: "general-purpose", prompt: "
  CONTEXT: Testing whether a gap exists that justifies a skill update.
  EXPECTED FAILURE: Agent should {struggle with X / fail to do Y}

  WITNESS PROMPT GIVEN:
  ---
  {paste exact Witness prompt}
  ---

  Read: {OUTPUT_DIR}/red-test.md

  ## STEP 0: PROMPT BIAS CHECK (MANDATORY FIRST)

  Check if prompt was blind. Must NOT contain:
  - Expected outcome/hypothesis
  - Bias words: failure, struggle, problem, gap, difficulty
  - Category priming: 'Note any X', 'DIFFICULTIES' return field

  PROMPT_VERDICT: CLEAN | CONTAMINATED (cite text)
  If CONTAMINATED: Return INVALID_TEST. Re-run with clean prompt.

  ## STEP 1: EVIDENCE REVIEW (if CLEAN)

  Read transcript and INFER:
  - Where did agent hesitate or change direction?
  - What did they improvise?
  - Did agent exhibit expected failure?
  Quote specific evidence.

  ## STEP 2: VERDICT

  - GAP_CONFIRMED: Evidence shows gap exists
  - GAP_NOT_FOUND: Agent succeeded (challenge premise)
  - INVALID_TEST: Prompt was contaminated

  Write to {OUTPUT_DIR}/red-verdict.md

  Return: PROMPT_VERDICT, VERDICT, EVIDENCE (2-3 sentences), CONFIDENCE
")
```

## GREEN Phase (Verify Fix Works)

### Step 1: GREEN Witness

```
Task(subagent_type: "general-purpose", prompt: "
  SKILL: Read('{skill-path}/SKILL.md') BEFORE starting
  TASK: {same task as RED}

  Execute following skill guidance. Document what you did step by step.

  Write to {OUTPUT_DIR}/green-test.md

  Return only:
  - APPROACH: What you did and which skill sections guided you (3-5 sentences)
  - OUTCOME: Final state achieved
")
```

### Step 2: GREEN Validator

```
Task(subagent_type: "general-purpose", prompt: "
  CONTEXT: Skill update made to fix: {problem description}
  EXPECTED IMPROVEMENT: Agent should now {do X / follow Y}

  Read:
  - {OUTPUT_DIR}/red-test.md (before)
  - {OUTPUT_DIR}/green-test.md (after)

  Analyze:
  1. GREEN ANALYSIS - Did agent succeed where RED failed? Quote evidence.
  2. BEHAVIORAL COMPARISON - 3-5 concrete differences
  3. UNEXPECTED CHANGES - Side effects not related to fix?
  4. REGRESSION CHECK - New problems introduced?
  5. VERDICT: PASSED | FAILED | PARTIAL
     - PASSED: Skill demonstrably improved agent behavior (cite specific differences)
     - FAILED: No behavioral improvement detected (cite similarities)
     - PARTIAL: Some improvement but gaps remain (cite what improved, what didn't)

  Write to {OUTPUT_DIR}/green-verdict.md

  Return: VERDICT (PASSED/FAILED/PARTIAL), EVIDENCE, BEHAVIORAL_DIFF, UNEXPECTED_CHANGES
")
```

## What Validators Look For

| Signal | Example | Indicates |
|--------|---------|-----------|
| Random order | "Let me check the logs... maybe the firewall..." | No systematic approach |
| Assumptions | "I'm pretty sure it's X" | Skipping verification |
| Direction changes | "Actually, let me try..." | Uncertainty |
| Improvisation | "I'll work around this by..." | Missing guidance |

## Common Failure Modes

| Mode | Symptom | Fix |
|------|---------|-----|
| Skill not loaded | GREEN identical to RED | Make SKILL instruction more explicit |
| Loaded but not followed | Agent acknowledges skill, uses training-data approach | Add "NOT EVEN WHEN" counters |
| Partial compliance | Some guidance followed, some skipped | Identify loopholes, add explicit requirements |
| Contaminated Witness | INVALID_TEST returned | Rewrite prompt to be truly blind |

## Anti-Patterns

| Anti-Pattern | Example | Why Wrong |
|--------------|---------|-----------|
| Document review | "Skill has Section 1, Section 2..." | Tests structure, not behavior |
| Hypothetical | "An agent would follow the tree..." | "Would" is speculation |
| Abbreviated | "I spawned an agent and it worked" | No evidence |
| Category-primed | "Agent reported 3 uncertainties" | You asked for "uncertainties" |

## Self-Assessment Protocol

When asked about prompt content, you MUST:
1. Re-read the prompt using Read()
2. Search for bias words AND category priming
3. Quote exact phrases if found
4. Do NOT rely on memory

❌ "No mention of struggle" (without re-reading)
❌ "I just wrote it, I remember"
✅ Re-read and search explicitly

**Time-Pressure Rationalizations (REJECT):**
- ❌ "I'm being careful, checklist is redundant"
- ❌ "Quick mental check is sufficient"

## Why These Rules Cannot Be Bent

| Rule Broken | Consequence |
|-------------|-------------|
| Skip bias checklist | Bias leaks into prompt, RED phase invalid |
| Category priming | Witness frames to match categories, not natural behavior |
| Read witness output | Orchestrator forms judgment, validator becomes rubber stamp |
| Memory-based self-assessment | Undetected bias, false confidence |

## Success Criteria

**RED complete when:**
- [ ] Task tool invoked (not hypothetical)
- [ ] Prompt was TRULY BLIND (no bias, no category priming)
- [ ] Agent returned APPROACH + OUTCOME only
- [ ] Validator: PROMPT_VERDICT = CLEAN
- [ ] Validator: GAP_CONFIRMED or GAP_NOT_FOUND

**GREEN complete when:**
- [ ] Task tool invoked with skill loaded
- [ ] Agent returned APPROACH + OUTCOME only
- [ ] Validator compared both transcripts
- [ ] Validator: PASSED, FAILED, or PARTIAL

## User Confirmation

```
AskUserQuestion:
"RED VERDICT: {verdict}
GREEN VERDICT: {verdict}
Behavioral changes: {bullets}
RECOMMENDATION: {PROCEED/IMPROVE/RETHINK}"

Options: Accept | Review full verdict | Override
```

## Related

- [tdd-methodology.md](tdd-methodology.md) - Overall TDD workflow
- Skills using this pattern: `updating-skills`, `creating-skills`
