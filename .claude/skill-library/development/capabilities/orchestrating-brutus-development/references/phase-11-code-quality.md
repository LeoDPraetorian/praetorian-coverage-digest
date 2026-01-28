# Phase 11: Code Quality

**Code review for maintainability and Brutus conventions.**

---

## Agents

Spawn in parallel:
- `capability-reviewer` - Code quality review
- `backend-security` - Security review

---

## Review Criteria

1. **Interface Compliance**
   - Correct Plugin interface implementation
   - Proper Result semantics

2. **Error Handling**
   - Complete error classification
   - Context cancellation honored
   - Resource cleanup

3. **Code Quality**
   - No hardcoded values
   - Clear naming
   - Appropriate comments

4. **Security**
   - No credential logging
   - Safe error messages
   - Proper TLS handling

---

## Verdict

- APPROVED → Proceed to Phase 12
- NEEDS_CHANGES → Return to Phase 8

---

## Related

- [Phase 10: Domain Compliance](phase-10-domain-compliance.md) - Previous phase
- [Phase 12: Test Planning](phase-12-test-planning.md) - Next phase
- [Delegation Templates](delegation-templates.md) - Reviewer prompts
