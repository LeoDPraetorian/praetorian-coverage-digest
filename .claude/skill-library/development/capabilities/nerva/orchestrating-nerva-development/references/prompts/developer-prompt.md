# Capability Developer Prompt Template (Fingerprintx)

Use this template when spawning capability-developer agent in Phase 8.

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

## Architecture (from Phase 7)

[PASTE detection strategy and design decisions from architecture.md]

## Implementation Plan (from Phase 7)

[PASTE task breakdown from plan.md]

## Protocol Research (from Phase 3)

[PASTE detection patterns from protocol-research.md]

## Version Matrix (from Phase 3, if applicable)

[PASTE version fingerprint matrix from version-matrix.md, or "N/A - closed-source"]

## Output Directory

OUTPUT_DIRECTORY: .fingerprintx-development

Write implementation notes to agents/capability-developer.md

## STEP 0: Clarification (MANDATORY)

Before ANY implementation work, review the architecture and identify:

1. **Ambiguous requirements** - Anything that could be interpreted multiple ways
2. **Missing information** - Protocol details, edge cases not specified
3. **Assumptions you're making** - State them explicitly
4. **Scope questions** - What's in/out of scope

### If You Have Questions

Return immediately with:

```json
{
  "status": "needs_clarification",
  "questions": [
    {
      "category": "requirement|protocol|scope|assumption",
      "question": "Specific question",
      "options": ["Option A", "Option B"],
      "impact": "What happens if this is wrong"
    }
  ]
}
```

### If No Questions

State explicitly:

"I have reviewed the architecture and have no clarifying questions.
My understanding: [1-2 sentence summary of what I'll build]
Proceeding with implementation."

---

## MANDATORY SKILLS (invoke ALL before completing)

You MUST use these skills during this task:

1. **developing-with-tdd** - Write tests first, verify failure, implement
2. **Read(".claude/skill-library/development/capabilities/nerva/writing-nerva-tcp-udp-modules/SKILL.md")** - Core implementation patterns (5-method interface)
3. **verifying-before-completion** - Verify plugin works before claiming done

## Your Job

1. Create plugin directory: `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/[protocol]/`
2. Implement the 5-method plugin interface:
   - `Type() plugins.Protocol`
   - `Priority() int`
   - `Run(conn net.Conn, timeout time.Duration, target plugins.Target) (*plugins.Service, error)`
   - `PortPriority(port uint16) bool`
   - `Name() string`
3. Add type constant to `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go` (alphabetically)
4. Register plugin in `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go` (alphabetically)
5. Implement two-phase detection (detect then enrich)
6. Implement version extraction using version matrix (if available)
7. Implement CPE generation

## Implementation Checklist

- [ ] Plugin directory created
- [ ] Plugin struct with 5 methods implemented
- [ ] Type constant added (alphabetically ordered)
- [ ] Plugin import added (alphabetically ordered)
- [ ] Two-phase detection working
- [ ] Version extraction implemented (if applicable)
- [ ] CPE generation implemented (no TODOs)
- [ ] Package comment documents detection strategy
- [ ] `go build ./...` passes

## TDD Approach

1. Write test case first (expect FAIL)
2. Run test (verify RED - it fails)
3. Implement minimum code to pass
4. Run test (verify GREEN - it passes)
5. Refactor if needed
6. Repeat for each feature

## Output Format

```json
{
  "agent": "capability-developer",
  "output_type": "implementation",
  "protocol": "[PROTOCOL_NAME]",
  "skills_invoked": [
    "developing-with-tdd",
    "writing-nerva-tcp-udp-modules",
    "verifying-before-completion"
  ],
  "status": "complete",
  "files_created": [
    "{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/[protocol]/plugin.go",
    "{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/[protocol]/[protocol]_test.go"
  ],
  "files_modified": ["{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go", "{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go"],
  "build_status": "passing",
  "test_status": "passing",
  "handoff": {
    "next_agent": "orchestrator",
    "context": "Plugin implemented, ready for design verification"
  }
}
```

### If Blocked

If you cannot complete implementation:

```json
{
  "status": "blocked",
  "blocked_reason": "unclear_architecture|missing_research|technical_limitation",
  "attempted": ["what you tried"],
  "handoff": {
    "next_agent": null,
    "context": "Detailed explanation of blocker"
  }
}
```
````

## Prior Iteration Context (if applicable)

When re-spawning after feedback loop iteration, include:

```markdown
## Prior Iteration Context

READ FIRST: .fingerprintx-development/feedback-scratchpad.md

### From Iteration {N-1}:

**Compliance Issues to Address:**
[List from Phase 10]

**Review Issues to Address:**
[List from Phase 11]

**Test Failures to Fix:**
[List from Phase 13]

You MUST address these specific issues before proceeding.
```
