---
name: orchestration-prompt-patterns
description: Use when constructing prompts for orchestrated agents - provides few-shot templates, chain-of-thought patterns, self-consistency checks, and confidence calibration guidelines for multi-agent workflows
---

# Orchestration Prompt Patterns

Prompt engineering patterns optimized for multi-agent orchestration workflows.

## When to Use This Skill

- Constructing prompts for subagents in orchestrated workflows
- Improving agent output quality when current prompts produce inconsistent results
- Adding verification steps to review or synthesis phases
- Calibrating confidence scores in research or analysis outputs

## Quick Reference

| Pattern                | Best For                             | Reference                                     |
| ---------------------- | ------------------------------------ | --------------------------------------------- |
| Few-Shot Examples      | Developer, Tester, Research agents   | references/few-shot-patterns.md               |
| Chain-of-Thought       | Reviewers, Architects, Synthesis     | references/chain-of-thought-patterns.md       |
| Self-Consistency       | Review phases, Synthesis, Decisions  | references/self-consistency-patterns.md       |
| Progressive Disclosure | Brainstorming, Clarification gates   | references/progressive-disclosure-patterns.md |
| Confidence Calibration | Research agents, Quality assessments | references/confidence-calibration.md          |

## Pattern Selection Guide

### By Agent Type

| Agent Type    | Primary Pattern                 | Secondary Pattern             |
| ------------- | ------------------------------- | ----------------------------- |
| \*-developer  | Few-Shot (TDD examples)         | Chain-of-Thought (debugging)  |
| \*-reviewer   | Chain-of-Thought (verification) | Self-Consistency (quality)    |
| \*-lead       | Chain-of-Thought (decisions)    | Progressive Disclosure (reqs) |
| \*-tester     | Few-Shot (test patterns)        | Chain-of-Thought (edge cases) |
| \*-researcher | Confidence Calibration          | Self-Consistency (synthesis)  |
| Explore       | Progressive Disclosure          | Chain-of-Thought (analysis)   |

### By Orchestration Phase

| Phase            | Recommended Pattern                 | Why                               |
| ---------------- | ----------------------------------- | --------------------------------- |
| Brainstorming    | Progressive Disclosure              | Refines vague ideas incrementally |
| Discovery        | Chain-of-Thought                    | Structured analysis of findings   |
| Architecture     | Chain-of-Thought + Self-Consistency | Rigorous decision-making          |
| Implementation   | Few-Shot                            | Concrete patterns to follow       |
| Review (Spec)    | Chain-of-Thought                    | Systematic verification           |
| Review (Quality) | Self-Consistency                    | Avoid first-impression bias       |
| Synthesis        | Self-Consistency + Confidence       | Accurate aggregation              |
| Testing          | Few-Shot                            | Consistent test patterns          |

## Integration

### Called By

- Orchestration skills (orchestrating-feature-development, orchestrating-research, threat-modeling-orchestrator)
- Agent definition files (.claude/agents/\*.md) - embedded in Step 1 mandatory skills
- Skill creators designing new orchestration workflows

### Requires (invoke before starting)

None - this is a reference library skill, not an active workflow.

### Calls (during execution)

None - terminal skill providing patterns.

### Pairs With (conditional)

| Skill                              | Trigger                                | Purpose                                                                                                            |
| ---------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `orchestrating-research` (LIBRARY) | When researching new prompt techniques | Find evidence for pattern effectiveness - `Read(".claude/skill-library/research/orchestrating-research/SKILL.md")` |
| `developing-with-tdd`              | When creating few-shot TDD examples    | Ensure examples follow correct methodology                                                                         |
| `debugging-systematically`         | When chain-of-thought patterns fail    | Diagnose why reasoning chains break down                                                                           |

## Anti-Patterns

| Anti-Pattern         | Problem                      | Solution                   |
| -------------------- | ---------------------------- | -------------------------- |
| Generic instructions | Agents interpret differently | Use few-shot examples      |
| Single-pass review   | First impressions dominate   | Add self-consistency check |
| Vague confidence     | Scores meaningless           | Use calibration guidelines |
| Wall of requirements | Agents miss items            | Progressive disclosure     |
| Assumed reasoning    | Agents skip steps            | Require chain-of-thought   |

## Usage Examples

### For Orchestration Skills

Reference this skill in your orchestration skill's 'Integration' section:

```markdown
### Requires (invoke before starting)

| Skill                           | When  | Purpose                      |
| ------------------------------- | ----- | ---------------------------- |
| `orchestration-prompt-patterns` | Start | Load prompt quality patterns |
```

Then read the relevant pattern reference:

```markdown
Read('.claude/skill-library/prompting/orchestration-prompt-patterns/references/few-shot-patterns.md')
```

### For Agent Definitions

Include relevant patterns directly in agent Step 1 prompts. Example for a developer agent:

```markdown
## Step 1: Load Mandatory Skills

MANDATORY SKILLS (invoke ALL before starting):

- developing-with-tdd: TDD methodology
- orchestration-prompt-patterns: Load few-shot TDD examples from references/few-shot-patterns.md

## TDD Workflow

[Copy few-shot pattern from references/few-shot-patterns.md]
```

### For Ad-Hoc Agent Spawning

When spawning an agent via Task tool, include pattern requirements in the prompt:

```markdown
MANDATORY SKILLS:

- orchestration-prompt-patterns: Use chain-of-thought verification pattern from references/chain-of-thought-patterns.md

[Task description]

[Copy relevant chain-of-thought template]
```

## Pattern Descriptions

### Few-Shot Examples

Concrete, complete examples that agents can pattern-match against. Include 2-3 examples per pattern with step-by-step execution traces.

**Best for:** Developer agents (TDD), testers (test structure), researchers (source analysis)

**Reference:** [references/few-shot-patterns.md](references/few-shot-patterns.md)

### Chain-of-Thought

Structured reasoning templates that force agents to show their work. Each step builds on previous steps, preventing skipping.

**Best for:** Reviewers (spec compliance), architects (decisions), synthesis agents (conflict detection)

**Reference:** [references/chain-of-thought-patterns.md](references/chain-of-thought-patterns.md)

### Self-Consistency

Multiple reasoning paths to the same conclusion. If paths diverge, the agent must investigate why.

**Best for:** Code quality reviews (two-pass), architecture decisions (alternative perspectives), research synthesis (multi-path aggregation)

**Reference:** [references/self-consistency-patterns.md](references/self-consistency-patterns.md)

### Progressive Disclosure

Layered information delivery from broad to specific. Each level must be completed before moving to the next.

**Best for:** Brainstorming (question levels), developer clarification (requirement levels)

**Reference:** [references/progressive-disclosure-patterns.md](references/progressive-disclosure-patterns.md)

### Confidence Calibration

Evidence-based self-assessment guidelines. Agents rate confidence based on source quantity/quality, not gut feeling.

**Best for:** Research agents (confidence scoring), quality assessments (calibrated scoring)

**Reference:** [references/confidence-calibration.md](references/confidence-calibration.md)

## Combining Patterns

Patterns can be layered for complex workflows:

| Combination                               | Use Case                                          |
| ----------------------------------------- | ------------------------------------------------- |
| Chain-of-Thought + Self-Consistency       | Architecture decisions (verify multiple paths)    |
| Few-Shot + Chain-of-Thought               | Developer debugging (example + reasoning)         |
| Self-Consistency + Confidence             | Research synthesis (multiple paths + calibration) |
| Progressive Disclosure + Chain-of-Thought | Requirements gathering (layered + structured)     |

## When NOT to Skip Patterns

**Common rationalizations that lead to failures:**

| Rationalization                        | Reality                                                    | Pattern Still Required  |
| -------------------------------------- | ---------------------------------------------------------- | ----------------------- |
| "I already know chain-of-thought"      | Knowing ≠ using. Agents skip steps under pressure          | Yes - use template      |
| "This task is too simple for few-shot" | Simple tasks become complex. Agents need concrete examples | Yes - 1 example min     |
| "My agent is just reviewing"           | Single-pass reviews miss 60%+ of issues                    | Yes - self-consistency  |
| "We don't need calibrated confidence"  | Uncalibrated scores are meaningless                        | Yes - evidence rubric   |
| "Progressive disclosure is overkill"   | Jumping to details causes requirement gaps                 | Yes - at least 2 levels |

**The only time patterns are optional:**

- Ad-hoc scripts that won't be reused (one-off automation)
- Terminal tasks with no decision-making (pure data transformation)

**For ALL orchestration workflows and agent prompts:** Use patterns. The 5 minutes to reference this skill prevents hours debugging why agents bypass requirements.

## Maintenance

When to update patterns:

1. **Agent bypass detected**: Pressure testing reveals rationalization → add explicit counter
2. **New agent type**: Novel orchestration role emerges → create specific few-shot examples
3. **Pattern failure**: Agents still skip steps → strengthen chain-of-thought requirements
4. **Confidence drift**: Scores don't match reality → recalibrate evidence thresholds

## Changelog

See [.history/CHANGELOG](.history/CHANGELOG) for version history.
