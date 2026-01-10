# Agent Prompt Templates

This document provides the complete prompt templates for context extraction and parallel reference analysis agents.

## Context Agent (Phase 2)

```
TASK: Extract context from skill's main file
SKILL: {skill-name}
FILE: {skill-path}/SKILL.md

READ the SKILL.md and extract:

1. IDENTITY
   - Name, description, allowed-tools from frontmatter
   - Skill type (process/library/integration/tool-wrapper/gateway)
   - Location type (core .claude/skills/ or library .claude/skill-library/)

2. PURPOSE
   - Primary function (what problem does it solve?)
   - When to use (triggers)
   - When NOT to use

3. STRUCTURE
   - Main sections/phases
   - Modes (if any)
   - Key workflows

4. INTEGRATION
   - Called By (what invokes this skill?)
   - Requires (prerequisites)
   - Calls (what does it delegate to?)
   - Pairs With (conditional companions)

5. REFERENCE MAP
   - List all references/ files mentioned
   - Note any external skill references

OUTPUT FORMAT (JSON):
{
  "name": "...",
  "description": "...",
  "type": "process|library|integration|tool-wrapper|gateway",
  "location": "core|library",
  "purpose": "...",
  "triggers": ["..."],
  "modes": ["..."],
  "phases": ["..."],
  "integration": {
    "called_by": ["..."],
    "requires": ["..."],
    "calls": ["..."],
    "pairs_with": ["..."]
  },
  "reference_files": ["..."],
  "external_skills": ["..."]
}
```

## Reference Agent (Phase 3)

```
TASK: Analyze reference file in context of parent skill
SKILL: {skill-name}
SKILL PURPOSE: {purpose-from-phase-2}
REFERENCE FILE: {reference-path}
TOTAL REFERENCES: {n} (you are analyzing reference {i} of {n})

CONTEXT: This file is part of the {skill-name} skill which {purpose-summary}.

READ the reference file and extract:

1. PURPOSE
   - What aspect of the skill does this file document?
   - Is this required reading or advanced/optional?

2. KEY CONTENT
   - Main concepts, patterns, or workflows
   - Important code examples or templates
   - Decision trees or matrices

3. CROSS-REFERENCES
   - References to SKILL.md sections
   - References to other reference files
   - References to external skills

4. RELATIONSHIP TO MAIN SKILL
   - How does this extend the main SKILL.md?
   - What questions does this answer that SKILL.md doesn't?

OUTPUT FORMAT (JSON):
{
  "file": "{filename}",
  "purpose": "...",
  "reading_priority": "required|recommended|advanced",
  "key_concepts": ["..."],
  "cross_references": {
    "to_skill_md": ["..."],
    "to_other_refs": ["..."],
    "to_external": ["..."]
  },
  "extends_sections": ["..."],
  "summary": "..."
}
```

## Agent Coordination Pattern

### Sequential vs Parallel

**Phase 2 (Context Agent):** MUST run FIRST - provides context to all other agents

**Phase 3 (Reference Agents):** Run in PARALLEL - each agent is independent

```
Phase 2: Context Agent (sequential)
   ↓
Phase 3: Reference Agents (parallel)
   ├─ Agent 1 → references/file-1.md
   ├─ Agent 2 → references/file-2.md
   ├─ Agent 3 → references/file-3.md
   └─ Agent N → references/file-N.md
   ↓
Phase 4: Synthesis (collect outputs)
```

### Task Tool Invocation

Use the Task tool to spawn reference agents in parallel:

```javascript
// Phase 3: Spawn parallel agents
const referenceFiles = ["workflow.md", "patterns.md", "api-reference.md"];

// Send single message with multiple Task calls
Task({
  subagent_type: "general-purpose",
  description: "Analyze workflow.md",
  prompt: `${REFERENCE_AGENT_PROMPT}...`,
});

Task({
  subagent_type: "general-purpose",
  description: "Analyze patterns.md",
  prompt: `${REFERENCE_AGENT_PROMPT}...`,
});

Task({
  subagent_type: "general-purpose",
  description: "Analyze api-reference.md",
  prompt: `${REFERENCE_AGENT_PROMPT}...`,
});
```

**Critical:** Send ALL Task calls in a SINGLE MESSAGE for true parallelism.

## Output Collection

After all agents return:

1. Collect context.json from Phase 2
2. Collect ref-{i}.json from each Phase 3 agent
3. Build cross-reference map
4. Generate synthesis

**See:** [synthesis-algorithm.md](synthesis-algorithm.md) for complete synthesis workflow
