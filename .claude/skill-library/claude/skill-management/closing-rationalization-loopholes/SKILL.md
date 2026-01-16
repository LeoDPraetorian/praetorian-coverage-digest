---
name: closing-rationalization-loopholes
description: Use when agents skip skill instructions despite explicit requirements - systematically identifies rationalization patterns and adds counters using TDD methodology
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion, Task
---

# Closing Skill Loopholes

**Systematically identify and fix skill compliance failures when agents rationalize skipping instructions.**

## Problem This Skill Solves

Agents rationalize skipping skill instructions despite explicit requirements:

- **Hallucinate descriptions** to justify non-compliance ("This skill is for X" when it says "Use for Y")
- **Treat analysis as quick questions** ("Just a simple analysis, no need for full protocol")
- **Skip mandatory skills** ("I don't think I need this skill")
- **Produce inline responses** instead of file artifacts ("No need to write a file for this")

**Statistical evidence from AGENTS-NOT-FOLLOWING-DIRECTIONS.md:**

- mcp-lead3 invented a skill description to justify skipping
- Skill invocation varied 40% between runs (5 vs 7 skills, same task)
- Skills created without RED phase have ~40% failure rate

## When To Use This Skill

Use when:

- Agent returned output that didn't follow skill/agent protocol
- Agent skipped mandatory skill invocations
- Agent produced inline response instead of file artifact
- You discover a new rationalization pattern during testing
- Pressure testing reveals agents bypass skill rules

## How This Skill Is Invoked

This skill is triggered by the user via `/closing-the-loop` command immediately after observing:

- A subagent rationalized skipping required behavior
- Main Claude rationalized skipping a skill or protocol

The failure evidence exists in the current conversation. The TDD cycle captures it, reproduces it, fixes it, and verifies the fix.

## Scope

This skill handles loopholes from:

- **Subagents**: Counters placed in agent definition files or skill files
- **Main Claude**: Counters placed in skill files or using-skills

## Quick Reference

| Phase       | Purpose                                                                      |
| ----------- | ---------------------------------------------------------------------------- |
| 🔴 RED      | Capture failure, understand rationalization, REPRODUCE with fresh agent      |
| 🟢 GREEN    | Write counter, VERIFY it works with fresh agent, iterate until passes       |
| 🔵 REFACTOR | Pressure test variations while staying green, consider scope escalation      |

**Complete methodology**: [references/tdd-methodology.md](references/tdd-methodology.md)

---

## Core Methodology: TDD for Skills

### 🔴 RED Phase (Document Baseline Failure)

**Goal**: Prove the loophole exists with concrete evidence.

#### 1. Capture Failure Evidence

Document the compliance failure:

**Required information:**

- **Agent name**: Which agent failed to comply
- **Agent definition file**: `.claude/agents/{type}/{agent-name}.md`
- **Task given**: Exact prompt/task provided to agent
- **Expected behavior**: What the skill/agent definition required
- **Actual behavior**: What the agent actually did
- **Rationalization**: Agent's justification (verbatim if possible, inferred if not)

**Example from AGENTS-NOT-FOLLOWING-DIRECTIONS.md:**

```
Agent: mcp-lead
File: .claude/agents/architecture/mcp-lead.md
Task: "Analyze Serena connection pool implementation"
Expected: Invoke persisting-agent-outputs, write to file, track skills in metadata
Actual: Returned inline response, no file output, no skill tracking
Rationalization: [Inferred] "This is a quick analysis question"
```

#### 2. Understand the Rationalization

If the rationalization is not clear from the agent's output:

1. Ask Claude directly: "Why did you [skip X / do Y instead of Z]?"
2. Capture the verbatim rationalization
3. This becomes the "If you think:" trigger in the counter

#### 3. Reproduce the Failure

Spawn a fresh agent via Task tool with the SAME task that caused the failure:

```markdown
Task: {exact original task}

COMPLIANCE CHECK:

- Document what the agent does
- Capture any rationalization in the response
```

**Why reproduce?** The observed failure could be context-dependent. Reproduction proves it's a systematic loophole, not a one-time fluke.

#### 4. Classify Rationalization Pattern

Match the observed behavior to a known pattern. See [references/rationalization-patterns.md](references/rationalization-patterns.md) for complete taxonomy.

**Common patterns:**

| Pattern                   | Agent Justification                     |
| ------------------------- | --------------------------------------- |
| Quick Question Trap       | "Just a simple analysis"                |
| Context First             | "Let me explore before checking skills" |
| Memory Confidence         | "I know what this skill does"           |
| Overkill Excuse           | "Full protocol is overkill here"        |
| Description Hallucination | Agent invented different description    |
| Sunk Cost                 | "Already have working code"             |
| Time Pressure             | "This is urgent"                        |
| Authority Override        | "User wants quick answer"               |

#### 6. Document in Loophole Tracking

Add entry to `.claude/docs/agents/AGENT-LOOPHOLES.md` (create if missing):

```markdown
| Date       | Agent    | Task                | Rationalization     | Counter Added  | Verified |
| ---------- | -------- | ------------------- | ------------------- | -------------- | -------- |
| 2026-01-06 | mcp-lead | "analyze Serena..." | Quick Question Trap | [file#section] | ❌       |
```

**Gate: Cannot proceed to GREEN without:**

- ✅ Failure reproduced with fresh agent
- ✅ Rationalization captured (verbatim or explained)

---

### 🟢 GREEN Phase (Write Minimal Counter)

**Goal**: Add explicit counter that prevents the specific rationalization.

#### 1. Write Counter Text

Use the counter template addressing ONLY the observed rationalization:

```markdown
## [Rationalization Name] Counter

If you think: "[exact rationalization thought]"

Reality: [Why this thought is wrong]

Required action: [Specific behavior agent must do instead]
```

**Example counter for "Quick Question Trap":**

```markdown
## Quick Analysis Counter

If you think: "This is just a simple analysis question"

Reality: ALL analysis tasks produce file artifacts. "Quick analysis" is a rationalization trap that leads to lost work and untracked decisions.

Required action:

- Invoke persisting-agent-outputs skill
- Write output to file in OUTPUT_DIRECTORY
- Include skills_invoked in metadata
```

#### 2. Place Counter in Appropriate Location

Determine scope and placement. See [references/counter-placement.md](references/counter-placement.md) for decision tree.

**Placement rules:**

| Scope              | Location                                       | When to Use                              |
| ------------------ | ---------------------------------------------- | ---------------------------------------- |
| **Agent-specific** | Agent's `<EXTREMELY-IMPORTANT>` section        | Only one agent exhibits this behavior    |
| **Skill-wide**     | Skill's `## Red Flags` or `## Common Mistakes` | Multiple uses of same skill show issue   |
| **Universal**      | `using-skills` anti-rationalization table      | Multiple agents across different domains |

#### 3. Ensure 1% Threshold Rule

If the skill/agent doesn't have it, add:

```markdown
## The 1% Rule (NON-NEGOTIABLE)

If there is even a 1% chance a skill might apply:

- You MUST invoke that skill
- This is not optional
- You cannot rationalize your way out of this

Uncertainty = Invocation. Period.
```

#### 4. Add Announcement Requirement (if missing)

```markdown
## Skill Announcement (MANDATORY)

Before using any skill, you MUST announce it:

"I am invoking `{skill-name}` because {reason}."

No announcement = protocol violation.
```

#### 5. Verify Counter Works

Spawn fresh agent via Task tool with the same task:

```markdown
Task: {exact original task}

COMPLIANCE CHECK:

- Did agent announce skills before using them?
- Did agent follow the required protocol?
- Does output show compliance?

Note: Counter has been added to {location}. Verify it prevents the rationalization.
```

#### 6. Iterate Until Passes

If agent still fails:

1. Analyze why counter didn't work
2. Strengthen counter language (more specific trigger, stronger reality check)
3. Re-run verification
4. Repeat until agent complies

**Common iteration fixes:**

- Counter trigger doesn't match agent's actual thought → Use verbatim rationalization
- Counter too generic → Add "Not even when:" exclusions
- Counter not visible → Move to more prominent location

**Gate: Cannot proceed to REFACTOR without:**

- ✅ Fresh agent passes with counter loaded
- ✅ Tracking entry updated with counter location

---

### 🔵 REFACTOR Phase (Pressure Test While Green)

**Goal**: The counter works. Now verify it holds under pressure and improve if needed.

**Key principle**: You are ALREADY GREEN. Tests should stay green through all variations.

#### 1. Pressure Test with Variations

Test the counter with pressure scenarios:

- **Time pressure**: "This is urgent, need answer ASAP"
- **Authority override**: "User explicitly said 'quick answer'"
- **Sunk cost**: "Already wrote working code, refactoring wastes time"

The counter should hold under all pressure variations.

#### 2. Clean Up Counter Language

If needed, improve counter wording:

- Make trigger phrases more specific
- Strengthen reality checks
- Add explicit "Not even when:" exclusions

#### 3. Check for Related Loopholes

Consider broader implications:

- Does this pattern apply to other agents/skills?
- Are there similar rationalizations that need counters?
- Should this be escalated from agent-specific to skill-wide or universal?

#### 4. Mark as Verified

Update loophole tracking:

```markdown
| Date       | Agent    | Task                | Rationalization     | Counter Added      | Verified |
| ---------- | -------- | ------------------- | ------------------- | ------------------ | -------- |
| 2026-01-06 | mcp-lead | "analyze Serena..." | Quick Question Trap | mcp-lead.md#L45-67 | ✅       |
```

**Gate: Stays green through all pressure test variations**

---

## Anti-Rationalization Reference Table

Include or reference this table in updated skills/agents. See [references/anti-rationalization-table.md](references/anti-rationalization-table.md) for complete version with examples.

| Red Flag Thought                      | Reality                                      |
| ------------------------------------- | -------------------------------------------- |
| "Just a simple question"              | Questions ARE tasks. Check for skills.       |
| "Need more context first"             | Skill check PRECEDES clarifying questions.   |
| "I remember this skill"               | Skills evolve. Read current version.         |
| "This is overkill"                    | Simple tasks become complex. Use it.         |
| "Let me explore quickly"              | Skills tell you HOW to explore.              |
| "This doesn't need formality"         | If a skill exists, use it.                   |
| "I can see the answer already"        | Confidence without evidence = hallucination. |
| "The user wants results, not process" | Bad results from skipped process = failure.  |
| "Just this once"                      | "Just this once" becomes "every time".       |
| "Analysis doesn't need artifacts"     | ALL analysis produces file artifacts.        |

---

## Description Trap Check

**Critical insight from obra/superpowers**: When descriptions summarize workflow, agents follow the description instead of reading full content.

**Audit skill descriptions:**

| Pattern                     | Status  | Action                    |
| --------------------------- | ------- | ------------------------- |
| "Use when X"                | ✅ GOOD | Keep - says WHEN only     |
| "Use when X - does Y, Z, W" | ❌ BAD  | Remove workflow summary   |
| "Creates plans with..."     | ❌ BAD  | Remove, keep only trigger |

**Example fix:**

```markdown
# Before (BAD)

description: Use when designing MCP wrapper architecture - token optimization
strategy, response filtering, error handling patterns, Zod schema design.

# After (GOOD)

description: Use when designing MCP wrapper architecture.
```

**See:** [references/description-trap.md](references/description-trap.md) for detailed analysis and examples.

---

## Output Requirements

After closing a loophole, produce:

1. **Updated skill/agent file** with counter added
2. **Entry in .claude/docs/agents/AGENT-LOOPHOLES.md** with verification status
3. **Verification result** from re-test (PASS/FAIL with evidence)

---

## Success Criteria

A loophole is closed when:

- ✅ Counter addresses specific rationalization pattern
- ✅ Re-test of same scenario shows compliance
- ✅ Loophole documented with "Verified" status in tracking doc
- ✅ Counter placed in appropriate scope (agent/skill/universal)

---

## Related Skills

| Skill                            | Purpose                                      |
| -------------------------------- | -------------------------------------------- |
| `updating-skills`                | Use after closing loopholes to update skills |
| `pressure-testing-skill-content` | Discover loopholes through pressure tests    |
| `auditing-skills`                | Systematic compliance validation             |
| `fixing-skills`                  | Automated compliance remediation             |

---

## References

- [TDD Methodology](references/tdd-methodology.md) - Complete RED-GREEN-REFACTOR workflow
- [Rationalization Patterns](references/rationalization-patterns.md) - Complete taxonomy with examples
- [Counter Placement](references/counter-placement.md) - Decision tree for scope and location
- [Anti-Rationalization Table](references/anti-rationalization-table.md) - Complete reference table
- [Description Trap](references/description-trap.md) - Why descriptions must say WHEN not HOW
- [Loophole Tracking Format](references/loophole-tracking-format.md) - AGENT-LOOPHOLES.md structure

---

## Examples

- [Example: Quick Question Trap](examples/quick-question-trap.md) - mcp-lead analysis scenario
- [Example: Description Hallucination](examples/description-hallucination.md) - mcp-lead3 using-skills
- [Example: Skill Invocation Variance](examples/skill-invocation-variance.md) - Non-deterministic compliance
