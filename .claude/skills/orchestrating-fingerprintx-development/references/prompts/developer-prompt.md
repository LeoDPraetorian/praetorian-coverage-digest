# Capability Developer Prompt Template (Fingerprintx)

Use this template when spawning capability-developer agent in Phase 5.

## Usage

```typescript
Task({
  subagent_type: "capability-developer",
  description: "Implement [protocol] fingerprintx plugin",
  prompt: `[Use template below, filling in placeholders]`,
});
```

## Template

````markdown
You are implementing a fingerprintx plugin for: [PROTOCOL_NAME]

## Protocol Context

**Service**: [PROTOCOL_NAME]
**Default Port(s)**: [PORTS]
**Source**: [Open-source URL or "closed-source"]

## Protocol Research (from Phase 3)

[PASTE protocol detection strategy from protocol-research.md]

## Version Matrix (from Phase 4, if applicable)

[PASTE version fingerprint matrix from version-matrix.md, or "N/A - closed-source"]

## Requirements (from Phase 1)

[PASTE key requirements from requirements.md]

## Output Directory

OUTPUT_DIRECTORY: [FEATURE_DIR]

Write implementation-log.md to this directory.

## MANDATORY SKILLS (invoke ALL before completing)

You MUST use these skills during this task:

1. **writing-fingerprintx-modules** - Core implementation patterns (5-method interface)
2. **developing-with-tdd** - Write tests first, verify failure, implement
3. **verifying-before-completion** - Verify plugin works before claiming done
4. **persisting-agent-outputs** - Output file format and metadata

## Your Job

1. Create plugin directory: `modules/fingerprintx/pkg/plugins/services/[protocol]/`
2. Implement the 5-method plugin interface:
   - `Type() plugins.Protocol`
   - `Priority() int`
   - `Run(conn net.Conn, timeout time.Duration, target plugins.Target) (*plugins.Service, error)`
   - `PortPriority(port uint16) bool`
   - `Name() string`
3. Add type constant to `pkg/plugins/types.go`
4. Register plugin in `pkg/scan/plugin_list.go`
5. Implement two-phase detection (detect then enrich)
6. Implement version extraction using version matrix (if available)
7. Implement CPE generation

## Implementation Checklist

- [ ] Plugin directory created
- [ ] Plugin struct with 5 methods implemented
- [ ] Type constants added (alphabetically ordered)
- [ ] Plugin registered (alphabetically ordered)
- [ ] Two-phase detection working
- [ ] Version extraction implemented
- [ ] CPE generation implemented
- [ ] Package comment documents detection strategy

## Output Format

Create implementation-log.md with structured JSON metadata:

```json
{
  "agent": "capability-developer",
  "output_type": "implementation",
  "protocol": "[PROTOCOL_NAME]",
  "skills_invoked": [
    "writing-fingerprintx-modules",
    "developing-with-tdd",
    "verifying-before-completion",
    "persisting-agent-outputs"
  ],
  "status": "complete",
  "files_created": ["modules/fingerprintx/pkg/plugins/services/[protocol]/[protocol].go"],
  "handoff": {
    "next_agent": "capability-tester",
    "context": "Plugin implemented, ready for testing"
  }
}
```
````

### If Blocked

If you cannot complete implementation:

```json
{
  "status": "blocked",
  "blocked_reason": "unclear_protocol|missing_research|technical_limitation",
  "attempted": ["what you tried"],
  "handoff": {
    "next_agent": null,
    "context": "Detailed explanation of blocker"
  }
}
```

```

```
