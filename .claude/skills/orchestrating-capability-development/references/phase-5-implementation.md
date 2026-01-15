# Phase 5: Implementation

Execute the architecture plan to create capability artifacts.

## Purpose

Implement the security capability following the architecture plan with:

- VQL/Nuclei/Janus/Fingerprintx/Scanner code
- Detection logic and data processing
- Error handling for edge cases
- Initial unit tests

## Quick Reference

| Aspect         | Details                                    |
| -------------- | ------------------------------------------ |
| **Agent**      | capability-developer                       |
| **Input**      | architecture.md from Phase 4               |
| **Output**     | Capability code + implementation-log.md    |
| **Checkpoint** | NONE - automatic to Phase 6 (Completion) |
| **Mode**       | Batch (1-3 tasks) or Per-Task (4+ tasks)   |

## Step 1: Count Tasks in Architecture

Before dispatching any agents, count the implementation tasks in architecture.md:

```python
task_count = count_tasks(architecture.md)
```

## Step 2: Select Review Mode

Based on task count, select the appropriate mode:

| Task Count | Mode      | Workflow                                           |
| ---------- | --------- | -------------------------------------------------- |
| 1-3 tasks  | **Batch** | Implement all → Phase 6 → Phase 7 review         |
| 4+ tasks   | **Per-Task** | Implement each → Review each → Next task        |

```python
if task_count >= 4:
    mode = "per-task"
    # See phase-5-per-task-mode.md for workflow
else:
    mode = "batch"
    # Continue with standard workflow below
```

**For Per-Task mode (4+ tasks):** See [Phase 5: Per-Task Mode](phase-5-per-task-mode.md) for complete workflow.

**For Batch mode (1-3 tasks):** Continue with Agent Spawning below.

## Step 3: Agent Spawning (Batch Mode)

```typescript
Task("capability-developer", {
  description: "Implement capability code",
  prompt: `Implement ${capabilityType} capability following architecture plan.

    INPUT_FILES:
    - ${OUTPUT_DIR}/architecture.md (implementation plan)
    - ${OUTPUT_DIR}/discovery.md (reference patterns)

    OUTPUT_DIRECTORY: ${OUTPUT_DIR}

    MANDATORY SKILLS (invoke ALL before completing):
    - persisting-agent-outputs: For writing output files
    - gateway-capabilities: For capability-specific patterns
    - gateway-backend: For Go/Python implementation (if applicable)

    Create capability artifacts according to type:
    - VQL: .vql files with query logic
    - Nuclei: .yaml templates with matchers
    - Janus: Go code for tool chains
    - Fingerprintx: Go plugin with 5-method interface
    - Scanner: Go/Python client for API integration

    Follow architecture plan exactly.
    Implement error handling for all edge cases.
    Write implementation-log.md documenting changes.

    COMPLIANCE: Document invoked skills in output metadata.`,
  subagent_type: "capability-developer",
});
```

## Step 3.5: Handle Clarification Requests

**IF developer returns `status: "needs_clarification"`:**

The developer has questions that must be answered before proceeding.

### Workflow

1. **Review questions** in the `questions` array from developer output
2. **Answer each question:**
   - If you can answer from architecture.md or context → provide answer
   - If requires user input → use AskUserQuestion
3. **Re-dispatch developer** with answers:

```typescript
Task("capability-developer", {
  description: "Continue implementation with clarifications",
  prompt: `
    CLARIFICATION ANSWERS:
    Q1: ${question1} → A1: ${answer1}
    Q2: ${question2} → A2: ${answer2}

    Now proceed with implementation using these answers.

    [rest of original prompt from Step 3]
  `,
  subagent_type: "capability-developer",
});
```

### AskUserQuestion Template

```typescript
AskUserQuestion({
  questions: [{
    question: `Developer needs clarification: "${developerQuestion}"`,
    header: "Clarification",
    multiSelect: false,
    options: [
      {
        label: developerOptions[0],
        description: "Option from developer"
      },
      {
        label: developerOptions[1],
        description: "Option from developer"
      }
    ]
  }]
})
```

### DO NOT

- Let developer proceed with assumptions
- Skip clarification because "it seems obvious"
- Answer questions you're not certain about

---

## Implementation Requirements by Type

### VQL Capabilities

**Files to create:**

```
modules/chariot-aegis-capabilities/vql/
└── ${capability-name}.vql
```

**Implementation checklist:**

- [ ] LET statements for variables
- [ ] SELECT query with artifact collection
- [ ] WHERE clauses for filtering
- [ ] Output format (JSON artifacts)
- [ ] Performance considerations (LIMIT if large datasets)

### Nuclei Templates

**Files to create:**

```
modules/nuclei-templates/
└── ${category}/
    └── ${capability-name}.yaml
```

**Implementation checklist:**

- [ ] Template metadata (id, info, severity)
- [ ] HTTP requests sequence
- [ ] Matchers (status, regex, word)
- [ ] Extractors (if needed)
- [ ] CVE/CWE references (if applicable)

### Janus Tool Chains

**Files to create:**

```
modules/janus-framework/pkg/chains/
└── ${capability-name}.go

modules/janus/pkg/pipelines/
└── ${capability-name}_pipeline.go
```

**Implementation checklist:**

- [ ] Chain struct with tool dependencies
- [ ] Execute() method with tool sequencing
- [ ] Error handling and recovery
- [ ] Result aggregation logic
- [ ] Unit tests for chain logic

### Fingerprintx Modules

**Files to create:**

```
modules/fingerprintx/pkg/plugins/services/
└── ${service-name}/
    └── ${service-name}.go
```

**Implementation checklist:**

- [ ] Plugin struct with 5 methods (Type, Priority, Run, RunResponse, Detect)
- [ ] Type constant in pkg/plugins/types.go
- [ ] Plugin registration in pkg/scan/plugin_list.go
- [ ] Network protocol implementation
- [ ] Version extraction logic
- [ ] CPE generation

### Scanner Integrations

**Files to create:**

```
modules/chariot/backend/pkg/scanner/
└── ${scanner-name}/
    ├── client.go
    ├── models.go
    └── normalizer.go
```

**Implementation checklist:**

- [ ] HTTP client with authentication
- [ ] API request methods
- [ ] Response models (Go structs)
- [ ] Result normalization to Chariot data model
- [ ] Rate limiting and pagination
- [ ] Error handling (timeouts, auth failures)

## Implementation Log Format

The `capability-developer` agent must produce `implementation-log.md`:

```markdown
# Implementation Log - ${Capability Name}

## Date: ${ISO timestamp}

## Agent: capability-developer

---

## FILES CREATED

- path/to/file1.go (purpose)
- path/to/file2.yaml (purpose)

---

## ARCHITECTURE COMPLIANCE

- [x] Detection logic implemented as specified
- [x] Data flow follows architecture plan
- [x] Error handling for all edge cases
- [x] Performance considerations addressed

---

## DEVIATIONS FROM ARCHITECTURE

[If any deviations, document with rationale]

None / [Deviation description and justification]

---

## IMPLEMENTATION NOTES

### Key Decisions

- Decision 1: [rationale]
- Decision 2: [rationale]

### Challenges Encountered

- Challenge 1: [how resolved]
- Challenge 2: [how resolved]

### Testing Considerations

- Test case 1: [scenario]
- Test case 2: [scenario]

---

## NEXT STEPS

Ready for Phase 7 (Review) with capability-reviewer.
```

## Handoff Format

After implementation completes:

```json
{
  "agent": "capability-developer",
  "phase": "implementation",
  "timestamp": "2026-01-04T15:00:00Z",
  "output_file": "implementation-log.md",
  "status": "complete",
  "files_modified": ["modules/chariot-aegis-capabilities/vql/s3-bucket-exposure.vql"],
  "handoff": {
    "next_phase": "review",
    "next_agent": "capability-reviewer",
    "context": "Implemented ${capabilityType} capability. Key files: ${files}. Detection logic: ${logic}. Ready for review against architecture plan."
  }
}
```

## Blocked Status Handling

If `capability-developer` returns `status: "blocked"`:

1. **Check blocked_reason** in agent output
2. **Route based on blocker type** (see [Agent Handoffs](agent-handoffs.md)):
   - `architecture_decision` → Re-invoke capability-lead
   - `security_concern` → Invoke security-lead
   - `missing_requirements` → AskUserQuestion
   - `out_of_scope` → AskUserQuestion

3. **Resolve blocker** before proceeding to Phase 5

## metadata.json Updates

After implementation completes:

```json
{
  "phases": {
    "implementation": {
      "status": "complete",
      "output_file": "implementation-log.md",
      "completed_at": "2026-01-04T15:00:00Z",
      "agent_invoked": "capability-developer",
      "files_created": ["modules/chariot-aegis-capabilities/vql/s3-bucket-exposure.vql"]
    },
    "review": {
      "status": "in_progress",
      "retry_count": 0
    }
  },
  "current_phase": "review"
}
```

## Exit Criteria

Implementation phase is complete when:

- [ ] capability-developer agent completed
- [ ] Capability artifacts created in correct locations
- [ ] implementation-log.md written to capability directory
- [ ] Detection logic implemented
- [ ] Error handling for edge cases implemented
- [ ] Files follow type-specific structure
- [ ] metadata.json updated with implementation status

## Common Issues

### "Implementation doesn't match architecture plan"

**Solution**: This will be caught in Phase 7 (Review). Reviewer will flag deviations and request changes.

### "Agent created files in wrong location"

**Solution**: This is a BLOCKER. Verify agent received correct OUTPUT_DIRECTORY. Check agent output metadata for files_modified paths.

### "Missing error handling for edge cases"

**Solution**: This will be caught in Phase 7 (Review). Reviewer will flag missing error handling per architecture plan.

## Related

- [Phase 4: Architecture](phase-4-architecture.md) - Previous phase (provides plan)
- [Phase 5: Per-Task Mode](phase-5-per-task-mode.md) - Per-task review cycle (4+ tasks)
- [Phase 6: Implementation Completion](phase-6-implementation-review.md) - Verify all requirements implemented
- [Phase 7: Review](phase-7-review.md) - Next phase (validates implementation)
- [Capability Types](capability-types.md) - Type-specific implementation guidance
- [Agent Handoffs](agent-handoffs.md) - Handoff format and blocked status
- [Prompts: Developer](prompts/developer-prompt.md) - Developer prompt with clarification protocol
- [Troubleshooting](troubleshooting.md) - Common implementation issues
