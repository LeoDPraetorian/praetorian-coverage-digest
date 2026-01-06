# Anti-Rationalization Reference Table

**Complete reference table with expanded reality counters and examples.**

---

## Usage

Include this table in skills/agents to prevent common rationalizations. Reference from skill content rather than duplicating.

---

## Complete Table

| Red Flag Thought                            | Reality                                                                                          | Required Action                                                                        | Example                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **"Just a simple question"**                | Questions ARE tasks requiring skill checks. "Simple" becomes complex during implementation.      | Check for applicable skills before answering. Treat all questions as full tasks.       | User asks "How does auth work?" → Invoke relevant backend/security skills |
| **"Need more context first"**               | Skill check PRECEDES information gathering. Skills tell you HOW to gather context effectively.   | Invoke skills BEFORE using Read/Grep/Glob tools. Skills guide exploration.             | Before reading auth code → Invoke discovering-reusable-code               |
| **"I remember this skill"**                 | Skills evolve continuously. Training data is outdated. Memory ≠ current skill content.           | Read skill EVERY time, no exceptions. Verify patterns against current version.         | Don't rely on "I know we use X pattern" → Read current skill file         |
| **"This is overkill"**                      | "Simple" tasks accumulate complexity. Every justified shortcut became a problem later.           | Follow full protocol regardless of perceived simplicity. Discipline prevents issues.   | "Just a util function" still needs full test planning                     |
| **"Let me explore quickly"**                | Undisciplined exploration misses patterns and wastes time. Skills prescribe effective discovery. | Invoke discovery skills BEFORE exploration. Structure prevents wheel-reinvention.      | Before browsing components → Invoke frontend patterns skill               |
| **"This doesn't need formality"**           | Skill existence = mandatory invocation. "Formal" means "correct".                                | If skill applies (1% threshold), invoke it. No skill is optional.                      | Skill exists for task? Invoke it, period.                                 |
| **"I can see the answer already"**          | Confidence without evidence = hallucination. Premature certainty causes errors.                  | Gather evidence before claiming knowledge. Verify assumptions.                         | "I know how this works" → Read code first, verify second                  |
| **"User wants results, not process"**       | Users want CORRECT results. Bad results from skipped process = user frustration.                 | Follow process to deliver quality. Speed without correctness = rework.                 | "Quick fix" vs "working solution"                                         |
| **"Just this once"**                        | "Just this once" becomes "every time". Exceptions establish precedent.                           | No exceptions. Treat every task with full discipline.                                  | One skipped test → culture of skipping tests                              |
| **"Analysis doesn't need artifacts"**       | ALL analysis produces file artifacts. Inline responses = lost decisions and duplicated work.     | Write to OUTPUT_DIRECTORY, track metadata, persist for reuse.                          | "Quick analysis" still goes in .md file                                   |
| **"I'll check skills after understanding"** | Skills tell you HOW to understand. Exploring first = wrong exploration method.                   | Skills first, implementation second. Process guides understanding.                     | Skills → Read → Implement (not Read → Implement → Skills)                 |
| **"This skill is for [X]" (hallucinated)**  | Fabricating descriptions to justify skipping. Read actual skill content.                         | READ skill description from file, don't infer or recall from memory.                   | Verify actual trigger conditions vs assumed ones                          |
| **"Already have working code"**             | Working ≠ correct. Sunk cost fallacy propagates wrong patterns.                                  | Review against patterns regardless of investment. Refactor if needed.                  | 45 minutes of work doesn't justify keeping bad patterns                   |
| **"This is urgent / no time"**              | Emergencies REQUIRE systematic approach. Rushing creates more urgent problems.                   | Time pressure = increased need for discipline. Follow protocol especially when urgent. | Production down? Debug systematically, don't guess-and-patch              |
| **"User said skip it / quick answer"**      | User intent ≠ explicit protocol bypass. "Quick" means fast AND correct.                          | Follow protocol unless user explicitly overrides AFTER seeing it.                      | User wants "quick look" → still produce proper artifact                   |

---

## Counter Application Pattern

When adding counter to skill/agent:

```markdown
## Red Flags

Watch for these thoughts that indicate rationalization:

[Insert relevant rows from table above]

If you catch yourself with any red flag thought:

1. STOP immediately
2. Return to skill/protocol checklist
3. Follow full workflow
4. No exceptions
```

---

## Evidence-Based Origins

These counters derived from observed agent failures documented in:

- `.claude/.output/research/AGENTS-NOT-FOLLOWING-DIRECTIONS.md`
- `.claude/docs/AGENT-LOOPHOLES.md`
- obra/superpowers pressure testing methodology
- Production agent behavior over 50+ test scenarios

**Statistical basis:**

- 60% of non-compliance involves "quick question" rationalization
- 50% involves "memory confidence" (remembering vs reading)
- 40% involves description hallucination
- 30% involves "overkill excuse"

---

## Usage in Skills

### Option 1: Full Table

Include complete table in skills that are frequently rationalized:

```markdown
## Red Flags

[Full table from this reference]
```

### Option 2: Reference

Point to this file to reduce duplication:

```markdown
## Red Flags

See [Anti-Rationalization Table](../../skills/managing-skills/references/anti-rationalization-table.md) for complete list of rationalization patterns to avoid.
```

### Option 3: Subset

Include only relevant rows for specific skill:

```markdown
## Red Flags

| Red Flag Thought         | Reality                                |
| ------------------------ | -------------------------------------- |
| "Just a simple question" | Questions ARE tasks. Check for skills. |
| "I remember this skill"  | Skills evolve. Read current version.   |
```

---

## Adding New Counters

When discovering new rationalization:

1. Document observed pattern in AGENT-LOOPHOLES.md
2. Write counter following table format
3. Add row to this table
4. Update relevant skills/agents with new counter
5. Test effectiveness with pressure scenarios

**Format for new rows:**

```markdown
| **"[Exact agent thought]"** | [Why wrong] + [Impact] | [Specific required action] | [Concrete example] |
```

---

## Counter Evolution

Counters strengthen over time as loopholes are discovered:

```
Version 1: "Just a simple question" → "Questions are tasks"
Version 2: "Just a simple question" → "Questions ARE tasks. Check for skills."
Version 3: "Just a simple question" → "Questions ARE tasks requiring skill checks. 'Simple' becomes complex during implementation."
```

**Process:**

1. Initial counter addresses observed rationalization
2. Agent finds loophole in counter wording
3. Strengthen counter to close loophole
4. Re-test until bulletproof

---

## Relationship to 1% Rule

The 1% rule ("even 1% chance skill applies → invoke it") converts these rationalization thoughts into immediate action:

```
Red flag thought detected
  ↓
Is there 1% chance a skill applies?
  ↓ (YES for any task)
Invoke skill immediately
  ↓
No rationalization possible
```

**The anti-rationalization table catches thoughts BEFORE they become actions. The 1% rule provides binary decision rule that prevents rationalization.**

---

## Testing Counter Effectiveness

Use pressure testing (see pressure-testing-skill-content skill):

1. Create scenario combining pressures (time + authority + sunk cost)
2. Spawn subagent WITHOUT counter
3. Document which rationalization agent uses
4. Add counter for that rationalization
5. Re-test with counter
6. Verify agent now complies

**Counter is effective when**: Agent no longer uses that specific rationalization, even under pressure.
