# Capability Lead Prompt Template (Fingerprintx)

Use this template when spawning capability-lead agent in Phase 7.

## Usage

```typescript
Task({
  subagent_type: "capability-lead",
  description: "Design [protocol] fingerprintx plugin architecture",
  prompt: `[Use template below, filling in placeholders]`,
});
```

## Template

````markdown
You are designing the architecture for a fingerprintx plugin: [PROTOCOL_NAME]

## Protocol Context

**Service**: [PROTOCOL_NAME]
**Default Port(s)**: [PORTS]
**Source**: [Open-source URL or "closed-source"]

## Protocol Research (from Phase 3)

[PASTE protocol detection strategy from protocol-research.md]

## Version Matrix (from Phase 3, if applicable)

[PASTE version fingerprint matrix from version-matrix.md, or "N/A - closed-source"]

## Brainstorming Decision (from Phase 6)

**Selected Approach**: [Approach name]
**Rationale**: [Why this approach was selected]

## Output Directory

OUTPUT_DIRECTORY: [.fingerprintx-development]

Write architecture.md and plan.md to this directory.

## MANDATORY SKILLS (invoke ALL before completing)

You MUST use these skills during this task:

1. **writing-fingerprintx-modules** - Understand the 5-method interface requirement
2. **writing-plans** - Create detailed implementation plan
3. **enforcing-evidence-based-analysis** - Base decisions on discovered patterns
4. **persisting-agent-outputs** - Output file format and metadata

## Your Job

1. **Design Detection Strategy**
   - Define probe sequence for protocol identification
   - Specify banner/response parsing logic
   - Plan two-phase detection (detect then enrich)

2. **Design Version Extraction** (if open-source)
   - Map version matrix to decision tree
   - Specify marker detection points
   - Plan fallback for unrecognized versions

3. **Define File Structure**
   - Plugin location: `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go`
   - Test location: `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/{protocol}_test.go`
   - Type constant: `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go`
   - Import: `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go`

4. **Create Implementation Plan**
   - Break into discrete tasks
   - Identify dependencies between tasks
   - Estimate complexity per task

## Architecture Document Structure

```markdown
# Architecture: [Protocol] Fingerprintx Plugin

## Detection Strategy

### Probe Design

[Describe what bytes to send, when]

### Response Parsing

[Describe how to parse the response]

### Two-Phase Detection

- **Phase 1 (Detect)**: [Quick check for protocol presence]
- **Phase 2 (Enrich)**: [Extract version, metadata]

## Version Detection (if applicable)

### Decision Tree

[Describe version detection logic]

### Marker Table

| Version Range | Marker | Location |
| ------------- | ------ | -------- |
| ...           | ...    | ...      |

## Error Handling

- Connection failure: [behavior]
- Timeout: [behavior]
- Invalid response: [behavior]

## File Structure

- `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go`
- `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/{protocol}_test.go`
- Type constant in `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go`
- Import in `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go`
```

## Implementation Plan Structure

```markdown
# Implementation Plan: [Protocol] Fingerprintx Plugin

## Tasks

### Task 1: Plugin Skeleton

- **Files**: plugin.go
- **Description**: Create plugin struct with 5-method interface stubs
- **Dependencies**: None

### Task 2: Detection Logic

- **Files**: plugin.go
- **Description**: Implement Run() method with two-phase detection
- **Dependencies**: Task 1

### Task 3: Version Extraction

- **Files**: plugin.go
- **Description**: Implement version decision tree
- **Dependencies**: Task 2

### Task 4: Type Registration

- **Files**: types.go, plugins.go
- **Description**: Add type constant and import
- **Dependencies**: Task 1

### Task 5: Unit Tests

- **Files**: {protocol}\_test.go
- **Description**: Table-driven tests for detection and version
- **Dependencies**: Task 3

## Execution Order

1. Tasks 1, 4 (parallel - no file overlap)
2. Task 2
3. Task 3
4. Task 5
```

## Output Format

```json
{
  "agent": "capability-lead",
  "output_type": "architecture",
  "protocol": "[PROTOCOL_NAME]",
  "skills_invoked": [
    "writing-fingerprintx-modules",
    "writing-plans",
    "enforcing-evidence-based-analysis",
    "persisting-agent-outputs"
  ],
  "status": "complete",
  "files_created": [
    ".fingerprintx-development/architecture.md",
    ".fingerprintx-development/plan.md"
  ],
  "task_count": 5,
  "handoff": {
    "next_agent": "capability-developer",
    "context": "Architecture designed, plan created, ready for implementation"
  }
}
```

### If Blocked

If you cannot complete architecture:

```json
{
  "status": "blocked",
  "blocked_reason": "unclear_protocol|missing_research|complex_decision",
  "questions": ["specific questions needing answers"],
  "handoff": {
    "next_agent": null,
    "context": "Detailed explanation of blocker"
  }
}
```
````
