# Phase 2: Discovery

**Three-stage feature-context-aware discovery using discovering-codebases-for-planning skill.**

## Overview

Discovery executes AFTER Brainstorming (Phase 1) and BEFORE Planning (Phase 3). Instead of fixed agent dispatch, it invokes the discovering-codebases-for-planning skill which:
1. Scopes to feature-relevant components only
2. Spawns dynamic number of Explore agents (1-10)
3. Synthesizes into unified discovery artifacts

## Quick Reference

| Aspect | Details |
|--------|---------|
| Execution | THREE-STAGE (Scoping → Parallel Discovery → Synthesis) |
| Skill | discovering-codebases-for-planning |
| Agent Count | Dynamic (1-10 based on scoping) |
| Mode | very thorough (always) |
| Input | design.md from Phase 1 |
| Output | discovery.md, file-placement.md, discovery-summary.json |
| Checkpoint | NONE - feeds directly into Planning and Architecture |

## Skill Invocation

Read('.claude/skill-library/planning/discovering-codebases-for-planning/SKILL.md')

Provide to skill:
- Feature context: Summary from design.md
- Scope paths: ['modules/chariot/ui', 'modules/chariot/backend'] (or relevant paths)
- Output directory: {feature_dir}

## Stage Breakdown

### Stage 1: Scoping (orchestrator assists)

The skill parses design.md to understand WHAT we're building, then identifies WHICH components are relevant.

Output: scoping-report.json with:
- relevant_components: paths + file counts
- strategy: agent count recommendation

### Stage 2: Parallel Deep Discovery (skill handles)

The skill spawns N Explore agents (one per relevant component) in a SINGLE Task message.
All agents use 'very thorough' mode with DRY/reuse-focused prompts.

Output: discovery-{component}.md per agent

### Stage 3: Synthesis + Verification (skill handles)

The skill merges all discovery reports, deduplicates, verifies completeness.

Output:
- discovery.md (unified, structured)
- file-placement.md (where new code goes)
- discovery-summary.json (machine-readable handoff)

## Handoff to Phase 3 (Planning)

writing-plans skill receives:
- discovery.md - Reusable patterns with tables
- file-placement.md - Where to create new files
- discovery-summary.json - Machine-readable summary

## Handoff to Phase 4 (Architecture)

Lead agents receive:
- All discovery artifacts
- Can assess pattern quality (good vs tech debt)
- Update tech debt registry as needed

## metadata.json Updates

After discovery completes:
```json
{
  "phases": {
    "discovery": {
      "status": "complete",
      "skill_invoked": "discovering-codebases-for-planning",
      "components_analyzed": N,
      "agents_spawned": M,
      "completed_at": "ISO timestamp"
    }
  }
}
```

## Error Handling

- Scoping finds 0 relevant components: Return to Brainstorming - design.md may be incomplete
- Agent timeout: Skill marks component incomplete, proceeds with available reports
- No reusable code found: Skill documents 'greenfield' justification

## Exit Criteria

- [ ] discovering-codebases-for-planning skill completed all 3 stages
- [ ] scoping-report.json exists with strategy
- [ ] discovery.md exists with unified findings
- [ ] file-placement.md exists with recommendations
- [ ] discovery-summary.json exists for downstream consumers
- [ ] metadata.json updated with discovery status

## Why This Changed

Previous approach (fixed 2 Explore agents):
- No feature-context filtering (analyzed everything)
- Fixed parallelization regardless of codebase size
- Unstructured handoff (just markdown files)

New approach (discovering-codebases-for-planning):
- Only analyzes components RELEVANT to feature
- Dynamic agent count (1-10) based on actual scope
- Structured output (JSON + markdown) for planning
