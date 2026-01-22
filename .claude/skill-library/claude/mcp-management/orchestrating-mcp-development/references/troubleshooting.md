# Troubleshooting

Common issues and solutions when orchestrating MCP wrapper development.

## Lost Context Mid-Workflow

**Symptom**: Session ended during implementation, need to resume MCP wrapper development.

**Solution**:

1. Read progress file:
   ```bash
   cat .claude/.output/mcp-wrappers/{mcp-service}/MANIFEST.yaml
   ```
2. Check `current_phase` and `current_batch` fields
3. Load artifacts (schema-discovery.md, architecture.md)
4. Check `tools_completed`, `tools_in_progress`, `tools_remaining`
5. Recreate TodoWrite todos based on phase and batch status
6. Continue from `current_phase` with current batch context

**Prevention**: Always save progress after each tool completion and batch completion.

---

## Agent Returned Blocked Status

**Symptom**: Agent returns `status: "blocked"` in metadata handoff.

**Solution**:

1. Read `blocked_reason` field for categorization
2. Read `attempted` array to see what agent tried
3. Route based on blocker type (see [Agent Handoffs](agent-handoffs.md) routing table):

| Blocked Reason            | Route To                      | Action                          |
| ------------------------- | ----------------------------- | ------------------------------- |
| `security_concern`        | security-lead                 | Re-assess security requirements |
| `architecture_decision`   | tool-lead                     | Clarify architecture            |
| `missing_requirements`    | AskUserQuestion               | Get user input                  |
| `test_failures`           | tool-tester                   | Debug test issues               |
| `out_of_scope`            | AskUserQuestion               | Confirm scope                   |
| `schema_discovery_failed` | Retry with different approach | Check MCP auth, try manual      |

4. Update relevant artifact (architecture.md or shared-infrastructure.md)
5. Re-spawn same agent type with resolution context

---

## Build Failing After Implementation

**Symptom**: `verification.build_success: false` in handoff metadata.

**Solution**:

1. Capture full build error:
   ```bash
   npm run build 2>&1 | tee build-error.log
   ```
2. Analyze error type:
   - TypeScript errors → Re-spawn developer with type fixes
   - Import errors → Check file paths, ensure wrapper exported
   - Dependency errors → Run `npm install`, check package.json
   - Zod schema errors → Re-spawn developer with schema validation fix
3. Create issue context and re-spawn tool-developer

**See**: [Troubleshooting Examples](troubleshooting-examples.md#build-failing) for detailed code examples

---

## Tests Failing Test Planning Unexpectedly

**Symptom**: Phase 7 RED gate tests pass (incorrect baseline) or tests fail for wrong reasons.

**Solution**:

1. Verify test file naming convention:
   ```
   .claude/tools/{service}/{tool}.test.ts  ✓
   .claude/tools/{service}/{tool}.spec.ts  ✗
   ```
2. Check mock setup ordering (must mock BEFORE importing wrapper)
3. Verify RED gate failure reasons (should be "not defined", not "mock error")
4. Re-spawn tool-tester with mock setup guidance if needed

**See**: [Troubleshooting Examples](troubleshooting-examples.md#red-gate-failures) for mock configuration examples

---

## Coverage Below 80% at Testing

**Symptom**: `verification.coverage_percent < 80` in handoff metadata.

**Solution**:

1. Generate coverage report:
   ```bash
   npm test -- --coverage .claude/tools/{service}/{tool}.test.ts
   ```
2. Identify uncovered lines/branches
3. Common uncovered areas: error handling, edge cases, response sanitization, security checks
4. Re-spawn tool-tester with coverage gap details

**See**: [Troubleshooting Examples](troubleshooting-examples.md#coverage-gaps) for test addition examples

---

## Audit Failing Phases

**Symptom**: Phase 11 audit detects compliance violations.

**Solution**:

1. Read audit output file:
   ```bash
   cat .claude/.output/mcp-wrappers/{service}/audit-report.md
   ```
2. Identify failing audit phase(s)
3. Fix specific phase violations:

   | Audit Phase | Common Violations                     | Fix Action                    |
   | ----------- | ------------------------------------- | ----------------------------- |
   | Phase 1     | Tool name doesn't match filename      | Rename file                   |
   | Phase 3     | Schema discovery incomplete           | Re-run discovery              |
   | Phase 5     | Architecture.md missing decisions     | Update architecture.md        |
   | Phase 8     | Token count exceeds budget            | Optimize response filtering   |
   | Phase 9     | Spec compliance review not documented | Re-run review with metadata   |
   | Phase 10    | Coverage below 80%                    | Add tests                     |
   | Phase 11    | Missing MANIFEST.yaml                 | Re-run agent with persistence |

4. Use fixing-skills for automated fixes if available

---

## Schema Discovery Returns Empty

**Symptom**: MCP list_tools call returns empty array or doesn't include expected tools.

**Solution**:

1. **Try different MCP endpoint/method**
2. **Check authentication** - Verify MCP server credentials
3. **Manual schema documentation** - Fall back to manual schema from documentation
4. **Check MCP server status**

**See**: [Troubleshooting Examples](troubleshooting-examples.md#schema-discovery-empty) for alternative discovery methods

---

## MCP Rate Limited During Discovery

**Symptom**: Schema discovery fails with 429 rate limit errors.

**Solution**:

1. **Implement exponential backoff**
2. **Reduce parallel calls** - Sequential discovery with delays
3. **Cache discovery results** - Write schema-discovery.md once, reuse

**See**: [Troubleshooting Examples](troubleshooting-examples.md#rate-limiting) for retry logic implementation

---

## Batch Partially Complete

**Symptom**: Batch implementation stopped mid-way, some tools complete, others not started.

**Solution**:

1. Read MANIFEST.yaml batch state
2. Resume from `tools_in_progress` or `tools_remaining`
3. Load per-tool metadata if available

**See**: [Troubleshooting Examples](troubleshooting-examples.md#partial-batch) for resume protocol

---

## Agent Ignores Architecture Decisions

**Symptom**: Implementation doesn't follow architecture.md patterns.

**Solution**:

1. Make architecture context more prominent in prompt
2. Add explicit verification checklist in prompt
3. Re-spawn developer with emphasized constraints
4. Review output against architecture before accepting

**See**: [Troubleshooting Examples](troubleshooting-examples.md#architecture-adherence) for prompt templates

---

## Two-Stage Code Review Failing

**Symptom**: Phase 9 code review repeatedly fails, exceeds MAX_RETRIES.

**Solution**:

1. **Stage 1 (Spec Compliance) failing**:
   - Read review feedback from `review-stage1-{tool}.md`
   - Common issues: missing spec fields, incorrect response structure, missing error handling
   - Fix: Re-spawn developer with specific spec requirements emphasized

2. **Stage 2 (Quality/Security) failing**:
   - Read review feedback from `review-stage2-{tool}.md`
   - Common issues: security vulnerabilities, code quality, missing edge cases
   - Fix: Re-spawn developer with quality/security checklist

3. **After MAX_RETRIES exceeded**:
   - Use AskUserQuestion to escalate with options

**See**: [Troubleshooting Examples](troubleshooting-examples.md#review-failures) for escalation templates

---

## Token Budget Exceeded

**Symptom**: Wrapper implementation exceeds 2000 token budget per wrapper or 10000 per service.

**Solution**:

1. **Measure actual tokens**: Use token counter utility
2. **Optimization strategies**:
   - Response filtering: Only include necessary fields
   - Schema simplification: Remove verbose descriptions
   - Field aliasing: Rename long field names
3. **Re-architect if needed**: Update architecture.md with revised strategy

**See**: [Troubleshooting Examples](troubleshooting-examples.md#token-optimization) for optimization code examples

---

## Large Service (15-30+ Tools) Timeout

**Symptom**: Session times out before completing all tools in large MCP service.

**Solution**:

1. **Invoke persisting-progress-across-sessions skill**
2. **Adjust batch size** - Smaller batches for 20+ tools
3. **Add checkpoints every 5 tools**
4. **Save progress more frequently** - After each tool instead of each batch

**See**: [Large Service Handling](large-service-handling.md) for comprehensive guidance

---

## Emergency Abort Protocol

For safe workflow termination mid-batch, follow orchestrating-multi-agent-workflows emergency abort.

**MCP-specific considerations:**

- Persist current batch progress to MANIFEST.yaml before abort
- Note which tools in current batch completed vs in-progress
- On resume, skip completed tools, restart in-progress tools from scratch

**Example Abort During Phase 8:**

```yaml
current_phase: 6
current_batch: 2
batch_size: 3
tools_in_current_batch:
  - name: update-issue
    status: completed
  - name: delete-issue
    status: in_progress # ← Abort happened here
  - name: find-issue
    status: pending

# On resume:
# - Skip update-issue (completed)
# - Restart delete-issue from scratch (was in_progress)
# - Process find-issue normally (was pending)
```

**Abort Procedure:**

1. Update MANIFEST.yaml with current status
2. Mark in-progress tools as "pending" (will restart from scratch)
3. Save all completed artifacts
4. Exit workflow cleanly
5. On resume: Load MANIFEST.yaml, continue from current_batch

---

## Related References

- [Troubleshooting Examples](troubleshooting-examples.md) - Detailed resolution examples with code
- [Progress Persistence](progress-persistence.md) - Resume workflow
- [Agent Handoffs](agent-handoffs.md) - Handling blocked status and routing
- [Context Management](context-management.md) - Fresh agent context
- [Large Service Handling](large-service-handling.md) - Services with 15-30+ tools
- [Checkpoint Configuration](checkpoint-configuration.md) - When to checkpoint
