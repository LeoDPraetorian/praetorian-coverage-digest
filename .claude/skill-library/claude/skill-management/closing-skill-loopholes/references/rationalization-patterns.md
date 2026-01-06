# Rationalization Pattern Taxonomy

**Complete classification of agent rationalizations with detection criteria and examples.**

---

## Pattern Classification

Each pattern has:

- **Name**: Short identifier
- **Agent Thought**: What agent thinks to justify skipping
- **Detection Criteria**: Observable behaviors indicating this pattern
- **Example Evidence**: Real cases from production
- **Counter Template**: Specific counter structure for this pattern

---

## Pattern 1: Quick Question Trap

**Agent Thought**: "This is just a simple analysis/question"

**Detection Criteria:**

- Agent returns inline response for analysis task
- Agent doesn't invoke persisting-agent-outputs
- Agent doesn't write output to file
- Task contains words: "analyze", "review", "assess", "examine", "check"

**Example Evidence** (from AGENTS-NOT-FOLLOWING-DIRECTIONS.md):

```
Agent: mcp-lead
Task: "Analyze Serena connection pool implementation"
Expected: Invoke skills, write to file with metadata
Actual: Inline response, no file output
Rationalization: [Inferred] "This is just a quick analysis question"
```

**Counter Template:**

```markdown
## Quick Analysis Counter

If you think: "This is just a simple analysis/question"

Reality: ALL analysis tasks produce file artifacts. "Quick analysis" is a rationalization trap that leads to lost work and untracked decisions.

Required action:

- Invoke persisting-agent-outputs skill
- Write output to file in OUTPUT_DIRECTORY
- Include skills_invoked in metadata
- Track analysis for future reference
```

**Placement**: Analysis and architecture agents (backend-lead, frontend-lead, mcp-lead, etc.)

---

## Pattern 2: Context First

**Agent Thought**: "Let me explore/read code before checking for skills"

**Detection Criteria:**

- Agent uses Read/Grep/Glob tools before checking for applicable skills
- Agent explores codebase without invoking navigation/discovery skills
- Agent starts implementation before checking for pattern skills

**Example Evidence:**

```
Agent: backend-developer
Task: "Add authentication to API"
Expected: Invoke discovering-reusable-code first
Actual: Immediately reads existing auth code, starts implementing
Rationalization: "I need to understand current implementation first"
```

**Counter Template:**

```markdown
## Context-First Counter

If you think: "Let me explore before checking for skills"

Reality: Skills tell you HOW to explore effectively. Exploring without skill guidance leads to missing existing patterns and reinventing solutions.

Required action:

- Check for applicable skills BEFORE any tool use
- Invoke discovery skills BEFORE reading code
- Use skills to guide exploration, not reverse
```

**Placement**: Development agents (backend-developer, frontend-developer, capability-developer)

---

## Pattern 3: Memory Confidence

**Agent Thought**: "I know what this skill does" or "I remember this pattern"

**Detection Criteria:**

- Agent mentions skill without invoking it
- Agent applies partial skill content from memory
- Agent summarizes skill approach without reading current version

**Example Evidence:**

```
Agent: frontend-developer
Task: "Implement user profile component"
Expected: Read frontend-patterns skill
Actual: "I know the component structure, let me implement it"
Rationalization: "I remember how we structure components here"
```

**Counter Template:**

```markdown
## Memory Confidence Counter

If you think: "I know what this skill does" or "I remember this pattern"

Reality: Skills evolve. Your training data is outdated. Memory ≠ current skill content.

Required action:

- Read the skill EVERY TIME, no exceptions
- Verify current patterns against memory
- Skills may have changed since your training cutoff
```

**Placement**: using-skills (universal - all agents exhibit this)

---

## Pattern 4: Overkill Excuse

**Agent Thought**: "Full protocol is overkill for this simple task"

**Detection Criteria:**

- Agent describes task as "simple", "straightforward", "quick"
- Agent proposes "lightweight" approach instead of full protocol
- Agent suggests skipping steps "for efficiency"

**Example Evidence:**

```
Agent: test-lead
Task: "Plan tests for utility function"
Expected: Complete test plan with coverage analysis
Actual: "This is a simple function, just need basic unit tests"
Rationalization: "Full test planning is overkill here"
```

**Counter Template:**

```markdown
## Overkill Excuse Counter

If you think: "Full protocol is overkill for this"

Reality: "Simple" tasks become complex. Every shortcut that seemed justified became a problem later.

Required action:

- Follow full protocol regardless of perceived simplicity
- Simple tasks ESPECIALLY need discipline
- Complexity emerges during implementation
```

**Placement**: All agents (common rationalization)

---

## Pattern 5: Description Hallucination

**Agent Thought**: [Agent invents different skill description to justify skipping]

**Detection Criteria:**

- Agent claims skill is "for X" when description says "for Y"
- Agent quotes description that doesn't match actual text
- Agent fabricates trigger conditions

**Example Evidence** (from AGENTS-NOT-FOLLOWING-DIRECTIONS.md):

```
Agent: mcp-lead3
Skill: using-skills
Actual Description: "Use when starting any conversation or performing any task"
Hallucinated: "Use when analyzing, creating, or modifying skills"
Rationalization: [Fabricated description to justify not invoking]
```

**Counter Template:**

```markdown
## Description Verification Counter

Before deciding NOT to invoke a skill:

- READ the actual description from the file
- DO NOT rely on memory or inference
- VERIFY trigger conditions match your task

If unsure whether skill applies → Invoke it (1% rule).
```

**Placement**: using-skills (universal - prevents fabrication)

---

## Pattern 6: Sunk Cost

**Agent Thought**: "Already have working code" or "Waste to refactor now"

**Detection Criteria:**

- Agent has existing implementation
- Agent resists invoking skills that suggest different approach
- Agent justifies current approach to avoid rework

**Example Evidence:**

```
Agent: backend-developer
Task: "Review API handler implementation"
Expected: Invoke reviewing-backend-implementations, suggest improvements
Actual: "Code works, refactoring would waste time already invested"
Rationalization: "45 minutes of working code, changing approach is sunk cost"
```

**Counter Template:**

```markdown
## Sunk Cost Counter

If you think: "Already have working code" or "Waste to refactor"

Reality: Working ≠ correct. Sunk cost fallacy causes propagation of wrong patterns. Hours invested don't justify skipping review.

Required action:

- Invoke review skills regardless of existing code
- Evaluate against patterns, not investment
- Refactor if needed, even with working code
```

**Placement**: Development and review agents

---

## Pattern 7: Time Pressure

**Agent Thought**: "This is urgent" or "No time for full protocol"

**Detection Criteria:**

- User message contains urgency indicators
- Agent mentions deadlines or deployment windows
- Agent proposes "quick fix" instead of proper solution

**Example Evidence:**

```
Agent: backend-developer
Task: "Production is down, fix auth middleware ASAP"
Expected: Invoke debugging-systematically, root cause analysis
Actual: "Emergency - applying quick patch without full debugging"
Rationalization: "Time pressure justifies skipping systematic debugging"
```

**Counter Template:**

```markdown
## Time Pressure Counter

If you think: "This is urgent" or "No time for protocol"

Reality: Rushing causes more downtime. Emergency is when you MOST need systematic approach.

Required action:

- Invoke debugging-systematically ESPECIALLY during emergencies
- Time pressure = increased need for discipline
- Quick fixes create more urgent problems
```

**Placement**: Development and debugging contexts

---

## Pattern 8: Authority Override

**Agent Thought**: "User wants quick answer" or "User said skip it"

**Detection Criteria:**

- Agent interprets user request as bypassing protocol
- Agent claims user wants speed over correctness
- Agent assumes user authority overrides skill requirements

**Example Evidence:**

```
Agent: Any
Task: "Just give me quick answer, don't need full analysis"
Expected: Follow full protocol anyway
Actual: Inline response without file artifacts
Rationalization: "User explicitly requested quick answer"
```

**Counter Template:**

```markdown
## Authority Override Counter

If you think: "User wants quick answer" or "User said skip it"

Reality: Users want CORRECT answers. "Quick" request doesn't mean "skip quality". User intent ≠ explicit bypass of protocols.

Required action:

- Follow protocol regardless of perceived user preference
- Quick AND correct are both requirements
- If user truly wants to skip, they'll override AFTER seeing protocol
```

**Placement**: using-skills (universal)

---

## Pattern Detection Workflow

When observing non-compliance:

1. **Capture verbatim**: What did agent say/do?
2. **Match to pattern**: Which pattern does this fit?
3. **If no match**: Document as new pattern
4. **Use counter template**: Adapt template to specific instance

---

## Pattern Frequency Data

From AGENTS-NOT-FOLLOWING-DIRECTIONS.md:

| Pattern                   | Observed Frequency | Impact                            |
| ------------------------- | ------------------ | --------------------------------- |
| Quick Question Trap       | 60%                | High - causes lost artifacts      |
| Description Hallucination | 40%                | Critical - complete fabrication   |
| Memory Confidence         | 50%                | Medium - partial compliance       |
| Overkill Excuse           | 30%                | Medium - inconsistent application |
| Sunk Cost                 | 20%                | Low - during reviews              |
| Time Pressure             | 15%                | High when present                 |
| Context First             | 25%                | Medium - wrong exploration order  |
| Authority Override        | 10%                | Low frequency, high impact        |

**Note**: Frequencies from observed agent behavior over 50 test scenarios. May vary by agent type and domain.

---

## Creating New Patterns

When rationalization doesn't match existing patterns:

1. **Document new pattern**:

   ```markdown
   ## Pattern N: [Pattern Name]

   **Agent Thought**: "[exact quote]"

   **Detection Criteria**:

   - [observable behavior 1]
   - [observable behavior 2]

   **Example Evidence**:
   ```

   [concrete example]

   ````

   **Counter Template**:
   ```markdown
   [counter following established format]
   ````

   ```

   ```

2. **Add to taxonomy**: Update this file with new pattern
3. **Track frequency**: Monitor how often pattern appears
4. **Refine criteria**: Improve detection as more examples found

---

## Pattern Combinations

Agents sometimes use multiple rationalizations:

```
Example: "This is urgent [Time Pressure] and just a quick question [Quick Question],
user wants fast answer [Authority Override]"
```

**When multiple patterns present:**

- Address primary rationalization first
- Add counters for each pattern
- Re-test to ensure all patterns blocked

---

## Anti-Pattern: Generic Counters

❌ **Don't write**:

```markdown
## Generic Counter

Always follow skills. Don't skip protocols.
```

✅ **Do write**:

```markdown
## Quick Question Counter

If you think: "This is just a simple question"
Reality: Questions ARE tasks. Check for skills.
Required action: [specific steps]
```

**Why**: Generic counters are easy to rationalize around. Specific counters trigger on exact phrasing and provide concrete alternatives.
