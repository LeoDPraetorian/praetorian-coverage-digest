# Blocked Status Handling

**When agents return blocked, use this routing table to determine next steps.**

## Routing Table

| Block Reason          | Route To              | Action                                       |
| --------------------- | --------------------- | -------------------------------------------- |
| architecture_decision | integration-lead      | Respawn architect with clarification context |
| missing_api_docs      | AskUserQuestion       | Request vendor API documentation from user   |
| credential_format     | AskUserQuestion       | Clarify credential structure with user       |
| security_concern      | backend-security      | Security review before proceeding            |
| p0_violation          | integration-developer | Fix violation, re-run P0 validation          |
| test_failures         | backend-tester        | Debug and fix failing tests                  |
| spec_mismatch         | integration-developer | Align implementation with architecture.md    |
| rate_limit_unknown    | AskUserQuestion       | Request rate limit info from user            |
| pagination_unclear    | integration-lead      | Clarify pagination strategy                  |
| tabularium_mapping    | integration-lead      | Clarify entity mapping to Chariot models     |
| out_of_scope          | AskUserQuestion       | Confirm scope expansion or defer             |

## Handling Protocol

1. **Identify block reason** from agent output metadata
2. **Look up routing** in table above
3. **Spawn routed agent** OR use AskUserQuestion
4. **Include context** from blocked agent in new prompt:
   - Original task
   - Block reason
   - Any partial work completed
   - Specific question or decision needed
5. **Resume workflow** once unblocked

## Example Block Handling

Agent returns:

```json
{
  "status": "blocked",
  "blocked_reason": "architecture_decision",
  "context": "Unclear whether to use cursor-based or offset pagination for vendor API",
  "partial_work": "implementation-log.md updated with progress"
}
```

Route to integration-lead:

```
Task: Clarify pagination strategy for {vendor} integration

The integration-developer is blocked on a pagination decision:
- Context: {context from blocked agent}
- Vendor API supports both cursor and offset pagination
- Need architectural decision on which to use

Review architecture.md and provide decision with rationale.
Update architecture.md if needed.
```

## Common Blocking Scenarios

### Scenario 1: Unclear Architecture

**Block Reason**: `architecture_decision`
**Solution**: Respawn integration-lead with specific question
**Prevention**: Ensure Phase 3 architecture covers edge cases

### Scenario 2: Missing Information

**Block Reason**: `missing_api_docs`, `credential_format`, `rate_limit_unknown`
**Solution**: Use AskUserQuestion to request from user
**Prevention**: Phase 1 brainstorming should gather this upfront

### Scenario 3: Security Concerns

**Block Reason**: `security_concern`
**Solution**: Spawn backend-security agent for review
**Prevention**: Phase 3 should flag potential security issues

### Scenario 4: P0 Violations

**Block Reason**: `p0_violation`
**Solution**: Return to integration-developer with violation details
**Prevention**: Phase 5 P0 validation catches these before review

### Scenario 5: Test Failures

**Block Reason**: `test_failures`
**Solution**: Respawn backend-tester with failure context
**Prevention**: Phase 6.1 test planning should anticipate failure modes

## Blocked vs. Needs Clarification

**Blocked** means agent cannot proceed without routing decision. Use routing table.

**Needs Clarification** means agent has questions but can otherwise continue. Use AskUserQuestion, then resume same agent.

## Related References

- [Agent Handoffs](agent-handoffs.md) - Structured handoff protocol with status field
- [Context Management](context-management.md) - Fresh agent spawning protocol
- [Error Recovery](error-recovery.md) - Recovery when agents fail vs. block
