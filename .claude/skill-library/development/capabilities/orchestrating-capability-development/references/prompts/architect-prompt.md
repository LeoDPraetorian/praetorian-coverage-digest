# Architect Prompt Templates

**Phase 7 prompts for capability-lead and security-lead.**

---

## Capability Lead Prompt

```markdown
Task(
subagent_type: "capability-lead",
description: "Design capability architecture for {capability}",
prompt: "

## Task: Design Capability Architecture

### Capability Request

{User's capability description}

### Capability Type

{Detected type: VQL | Nuclei | Janus | Fingerprintx | Scanner}

### Codebase Context

{From Phase 3 discovery.md - relevant patterns, existing capabilities}

### MANDATORY SKILLS TO READ FIRST

You MUST read these skills before designing:

- adhering-to-dry
- adhering-to-yagni
- writing-plans
  {skills_by_domain.capability.library_skills from skill-manifest.yaml}

### Your Deliverables

1. **Architecture Design** (.capability-development/architecture-capability.md)
   - Capability structure
   - Detection approach
   - Data flow patterns
   - Output schema mapping (to Tabularium)

2. **Implementation Tasks** (to be merged into plan.md)
   - Specific, actionable tasks
   - File paths for each task
   - Dependencies between tasks
   - Estimated complexity

### Constraints (by Capability Type)

**VQL:**

- Follow Velociraptor artifact patterns
- Platform-specific handling (Windows/Linux/macOS)
- Output fields map to Tabularium schema

**Nuclei:**

- YAML template structure with id, info, requests
- Minimal request count
- Complete CVE metadata

**Janus:**

- Go implementation of janus.Tool interface
- Error propagation patterns
- Tool chain sequencing

**Fingerprintx:**

- Go plugin implementing Plugin interface
- Protocol-specific probe design
- Confidence scoring

**Scanner:**

- API client design patterns
- Rate limiting compliance
- Result normalization

### Output Format

{
'status': 'complete',
'architecture_file': '.capability-development/architecture-capability.md',
'tasks': [
{ 'id': 'T001', 'description': '...', 'file': '...', 'depends_on': [] }
],
'risks': [],
'skills_invoked': ['adhering-to-dry', ...]
}
"
)
```

---

## Security Lead Prompt (for capability security review)

```markdown
Task(
subagent_type: "security-lead",
description: "Security assessment for {capability}",
prompt: "

## Task: Security Assessment

### Capability Request

{User's capability description}

### Capability Type

{Detected type: VQL | Nuclei | Janus | Fingerprintx | Scanner}

### Architecture Proposal

{From capability-lead output}

### MANDATORY SKILLS TO READ FIRST

- adhering-to-dry
  {Security-specific skills from skill-manifest.yaml}

### Your Deliverables

1. **Security Assessment** (.capability-development/security-assessment.md)
   - Threat model for this capability
   - Attack vectors to consider
   - Required security controls
   - Safe execution patterns

2. **Security Requirements** (to be added to architecture)
   - Input validation requirements
   - Output sanitization needs
   - Resource limit requirements
   - Credential handling (for Scanner type)

### Focus Areas by Capability Type

**VQL:**

- Query injection risks
- Resource exhaustion
- Privilege requirements

**Nuclei:**

- Target validation
- Safe default configurations
- Response handling security

**Janus:**

- Tool chain integrity
- Input/output sanitization
- Timeout/resource limits

**Fingerprintx:**

- Protocol fuzzing risks
- Response parsing security
- Network exposure limits

**Scanner:**

- Credential storage/handling
- API key rotation
- Rate limit compliance

### Output Format

{
'status': 'complete',
'assessment_file': '.capability-development/security-assessment.md',
'requirements': [
{ 'category': 'input_validation', 'requirement': '...', 'priority': 'P0' }
],
'risks': [
{ 'risk': '...', 'mitigation': '...', 'severity': 'HIGH' }
],
'skills_invoked': [...]
}
"
)
```

---

## Combined Prompt Pattern

When spawning capability-lead and security-lead in parallel:

```markdown
# Spawn ALL in SINGLE message

Task("capability-lead", "Design capability architecture...", {capability_prompt})
Task("security-lead", "Security assessment...", {security_prompt})
```

**Wait for both to complete, then merge outputs into:**

- `.capability-development/architecture-plan.md` (combined architecture)
- `.capability-development/plan.md` (all tasks with dependencies)
- `.capability-development/security-assessment.md` (security requirements)

---

## Related References

- [Phase 7: Architecture Plan](../phase-7-architecture-plan.md) - Phase context
- [Agent Matrix](../agent-matrix.md) - Agent selection by capability type
- [Capability Types](../capability-types.md) - Type-specific patterns
