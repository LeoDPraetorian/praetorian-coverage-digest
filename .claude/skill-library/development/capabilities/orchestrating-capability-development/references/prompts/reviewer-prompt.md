# Reviewer Prompt Templates

**Phase 11 prompts for capability-reviewer and backend-reviewer.**

---

## Capability Reviewer - Stage 1 (Spec Compliance)

```markdown
Task(
subagent_type: "capability-reviewer",
description: "Spec compliance review for {capability}",
prompt: "

## Task: Verify Spec Compliance

### Stage: 1 of 2 (BLOCKING)

### Capability Type

{Detected type: VQL | Nuclei | Janus | Fingerprintx | Scanner}

### Plan Requirements

{From .capability-development/plan.md}

### Implementation Summary

{From .capability-development/agents/capability-developer.md}

### Files to Review

{List of created/modified capability files}

### YOUR ONLY FOCUS

Does implementation match plan exactly?

### Checklist

- [ ] All planned tasks implemented
- [ ] No extra features added
- [ ] Correct detection approach per spec
- [ ] File locations match plan
- [ ] Output schema matches Tabularium (if applicable)

### DO NOT Evaluate

- Code quality (that's Stage 2)
- Performance (that's Stage 2)
- Detection accuracy (that's Phase 13)

### Output Format

{
'verdict': 'SPEC_COMPLIANT | NOT_COMPLIANT',
'missing_requirements': [],
'extra_features': [],
'deviations': [
{ 'planned': '...', 'actual': '...', 'severity': 'HIGH' }
]
}
"
)
```

---

## Capability Reviewer - Stage 2 (Capability Quality)

```markdown
Task(
subagent_type: "capability-reviewer",
description: "Capability quality review for {capability}",
prompt: "

## Task: Capability Quality Review

### Stage: 2 of 2

### Prerequisite

Stage 1 PASSED (spec compliance confirmed)

### Capability Type

{Detected type: VQL | Nuclei | Janus | Fingerprintx | Scanner}

### MANDATORY SKILLS TO READ FIRST

- adhering-to-dry
  {skills_by_domain.capability.library_skills from skill-manifest.yaml}

### Files to Review

{List of capability files}

### Quality Checklist by Type

**VQL:**

- [ ] Query syntax is valid
- [ ] Artifact definition complete
- [ ] Platform handling correct
- [ ] Output fields properly mapped
- [ ] Parameters documented

**Nuclei:**

- [ ] YAML syntax valid
- [ ] Matchers are precise
- [ ] CVE metadata complete
- [ ] Request count minimal (<=3)
- [ ] Severity classification accurate

**Janus:**

- [ ] janus.Tool interface correctly implemented
- [ ] Error handling comprehensive
- [ ] Timeout handling present
- [ ] Input/output marshaling correct

**Fingerprintx:**

- [ ] Plugin interface implemented
- [ ] Probe design sound
- [ ] Confidence scoring calibrated
- [ ] Protocol handling correct

**Scanner:**

- [ ] API client patterns followed
- [ ] Rate limiting implemented
- [ ] Error handling for all codes
- [ ] Result normalization correct

### Output Format

{
'verdict': 'APPROVED | APPROVED_WITH_NOTES | CHANGES_REQUESTED',
'quality_score': {0-100},
'issues': [
{ 'file': '...', 'line': ..., 'issue': '...', 'severity': 'HIGH' }
],
'suggestions': []
}
"
)
```

---

## Backend Reviewer (for Go capabilities)

For Janus, Fingerprintx, and Scanner capabilities that use Go:

```markdown
Task(
subagent_type: "backend-reviewer",
description: "Go code quality review for {capability}",
prompt: "

## Task: Go Code Quality Review

### Stage: 2 of 2 (Parallel with Capability Review)

### Prerequisite

Stage 1 PASSED (spec compliance confirmed)

### MANDATORY SKILLS TO READ FIRST

- adhering-to-dry
  {skills_by_domain.backend.library_skills from skill-manifest.yaml}

### Files to Review

{List of .go files}

### Quality Checklist

- [ ] Go idioms followed
- [ ] Error handling (wrapping, proper context)
- [ ] Concurrency safety (if applicable)
- [ ] Interface design
- [ ] Code organization
- [ ] DRY principle followed
- [ ] Test coverage

### Output Format

{
'verdict': 'APPROVED | APPROVED_WITH_NOTES | CHANGES_REQUESTED',
'quality_score': {0-100},
'issues': [],
'suggestions': []
}
"
)
```

---

## Security Considerations Review

For capabilities that handle sensitive data or network operations:

```markdown
Task(
subagent_type: "capability-reviewer",
description: "Security review for {capability}",
prompt: "

## Task: Capability Security Review

### Capability Type

{Detected type: VQL | Nuclei | Janus | Fingerprintx | Scanner}

### Security Checklist by Type

**VQL:**

- [ ] No command injection via parameters
- [ ] Safe file system access
- [ ] Proper privilege requirements documented

**Nuclei:**

- [ ] No unsafe payload execution
- [ ] Safe default configurations
- [ ] Matchers don't expose sensitive data

**Janus:**

- [ ] Tool chain input sanitization
- [ ] Safe subprocess execution
- [ ] Resource limits enforced

**Fingerprintx:**

- [ ] Protocol probes don't cause harm
- [ ] Response parsing safe from injection
- [ ] Network exposure minimized

**Scanner:**

- [ ] Credentials handled securely
- [ ] API keys not logged
- [ ] Rate limits prevent abuse

### Output Format

{
'verdict': 'APPROVED | CHANGES_REQUESTED',
'security_issues': [
{ 'type': '...', 'file': '...', 'severity': 'HIGH', 'fix': '...' }
],
'recommendations': []
}
"
)
```

---

## Related References

- [Phase 11: Code Quality](../phase-11-code-quality.md) - Phase context
- [Agent Matrix](../agent-matrix.md) - Agent selection by capability type
- [Quality Standards](../quality-standards.md) - Quality thresholds
