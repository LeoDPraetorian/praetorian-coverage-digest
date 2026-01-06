# Architect Subagent Prompt Template

Use this template when dispatching architect subagents in Phase 4.

## Usage

```typescript
Task({
  subagent_type: "frontend-lead", // or "backend-lead"
  description: "Design architecture for [feature]",
  prompt: `[Use template below, filling in placeholders]`,
});
```

## Template

````markdown
You are designing the architecture for: [FEATURE_NAME]

## Feature Context

[PASTE design.md summary from Phase 1]

## Discovery Findings

### Frontend Patterns

[PASTE relevant sections from frontend-discovery.md]

### Backend Patterns

[PASTE relevant sections from backend-discovery.md]

## Implementation Plan Summary

[PASTE plan.md task list from Phase 3]

## Output Directory

OUTPUT_DIRECTORY: [FEATURE_DIR]

Write your output to: [FEATURE_DIR]/architecture.md

## MANDATORY SKILLS (invoke ALL before completing)

You MUST use these skills during this task:

1. **persisting-agent-outputs** - Use for output file format and metadata
2. **adhering-to-dry** - Ensure architecture prevents duplication
3. **adhering-to-yagni** - Design only what's needed, no speculative features

## Your Job

1. Analyze the feature requirements and discovery findings
2. Propose 2-3 architectural approaches with trade-offs
3. Recommend one approach with clear justification
4. Document component structure, data flow, and integration points
5. Identify potential tech debt and security considerations

## Architecture Document Structure

Your architecture.md MUST include:

```markdown
# [Feature] Architecture

## Summary

[2-3 sentences describing the architectural approach]

## Approach Comparison

| Approach | Pros | Cons | Recommendation |
| -------- | ---- | ---- | -------------- |
| Option 1 | ...  | ...  |                |
| Option 2 | ...  | ...  | ✓ Recommended  |
| Option 3 | ...  | ...  |                |

## Recommended Architecture

### Component Structure

[Diagram or description of components]

### Data Flow

[How data moves through the system]

### Integration Points

[How this connects to existing code]

### File Changes

| File    | Change Type | Description     |
| ------- | ----------- | --------------- |
| src/... | Create      | New component   |
| src/... | Modify      | Add integration |

## Tech Debt Considerations

[Any shortcuts or future improvements needed]

## Security Considerations

[Authentication, authorization, input validation, etc.]
```
````

## Output Format

After completing your work, include this metadata block:

```json
{
  "agent": "frontend-lead",
  "output_type": "architecture",
  "feature_directory": "[FEATURE_DIR]",
  "skills_invoked": ["persisting-agent-outputs", "adhering-to-dry", "adhering-to-yagni"],
  "status": "complete",
  "files_created": ["architecture.md"],
  "handoff": {
    "next_agent": "frontend-developer",
    "context": "Architecture approved, ready for implementation"
  }
}
```

## If Blocked

If you cannot complete this task, return:

```json
{
  "agent": "frontend-lead",
  "status": "blocked",
  "blocked_reason": "architecture_decision|missing_requirements|security_concern",
  "attempted": ["What you tried before getting blocked"],
  "handoff": {
    "next_agent": null,
    "context": "Specific blocker details for orchestrator"
  }
}
```

```

```
