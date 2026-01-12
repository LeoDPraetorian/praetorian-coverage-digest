---
name: orchestrating-mcp-development
description: Use when creating MCP wrappers with full quality gates - coordinates tool discovery, shared architecture design, batched TDD implementation, code review, and audit phases for 100% tool coverage across an MCP service
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion, Task, Skill
---

# Orchestrating MCP Development

**Multi-agent workflow orchestration for MCP wrapper creation with 100% tool coverage, shared architecture patterns, batched parallel execution, and quality gates.**

## When to Use This Skill

Use this skill when:

- Creating new MCP wrappers via /mcp-manager create {service}
- Need to wrap ALL tools in an MCP service (100% coverage)
- Want shared architecture patterns across all wrappers
- Require batched parallel execution for multiple tools
- Need TypeScript best practices enforcement

**This skill orchestrates MCP wrapper creation for ALL tools in a service with specialized agents for each phase.**

**You MUST use TodoWrite before starting to track all workflow steps.**

## Quick Reference

| Phase | Name                | Agents                          | Execution           | Checkpoint   |
| ----- | ------------------- | ------------------------------- | ------------------- | ------------ |
| 0     | Setup               | -                               | Sequential          | -            |
| 1     | MCP Setup           | setting-up-mcp-servers          | Sequential          | -            |
| 2     | Tool Discovery      | Claude                          | Sequential          | -            |
| 3     | Shared Architecture | mcp-tool-lead + security-lead   | PARALLEL            | 🛑 Human     |
| 4     | Per-Tool Work       | mcp-tool-lead + mcp-tool-tester | BATCHED (3-5 tools) | -            |
| 5     | RED Gate            | CLI                             | Sequential          | Gate         |
| 6     | Implementation      | mcp-tool-developer              | BATCHED (3-5 tools) | -            |
| 7     | Code Review         | mcp-tool-reviewer               | BATCHED (3-5 tools) | 1 retry/tool |
| 8     | GREEN Gate          | CLI                             | Sequential          | Gate         |
| 9     | Audit               | CLI                             | Sequential          | Gate         |
| 10    | Completion          | -                               | Sequential          | -            |

## Agent Matrix

| Phase | Agent(s)           | Mode     | Execution | Output                                         |
| ----- | ------------------ | -------- | --------- | ---------------------------------------------- |
| 3     | mcp-tool-lead      | shared   | PARALLEL  | architecture-shared.md                         |
| 3     | security-lead      | shared   | PARALLEL  | security-assessment.md                         |
| 4     | mcp-tool-lead      | per-tool | BATCHED   | tools/{tool}/architecture.md                   |
| 4     | mcp-tool-tester    | per-tool | BATCHED   | tools/{tool}/test-plan.md, {tool}.unit.test.ts |
| 6     | mcp-tool-developer | per-tool | BATCHED   | {tool}.ts                                      |
| 7     | mcp-tool-reviewer  | per-tool | BATCHED   | tools/{tool}/review.md                         |

## Batching Strategy

For MCPs with many tools, process in batches to prevent overwhelming agents:

**Batch Size:** 3-5 tools per batch

**Batching applies to:**

- Phase 4: Per-Tool Work (architecture + test planning + test implementation)
- Phase 6: Implementation
- Phase 7: Code Review

**Execution Pattern:**

```
Batch 1: [get-issue, list-issues, create-issue]
  └─ Spawn 3 agents in parallel
  └─ Wait for all to complete
  └─ Update metadata.json

Batch 2: [update-issue, delete-issue, find-issue]
  └─ Spawn 3 agents in parallel
  └─ Wait for all to complete
  └─ Update metadata.json

... continue until all tools processed
```

**Progress Tracking:** Update metadata.json after each batch completes.

## Shared Infrastructure

Agents MUST reference shared utilities from .claude/ for testing, response handling, input sanitization, and MCP client interactions.

**Complete infrastructure details:** See [references/shared-infrastructure.md](references/shared-infrastructure.md)

## Critical Rules

- **Parallel Execution:** Phase 3 (Shared Architecture) spawns agents in parallel
- **Batched Execution:** Phases 4, 6, 7 process tools in batches of 3-5
- **Human Checkpoint:** Shared architecture approval required after Phase 3
- **CLI Gates:** Phase 5 (RED must fail), Phase 8 (GREEN ≥80%), Phase 9 (Audit ≥10/11)
- **Feedback Loop:** Max 1 retry per tool on Phase 7 code review, then escalate
- **Structured Handoff:** Agents return JSON with status, verdict, and next steps

**Complete rules and formats:** See [references/critical-rules.md](references/critical-rules.md)

## Table of Contents

### References

#### P0 - Critical Infrastructure
- [Progress Persistence](references/progress-persistence.md)
- [Context Management](references/context-management.md)
- [Troubleshooting](references/troubleshooting.md)

#### P0 - Prompt Templates
- [MCP Tool Developer Prompt](references/prompts/mcp-tool-developer-prompt.md)
- [MCP Tool Tester Prompt](references/prompts/mcp-tool-tester-prompt.md)
- [MCP Tool Lead Prompt](references/prompts/mcp-tool-lead-prompt.md)
- [MCP Tool Reviewer Prompt](references/prompts/mcp-tool-reviewer-prompt.md)
- [Security Lead Prompt](references/prompts/security-lead-prompt.md)

#### P1 - Process Enhancement
- [Rationalization Table](references/rationalization-table.md)
- [Phase 7: Code Review](references/phase-7-code-review.md)
- [Checkpoint Configuration](references/checkpoint-configuration.md)
- [Phase 6: Plan Review](references/phase-6-plan-review.md)
- [Large Service Handling](references/large-service-handling.md)

#### P1 - Handoff Enhancement
- [Agent Handoffs](references/agent-handoffs.md)

## Workflow Phases

### Phase 0: Setup

Create SERVICE workspace (not per-tool):

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
SERVICE="{service}"
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
WRAPPER_DIR="$ROOT/.claude/.output/mcp-wrappers/${TIMESTAMP}-${SERVICE}"
mkdir -p "$WRAPPER_DIR/tools"
```

Initialize metadata.json for multi-tool tracking:

```json
{
  "service": "{service}",
  "created": "2025-01-02T...",
  "status": "in_progress",
  "batch_size": 3,
  "tools_discovered": 0,
  "tools_selected": 0,
  "tools": [],
  "phases": {
    "setup": { "status": "complete" },
    "mcp_setup": { "status": "pending" },
    "tool_discovery": { "status": "pending" },
    "shared_architecture": { "status": "pending", "human_approved": false },
    "per_tool": {},
    "red_gate": { "status": "pending" },
    "green_gate": { "status": "pending" },
    "audit": { "status": "pending" },
    "completion": { "status": "pending" }
  }
}
```

**Output:** Service workspace at `.claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{service}/`

### Phase 1: MCP Setup

Ensure the MCP is configured before tool discovery.

Before exploring an MCP's schema, verify it is set up in mcp-client.ts. If not configured, the setting-up-mcp-servers skill guides installation.

**Check if MCP is configured:**

```bash
grep -q "'{service}'" .claude/tools/config/lib/mcp-client.ts && echo 'configured' || echo 'not configured'
```

If not configured, invoke the setup skill:

Read the skill at `.claude/skill-library/claude/mcp-management/setting-up-mcp-servers/SKILL.md` and follow its 8-step workflow:

1. Check if MCP already configured
2. Ask user for installation source (search/GitHub/local/skip)
3. Search or locate MCP package
4. Determine command configuration
5. Check credential requirements
6. Add config to mcp-client.ts
7. Verify MCP works
8. Return structured result

Handle setup result:

- `status: 'already_configured'` → Proceed to Phase 2
- `status: 'configured'` → Proceed to Phase 2
- `status: 'skipped'` → Warn user, proceed to Phase 2 (may fail)
- `status: 'failed'` → Stop workflow, report error to user

Update metadata.json:

```json
{
  "phases": {
    "mcp_setup": {
      "status": "complete",
      "mcp_configured": true,
      "source": "npm|pypi|github|local|existing"
    }
  }
}
```

After setup completes: The MCP is ready. Phase 2 will discover all available tools.

**Output:** MCP configured in mcp-client.ts

### Phase 2: Tool Discovery

Discover ALL tools in the MCP and perform schema discovery for each.

**Step 1: List all available tools**

Call the MCP to get its tool list. Most MCPs provide this via `list_tools` or similar.

```typescript
// Example: Get all tools from MCP
const tools = await callMCPTool("{service}", "list_tools", {});
// Returns: ['get-issue', 'list-issues', 'create-issue', 'update-issue', ...]
```

**Step 2: Confirm tool selection**

```typescript
AskUserQuestion({
  questions: [
    {
      header: "Tool Selection",
      question: "Found {N} tools in {service} MCP. Which tools should be wrapped?",
      multiSelect: false,
      options: [
        { label: "All tools (Recommended)", description: "100% coverage - wrap all {N} tools" },
        { label: "Select specific tools", description: "Choose which tools to wrap" },
      ],
    },
  ],
});
```

**Default:** ALL tools (100% coverage)

**Step 3: Schema discovery for EACH tool**

For each selected tool, perform comprehensive schema discovery to understand behavior before wrapper design.

For complete schema discovery methodology, see [references/schema-discovery.md](references/schema-discovery.md).

**Quick process:**

```
For each tool in selected_tools:
  1. Call the tool with sample inputs
  2. Document input schema (required fields, types, constraints)
  3. Document output schema (response structure, field types)
  4. Measure token count (raw vs filtered)
  5. Document error scenarios
  6. Save to: .claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{service}/tools/{tool}/schema-discovery.md
```

**Step 4: Create tools manifest**

Save `tools-manifest.json`:

```json
{
  "service": "{service}",
  "discovered_at": "2025-01-02T...",
  "total_tools": 15,
  "selected_tools": 15,
  "tools": [
    { "name": "get-issue", "description": "Get issue by ID", "schema_complete": true },
    { "name": "list-issues", "description": "List issues", "schema_complete": true }
  ]
}
```

Update `metadata.json`:

```json
{
  "tools_discovered": 15,
  "tools_selected": 15,
  "tools": ["get-issue", "list-issues", "create-issue"],
  "phases": {
    "tool_discovery": { "status": "complete", "tools_found": 15 },
    "per_tool": {
      "get-issue": { "schema_discovery": "complete" },
      "list-issues": { "schema_discovery": "complete" }
    }
  }
}
```

**Output:**

- `tools-manifest.json`
- `tools/{tool}/schema-discovery.md` for each tool

### Phase 3: Shared Architecture (PARALLEL)

Design SHARED patterns that apply to ALL tools in this MCP service.

The goal is to establish consistent patterns across all wrappers, not design each tool individually.

**Spawn in SINGLE message:**

```typescript
Task(subagent_type: 'mcp-tool-lead', prompt: 'Design SHARED architecture patterns for ALL {service} MCP wrappers.

Tools to wrap: [list all tools from tools-manifest.json]

This is SHARED architecture - patterns that apply to ALL tools, not tool-specific designs.

Design:
1. Token optimization strategy (target 80-99% reduction) - applies to all tools
2. Response filtering approach (whitelist vs blacklist fields)
3. Error handling pattern (Result/Either or exceptions) - consistent across all
4. Input validation approach (Zod patterns to reuse)
5. Security validation layers (sanitization patterns)

Reference schema discoveries: [attach summary of common patterns across tools]

Output: .claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{service}/architecture-shared.md', run_in_background: true)

Task(subagent_type: 'security-lead', prompt: 'Security assessment for ALL {service} MCP wrappers.

Tools to wrap: [list all tools]

This is SHARED security assessment - patterns that apply to all tools.

Assess:
1. Common input validation requirements
2. Injection risks across tool types
3. Data exposure patterns
4. Authentication/authorization model

Output: .claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{service}/security-assessment.md', run_in_background: true)
```

**mcp-tool-lead MUST load these library skills via Read tool:**

| Skill                  | Path                                                                                        | Focus              |
| ---------------------- | ------------------------------------------------------------------------------------------- | ------------------ |
| Progressive Loading    | .claude/skill-library/claude/mcp-management/designing-progressive-loading-wrappers/SKILL.md | Token optimization |
| LLM Response Opt       | .claude/skill-library/development/typescript/optimizing-llm-api-responses/SKILL.md          | Response filtering |
| Result/Either Pattern  | .claude/skill-library/development/typescript/implementing-result-either-pattern/SKILL.md    | Error handling     |
| Zod Validation         | .claude/skill-library/development/typescript/validating-with-zod-schemas/SKILL.md           | Input validation   |
| Retry with Backoff     | .claude/skill-library/development/typescript/implementing-retry-with-backoff/SKILL.md       | Resilience         |
| Input Sanitization     | .claude/skill-library/development/typescript/sanitizing-inputs-securely/SKILL.md            | Security           |
| Hexagonal Architecture | .claude/skill-library/development/typescript/structuring-hexagonal-typescript/SKILL.md      | Structure          |

`architecture-shared.md` must include:

- Token optimization strategy (applies to all tools)
- Response filtering approach (field selection patterns)
- Error handling pattern (consistent across all wrappers)
- Zod schema patterns (reusable validation)
- Security validation approach
- Common imports and utilities to use

**🛑 Human Checkpoint:** Use `AskUserQuestion` to approve shared architecture before proceeding to per-tool work.

**Output:**

- `architecture-shared.md`
- `security-assessment.md`

For complete Phase 3 agent prompts, see [references/agent-prompts.md](references/agent-prompts.md#mcp-tool-lead).

### Phase 4: Per-Tool Work (BATCHED)

For each tool, create tool-specific architecture, test plan, and test implementation.

This phase processes tools in batches of 3-5 to manage parallelism.

**For each batch of tools:**

```typescript
// Example: Batch 1 = ['get-issue', 'list-issues', 'create-issue']

// 4a. Per-tool architecture (parallel within batch)
Task(subagent_type: 'mcp-tool-lead', prompt: 'Design tool-specific architecture for get-issue.

SHARED patterns (use these): [attach architecture-shared.md]
Tool schema: [attach tools/get-issue/schema-discovery.md]

Design tool-specific:
- Input schema (Zod) specific to this tool
- Output filtering (which fields to keep for this tool)
- Edge cases specific to this tool

Output: .claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{service}/tools/get-issue/architecture.md')

// Spawn similar for list-issues, create-issue in same message

// 4b. Test planning (after architecture complete)
Task(subagent_type: 'mcp-tool-tester', prompt: 'Create test plan for get-issue wrapper.

Shared patterns: [attach architecture-shared.md]
Tool architecture: [attach tools/get-issue/architecture.md]

Requirements: 18 tests across 6 categories per tool.

Output: .claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{service}/tools/get-issue/test-plan.md')

// 4c. Test implementation (after test plan complete)
Task(subagent_type: 'mcp-tool-tester', prompt: 'Implement tests for get-issue wrapper.

Test plan: [attach tools/get-issue/test-plan.md]

Output: .claude/tools/{service}/get-issue.unit.test.ts')
```

Update `metadata.json` after each batch:

```json
{
  "per_tool": {
    "get-issue": {
      "architecture": "complete",
      "test_planning": "complete",
      "test_implementation": "complete"
    },
    "list-issues": {
      "architecture": "complete",
      "test_planning": "complete",
      "test_implementation": "complete"
    }
  }
}
```

**mcp-tool-tester MUST load:**

- .claude/skill-library/testing/testing-with-vitest-mocks/SKILL.md

**Test plan must cover 6 categories:**

| Category           | Min Tests | Examples                                      |
| ------------------ | --------- | --------------------------------------------- |
| Input Validation   | 3         | Required fields, type coercion, refinements   |
| MCP Integration    | 2         | Successful call, error propagation            |
| Response Filtering | 2         | Token reduction, field selection              |
| Security           | 4         | Path traversal, injection, XSS, control chars |
| Edge Cases         | 4         | Null, empty, malformed, large payloads        |
| Error Handling     | 3         | Network timeout, rate limit, auth failure     |

**Output:**

- `tools/{tool}/architecture.md` for each tool
- `tools/{tool}/test-plan.md` for each tool
- `.claude/tools/{service}/{tool}.unit.test.ts` for each tool

For complete mcp-tool-tester prompt, see [references/agent-prompts.md](references/agent-prompts.md#mcp-tool-tester).

### Phase 5: RED Gate

ALL tests must fail (no implementations yet).

```bash
cd $ROOT/.claude && npm run test:run -- tools/{service}/
```

This runs tests for ALL tools in the service. Every test file should fail because no wrappers are implemented yet.

**Gate:** Cannot proceed until ALL tests fail. If any tests pass, something is wrong with the test setup.

**Output:** All {N} test files failing as expected.

### Phase 6: Implementation (BATCHED)

Implement ALL wrappers in batches.

**For each batch of tools:**

```typescript
// Batch 1: ['get-issue', 'list-issues', 'create-issue']

Task(subagent_type: 'mcp-tool-developer', prompt: 'Implement get-issue wrapper.

Shared patterns: [attach architecture-shared.md]
Tool architecture: [attach tools/get-issue/architecture.md]
Security assessment: [attach security-assessment.md]

Requirements:
- Follow shared patterns exactly
- Implement tool-specific schema from architecture.md
- Use response-utils, sanitize.ts, mcp-client.ts

Output: .claude/tools/{service}/get-issue.ts')

// Spawn similar for list-issues, create-issue in same message
```

Update `metadata.json` after each batch:

```json
{
  "per_tool": {
    "get-issue": { "implementation": "complete" },
    "list-issues": { "implementation": "complete" }
  }
}
```

**mcp-tool-developer implements wrapper:**

1. Create InputSchema (Zod) per architecture
2. Create FilteredResult interface per token strategy
3. Implement execute() function
4. Add error handling per designed pattern
5. Add security validation per assessment

**Output:** `.claude/tools/{service}/{tool}.ts` for each tool

For implementation checklist, see [references/implementation-checklist.md](references/implementation-checklist.md).

### Phase 7: Code Review (BATCHED, MAX 1 RETRY PER TOOL)

Review ALL wrappers in batches.

**For each batch of tools:**

```typescript
Task(subagent_type: 'mcp-tool-reviewer', prompt: 'Review get-issue wrapper.

Shared patterns: [attach architecture-shared.md]
Tool architecture: [attach tools/get-issue/architecture.md]
Implementation: [attach .claude/tools/{service}/get-issue.ts]

Checklist:
- Follows shared patterns
- Token optimization matches architecture
- Security sanitization implemented
- Uses infrastructure (response-utils, sanitize.ts)

Output: .claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{service}/tools/get-issue/review.md
Verdict: APPROVED | CHANGES_REQUESTED | BLOCKED')
```

**Retry Logic:** If CHANGES_REQUESTED for a tool:

1. mcp-tool-developer fixes that specific tool
2. mcp-tool-reviewer re-reviews ONCE
3. If still failing, escalate via AskUserQuestion

Update `metadata.json`:

```json
{
  "per_tool": {
    "get-issue": {
      "review": { "status": "complete", "verdict": "APPROVED" }
    }
  }
}
```

**mcp-tool-reviewer MUST load:**

- .claude/skill-library/development/typescript/avoiding-barrel-files/SKILL.md
- .claude/skill-library/development/typescript/documenting-with-tsdoc/SKILL.md

**Review checklist:**

- [ ] Token optimization matches architecture (80-99% reduction)
- [ ] Error handling follows designed pattern
- [ ] Input validation matches Zod schema design
- [ ] Security sanitization implemented
- [ ] No barrel file anti-patterns
- [ ] TSDoc documentation present
- [ ] No hardcoded values
- [ ] Uses response-utils for truncation/filtering (not manual substring)
- [ ] Uses sanitize.ts validators in Zod schema (not custom regex)
- [ ] Imports from @claude/testing in test file (not manual mocks)
- [ ] Follows existing wrapper patterns from .claude/tools/

**Verdict:** APPROVED | CHANGES_REQUESTED | BLOCKED

**Output:** `tools/{tool}/review.md` for each tool (all must be APPROVED)

For complete mcp-tool-reviewer prompt, see [references/agent-prompts.md](references/agent-prompts.md#mcp-tool-reviewer).

### Phase 8: GREEN Gate

ALL tests must pass with >=80% coverage.

```bash
cd $ROOT/.claude && npm run test:coverage -- tools/{service}/
```

This runs tests for ALL wrappers. Every test should pass.

**Gate:** Cannot proceed until ALL tests pass with >=80% coverage per wrapper.

**Output:** All {N} test files passing with coverage report.

### Phase 9: Audit

ALL wrappers must pass audit.

```bash
cd $ROOT/.claude/skills/managing-mcp-wrappers/scripts && npm run audit -- {service}
```

This audits ALL wrappers in the service.

**Gate:** Each wrapper must pass >=10/11 audit phases. Fix failures before proceeding.

**Output:** Audit report for all wrappers.

### Phase 10: Completion

Finalize all wrappers and generate service skill.

**Step 1: Generate service skill (covers ALL tools):**

```bash
cd $ROOT/.claude/skills/managing-mcp-wrappers/scripts && npm run generate-skill -- {service}
```

**Step 2: Final verification:**

```bash
cd $ROOT/.claude && npm run build && npm test
```

**Step 3: Update metadata.json:**

```json
{
  "status": "complete",
  "phases": {
    "completion": { "status": "complete" }
  },
  "summary": {
    "tools_wrapped": 15,
    "total_wrappers": 15,
    "coverage": "100%"
  }
}
```

**Step 4: Report summary to user:**

```
MCP Wrapper Creation Complete: {service}

Tools Wrapped: 15/15 (100% coverage)
- get-issue ✓
- list-issues ✓
- create-issue ✓
- update-issue ✓
... (all tools)

Service skill generated: .claude/skill-library/claude/mcp-tools/mcp-tools-{service}/SKILL.md
All tests passing with >=80% coverage.
All audits passing (>=10/11 phases).
```

## Output Directory Structure

```
.claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{service}/
├── metadata.json              # Tracks ALL tools and phases
├── tools-manifest.json        # All discovered tools
├── architecture-shared.md     # Phase 3: Shared patterns
├── security-assessment.md     # Phase 3: Shared security
└── tools/
    ├── get-issue/
    │   ├── schema-discovery.md   # Phase 2
    │   ├── architecture.md       # Phase 4
    │   ├── test-plan.md          # Phase 4
    │   └── review.md             # Phase 7
    ├── list-issues/
    │   └── ... (same structure)
    ├── create-issue/
    │   └── ... (same structure)
    └── ... (all tools)

.claude/tools/{service}/
├── get-issue.ts              # Phase 6: Wrapper
├── get-issue.unit.test.ts    # Phase 4: Tests
├── list-issues.ts
├── list-issues.unit.test.ts
├── create-issue.ts
├── create-issue.unit.test.ts
└── ... (all tools)
```

## Integration

### Core Skills

| Skill                                  | Purpose                              |
| -------------------------------------- | ------------------------------------ |
| setting-up-mcp-servers                 | Phase 1: MCP detection and setup     |
| managing-mcp-wrappers                  | Phase 9-10: CLI audit and generation |
| orchestrating-multi-agent-workflows    | Agent coordination and routing       |
| persisting-agent-outputs               | Handoff format and metadata          |
| developing-with-subagents              | Conditional: >10 tools               |
| persisting-progress-across-sessions    | Conditional: >15 tools               |
| dispatching-parallel-agents            | Conditional: 3+ failures             |

### Library Skills

| Skill                                 | Path                                                                                         | Purpose                           |
| ------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------- |
| designing-progressive-loading-wrappers | .claude/skill-library/claude/mcp-management/designing-progressive-loading-wrappers/SKILL.md  | Token optimization                |
| optimizing-llm-api-responses          | .claude/skill-library/development/typescript/optimizing-llm-api-responses/SKILL.md           | Response filtering                |
| implementing-result-either-pattern    | .claude/skill-library/development/typescript/implementing-result-either-pattern/SKILL.md     | Error handling                    |
| validating-with-zod-schemas           | .claude/skill-library/development/typescript/validating-with-zod-schemas/SKILL.md            | Input validation                  |
| implementing-retry-with-backoff       | .claude/skill-library/development/typescript/implementing-retry-with-backoff/SKILL.md        | Resilience                        |
| sanitizing-inputs-securely            | .claude/skill-library/development/typescript/sanitizing-inputs-securely/SKILL.md             | Security                          |
| structuring-hexagonal-typescript      | .claude/skill-library/development/typescript/structuring-hexagonal-typescript/SKILL.md       | Architecture                      |
| testing-with-vitest-mocks             | .claude/skill-library/testing/testing-with-vitest-mocks/SKILL.md                             | Testing patterns                  |
| avoiding-barrel-files                 | .claude/skill-library/development/typescript/avoiding-barrel-files/SKILL.md                  | Import patterns                   |
| documenting-with-tsdoc                | .claude/skill-library/development/typescript/documenting-with-tsdoc/SKILL.md                 | Documentation                     |
| orchestration-prompt-patterns         | .claude/skill-library/prompting/orchestration-prompt-patterns/SKILL.md                       | Prompt engineering patterns       |

> Prompt templates in `references/prompts/` implement patterns from orchestration-prompt-patterns skill.

### Required Sub-Skills by Phase

| Phase | Required Sub-Skills                                               | Conditional Sub-Skills                               |
| ----- | ----------------------------------------------------------------- | ---------------------------------------------------- |
| All   | persisting-agent-outputs, orchestrating-multi-agent-workflows     | -                                                    |
| 1     | setting-up-mcp-servers                                            | -                                                    |
| 3-7   | -                                                                 | developing-with-subagents (if >10 tools)             |
| 3-7   | -                                                                 | persisting-progress-across-sessions (if >15 tools)   |
| 6,7   | -                                                                 | dispatching-parallel-agents (if 3+ failures)         |

**Conditional complexity triggers:**
- \>10 tools: Invoke `developing-with-subagents` for batch coordination
- \>15 tools: Invoke `persisting-progress-across-sessions` for resume capability
- 3+ independent failures in batch: Invoke `dispatching-parallel-agents` for parallel fixes

## Related Skills

- **setting-up-mcp-servers** - MCP detection, installation, and configuration (Phase 1)
- **managing-mcp-wrappers** - CLI commands for audit, fix, generate-skill (Phase 9, 10)
- **orchestrating-feature-development** - Reference for multi-agent orchestration patterns
- **dispatching-parallel-agents** - For handling batch failures across multiple tools
- **gateway-typescript** - Routes to TypeScript library skills (Zod, Result/Either, TSDoc)
- **gateway-testing** - Routes to testing patterns and @claude/testing usage

## Exit Criteria

MCP wrapper creation is complete when:

- ✅ All 11 phases (0-10) marked complete in metadata.json
- ✅ 100% tool coverage (all discovered tools wrapped)
- ✅ MCP server configured (Phase 1)
- ✅ Shared architecture approved by human (Phase 3)
- ✅ All tests pass with >=80% coverage per wrapper (Phase 8)
- ✅ All audits pass >=10/11 phases per wrapper (Phase 9)
- ✅ All code reviews verdict: APPROVED (Phase 7)
- ✅ Service skill generated covering all tools (Phase 10)
- ✅ Build and tests pass (Phase 10)
- ✅ All gate checklists passed (RED, GREEN, Audit)
- ✅ No rationalization phrases detected during workflow
- ✅ Progress.json status = 'complete'
- ✅ Both review stages passed (spec compliance + quality/security)
- ✅ All tool metadata files present with skills_invoked arrays
