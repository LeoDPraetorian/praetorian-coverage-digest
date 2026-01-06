# Phase 3: Architecture

Design implementation plan for the security capability with detection logic, data flow, and error handling.

## Purpose

Create a comprehensive architecture plan that:

- Documents detection logic and approach
- Defines data flow and transformations
- Specifies error handling and edge cases
- Provides implementation guidance for developers

## Quick Reference

| Aspect         | Details                                       |
| -------------- | --------------------------------------------- |
| **Agent**      | capability-lead                               |
| **Input**      | design.md, discovery.md from Phases 1-2       |
| **Output**     | architecture.md                               |
| **Checkpoint** | 🛑 HUMAN - must approve before implementation |

## Agent Spawning

```typescript
Task("capability-lead", {
  description: "Design capability architecture",
  prompt: `Create implementation plan for ${capabilityType} capability.

    INPUT_FILES:
    - ${OUTPUT_DIR}/design.md (capability requirements)
    - ${OUTPUT_DIR}/discovery.md (existing patterns)

    OUTPUT_DIRECTORY: ${OUTPUT_DIR}

    MANDATORY SKILLS (invoke ALL before completing):
    - persisting-agent-outputs: For writing output files
    - gateway-capabilities: For capability-specific patterns
    - gateway-backend: For Go/Python implementation patterns

    Create architecture.md with:
    1. Detection Logic - How capability identifies security issues
    2. Data Flow - Input → Processing → Output
    3. Error Handling - Edge cases and failure modes
    4. Implementation Plan - Step-by-step guidance for developer

    Use patterns from discovery.md where applicable.
    Reference capability-specific best practices.

    COMPLIANCE: Document invoked skills in output metadata.`,
  subagent_type: "capability-lead",
});
```

## Architecture Document Structure

The `capability-lead` agent must produce `architecture.md` with the following sections:

### 1. Overview

- Capability purpose and scope
- Capability type and runtime
- Key security objectives

### 2. Detection Logic

**Type-specific guidance:**

#### VQL Capabilities

- Artifact collection strategy
- Query structure and performance considerations
- Detection conditions and thresholds

#### Nuclei Templates

- HTTP request sequences
- Matcher conditions (status, regex, word)
- Extractor patterns for data capture

#### Janus Tool Chains

- Tool sequencing and dependencies
- Data passing between tools
- Aggregation strategy

#### Fingerprintx Modules

- Probe design and protocol handling
- Version marker extraction strategy
- CPE generation logic

#### Scanner Integrations

- API endpoints and authentication
- Result normalization rules
- Data mapping to Chariot model

### 3. Data Flow

```
[Input] → [Processing Steps] → [Output]

Example for VQL:
System Files → VQL Query → Artifact Collection → JSON Output → Risk Generation

Example for Nuclei:
Target URL → HTTP Request → Response Matching → Vulnerability Finding → Alert

Example for Janus:
Target IP → Port Scan → Service Fingerprint → Vulnerability Scan → Aggregated Report
```

### 4. Error Handling

Edge cases and failure modes:

- Timeouts and network failures
- Malformed responses
- Permission denied / access errors
- Empty or null results
- Rate limiting (for external APIs)

### 5. Quality Standards

Specify metrics based on capability type (see [Quality Standards](quality-standards.md)):

- Detection accuracy targets
- Acceptable false positive rates
- Performance thresholds
- Coverage requirements

### 6. Implementation Plan

Step-by-step guidance for `capability-developer`:

1. File structure and locations
2. Core logic implementation
3. Helper functions needed
4. Test data and fixtures
5. Integration points

### 7. Testing Strategy

Test cases to implement:

- Happy path scenarios
- Edge cases and error conditions
- Performance tests (if applicable)
- Multi-version tests (if applicable)

## Handoff Format

After architecture completes, update metadata with handoff:

```json
{
  "agent": "capability-lead",
  "phase": "architecture",
  "timestamp": "2026-01-04T14:45:00Z",
  "output_file": "architecture.md",
  "status": "complete",
  "handoff": {
    "next_phase": "implementation",
    "next_agent": "capability-developer",
    "context": "Architecture approved. Implement ${capabilityType} capability following plan in architecture.md. Key patterns: ${patterns}. Critical edge cases: ${edge_cases}."
  }
}
```

## Human Checkpoint (MANDATORY)

Use AskUserQuestion to present architecture for approval:

```
The capability-lead has designed the following architecture:

Capability Type: ${capabilityType}
Detection Approach: ${approach}

Key Components:
- ${component1}
- ${component2}

Critical Decisions:
- ${decision1}
- ${decision2}

Edge Cases Addressed:
- ${edge_case1}
- ${edge_case2}

Do you approve this architecture before proceeding to implementation?

Options:
- Yes, proceed to implementation
- No, revise the architecture (specify concerns)
- Pause - I need to review the full architecture.md file
```

**If user requests revision:**

1. Collect feedback on specific concerns
2. Re-invoke capability-lead with revision guidance
3. Present updated architecture for re-approval

**If user approves:**

1. Update metadata.json with human_approved: true
2. Mark architecture phase as complete
3. Proceed to Phase 4 (Implementation)

## metadata.json Updates

After human approval:

```json
{
  "phases": {
    "architecture": {
      "status": "complete",
      "human_approved": true,
      "output_file": "architecture.md",
      "completed_at": "2026-01-04T14:50:00Z",
      "agent_invoked": "capability-lead"
    },
    "implementation": {
      "status": "in_progress"
    }
  },
  "current_phase": "implementation"
}
```

## Exit Criteria

Architecture phase is complete when:

- [ ] capability-lead agent completed
- [ ] architecture.md written to capability directory
- [ ] Detection logic documented
- [ ] Data flow specified
- [ ] Error handling addressed
- [ ] Implementation plan provided
- [ ] **Human explicitly approved architecture**
- [ ] metadata.json updated with approval

## Common Issues

### "Architecture too vague for implementation"

**Solution**: Re-invoke capability-lead with specific guidance: "Provide more detail on ${specific_area}. Include code examples or pseudocode."

### "Discovery patterns conflict with architecture approach"

**Solution**: Leads must explicitly document why new approach is chosen over discovered patterns. Include rationale in architecture.md.

### "No error handling specified"

**Solution**: This is a BLOCKER. Architecture must address all edge cases from Phase 1 brainstorming. Re-invoke capability-lead.

## Related

- [Phase 2: Discovery](phase-2-discovery.md) - Previous phase (provides patterns)
- [Phase 4: Implementation](phase-4-implementation.md) - Next phase (executes plan)
- [Capability Types](capability-types.md) - Type-specific architecture guidance
- [Quality Standards](quality-standards.md) - Quality metrics to specify
- [Agent Handoffs](agent-handoffs.md) - Handoff format details
