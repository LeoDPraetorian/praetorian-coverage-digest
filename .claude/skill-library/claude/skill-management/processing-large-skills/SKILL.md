---
name: processing-large-skills
description: Use when needing to understand complex skills with multiple reference files - provides parallel analysis of skill components with semantic synthesis, dependency tracing, and cross-file relationship mapping. Invoke when user asks to understand, compare, or trace skills with 5+ files.
allowed-tools: Read, Task, TodoWrite, Write, Bash, Grep, Glob, Skill
---

# Processing Large Skills

**Systematic analysis of complex, multi-file skills using parallel agent coordination and semantic synthesis.**

## Problem Statement

When encountering skills with progressive disclosure (SKILL.md + 5-15 reference files), Claude either:

- Reads only SKILL.md, missing detailed patterns in references
- Reads files sequentially, losing context between files
- Fails to synthesize how components relate to each other
- Cannot trace dependency chains (skill A calls skill B calls skill C)

**This skill provides:** Parallel file analysis, relationship mapping, and structured output for understanding complex skills.

## When to Use

Invoke this skill when:

- "Help me understand [skill-name]"
- "How does [skill] work?"
- "What's the relationship between [skill-a] and [skill-b]?"
- "Trace the dependencies of [skill]"
- "Compare [skill-a] to [skill-b]"
- Encountering a skill directory with 5+ files
- Needing to modify a skill but unsure of impact

## Modes

### understand

**Purpose:** Comprehensive analysis of a single skill
**Input:** Skill directory path
**Output:** Structured understanding document with purpose, workflow, components, integration points

### compare

**Purpose:** Side-by-side analysis of 2-3 related skills
**Input:** Multiple skill paths
**Output:** Comparison matrix with similarities, differences, when to use each

### trace

**Purpose:** Map dependency chains across skill ecosystem
**Input:** Starting skill path
**Output:** Dependency graph showing calls/called-by relationships

## Quick Workflow

| Phase | Purpose                            | Time  |
| ----- | ---------------------------------- | ----- |
| 1     | Discovery - List files, validate   | 1 min |
| 2     | Context - Extract from SKILL.md    | 2 min |
| 3     | Analysis - Parallel ref agents     | 3 min |
| 4     | Synthesis - Build relationship map | 2 min |
| 5     | Output - Generate mode-specific    | 2 min |

**Total:** ~10 minutes for comprehensive skill analysis

## Core Algorithm

### Phase 1: Discovery

1. Validate skill path exists
2. List all files in skill directory:
   ```bash
   find {skill-path} -type f -name "*.md" | sort
   ```
3. Calculate total tokens across all files
4. Identify skill type (core vs library, gateway vs regular)

### Phase 2: Context Extraction

1. Read SKILL.md completely (this is the anchor)
2. Extract:
   - Skill name and description
   - Allowed tools
   - Primary purpose (from first H1/H2)
   - Modes or phases (from headings)
   - Integration section (Called By, Requires, Calls, Pairs With)

**Output:** JSON context object used by reference agents

### Phase 3: Parallel Reference Analysis

**Agent 0 (Context Agent):** Already completed in Phase 2 - provides context to all other agents

**Agents 1-N (Reference Agents):** One per reference file

Each reference agent receives:

- The SKILL.md summary from Phase 2 (context)
- Their assigned reference file path
- Instructions to identify: purpose, key patterns, cross-references to other files

**For detailed agent prompt templates, see:** [references/agent-prompts.md](references/agent-prompts.md)

### Phase 4: Synthesis

1. Collect all agent outputs
2. Build relationship map:
   - Which references are mentioned in SKILL.md?
   - Which references mention each other?
   - What's the reading order for understanding?
3. Generate structured output based on mode

### Phase 5: Output Generation

Generate mode-specific output (understand/compare/trace) with:

- Executive summary
- Component map with reading order
- Integration points
- Key patterns and pitfalls

**For complete output structures, see:** [references/output-templates.md](references/output-templates.md)

## Output Persistence

All outputs persist to:

```
.claude/.output/skill-analysis/
  {timestamp}-{skill-name}/
    MANIFEST.yaml
    context.json           # Phase 2 output
    references/            # Phase 3 outputs
      ref-01.json
      ref-02.json
    final/
      understanding.md     # understand mode
      comparison.md        # compare mode
      dependency-trace.md  # trace mode
```

## Integration

### Called By

- Main conversation when encountering complex skills
- Skill modification workflows (before editing)
- Onboarding (understanding skill ecosystem)

### Requires (invoke before starting)

| Skill                    | When  | Purpose                    |
| ------------------------ | ----- | -------------------------- |
| persisting-agent-outputs | Start | Output directory structure |

### Calls (during execution)

| Skill | Phase | Purpose        |
| ----- | ----- | -------------- |
| None  | N/A   | Terminal skill |

### Pairs With (conditional)

| Skill                     | Trigger          | Purpose                                                                                                  |
| ------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| auditing-skills (LIBRARY) | After understand | Validate compliance - `Read(".claude/skill-library/claude/skill-management/auditing-skills/SKILL.md")`   |
| updating-skills (LIBRARY) | After understand | Make informed changes - `Read(".claude/skill-library/claude/skill-management/updating-skills/SKILL.md")` |

## Examples

### Example 1: Understanding a Complex Skill

**User:** "Help me understand the managing-skills skill"

**Assessment:**

- Path: .claude/skills/managing-skills/
- Files: SKILL.md + 7 reference files
- Type: Core skill, router pattern

**Output:**

- Purpose: Routes skill management operations to library skills
- Key insight: This skill implements NOTHING - it's pure delegation
- Dependency map: Routes to 10 different library skills
- Reading order: SKILL.md → operations.md → tdd-methodology.md

### Example 2: Comparing Related Skills

**User:** "What's the difference between creating-skills and updating-skills?"

**Output:**

- creating-skills: Full TDD cycle, location selection, gateway updates
- updating-skills: Targeted changes, preserves existing structure
- Key difference: Creating has Phase 3 (location), updating skips it
- Use creating for: New skills
- Use updating for: Modifications to existing skills

### Example 3: Tracing Dependencies

**User:** "Trace what managing-skills depends on"

**Output:**

- Direct: creating-skills, updating-skills, auditing-skills, ... (10 skills)
- Indirect: pressure-testing-skill-content, developing-with-tdd
- Upstream: /skill-manager command, gateway-claude
- Impact: Modifying managing-skills affects all skill operations

## Error Handling

| Error                        | Recovery                              |
| ---------------------------- | ------------------------------------- |
| Skill path doesn't exist     | Return clear error with suggestions   |
| No reference files           | Analyze SKILL.md only, note in output |
| Circular dependency detected | Flag in trace output, continue        |
| Reference file empty         | Note in output, reduce confidence     |

## Common Pitfalls

**"I already understand this skill"** - Without systematic analysis, you likely missed:

- How references extend the main workflow
- Cross-file dependencies
- Integration points with other skills

**"This is simple, just read the files"** - Sequential reading loses context. Parallel analysis with shared context reveals relationships you'd miss.

**"No time for full analysis"** - 10 minutes now prevents hours of trial-and-error when modifying skills.

**"User already spent time reading manually"** - Partial manual analysis is unreliable. Missing just one reference file can lead to incorrect conclusions about how the skill works. Systematic analysis is more reliable than building on incomplete notes. Even when users have specific questions, use full analysis to answer within correct context.

## Checklist

- [ ] Validated skill path exists
- [ ] Listed all component files
- [ ] Extracted context from SKILL.md
- [ ] Dispatched parallel agents for references
- [ ] Collected all agent outputs
- [ ] Built relationship map
- [ ] Generated mode-appropriate output
- [ ] Persisted to output directory
- [ ] Identified integration points

## Related Skills

- `managing-skills` (CORE) - Router for all skill operations
- `creating-skills` (LIBRARY) - `Read(".claude/skill-library/claude/skill-management/creating-skills/SKILL.md")` - Full TDD workflow for new skills
- `updating-skills` (LIBRARY) - `Read(".claude/skill-library/claude/skill-management/updating-skills/SKILL.md")` - Targeted modifications with test guards
- `auditing-skills` (LIBRARY) - `Read(".claude/skill-library/claude/skill-management/auditing-skills/SKILL.md")` - Compliance validation
- `persisting-agent-outputs` (CORE) - Output directory management
