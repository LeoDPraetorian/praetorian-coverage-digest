# Agent Matrix

**Agent selection guide for Brutus plugin development phases.**

---

## Phase-Agent Mapping

| Phase | Agent(s) | Execution | Purpose |
|-------|----------|-----------|---------|
| 7 | capability-lead, security-lead | PARALLEL | Design + security review |
| 8 | capability-developer | Sequential | Implementation |
| 11 | capability-reviewer, backend-security | PARALLEL | Code + security review |
| 12 | test-lead | Sequential | Test planning |
| 13 | capability-tester ×3 | PARALLEL | Test implementation |
| 15 | test-lead | Sequential | Quality review |

---

## Agent Responsibilities

### capability-lead
- Plugin architecture design
- Error classification strategy
- Dependencies selection

### security-lead
- Security assessment
- Credential handling review
- TLS/connection security

### capability-developer
- Plugin implementation
- Test file creation
- Documentation

### capability-reviewer
- Code quality review
- Pattern compliance
- Maintainability

### backend-security
- Security vulnerabilities
- Credential handling
- Error message safety

### test-lead
- Test strategy
- Coverage planning
- Quality assessment

### capability-tester
- Test implementation
- Coverage verification
- Integration tests

---

## Mandatory Skills per Agent

| Agent | Required Skills |
|-------|-----------------|
| capability-lead | adhering-to-dry, adhering-to-yagni |
| capability-developer | developing-with-tdd, verifying-before-completion |
| capability-reviewer | adhering-to-dry |
| capability-tester | developing-with-tdd |

---

## Related

- [Delegation Templates](delegation-templates.md) - Agent prompts
- [File Scope Boundaries](file-scope-boundaries.md) - Agent file access
