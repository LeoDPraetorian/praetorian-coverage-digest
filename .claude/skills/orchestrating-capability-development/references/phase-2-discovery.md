# Phase 2: Discovery

Search existing capabilities for reusable patterns before creating new code.

## Overview

The Discovery phase executes AFTER Brainstorming (Phase 1) and BEFORE Architecture (Phase 3). It spawns the native `Explore` agent (very thorough mode) to search the codebase for existing capability patterns, preventing the #1 implementation failure: creating new capability code when reusable patterns exist.

**Why this phase exists:**

Security capabilities often share common patterns (VQL query structure, Nuclei matcher syntax, Janus pipeline configuration). Without discovery, developers create duplicate detection logic or miss proven approaches.

## Quick Reference

| Aspect         | Details                                           |
| -------------- | ------------------------------------------------- |
| **Execution**  | Sequential - single Explore agent                 |
| **Agent**      | Explore (native Claude Code agent)                |
| **Mode**       | **very thorough** (always)                        |
| **Input**      | design.md from Phase 1 (Brainstorming)            |
| **Output**     | discovery.md                                      |
| **Checkpoint** | NONE - feeds directly into Architecture           |
| **Objective**  | Find existing capabilities to reference or extend |

## Agent Spawning

```
Task(subagent_type: "Explore", description: "Capability reuse discovery")
```

**Prompt:**

```markdown
Perform a VERY THOROUGH reuse discovery analysis for existing ${capabilityType} capabilities.

CAPABILITY CONTEXT:
${capabilityDescription}
Capability Type: ${capabilityType}

SEARCH SCOPE (based on capability type):

- VQL: modules/chariot-aegis-capabilities/vql/
- Nuclei: modules/nuclei-templates/
- Janus: modules/janus-framework/, modules/janus/
- Fingerprintx: modules/fingerprintx/pkg/plugins/services/
- Scanner: modules/chariot/backend/pkg/scanner/

SEARCH OBJECTIVES:

1. Find ALL existing capabilities that implement similar detection logic
2. Find ALL shared utilities, helpers, or patterns used by similar capabilities
3. Find ALL common patterns (query structure, matcher syntax, pipeline patterns) we must follow
4. Identify similar capabilities that can be used as reference implementations

OUTPUT REQUIREMENTS - Structure your response as:

## Similar Capabilities

| Capability | Location | Similarity      | Can Reference? |
| ---------- | -------- | --------------- | -------------- |
| ...        | ...      | High/Medium/Low | Yes/No - why   |

## Reusable Patterns

| Pattern | Example Location | Can Extend? | Extension Point |
| ------- | ---------------- | ----------- | --------------- |
| ...     | ...              | Yes/No      | What to modify  |

## Shared Utilities

| Utility | Location | Usage Pattern |
| ------- | -------- | ------------- |
| ...     | ...      | How to use it |

## Patterns to Follow

| Pattern | Example Location | Must Follow? |
| ------- | ---------------- | ------------ |
| ...     | ...              | Yes/No       |

## Anti-Pattern Warnings

List any existing capabilities that do something similar that we MUST NOT duplicate.

## Summary

- **Reuse Percentage:** X%
- **Similar Capabilities Found:** N
- **Patterns to Extend:** M

CRITICAL: Do NOT just list what exists. For each finding, explicitly state whether it CAN BE REFERENCED or EXTENDED for this capability and HOW.

OUTPUT_FILE: ${OUTPUT_DIR}/discovery.md
```

**Path:** Based on capability type (see SEARCH SCOPE in prompt)

## Why "Very Thorough" Mode

The Explore agent supports three thoroughness levels: `quick`, `medium`, `very thorough`.

**Always use `very thorough` for Discovery because:**

1. **Context window efficiency** - Explore manages its own context, so thoroughness doesn't impact orchestrator
2. **Prevent false negatives** - Missing reusable patterns leads to duplication
3. **One-time cost** - Discovery runs once per capability; thoroughness pays dividends in implementation
4. **Architecture quality** - capability-lead makes better decisions with comprehensive discovery reports

## Discovery Report Format

```markdown
# Reuse Discovery Report

## Capability: [Capability Name]

## Type: [VQL | Nuclei | Janus | Fingerprintx | Scanner]

## Date: [ISO timestamp]

---

## Similar Capabilities

| Capability | Location | Similarity | Can Reference? |
| ---------- | -------- | ---------- | -------------- |

## Reusable Patterns

| Pattern | Example Location | Can Extend? | Extension Point |
| ------- | ---------------- | ----------- | --------------- |

## Shared Utilities

| Utility | Location | Usage Pattern |
| ------- | -------- | ------------- |

## Patterns to Follow

| Pattern | Example Location | Must Follow? |
| ------- | ---------------- | ------------ |

## Anti-Pattern Warnings

[Existing capabilities that do something similar - MUST NOT duplicate]

## Summary

- **Reuse Percentage:** X%
- **Similar Capabilities Found:** N
- **Patterns to Extend:** M
```

## Handoff to Phase 3 (Architecture)

Discovery output feeds into Architecture:

```json
{
  "status": "complete",
  "agent": "Explore",
  "capability_type": "vql|nuclei|janus|fingerprintx|scanner",
  "output_file": "discovery.md",
  "summary": {
    "reuse_percentage": 60,
    "similar_capabilities": 3,
    "patterns_to_extend": 2,
    "critical_patterns": ["vql-file-collection", "artifact-parser"]
  }
}
```

The `capability-lead` agent in Phase 3 consumes this report to create implementation plans that prioritize pattern reuse over new code.

## metadata.json Updates

After discovery completes, update phase status:

```json
{
  "phases": {
    "discovery": {
      "status": "complete",
      "completed_at": "2026-01-04T14:40:00Z",
      "output_file": "discovery.md"
    },
    "architecture": {
      "status": "in_progress"
    }
  },
  "current_phase": "architecture"
}
```

## Error Handling

### No Similar Capabilities Found

If exhaustive search finds no similar capabilities:

1. Verify search was truly thorough (all relevant directories searched)
2. Document "greenfield" justification
3. Proceed to Architecture with explicit "no reuse" rationale

### Conflicting Pattern Recommendations

If discovery finds multiple conflicting approaches:

1. Flag all approaches in discovery.md
2. Leads resolve during Phase 3 (Architecture)
3. Document resolution rationale in architecture.md

## Exit Criteria

Discovery phase is complete when:

- [ ] Explore agent completed (very thorough mode)
- [ ] discovery.md written to capability directory
- [ ] metadata.json updated with discovery status
- [ ] Report contains structured reuse tables
- [ ] Similar capabilities analyzed (or justification for greenfield)

## Related

- **discovering-reusable-code skill** - Reuse methodology (prompts now baked into Explore)
- **Native Explore agent** - Executes the analysis (very thorough mode)
- **Phase 3: Architecture** - Consumes discovery report
- **Capability Types** - Type-specific search patterns
