# Troubleshooting

Common issues and solutions when orchestrating MCP wrapper development.

## Lost Context Mid-Workflow

**Symptom**: Session ended during implementation, need to resume MCP wrapper development.

**Solution**:

1. Read progress file:
   ```bash
   cat .claude/.output/mcp-wrappers/{mcp-service}/progress.json
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

| Blocked Reason            | Route To               | Action                          |
| ------------------------- | ---------------------- | ------------------------------- |
| `security_concern`        | security-lead          | Re-assess security requirements |
| `architecture_decision`   | tool-lead          | Clarify architecture            |
| `missing_requirements`    | AskUserQuestion        | Get user input                  |
| `test_failures`           | tool-tester        | Debug test issues               |
| `out_of_scope`            | AskUserQuestion        | Confirm scope                   |
| `schema_discovery_failed` | Retry with different approach | Check MCP auth, try manual      |

4. Update relevant artifact (architecture.md or shared-infrastructure.md)
5. Re-spawn same agent type with resolution context

**Example**:

```
Agent blocked: "Schema discovery returned empty for get-issue endpoint"

1. Categorize: schema_discovery_failed
2. Check attempted: ["Called list_tools", "Filtered for 'issue'", "Found empty"]
3. Resolution: Try different MCP endpoint, check authentication
4. Re-spawn schema-discovery with manual approach
```

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
3. Create issue context:

   ```
   Build failed with error:
   {error output}

   Fix the wrapper implementation to resolve this error.

   OUTPUT_DIRECTORY: .claude/.output/mcp-wrappers/{service}/
   ```

4. Re-spawn tool-developer with error context

---

## Tests Failing RED Gate Unexpectedly

**Symptom**: Phase 5 RED gate tests pass (incorrect baseline) or tests fail for wrong reasons.

**Solution**:

1. Verify test file naming convention:
   ```
   .claude/tools/{service}/{tool}.test.ts  ✓
   .claude/tools/{service}/{tool}.spec.ts  ✗
   ```
2. Check mock setup in test file:

   ```typescript
   // ✓ Correct: Mock MCP before importing wrapper
   vi.mock("@/lib/mcp-client");

   // ✗ Wrong: Mock after import
   import { getTool } from "./tool";
   vi.mock("@/lib/mcp-client");
   ```

3. Verify RED gate failure reasons:

   ```
   ✓ Correct RED failure:
   ReferenceError: getIssue is not defined

   ✗ Wrong RED failure:
   TypeError: Cannot read property 'callTool' of undefined
   // Mock not configured correctly
   ```

4. Re-spawn tool-tester with mock setup guidance if needed

---

## Coverage Below 80% at GREEN Gate

**Symptom**: `verification.coverage_percent < 80` in handoff metadata.

**Solution**:

1. Generate coverage report:
   ```bash
   npm test -- --coverage .claude/tools/{service}/{tool}.test.ts
   ```
2. Identify uncovered lines/branches:
   ```bash
   # Check coverage details
   cat coverage/lcov-report/{tool}.ts.html
   ```
3. Common uncovered areas:
   - Error handling branches
   - Edge case validation
   - Response sanitization paths
   - Security checks
4. Re-spawn tool-tester:

   ```
   Current coverage: {percent}%
   Target: 80%

   Uncovered lines:
   {file path}:{line numbers}

   Add tests for uncovered branches, focusing on:
   - Error handling
   - Edge cases
   - Security validation

   OUTPUT_DIRECTORY: .claude/.output/mcp-wrappers/{service}/
   ```

---

## Audit Failing Phases

**Symptom**: Phase 9 audit detects compliance violations.

**Solution**:

1. Read audit output file:
   ```bash
   cat .claude/.output/mcp-wrappers/{service}/audit-report.md
   ```
2. Identify failing audit phase(s):
   - Phase 0: Tool discovery
   - Phase 1: Naming conventions
   - Phase 2: Schema discovery
   - Phase 3: Architecture compliance
   - Phase 4: Testing infrastructure
   - Phase 5: RED gate
   - Phase 6: Implementation
   - Phase 7: Code review
   - Phase 8: GREEN gate
   - Phase 9: Audit
3. Fix specific phase violations:

   | Audit Phase | Common Violations                     | Fix Action                    |
   | ----------- | ------------------------------------- | ----------------------------- |
   | Phase 1     | Tool name doesn't match filename      | Rename file                   |
   | Phase 2     | Schema discovery incomplete           | Re-run discovery              |
   | Phase 3     | Architecture.md missing decisions     | Update architecture.md        |
   | Phase 6     | Token count exceeds budget            | Optimize response filtering   |
   | Phase 7     | Spec compliance review not documented | Re-run review with metadata   |
   | Phase 8     | Coverage below 80%                    | Add tests                     |
   | Phase 9     | Missing metadata.json                 | Re-run agent with persistence |

4. Use fixing-skills for automated fixes:
   ```bash
   skill: "fixing-skills"
   args: "mcp-wrapper --phase {phase_number}"
   ```

---

## Schema Discovery Returns Empty

**Symptom**: MCP list_tools call returns empty array or doesn't include expected tools.

**Solution**:

1. **Try different MCP endpoint/method**:
   ```typescript
   // Try alternative discovery methods
   const tools = await mcp.callTool("list_tools"); // Standard
   const tools = await mcp.request("tools/list"); // Alternative
   const tools = await mcp.getTools(); // Client method
   ```
2. **Check authentication**:
   ```bash
   # Verify MCP server credentials
   cat .env | grep {SERVICE}_
   # Ensure API key/token is valid
   ```
3. **Manual schema documentation**:
   If automated discovery fails, fall back to manual schema from documentation:
   ```markdown
   ## Manual Schema Discovery

   Source: {MCP service documentation URL}

   Tools identified:
   - get-issue: Get issue by ID
   - list-issues: List issues with filtering
   ...
   ```
4. **Check MCP server status**:
   ```bash
   # Test MCP server directly
   curl {MCP_SERVER_URL}/health
   ```

---

## MCP Rate Limited During Discovery

**Symptom**: Schema discovery fails with 429 rate limit errors.

**Solution**:

1. **Implement exponential backoff**:

   ```typescript
   async function discoverWithBackoff(mcp: MCPClient, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await mcp.callTool("list_tools");
       } catch (error) {
         if (error.status === 429) {
           const delay = Math.pow(2, i) * 1000; // Exponential: 1s, 2s, 4s
           await new Promise((resolve) => setTimeout(resolve, delay));
         } else {
           throw error;
         }
       }
     }
   }
   ```

2. **Reduce parallel calls**:
   ```typescript
   // ✗ Wrong: Discover all tools at once
   await Promise.all(tools.map((t) => discoverSchema(t)));

   // ✓ Right: Sequential with delay
   for (const tool of tools) {
     await discoverSchema(tool);
     await sleep(500); // 500ms delay between tools
   }
   ```
3. **Cache discovery results**:
   Write schema-discovery.md once, reuse for entire workflow

---

## Batch Partially Complete

**Symptom**: Batch implementation stopped mid-way, some tools complete, others not started.

**Solution**:

1. Read progress.json batch state:
   ```typescript
   const progress = JSON.parse(
     fs.readFileSync(".claude/.output/mcp-wrappers/{service}/progress.json", "utf-8")
   );
   const batch = progress.phases.implementation;
   console.log(`Batch ${batch.current_batch} of ${batch.total_batches}`);
   console.log(`Completed: ${batch.tools_completed.join(", ")}`);
   console.log(`In progress: ${batch.tools_in_progress.join(", ")}`);
   console.log(`Remaining: ${batch.tools_remaining.join(", ")}`);
   ```
2. Resume from `tools_in_progress` or `tools_remaining`:

   ```
   Resuming batch {N} implementation.

   Already completed in this batch:
   {tools_completed list}

   Now implementing:
   {first tool from tools_remaining}

   Shared context:
   {load from architecture.md and shared-infrastructure.md}

   OUTPUT_DIRECTORY: .claude/.output/mcp-wrappers/{service}/
   ```

3. Load per-tool metadata if available:
   ```typescript
   const toolMetadata = JSON.parse(
     fs.readFileSync(`.claude/.output/mcp-wrappers/{service}/metadata/{tool}.json`, "utf-8")
   );
   ```

---

## Agent Ignores Architecture Decisions

**Symptom**: Implementation doesn't follow architecture.md patterns.

**Solution**:

1. Make architecture context more prominent in prompt:

   ```
   CRITICAL ARCHITECTURE CONSTRAINTS:
   You MUST follow these decisions. Deviation = IMPLEMENTATION REJECTED.

   1. {decision 1}
   2. {decision 2}
   3. {decision 3}

   VERIFICATION REQUIRED:
   - [ ] Uses Result type for error handling (not try/catch)
   - [ ] Uses sanitizeResponse() from response-utils.ts
   - [ ] Token count under 2000 (verify with token counter)

   Any deviation requires user approval via AskUserQuestion.
   ```

2. Add explicit verification checklist in prompt
3. Re-spawn developer with emphasized constraints
4. Review output against architecture before accepting

---

## Two-Stage Code Review Failing

**Symptom**: Phase 7 code review repeatedly fails, exceeds MAX_RETRIES.

**Solution**:

1. **Stage 1 (Spec Compliance) failing**:

   - Read review feedback from `.claude/.output/mcp-wrappers/{service}/review-stage1-{tool}.md`
   - Common issues:
     - Missing required fields from spec
     - Incorrect response structure
     - Missing error handling for spec errors
   - Fix: Re-spawn developer with specific spec requirements emphasized

2. **Stage 2 (Quality/Security) failing**:

   - Read review feedback from `.claude/.output/mcp-wrappers/{service}/review-stage2-{tool}.md`
   - Common issues:
     - Security vulnerabilities (XSS, injection)
     - Code quality (complexity, duplication)
     - Missing edge case handling
   - Fix: Re-spawn developer with quality/security checklist

3. **After MAX_RETRIES exceeded**:

   - Use AskUserQuestion to escalate:
     ```
     Code review failed after {MAX_RETRIES} retries for {tool} wrapper.

     Issues:
     {list of persistent issues}

     Options:
     - Accept with known issues (document in tech debt)
     - Manual fix (you implement corrections)
     - Adjust architecture (if requirements were unrealistic)
     - Skip this tool (defer to future iteration)
     ```

---

## Token Budget Exceeded

**Symptom**: Wrapper implementation exceeds 2000 token budget per wrapper or 10000 per service.

**Solution**:

1. **Measure actual tokens**:

   ```bash
   # Use token counter utility
   npm run count-tokens .claude/tools/{service}/{tool}.ts
   ```

2. **Optimization strategies**:

   - **Response filtering**: Only include necessary fields
     ```typescript
     // Before: 2500 tokens
     return sanitizeResponse(response);

     // After: 1200 tokens
     return sanitizeResponse(response, {
       include: ["id", "title", "status", "assignee"],
     });
     ```
   - **Schema simplification**: Remove verbose descriptions
   - **Field aliasing**: Rename long field names
     ```typescript
     // Before: 200 tokens
     veryLongDescriptiveFieldName: string;

     // After: 50 tokens
     desc: string; // Maps to veryLongDescriptiveFieldName
     ```

3. **Re-architect if needed**:
   If optimization can't meet budget, update architecture.md with revised strategy

---

## Large Service (15-30+ Tools) Timeout

**Symptom**: Session times out before completing all tools in large MCP service.

**Solution**:

1. **Invoke persisting-progress-across-sessions skill**:
   ```
   skill: "persisting-progress-across-sessions"
   ```
2. **Adjust batch size**:

   ```typescript
   // For 20+ tools
   const batchSize = 3; // Instead of 5

   // For 30+ tools
   const batchSize = 2; // Smaller batches, more checkpoints
   ```

3. **Add checkpoints every 5 tools**:

   ```
   ## Progress Checkpoint (Tools 5/28)

   Completed:
   {list tools}

   Status: On track

   Continue? [Yes / Pause]
   ```

4. **Save progress more frequently**:
   After each tool instead of each batch

See [Large Service Handling](large-service-handling.md) for comprehensive guidance.

---

## Related References

- [Progress Persistence](progress-persistence.md) - Resume workflow
- [Agent Handoffs](agent-handoffs.md) - Handling blocked status and routing
- [Context Management](context-management.md) - Fresh agent context
- [Large Service Handling](large-service-handling.md) - Services with 15-30+ tools
- [Checkpoint Configuration](checkpoint-configuration.md) - When to checkpoint
