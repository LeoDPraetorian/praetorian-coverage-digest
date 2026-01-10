> **NOTE:** This prompt template is now used internally by the discovering-codebases-for-planning skill. Orchestrators should invoke that skill rather than spawning Explore agents directly.

# Explore Subagent Prompt Template

Use this template when dispatching Explore agents in Phase 2 (Discovery).

## Usage

Spawn frontend and backend exploration in parallel in a SINGLE message:

```typescript
// Both in ONE message for parallel execution
Task({
  subagent_type: "Explore",
  description: "Frontend pattern discovery for [feature]",
  prompt: `[Use template with DOMAIN=frontend]`,
});
Task({
  subagent_type: "Explore",
  description: "Backend pattern discovery for [feature]",
  prompt: `[Use template with DOMAIN=backend]`,
});
```

## Template

````markdown
You are exploring [DOMAIN] patterns for: [FEATURE_NAME]

## Exploration Mode

**THOROUGHNESS:** very thorough

This is Phase 2 Discovery. Your findings will inform architecture and implementation.
Be exhaustive in finding relevant patterns.

## Feature Context

[PASTE design.md from Phase 1 - what we're building]

## Output Directory

OUTPUT_DIRECTORY: [FEATURE_DIR]

Write your findings to: [FEATURE_DIR]/[DOMAIN]-discovery.md

## Your Job

Find EVERYTHING relevant to implementing this feature in the [DOMAIN] codebase:

### 1. Similar Features

- Existing features that solve similar problems
- How they're structured
- Patterns they use

### 2. Relevant Components/Services

- Components we could reuse
- Services we need to integrate with
- Utilities that would help

### 3. Coding Patterns

- How similar things are done in this codebase
- Naming conventions
- File organization patterns
- State management patterns (frontend)
- API patterns (backend)

### 4. Integration Points

- Where our feature connects to existing code
- APIs we'll call
- Events we'll emit/listen to

### 5. Testing Patterns

- How similar features are tested
- Test utilities available
- Mock patterns used

## Search Strategy

1. **Keyword search** - Search for terms related to the feature
2. **File pattern search** - Find files with similar names/purposes
3. **Import analysis** - What do similar features import?
4. **Test analysis** - How are similar features tested?

## Discovery Document Structure

```markdown
# [DOMAIN] Discovery: [Feature]

## Summary

[2-3 sentences on what you found]

## Similar Existing Features

### [Feature Name]

- **Location:** path/to/feature
- **Relevance:** Why it's similar
- **Patterns Used:** List of patterns
- **Reusable Parts:** What we can use

## Relevant Code

### Components/Services

| Name   | Path   | Purpose        | Reusable? |
| ------ | ------ | -------------- | --------- |
| [name] | [path] | [what it does] | Yes/No    |

### Utilities

| Name   | Path   | Purpose        |
| ------ | ------ | -------------- |
| [name] | [path] | [what it does] |

## Patterns Found

### [Pattern Name]

- **Example:** path/to/example
- **How it works:** Description
- **When to use:** Guidance

## Integration Points

| System   | How We Connect | Files Involved |
| -------- | -------------- | -------------- |
| [system] | [method]       | [files]        |

## Testing Patterns

### Unit Testing

- Framework: [vitest/jest/etc]
- Patterns: [describe/it, fixtures, etc]
- Example: path/to/example.test.ts

### Integration Testing

- Approach: [MSW/nock/etc]
- Example: path/to/example

## Recommendations

1. **Reuse:** [What to reuse from existing code]
2. **Follow:** [Patterns to follow]
3. **Avoid:** [Anti-patterns seen]
```
````

## Output Format

```json
{
  "agent": "Explore",
  "output_type": "discovery",
  "domain": "[frontend|backend]",
  "feature_directory": "[FEATURE_DIR]",
  "thoroughness": "very thorough",
  "status": "complete",
  "similar_features_found": 3,
  "reusable_components": 5,
  "patterns_documented": 4,
  "handoff": {
    "next_agent": "frontend-lead",
    "context": "Discovery complete, found [X] relevant patterns"
  }
}
```

## If Limited Findings

If you find very little relevant code:

1. Document what you searched for
2. Note that the feature is novel to this codebase
3. Recommend looking at external examples or patterns

This is still valuable - it tells architects they need to establish new patterns.

```

```
