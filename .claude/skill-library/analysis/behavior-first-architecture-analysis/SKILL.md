---
name: behavior-first-architecture-analysis
description: Use when analyzing codebase architecture to prevent keyword-based assumptions - forces execution tracing over name searching, requires counter-evidence before claiming gaps, provides parallel agent prompt templates for triangulating true system behavior
allowed-tools: Read, Grep, Glob, Task, TodoWrite
---

# Behavior-First Architecture Analysis

**Methodology for accurate codebase architecture assessment that prevents keyword-based mischaracterization.**

## When to Use

Use this skill when:

- Analyzing codebase architecture for documentation
- Assessing capability completeness (e.g., "is X implemented?")
- Comparing systems to spec expectations
- Spawning Explore agents for architecture discovery
- Auditing existing architecture documentation for accuracy

## The Problem This Solves

**Common Failure Mode**: Agents search for expected keywords/class names instead of tracing actual execution, leading to mischaracterization.

| What Agents Do Wrong               | Result                                               |
| ---------------------------------- | ---------------------------------------------------- |
| Search for "workflow engine"       | Conclude "missing" when different paradigm exists    |
| Compare to spec expectations       | Miss implemented functionality with different naming |
| Keyword-based capability inventory | Conflate naming with capability                      |
| Single-angle analysis              | Miss patterns visible from other entry points        |

**Example Failure**: Documentation assessed system as "5% complete workflow engine" when it had production-ready event-driven orchestration - just named differently (`GetTargetTasks()`, `Match()`, `spawnAll()` instead of `WorkflowEngine`).

## Core Methodology

### Principle 1: Trace Execution, Don't Search Keywords

```
WRONG: grep -r "workflow" → not found → "workflow engine missing"
RIGHT: Trace: HTTP handler → service → what happens next? → document pattern
```

**Key Question**: "What does this code DO?" not "Does it have X feature?"

### Principle 2: Counter-Evidence Requirement

Before claiming something is "missing" or "incomplete":

1. Search for 3+ alternative implementations (different naming conventions)
2. Look for implicit patterns (type matching, convention-based dispatch)
3. Document what you searched for and found/didn't find
4. Distinguish "different approach" from "not implemented"

### Principle 3: Multi-Angle Triangulation

Run 3-4 agents from **different entry points**, not different topics. If all agents find the same pattern from different angles, that's strong evidence.

## Parallel Agent Strategy

### Entry Point Selection

| Agent | Starting Point                   | Traces                                        |
| ----- | -------------------------------- | --------------------------------------------- |
| 1     | HTTP handlers / API entry        | Request → dispatch → execution                |
| 2     | Core domain objects (Job, Asset) | Lifecycle, state transitions, chaining        |
| 3     | Registration/dispatch code       | How capabilities register, how matching works |
| 4     | Database writes                  | Trace BACKWARD from effects to causes         |

### Prompt Template for Each Agent

Include these sections in every Explore agent prompt:

```markdown
## Task: [Specific Trace]

CRITICAL: Do NOT search for expected component names. Trace actual code paths.

### Starting Point

[Concrete entry point - file pattern or function type]

### Trace Forward/Backward

[Specific instruction to follow 5+ hops with file:line documentation]

### Discovery Questions

[Questions about WHAT pattern exists, not WHETHER expected pattern exists]

### Output Format

| Behavior       | Implementation Pattern | Code Evidence         |
| -------------- | ---------------------- | --------------------- |
| [what it does] | [paradigm used]        | [file:line + snippet] |

### Counter-Evidence Requirement

Before claiming something is "missing":

1. Search for 3+ alternative implementations
2. Look for implicit patterns (type matching, convention-based)
3. Document search attempts and results
```

**See**: [references/prompt-templates.md](references/prompt-templates.md) for complete prompt templates.

## Red Flags (Rationalization Traps)

These thoughts indicate you're about to mischaracterize:

| Thought                               | Reality                                                         |
| ------------------------------------- | --------------------------------------------------------------- |
| "No WorkflowEngine class found"       | Different naming ≠ missing functionality                        |
| "Doesn't match the spec"              | Spec describes WHAT, not HOW                                    |
| "I searched for X and didn't find it" | Did you search for alternative implementations?                 |
| "This is incomplete"                  | Is it incomplete, or a different paradigm?                      |
| "5% complete"                         | Arbitrary percentages without execution tracing are meaningless |
| "Critical gap"                        | Did you trace what actually happens in the scenario?            |

## Output Requirements

### Per-Agent Output

Each agent must provide:

```markdown
## [TRACE TYPE]: [description]

### Execution Path

1. [file:line] - [function] - [what it does]
2. [file:line] - [function] - [what it does]
   ...

### Pattern Identified

[Name the paradigm: event-driven / registry-based / queue-based / etc.]

### Code Evidence

[Actual code snippets proving the pattern]

### Counter-Evidence Searches

- Searched for: [X] → Found: [Y or nothing]
- Searched for: [X] → Found: [Y or nothing]
- Searched for: [X] → Found: [Y or nothing]
```

### Synthesis Output

After all agents return:

```markdown
## Triangulation Results

| Agent | Entry Point | Pattern Found |
| ----- | ----------- | ------------- |
| 1     | [entry]     | [pattern]     |
| 2     | [entry]     | [pattern]     |
| 3     | [entry]     | [pattern]     |
| 4     | [entry]     | [pattern]     |

## Convergence

[Did all agents find the same pattern? What does this prove?]

## Corrected Understanding

| Original Assumption | Reality                |
| ------------------- | ---------------------- |
| [what was expected] | [what actually exists] |

## Actual Gaps (if any)

[Only gaps with counter-evidence documentation]
```

## Quick Reference

### Before Spawning Agents

1. Define 4 different entry points (not topics)
2. Include counter-evidence requirement in each prompt
3. Require file:line evidence, not claims

### Key Phrases to Include in Prompts

- "Show me the code, not the architecture docs"
- "Trace execution, don't search for class names"
- "What pattern IS this, not what pattern SHOULD it be"
- "Evidence required: file:line for every claim"

### After Agents Return

1. Compare patterns found from each angle
2. Check for convergence (same pattern, different entry points)
3. Validate counter-evidence was actually performed
4. Update documentation only with evidence-backed claims

## Related Skills

| Skill                               | When to Use                                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `orchestrating-research` (LIBRARY)  | Complex multi-source research with intent expansion - `Read(".claude/skill-library/research/orchestrating-research/SKILL.md")` |
| `enforcing-evidence-based-analysis` | Prevent hallucination in implementation plans                                                                                  |
| `debugging-systematically`          | When architecture analysis reveals bugs to investigate                                                                         |

## References

- [references/prompt-templates.md](references/prompt-templates.md) - Complete agent prompt templates
- [references/anti-patterns.md](references/anti-patterns.md) - Common analysis mistakes to avoid
- [references/synthesis-workflow.md](references/synthesis-workflow.md) - How to synthesize multi-agent results
