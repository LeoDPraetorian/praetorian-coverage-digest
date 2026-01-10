# Architect Subagent Prompt Template

Use this template when dispatching capability-lead subagent in Phase 3.

## Usage

```typescript
Task({
  subagent_type: "capability-lead",
  description: "Design architecture for [capability]",
  prompt: `[Use template below, filling in placeholders]`,
});
```

## Template

````markdown
You are designing the architecture for capability: [CAPABILITY_NAME]

## Capability Context

**Type**: [VQL | Nuclei | Janus | Fingerprintx | Scanner]

**Description**: [PASTE design.md summary from Phase 1]

**Detection Goals**: [What the capability needs to detect/scan]

## Discovery Findings

[PASTE relevant sections from discovery.md - similar capabilities and reusable patterns]

## Output Directory

OUTPUT_DIRECTORY: [CAPABILITY_DIR]

Write your output to: [CAPABILITY_DIR]/architecture.md

## MANDATORY SKILLS (invoke ALL before completing)

You MUST use these skills during this task:

1. **persisting-agent-outputs** - Use for output file format and metadata
2. **adhering-to-dry** - Leverage reusable patterns from discovery
3. **adhering-to-yagni** - Design only what's needed for detection goals

## Your Job

1. Analyze capability requirements and discovery findings
2. Design detection logic (queries, matchers, protocols, data flow)
3. Specify error handling and edge cases
4. Document implementation approach with code examples
5. Identify security and performance considerations

## Capability Architecture Decision Protocol

### Step 1: State the decision
"Decision: [detection approach / data source / output format]"

### Step 2: List constraints
- Detection accuracy requirement: [X]%
- False positive tolerance: [Y]%
- Performance requirement: [Z]
- Integration requirements: [list]

### Step 3: Enumerate options
**Option A**: [approach 1]
**Option B**: [approach 2]

### Step 4: Analyze against security criteria

**Option A**:
- Detection accuracy: ✓/✗ (estimated [X]% based on [evidence])
- False positive rate: ✓/✗ (estimated [Y]% because [reason])
- Evasion resistance: ✓/✗ ([can/cannot] be bypassed by [method])
- Performance: ✓/✗ ([X]ms per check)

**Option B**:
- [same structure]

### Step 5: Self-consistency check
"Arguing against my preference: [strongest counterargument]"
"This [does/doesn't] change my recommendation because: [reason]"

### Step 6: Recommend
"Recommendation: Option [X]
Security justification: [specific reasons]
Trade-offs accepted: [what we're giving up]
What would change this: [conditions]"

---

**Document for: detection logic, data sources, output format, error handling**

## Architecture Document Structure

Your architecture.md MUST include:

```markdown
# [Capability] Architecture

## Summary

[2-3 sentences describing the detection approach]

## Detection Logic

### Approach

[How this capability will detect the target (query structure, matchers, protocol)]

### Reused Patterns

[Which patterns from discovery.md we're leveraging]

### Novel Elements

[What's unique about this capability]

## Data Flow
```
````

[Diagram or description showing: Input → Processing → Output]

````

## Implementation Details

### Capability Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| [filename] | [VQL/Nuclei/Go/etc] | [What it does] |

### Code Structure (if applicable)

```[language]
// High-level code structure with comments
````

### Configuration

[Any configuration parameters needed]

## Error Handling

| Error Scenario     | Handling Strategy |
| ------------------ | ----------------- |
| Target unreachable | ...               |
| Malformed response | ...               |
| Timeout            | ...               |

## Edge Cases

1. **[Edge case]**: [How to handle]
2. **[Edge case]**: [How to handle]

## Quality Targets

- **Detection Accuracy**: [Target %]
- **False Positive Rate**: [Acceptable %]
- **Performance**: [Response time expectations]

## Security Considerations

[Authentication, authorization, data handling, secrets management]

## Testing Strategy

[How to validate detection accuracy, test with known positives/negatives]

````

## Output Format

Create structured JSON metadata at the end of architecture.md:

```json
{
  "agent": "capability-lead",
  "output_type": "architecture",
  "capability_type": "[type]",
  "skills_invoked": [
    "persisting-agent-outputs",
    "adhering-to-dry",
    "adhering-to-yagni"
  ],
  "status": "complete",
  "handoff": {
    "next_agent": "capability-developer",
    "context": "Architecture approved, ready for implementation"
  }
}
````

### If Blocked

If you cannot complete architecture:

```json
{
  "status": "blocked",
  "blocked_reason": "missing_requirements|technical_limitation|unclear_approach",
  "attempted": ["what you tried"],
  "handoff": {
    "next_agent": null,
    "context": "Detailed explanation of blocker"
  }
}
```

```

```
