# Delegation Templates (Integration Development)

Pre-built prompt templates for delegating to specialized agents in integration workflows.

---

## Template Structure

Every delegation prompt should include:

```markdown
Task: [Clear objective - what to accomplish]

Context from prior phases:

- [Key decisions from architecture]
- [P0 compliance requirements]
- [Vendor API details]

Scope: [What to do] / [What NOT to do]

Expected output:

- [Specific deliverables]
- [File locations for artifacts]
- [Output format for results]
```

---

## Integration Lead Template

```markdown
Task: Design integration architecture for {vendor}

Requirements:

- Integration type: {asset_discovery | vuln_sync | bidirectional}
- API endpoints to support: {list}
- Authentication method: {api_key | oauth2 | bearer_token}

P0 Requirements (MANDATORY):

- VMFilter pattern for data filtering
- CheckAffiliation for multi-tenant isolation
- errgroup for concurrent API calls
- ValidateCredentials for auth validation

Constraints:

- Follow existing integration patterns from {reference_integration}
- Client in backend/pkg/integrations/{vendor}/client.go
- Collector in backend/pkg/integrations/{vendor}/collector/collector.go

Scope: Architecture decisions only. Do NOT implement code.

Expected output:

- Client interface design
- Collector flow diagram
- P0 compliance approach
- Return as structured architecture-plan.md
```

---

## Integration Developer Template

```markdown
Task: Implement {vendor} integration based on architecture

Context from architecture:

- Client design: {summary}
- Collector flow: {summary}
- P0 requirements: VMFilter, CheckAffiliation, errgroup

Location: backend/pkg/integrations/{vendor}/

Implementation requirements:

1. Create client.go following pattern from {reference_integration}
2. Create collector/collector.go with P0 compliance
3. Implement rate limiting in client
4. Add structured logging with request IDs

P0 MANDATORY CHECKLIST:

- [ ] VMFilter called before processing assets
- [ ] CheckAffiliation verified for each resource
- [ ] errgroup used for concurrent operations
- [ ] ValidateCredentials implemented and tested

Scope: Implementation + unit tests. Do NOT create acceptance tests.

Expected output:

- client.go at backend/pkg/integrations/{vendor}/
- collector.go at backend/pkg/integrations/{vendor}/collector/
- Unit tests with 80% coverage
- Return JSON with files created and P0 compliance status
```

---

## Integration Reviewer Template

```markdown
Task: Review {vendor} integration for P0 compliance

Files to review:

- backend/pkg/integrations/{vendor}/client.go
- backend/pkg/integrations/{vendor}/collector/collector.go
- backend/pkg/integrations/{vendor}/\*\_test.go

P0 COMPLIANCE CHECKLIST (ALL REQUIRED):

| Requirement         | Status    | Line Numbers |
| ------------------- | --------- | ------------ |
| VMFilter            | PASS/FAIL | Lines X-Y    |
| CheckAffiliation    | PASS/FAIL | Lines X-Y    |
| errgroup            | PASS/FAIL | Lines X-Y    |
| ValidateCredentials | PASS/FAIL | Lines X-Y    |
| Error handling      | PASS/FAIL | Throughout   |
| Rate limiting       | PASS/FAIL | Lines X-Y    |

Review focus:

1. P0 compliance (blocking)
2. Error handling patterns
3. Resource cleanup (defer statements)
4. Test coverage adequacy

Scope: Review only. Do NOT make code changes.

Expected output:

- Compliance report (PASS/FAIL per requirement)
- Specific line numbers for issues
- Recommendations if FAIL
- Return as p0-compliance-review.md
```

---

## Backend Tester Template

```markdown
Task: Write tests for {vendor} integration

Files to test:

- backend/pkg/integrations/{vendor}/client.go
- backend/pkg/integrations/{vendor}/collector/collector.go

Test Plan from Phase 12:
{Include test plan summary}

TEST MODE: {unit | integration | acceptance}

Requirements:

1. Follow test plan requirements
2. Use testify for assertions
3. Create mock server for API calls
4. Test P0 compliance methods explicitly:
   - VMFilter behavior
   - CheckAffiliation isolation
   - errgroup error handling
5. Achieve 80% coverage minimum

Scope: Tests only. Do NOT modify implementation.

Expected output:

- Test files at backend/pkg/integrations/{vendor}/\*\_test.go
- Coverage report
- Return JSON with test count and coverage %
```

---

## Context Awareness in Delegations

### Token Thresholds

Before spawning agents, check current token usage:

| Threshold         | Layer       | Action                     |
| ----------------- | ----------- | -------------------------- |
| <75% (150k)       | —           | Proceed normally           |
| 75-80% (150-160k) | Guidance    | SHOULD compact             |
| 80-85% (160-170k) | Guidance    | MUST compact NOW           |
| >85% (170k)       | Enforcement | Hook BLOCKS agent spawning |

**See:** [context-monitoring.md](context-monitoring.md) for token measurement scripts.

### Agent Prompt Context Size

Keep agent prompts focused:

| Agent Type            | Max Context | Include                                             | Exclude                           |
| --------------------- | ----------- | --------------------------------------------------- | --------------------------------- |
| integration-lead      | 2000 tokens | Requirements, P0 checklist, vendor API docs summary | Full discovery output             |
| integration-developer | 3000 tokens | Architecture summary, file paths, P0 requirements   | Other domain details              |
| integration-reviewer  | 2000 tokens | Plan, implementation files, P0 checklist            | Discovery, architecture rationale |
| backend-tester        | 2000 tokens | Test plan, file locations                           | Implementation logs               |

### Fresh Agent Principle

Each `Task()` spawns a NEW agent instance:

- No context pollution from previous agents
- Include ALL necessary context in the prompt
- Reference files instead of inlining content
- Never ask agent to "continue" previous work

---

## Related References

- [context-monitoring.md](context-monitoring.md) - Token measurement
- [compaction-gates.md](compaction-gates.md) - Compaction protocol
- [agent-matrix.md](agent-matrix.md) - Agent selection guide
