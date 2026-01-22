# Developer Prompt Templates

**Phase 8 prompts for capability-developer.**

---

## Capability Developer Prompt (VQL)

```markdown
Task(
subagent_type: "capability-developer",
description: "Implement VQL capability for {capability}",
prompt: "

## Task: Implement VQL Capability

### Implementation Tasks

{Tasks from Phase 7 plan.md}

### Architecture Reference

{From .capability-development/architecture-plan.md}

### MANDATORY SKILLS TO READ FIRST

You MUST read these skills before coding:

- developing-with-tdd
- verifying-before-completion
- .claude/skill-library/development/capabilities/writing-vql-capabilities/SKILL.md
  {skills_by_domain.capability.library_skills from skill-manifest.yaml}

### Files to Modify/Create

{Specific file paths from plan}

### Constraints

- Follow Velociraptor artifact patterns
- VQL syntax must be valid
- Platform-specific handling as required
- Output fields map to Tabularium schema
- Write tests alongside implementation

### TDD Requirement

For each detection pattern:

1. Write test first with known samples (RED)
2. Implement detection logic (GREEN)
3. Refactor if needed (REFACTOR)

### Output Format

{
'status': 'complete',
'tasks_completed': ['T001', 'T002'],
'files_modified': ['chariot-aegis-capabilities/vql/...'],
'files_created': ['chariot-aegis-capabilities/vql/..._test.go'],
'tests_written': 5,
'detection_accuracy': 0.96,
'skills_invoked': ['developing-with-tdd', 'writing-vql-capabilities', ...]
}

### Verification Before Returning

Run and confirm:

- VQL syntax validation (passes)
- Detection tests (all pass)
- False positive tests (rate <=5%)

DO NOT claim completion without running verification commands.
"
)
```

---

## Capability Developer Prompt (Nuclei)

```markdown
Task(
subagent_type: "capability-developer",
description: "Implement Nuclei template for {capability}",
prompt: "

## Task: Implement Nuclei Template

### Implementation Tasks

{Tasks from Phase 7 plan.md}

### Architecture Reference

{From .capability-development/architecture-plan.md}

### MANDATORY SKILLS TO READ FIRST

You MUST read these skills before coding:

- developing-with-tdd
- verifying-before-completion
- .claude/skill-library/development/capabilities/writing-nuclei-templates/SKILL.md
  {skills_by_domain.capability.library_skills from skill-manifest.yaml}

### Files to Modify/Create

{Specific file paths from plan}

### Constraints

- YAML template with complete metadata
- Minimal request count (<=3)
- Complete CVE metadata (if applicable)
- Matchers must be precise
- Write tests alongside implementation

### TDD Requirement

For each detection:

1. Write test with known-vulnerable target (RED)
2. Implement template matchers (GREEN)
3. Add false positive tests (REFACTOR)

### Output Format

{
'status': 'complete',
'tasks_completed': ['T001', 'T002'],
'files_modified': ['nuclei-templates/...'],
'files_created': ['nuclei-templates/...'],
'tests_written': 3,
'detection_accuracy': 0.97,
'false_positive_rate': 0.01,
'skills_invoked': ['developing-with-tdd', 'writing-nuclei-templates', ...]
}

### Verification Before Returning

Run and confirm:

- nuclei -validate -t {template} (passes)
- Detection tests (all pass)
- False positive rate (<=2%)

DO NOT claim completion without running verification commands.
"
)
```

---

## Capability Developer Prompt (Fingerprintx)

```markdown
Task(
subagent_type: "capability-developer",
description: "Implement Fingerprintx module for {capability}",
prompt: "

## Task: Implement Fingerprintx Module

### Implementation Tasks

{Tasks from Phase 7 plan.md}

### Architecture Reference

{From .capability-development/architecture-plan.md}

### MANDATORY SKILLS TO READ FIRST

You MUST read these skills before coding:

- developing-with-tdd
- verifying-before-completion
- .claude/skill-library/development/capabilities/writing-fingerprintx-modules/SKILL.md
  {skills_by_domain.capability.library_skills from skill-manifest.yaml}

### Files to Modify/Create

{Specific file paths from plan}

### Constraints

- Go plugin implementing Plugin interface
- Protocol-specific probe implementation
- Confidence scoring calibrated
- Proper timeout handling
- Write tests alongside implementation

### TDD Requirement

For each service detection:

1. Write test with known service (RED)
2. Implement probe and response parsing (GREEN)
3. Calibrate confidence scoring (REFACTOR)

### Output Format

{
'status': 'complete',
'tasks_completed': ['T001', 'T002'],
'files_modified': ['fingerprintx/plugins/...'],
'files_created': ['fingerprintx/plugins/..._test.go'],
'tests_written': 8,
'detection_accuracy': 0.98,
'false_positive_rate': 0.005,
'skills_invoked': ['developing-with-tdd', 'writing-fingerprintx-modules', ...]
}

### Verification Before Returning

Run and confirm:

- go build ./... (passes)
- go test ./... (all pass)
- Detection accuracy (>=98%)
- False positive rate (<=1%)

DO NOT claim completion without running verification commands.
"
)
```

---

## Capability Developer Prompt (Janus)

```markdown
Task(
subagent_type: "capability-developer",
description: "Implement Janus tool chain for {capability}",
prompt: "

## Task: Implement Janus Tool Chain

### Implementation Tasks

{Tasks from Phase 7 plan.md}

### Architecture Reference

{From .capability-development/architecture-plan.md}

### MANDATORY SKILLS TO READ FIRST

You MUST read these skills before coding:

- developing-with-tdd
- verifying-before-completion
  {skills_by_domain.capability.library_skills from skill-manifest.yaml}

### Files to Modify/Create

{Specific file paths from plan}

### Constraints

- Go implementation of janus.Tool interface
- Proper error propagation
- Timeout handling
- Input/output marshaling
- Write tests alongside implementation

### TDD Requirement

For each tool in chain:

1. Write pipeline test (RED)
2. Implement tool interface (GREEN)
3. Add error handling tests (REFACTOR)

### Output Format

{
'status': 'complete',
'tasks_completed': ['T001', 'T002'],
'files_modified': ['modules/janus/...'],
'files_created': ['modules/janus/..._test.go'],
'tests_written': 10,
'pipeline_success_rate': 0.99,
'skills_invoked': ['developing-with-tdd', ...]
}

### Verification Before Returning

Run and confirm:

- go build ./... (passes)
- go test ./... (all pass)
- Pipeline success rate (>=98%)

DO NOT claim completion without running verification commands.
"
)
```

---

## Capability Developer Prompt (Scanner)

```markdown
Task(
subagent_type: "capability-developer",
description: "Implement Scanner integration for {capability}",
prompt: "

## Task: Implement Scanner Integration

### Implementation Tasks

{Tasks from Phase 7 plan.md}

### Architecture Reference

{From .capability-development/architecture-plan.md}

### MANDATORY SKILLS TO READ FIRST

You MUST read these skills before coding:

- developing-with-tdd
- verifying-before-completion
  {skills_by_domain.capability.library_skills from skill-manifest.yaml}

### Files to Modify/Create

{Specific file paths from plan}

### Constraints

- API client with proper authentication
- Rate limiting compliance
- Error handling for all response codes
- Result normalization to Tabularium
- Write tests alongside implementation

### TDD Requirement

For each endpoint:

1. Write integration test with mock (RED)
2. Implement client method (GREEN)
3. Add error handling tests (REFACTOR)

### Output Format

{
'status': 'complete',
'tasks_completed': ['T001', 'T002'],
'files_modified': ['pkg/scanner/...'],
'files_created': ['pkg/scanner/..._test.go'],
'tests_written': 12,
'api_integration': 1.0,
'skills_invoked': ['developing-with-tdd', ...]
}

### Verification Before Returning

Run and confirm:

- go build ./... (passes)
- go test ./... (all pass)
- API integration (100%)

DO NOT claim completion without running verification commands.
"
)
```

---

## Related References

- [Phase 8: Implementation](../phase-8-implementation.md) - Phase context
- [Agent Matrix](../agent-matrix.md) - Agent selection
- [Quality Standards](../quality-standards.md) - Verification thresholds
- [Capability Types](../capability-types.md) - Type-specific patterns
