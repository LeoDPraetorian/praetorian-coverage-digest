# Explore Subagent Prompt Template

Use this template when dispatching Explore subagent in Phase 3.

## Usage

```typescript
Task({
  subagent_type: "Explore",
  description: "Discover reusable capability patterns",
  prompt: `[Use template below, filling in placeholders]`,
});
```

## Template

````markdown
You are performing discovery for capability: [CAPABILITY_NAME]

## Capability Context

**Type**: [VQL | Nuclei | Janus | Fingerprintx | Scanner]

**Description**: [PASTE design.md summary from Phase 1]

**Detection Goals**: [What the capability needs to detect/scan]

## Your Mission

Search the codebase for existing capabilities that:

1. Have similar detection goals
2. Target the same service/protocol/vulnerability class
3. Use reusable detection patterns

## Search Locations

Based on capability type:

- **VQL**: `modules/chariot-aegis-capabilities/`
- **Nuclei**: `modules/nuclei-templates/`
- **Janus**: `modules/janus/`, `modules/janus-framework/`
- **Fingerprintx**: `modules/fingerprintx/`
- **Scanner Integration**: `modules/chariot/backend/pkg/integrations/`

## Output Directory

OUTPUT_DIRECTORY: [CAPABILITY_DIR]

Write your output to: [CAPABILITY_DIR]/discovery.md

## MANDATORY SKILLS (invoke ALL before completing)

You MUST use these skills during this task:

1. **persisting-agent-outputs** - Use for output file format and metadata
2. **discovering-reusable-code** - Methodical reuse analysis (Rule of Three)

## Your Job

1. Search for capabilities with similar detection logic
2. Identify reusable patterns (query structure, matchers, protocols)
3. Find edge case handling we can learn from
4. Document what exists and what's novel about this capability

## Discovery Report Structure

Your discovery.md MUST include:

```markdown
# [Capability] Discovery Report

## Summary

[2-3 sentences: What exists, what's novel, reuse opportunities]

## Similar Capabilities

| Capability | Location | Similarity | Reusable Elements |
| ---------- | -------- | ---------- | ----------------- |
| ...        | ...      | ...        | ...               |

## Reusable Patterns

### Pattern 1: [Name]

**Source**: [File path]
**Description**: [What it does]
**Applicability**: [How we can reuse it]

### Pattern 2: [Name]

...

## Novel Requirements

[What's unique about this capability that we can't reuse]

## Recommendations

[Which patterns to reuse, which to adapt, what to build new]
```
````

## Output Format

Create structured JSON metadata at the end of discovery.md:

```json
{
  "agent": "Explore",
  "output_type": "discovery",
  "capability_type": "[type]",
  "skills_invoked": ["persisting-agent-outputs", "discovering-reusable-code"],
  "status": "complete",
  "reusable_patterns_found": 0,
  "handoff": {
    "next_agent": "capability-lead",
    "context": "Discovery complete with [N] reusable patterns identified"
  }
}
```

### If Blocked

If you cannot complete discovery:

```json
{
  "status": "blocked",
  "blocked_reason": "missing_context|unclear_requirements|technical_limitation",
  "attempted": ["what you tried"],
  "handoff": {
    "next_agent": null,
    "context": "Detailed explanation of blocker"
  }
}
```

```

```
