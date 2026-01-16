---
name: brainstorming
description: Use when creating or developing, before writing code or implementation plans - refines rough ideas into fully-formed designs through collaborative questioning, alternative exploration, and incremental validation. Don't use during clear 'mechanical' processes
allowed-tools: "Read, Write, Bash"
---

# Brainstorming Ideas Into Designs

## Overview

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

Start by understanding the current project context, then ask questions one at a time to refine the idea. Once you understand what you're building, present the design in small sections (200-300 words), checking after each section whether it looks right so far.

## Integration

### Library Skills (Read before use)

| Skill | Path | Purpose |
|-------|------|---------|
| orchestration-prompt-patterns | .claude/skill-library/prompting/orchestration-prompt-patterns/SKILL.md | Progressive disclosure patterns for questions |

Before starting brainstorming, read the progressive disclosure patterns:

```
Read('.claude/skill-library/prompting/orchestration-prompt-patterns/references/progressive-disclosure-patterns.md')
```

## The Process

**Understanding the idea (Progressive Disclosure):**

Questions must follow progressive disclosure levels. Do NOT skip levels.

**Level 1 - Orientation** (ask first):
- What problem are you trying to solve?
- Who will use this?
- What does success look like?

**Level 2 - Constraints** (after Level 1):
- What systems does this integrate with?
- What are the performance/security requirements?
- What's the timeline?

**Level 3 - Decisions** (after Level 2, prefer multiple choice):
- "Should this be: A) [option], B) [option], or C) [option]?"
- Lead with your recommendation and explain why

**Level 4 - Details** (after Level 3):
- Specific fields, validation rules, error messages
- Edge case behaviors

**Rules:**
- ONE question per message
- Complete each level before moving to next
- Prefer multiple choice over open-ended when possible
- If user gives vague answer, ask follow-up at SAME level before advancing

**Exploring approaches (Chain-of-Thought):**

When presenting 2-3 approaches, use this structure for EACH:

1. **State the option clearly**: "Option A: [name]"

2. **Walk through implications step-by-step**:
   - How does it solve the problem?
   - What are the trade-offs?
   - What assumptions does it make?
   - What could go wrong?

3. **Compare against constraints** (from Level 2 questions):
   - Does it meet performance requirements?
   - Does it integrate with existing systems?
   - Does it fit the timeline?

4. **Self-consistency check** (before recommending):
   - If I approached this from a different angle, would I reach the same recommendation?
   - What would make me switch to a different option?

5. **Recommend with explicit reasoning**:
   - "I recommend Option [X] because [specific reasons tied to constraints]"
   - "I would switch to Option [Y] if [condition]"

**Presenting the design:**

- Once you believe you understand what you're building, present the design
- Break it into sections of 200-300 words
- Ask after each section whether it looks right so far
- Cover: architecture, components, data flow, error handling, testing
- Be ready to go back and clarify if something doesn't make sense

## After the Design

**Documentation:**

- Write the validated design to `docs/plans/YYYY-MM-DD-<topic>-design.md`
- Use elements-of-style:writing-clearly-and-concisely skill if available
- Commit the design document to git

**Implementation (if continuing):**

- Ask: "Ready to set up for implementation?"
- Use using-git-worktrees to create isolated workspace
- Use writing-plans to create detailed implementation plan

## Key Principles

- **Progressive disclosure** - Questions follow levels: Orientation → Constraints → Decisions → Details
- **Chain-of-thought for options** - Walk through each option's implications step-by-step
- **Self-consistency** - Before recommending, argue against your recommendation to verify it holds
- **One question at a time** - Don't overwhelm with multiple questions
- **Multiple choice preferred** - Easier to answer than open-ended when possible
- **YAGNI ruthlessly** - Remove unnecessary features from all designs
- **Explore alternatives** - Always propose 2-3 approaches before settling
- **Incremental validation** - Present design in sections, validate each
- **Be flexible** - Go back and clarify when something doesn't make sense

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | Correct Approach |
|--------------|----------------|------------------|
| Jumping to details | Missing context leads to wrong design | Complete Level 1-2 before Level 3-4 |
| Multiple questions per message | Overwhelming, answers get confused | ONE question per message |
| Open-ended when multiple choice works | Harder to answer, vague responses | Offer A/B/C options with recommendation |
| Recommending without trade-off analysis | User can't evaluate decision | Walk through each option step-by-step |
| First option bias | May miss better alternatives | Self-consistency check before recommending |
