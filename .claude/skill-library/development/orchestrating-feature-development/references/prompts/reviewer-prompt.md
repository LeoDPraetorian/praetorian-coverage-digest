# Reviewer Prompt Templates

**Phase 11 prompts for reviewers and security agents.**

---

## Frontend Reviewer - Stage 1 (Spec Compliance)

```markdown
Task(
subagent_type: "frontend-reviewer",
description: "Spec compliance review for {feature}",
prompt: "

## Task: Verify Spec Compliance

### Stage: 1 of 2 (BLOCKING)

### Plan Requirements

{From .feature-development/plan.md - frontend tasks}

### Implementation Summary

{From .feature-development/implementation-summary.md}

### Files to Review

{List of modified/created files}

### YOUR ONLY FOCUS

Does code match plan exactly?

### Checklist

- [ ] All planned tasks implemented
- [ ] No extra features added
- [ ] Correct behavior per spec
- [ ] File locations match plan

### DO NOT Evaluate

- Code quality (that's Stage 2)
- Performance (that's Stage 2)
- Style preferences (that's Stage 2)

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

## Frontend Reviewer - Stage 2 (Code Quality)

```markdown
Task(
subagent_type: "frontend-reviewer",
description: "Code quality review for {feature}",
prompt: "

## Task: Code Quality Review

### Stage: 2 of 2 (Parallel with Security)

### Prerequisite

Stage 1 PASSED (spec compliance confirmed)

### MANDATORY SKILLS TO READ FIRST

- adhering-to-dry
  {skills_by_domain.frontend.library_skills from skill-manifest.yaml}

### Files to Review

{List of modified/created files}

### Quality Checklist

- [ ] React patterns (hooks, components)
- [ ] TypeScript type safety
- [ ] Performance (re-renders, memoization)
- [ ] Accessibility (keyboard, ARIA)
- [ ] Code organization
- [ ] DRY principle followed
- [ ] Test quality

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

## Frontend Security Review

```markdown
Task(
subagent_type: "frontend-security",
description: "Security review for {feature}",
prompt: "

## Task: Security Review

### Stage: 2 of 2 (Parallel with Quality)

### Prerequisite

Stage 1 PASSED (spec compliance confirmed)

### Files to Review

{List of modified/created files}

### Security Checklist

- [ ] XSS prevention (user input rendering)
- [ ] CSRF protection (form submissions)
- [ ] Sensitive data exposure (console, errors)
- [ ] Authentication checks
- [ ] Authorization checks
- [ ] Secure storage (no secrets in localStorage)
- [ ] Input validation (client-side)

### Focus Areas

- User input handling
- API calls and responses
- Error messages (no sensitive data)
- Third-party integrations

### Output Format

{
'verdict': 'APPROVED | CHANGES_REQUESTED',
'vulnerabilities': [
{ 'type': 'XSS', 'file': '...', 'line': ..., 'severity': 'HIGH', 'fix': '...' }
],
'recommendations': []
}
"
)
```

---

## Backend Reviewer - Stage 1 (Spec Compliance)

```markdown
Task(
subagent_type: "backend-reviewer",
description: "Spec compliance review for {feature}",
prompt: "

## Task: Verify Spec Compliance

### Stage: 1 of 2 (BLOCKING)

### Plan Requirements

{From .feature-development/plan.md - backend tasks}

### Implementation Summary

{From .feature-development/implementation-summary.md}

### Files to Review

{List of modified/created files}

### YOUR ONLY FOCUS

Does code match plan exactly?

### Checklist

- [ ] All planned tasks implemented
- [ ] Handler signatures match spec
- [ ] API contracts followed
- [ ] No extra endpoints added

### DO NOT Evaluate

- Code quality (that's Stage 2)
- Performance (that's Stage 2)
- Style preferences (that's Stage 2)

### Output Format

{
'verdict': 'SPEC_COMPLIANT | NOT_COMPLIANT',
'missing_requirements': [],
'extra_features': [],
'deviations': []
}
"
)
```

---

## Backend Reviewer - Stage 2 (Code Quality)

```markdown
Task(
subagent_type: "backend-reviewer",
description: "Code quality review for {feature}",
prompt: "

## Task: Code Quality Review

### Stage: 2 of 2 (Parallel with Security)

### Prerequisite

Stage 1 PASSED (spec compliance confirmed)

### MANDATORY SKILLS TO READ FIRST

- adhering-to-dry
  {skills_by_domain.backend.library_skills from skill-manifest.yaml}

### Files to Review

{List of modified/created files}

### Quality Checklist

- [ ] Go idioms followed
- [ ] Error handling (wrapping, logging)
- [ ] Concurrency safety
- [ ] API design
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

## Backend Security Review

```markdown
Task(
subagent_type: "backend-security",
description: "Security review for {feature}",
prompt: "

## Task: Security Review

### Stage: 2 of 2 (Parallel with Quality)

### Prerequisite

Stage 1 PASSED (spec compliance confirmed)

### Files to Review

{List of modified/created files}

### Security Checklist

- [ ] SQL injection prevention
- [ ] Command injection prevention
- [ ] Authentication enforcement
- [ ] Authorization checks
- [ ] Input validation (server-side)
- [ ] Error message leakage
- [ ] Sensitive data logging
- [ ] OWASP Top 10

### Output Format

{
'verdict': 'APPROVED | CHANGES_REQUESTED',
'vulnerabilities': [],
'recommendations': []
}
"
)
```

---

## Related References

- [Phase 11: Code Quality](../phase-11-code-quality.md) - Phase context
- [Agent Matrix](../agent-matrix.md) - Agent selection
