# Output Templates

This document provides complete templates for all three analysis modes.

## understand Mode Output

```markdown
# Understanding: {skill-name}

## Quick Summary

{2-3 sentence overview}

## Purpose

{What problem does this skill solve?}

## When to Use

{Triggers and scenarios}

## Skill Type

- Type: {process/library/integration/tool-wrapper/gateway}
- Location: {core/library}
- Gateway: {which gateway routes to this, if library}

## Workflow

{Main phases or modes with brief descriptions}

## Component Map

┌─────────────────┬───────────────┬────────────┬───────────┐
│ File │ Purpose │ Priority │ Extends │
├─────────────────┼───────────────┼────────────┼───────────┤
│ SKILL.md │ Core workflow │ Required │ - │
├─────────────────┼───────────────┼────────────┼───────────┤
│ references/X.md │ {purpose} │ {priority} │ {section} │
└─────────────────┴───────────────┴────────────┴───────────┘

## Reading Order

1. SKILL.md (always first)
2. {recommended references in order}
3. {advanced references}

## Integration Points

### This Skill Requires

{Skills that must be invoked before or alongside}

### This Skill Calls

{Skills this one delegates to}

### Called By

{Commands, agents, or skills that invoke this}

## Key Patterns

{Most important patterns or templates from the skill}

## Common Pitfalls

{What goes wrong when using this skill incorrectly}
```

## compare Mode Output

```markdown
# Comparison: {skill-a} vs {skill-b}

## Quick Distinction

{One sentence on when to use each}

## Comparison Matrix

┌────────────┬───────────┬───────────┐
│ Aspect │ {skill-a} │ {skill-b} │
├────────────┼───────────┼───────────┤
│ Purpose │ ... │ ... │
├────────────┼───────────┼───────────┤
│ Triggers │ ... │ ... │
├────────────┼───────────┼───────────┤
│ Complexity │ ... │ ... │
├────────────┼───────────┼───────────┤
│ Output │ ... │ ... │
└────────────┴───────────┴───────────┘

## Overlapping Capabilities

{What both skills can do}

## Unique to {skill-a}

{Capabilities only in skill-a}

## Unique to {skill-b}

{Capabilities only in skill-b}

## Decision Guide

- Use {skill-a} when: ...
- Use {skill-b} when: ...
- Use both when: ...
```

## trace Mode Output

```markdown
# Dependency Trace: {skill-name}

## Dependency Graph

{Mermaid diagram showing relationships}

## Upstream (What Calls This Skill)

{List of callers with context}

## Downstream (What This Skill Calls)

{List of callees with context}

## Full Chain

{Complete path from entry point to terminal skills}

## Impact Analysis

If modifying {skill-name}:

- Direct impact: {skills that call this directly}
- Indirect impact: {skills further upstream}
- Safe to modify: {isolated components}
```

## Output File Structure

All outputs persist to `.claude/.output/skill-analysis/{timestamp}-{skill-name}/`:

```
{timestamp}-{skill-name}/
├── MANIFEST.yaml              # Metadata about analysis
├── context.json               # Phase 2: Context extraction
├── references/                # Phase 3: Reference analysis
│   ├── ref-01.json
│   ├── ref-02.json
│   └── ref-N.json
└── final/                     # Phase 5: Mode output
    ├── understanding.md       # understand mode
    ├── comparison.md          # compare mode
    └── dependency-trace.md    # trace mode
```

## MANIFEST.yaml Format

```yaml
skill_name: "processing-large-skills"
analysis_mode: "understand" # understand|compare|trace
timestamp: "2026-01-10T14:30:00Z"
analyzed_files:
  - path: ".claude/skill-library/.../SKILL.md"
    lines: 250
    tokens: 1200
  - path: ".claude/skill-library/.../references/agent-prompts.md"
    lines: 180
    tokens: 900
total_tokens: 2100
agents_spawned: 3
synthesis_complete: true
output_files:
  - final/understanding.md
```

## Mermaid Diagram Format (trace mode)

```mermaid
graph TD
    A[/skill-manager command] --> B[managing-skills]
    B --> C[creating-skills]
    B --> D[updating-skills]
    B --> E[auditing-skills]
    C --> F[pressure-testing-skill-content]
    C --> G[developing-with-tdd]

    style B fill:#f9f,stroke:#333,stroke-width:4px
    style C fill:#bbf,stroke:#333,stroke-width:2px
    style D fill:#bbf,stroke:#333,stroke-width:2px
    style E fill:#bbf,stroke:#333,stroke-width:2px
```

**Legend:**

- Pink nodes: Current skill being analyzed
- Blue nodes: Direct dependencies
- Green nodes: Indirect dependencies

## Component Map Sorting

**Priority order:**

1. Required (SKILL.md always first)
2. Recommended (in logical reading order)
3. Advanced (optional/specialized)

**Extends column:**

- Lists which SKILL.md section this reference extends
- Use for quick navigation ("I need X, read Y")
