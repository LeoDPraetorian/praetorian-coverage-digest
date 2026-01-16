# MCP Tools Architecture

## The Problem

MCP (Model Context Protocol) servers represent the largest token sink in Claude Code. Unlike skills which load progressively, MCPs load eagerlyevery tool definition, parameter schema, and description enters the context window at session start. With 5 MCP servers, 71,800 tokens were consumed before any work began, leaving only ~128K of a 200K context window for actual code and conversation. Anthropic's research warns that "context must be treated as a finite resource with diminishing marginal returns"LLMs have an "attention budget" that degrades as token counts increase. Starting every session with 36% of context consumed puts agents in a degraded attention state before writing a single line of code.

MCP (Model Context Protocol) servers consume **10,000-20,000+ tokens EACH** at session start. When Claude Code loads MCP servers from `.mcp.json`, every tool definition, parameter schema, and description enters the context window immediatelybefore any work begins. With 5+ MCP servers, **71,800 tokens** were consumed at startup, leaving only ~130k tokens for actual work. This creates:

- **Reduced context window** for code, conversation, and tool results
- **Slower responses** from processing larger prompts
- **Token cost** even when MCP tools aren't used
- **No granular access control** - all MCP tools available to all agents

### Why This Happens

When Claude Code starts with MCPs enabled in `.mcp.json`:

1. Claude Code connects to each MCP server
2. MCP servers return their tool schemas (JSON-RPC `tools/list`)
3. All tool definitions are injected into Claude's system prompt
4. Every session pays this cost, regardless of which tools are used

**Key insight**: MCP tools are "eager loaded" - the full schema enters context immediately. Unlike skills (which load on-demand), MCPs have no progressive loading mechanism.

---

## The Solution: TypeScript Wrapper Architecture

We implemented progressive loading for MCPs through TypeScript wrappers that achieve 0 tokens at session start while maintaining full functionality. A single gateway skill (gateway-mcp-tools) routes to service-specific skills in the library, which catalog available wrappers. When an agent needs an MCP tool, it executes a lightweight TypeScript wrapper (~50 tokens) that spawns the MCP connection on-demand, calls the tool, filters the response for token efficiency, and closes the connection. The MCP server runs as an external processnever entering Claude's context. The result: 92% reduction in MCP token costs (71,800 ~5,500 for a typical 10-call session), with added benefits of Zod input validation, response size limits, and per-service credential isolation.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Claude Code Session                     │
│                    (0 MCP tokens at start)                  │
└─────────────────────┬───────────────────────────────────────┘
                      │ 1. Agent has gateway-mcp-tools in frontmatter
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           Gateway Skill (.claude/skills/gateway-mcp-tools/) │
│  • Single slot in 15K skill budget                          │
│  • Routes to service skills in .claude/skill-library/       │
│  • Lists paths: mcp-tools-linear, mcp-tools-praetorian-cli  │
└─────────────────────┬───────────────────────────────────────┘
                      │ 2. Agent reads service skill (just-in-time)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│    Service Skill (.claude/skill-library/.../mcp-tools-*)    │
│  • Tool catalog with import paths                           │
│  • Service-specific examples                                │
│  • 0 token cost (library, not auto-discovered)              │
└─────────────────────┬───────────────────────────────────────┘
                      │ 3. Agent imports wrapper (~50 tokens)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              TypeScript Wrapper (.claude/tools/)            │
│  • Zod validation for inputs                                │
│  • On-demand MCP connection                                 │
│  • Response filtering & summarization                       │
│  • Token-optimized output                                   │
└─────────────────────┬───────────────────────────────────────┘
                      │ 4. Wrapper spawns MCP (only when called)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      MCP Server Process                     │
│  • Runs independently (not in Claude's context)             │
│  • Returns full data to wrapper                             │
│  • Connection closed after call                             │
└─────────────────────────────────────────────────────────────┘
```

### Token Savings

| MCP Server        | Wrappers | Before (startup)  | After (startup) | Savings  |
| ----------------- | -------- | ----------------- | --------------- | -------- |
| `praetorian-cli`  | 30+      | 9,000 tokens      | 0 tokens        | **9k**   |
| `linear`          | 20+      | 46,000 tokens     | 0 tokens        | **46k**  |
| `chrome-devtools` | 25+      | 6,000 tokens      | 0 tokens        | **6k**   |
| `currents`        | 5        | 3,000 tokens      | 0 tokens        | **3k**   |
| `context7`        | 2        | 600 tokens        | 0 tokens        | **0.6k** |
| `perplexity`      | 4        | 2,000 tokens      | 0 tokens        | **2k**   |
| `nebula`          | 1        | 500 tokens        | 0 tokens        | **0.5k** |
| `chariot`         | 2        | 1,000 tokens      | 0 tokens        | **1k**   |
| `serena`          | 23       | 8,000 tokens      | 0 tokens        | **8k**   |
| **TOTAL**         | **113+** | **76,100 tokens** | **0 tokens**    | **76k**  |

Additional savings from eliminated MCP infrastructure: **3,700 tokens**

**Total freed context: 79,800 tokens (8% of context window)**

---

## Skill Architecture (Gateway Pattern)

### Layer 1: MCP Wrapper Management (Lifecycle)

**Location**: `.claude/skills/managing-tool-wrappers/` (lifecycle) + `.claude/skill-library/claude/mcp-management/orchestrating-mcp-development/` (creation)

**Purpose**: Create, test, audit, and maintain MCP wrappers with mandatory TDD enforcement.

**Skill Architecture**:

- `managing-tool-wrappers` - Main entry point and lifecycle operations (audit, update, fix, test, generate-skill)
- `orchestrating-mcp-development` - Multi-agent workflow for MCP wrapper creation
- `orchestrating-api-tool-development` - Simpler workflow for REST API wrappers

> **See [MCP Wrapper Management](#mcp-wrapper-management) section below for complete documentation** including TDD workflow, 11-phase audit system, directory structure, and CLI reference.

### Layer 2: Gateway Skill (Discovery & Routing)

**Location**: `.claude/skills/gateway-mcp-tools/` (Core skill - auto-discovered)

**Purpose**: Single entry point that routes to service-specific library skills

**How it works**:

- Gateway is in `.claude/skills/` (consumes 1 slot in 15K budget)
- Service skills are in `.claude/skill-library/` (0 token cost)
- Agents reference gateway in frontmatter, body specifies which services to use
- Gateway provides paths to service skills for just-in-time loading

**Gateway provides**:

- Service skill paths for Read tool
- Dynamic discovery via `npx tsx .claude/tools/discover.ts`
- Quick reference table for service selection
- Execution pattern documentation

**Agent Frontmatter Pattern**:

```yaml
# Agent definition
tools:
  - Bash # REQUIRED: Execute TypeScript (npx tsx)
  - Read # REQUIRED: Load service skills
skills:
  - gateway-mcp-tools # Routes to service skills
```

**Agent Body Pattern**:

```markdown
## MCP Tool Access

You have access to MCP wrappers via the `gateway-mcp-tools` skill.

**For this agent, use these services:**

- Context7 for library documentation lookups
- Linear for issue tracking (read-only)

Read the gateway skill first, then load the specific service skill you need.
```

### Layer 2b: Registry Skill (Detailed Usage - Library)

**Location**: `.claude/skill-library/claude/mcp-tools/mcp-tools-registry/`

**Purpose**: Comprehensive documentation for wrapper execution patterns

**When to use**: After gateway routes you to service skills, if you need detailed execution patterns, troubleshooting, or advanced workflows.

**What it provides**:

- Detailed execution patterns (inline vs script file)
- Import conventions (`.ts` source files, `.js` in imports)
- Error handling and troubleshooting
- Common workflow examples

### Layer 3: Service Skills (Access Control)

**Location**: `.claude/skill-library/claude/mcp-tools/mcp-tools-{service}/`

**Purpose**: Granular agent access control per service

**Example**: `mcp-tools-linear` provides:

- Catalog of 13 Linear wrappers
- Import paths for each tool
- Service-specific examples
- Reference to mcp-tools-registry for execution

**How granular access works**:

```yaml
# Agent frontmatter - uses gateway for routing
skills:
  - gateway-mcp-tools # Routes to service skills


# Agent body - specifies which services
# "For this task, use mcp-tools-linear for issue tracking"
# Agent then reads: .claude/skill-library/claude/mcp-tools/mcp-tools-linear/SKILL.md
```

**Why this pattern?**

- Gateway in `.claude/skills/` = 1 slot in 15K budget
- Service skills in `.claude/skill-library/` = 0 token cost at discovery
- Agent body controls which services are used (not frontmatter bloat)
- Just-in-time loading via Read tool

### Token Budget Summary

| Component             | Location                 | Discovery Cost      | Execution Cost       |
| --------------------- | ------------------------ | ------------------- | -------------------- |
| `gateway-mcp-tools`   | `.claude/skills/`        | ~100 chars (1 slot) | ~500 tokens          |
| `mcp-tools-{service}` | `.claude/skill-library/` | 0 (library)         | ~300-500 tokens      |
| `mcp-tools-registry`  | `.claude/skill-library/` | 0 (library)         | ~1500 tokens         |
| TypeScript wrappers   | `.claude/tools/`         | 0                   | ~50-100 tokens each  |
| MCP servers           | (spawned on-demand)      | 0                   | 0 (external process) |

**Total at session start: 1 slot (~100 chars) vs legacy 71.8k tokens**

---

## How It Works Together

### Creating a New MCP Wrapper

The `orchestrating-mcp-development` skill provides a multi-agent workflow for comprehensive MCP service coverage:

```
User: "Create wrappers for linear service"

1. Agent loads `orchestrating-mcp-development` via gateway-mcp-tools
2. Skill orchestrates 11-phase multi-agent workflow:
   Phase 0-1: Setup workspace and configure MCP server
   Phase 2: Tool discovery - find ALL tools in the MCP service
   Phase 3: Shared architecture design (tool-lead + security-lead in PARALLEL)
   Phase 4: Per-tool architecture + test planning (BATCHED, 3-5 tools)
   Phase 5: RED Gate - all tests must fail
   Phase 6: Implementation (tool-developer, BATCHED)
   Phase 7: Code review (tool-reviewer, max 1 retry per tool)
   Phase 8: GREEN Gate - all tests pass with ≥80% coverage
   Phase 9: Audit - all wrappers pass ≥10/11 phases
   Phase 10: Completion - generate service skill
3. Agents can now discover and use ALL wrappers for the service
```

**Key Insight**: Multi-agent orchestration enables comprehensive service coverage with batched parallel execution, quality gates, and code review.

### Using an MCP Wrapper

```
User: "Get Linear issue ENG-1234"

1. Agent sees `gateway-mcp-tools` in available skills (from frontmatter)
2. Agent reads gateway skill, sees Linear service path
3. Agent reads `.claude/skill-library/claude/mcp-tools/mcp-tools-linear/SKILL.md`
4. Agent executes via Bash:
   npx tsx -e "(async () => {
     const { getIssue } = await import('./.claude/tools/linear/get-issue.ts');
     const result = await getIssue.execute({ issueId: 'ENG-1234' });
     console.log(JSON.stringify(result, null, 2));
   })();" 2>/dev/null
5. Wrapper connects to Linear MCP, calls tool, returns filtered result
6. Agent processes result (~500 tokens vs 5k+ raw)
```

---

## Wrapper Anatomy

### File Structure

```
.claude/tools/{service}/
├── {tool-name}.ts              # Wrapper implementation
├── {tool-name}.unit.test.ts    # Unit tests (mocked MCP)
├── {tool-name}.integration.test.ts  # Integration tests (real MCP)
├── tsconfig.json               # TypeScript config (REQUIRED - auto-generated by create)
├── index.ts                    # Re-exports all tools
├── package.json                # Dependencies
└── README.md                   # Service documentation
```

### Wrapper Template

```typescript
// .claude/tools/linear/get-issue.ts

import { z } from "zod";
import { callMCPTool } from "../config/lib/mcp-client.js";

// 1. Input validation with Zod
const InputSchema = z.object({
  issueId: z.string().describe("Linear issue ID (e.g., ENG-1234)"),
  includeComments: z.boolean().optional().default(false),
});

// 2. Output filtering for token reduction
interface FilteredResult {
  id: string;
  title: string;
  status: string;
  priority: number;
  assignee?: string;
  // Only essential fields, not raw MCP response
}

// 3. Exported tool definition
export const getIssue = {
  name: "linear.get_issue",
  description: "Get a single Linear issue by ID",
  inputSchema: InputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<FilteredResult> {
    // 4. Validate input
    const validated = InputSchema.parse(input);

    // 5. Call MCP (spawns connection on-demand)
    const raw = await callMCPTool("linear", "get_issue", {
      issue_id: validated.issueId,
    });

    // 6. Filter and return (token optimization)
    return {
      id: raw.id,
      title: raw.title,
      status: raw.state?.name ?? "Unknown",
      priority: raw.priority ?? 4,
      assignee: raw.assignee?.name,
    };
  },
};
```

---

## MCP Wrapper Management

The MCP Wrapper Management system is the lifecycle management system for MCP wrappers. It enforces Test-Driven Development (TDD), validates compliance across 11 phases, and provides tooling for creating, updating, auditing, and fixing wrappers.

### Overview

| Aspect         | Details                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------- |
| **Location**   | `.claude/skills/managing-tool-wrappers/` (lifecycle) + `skill-library/.../orchestrating-mcp-development/` (creation) |
| **Purpose**    | Create, test, audit, and maintain MCP wrappers                                            |
| **Philosophy** | TDD-first: tests must exist and fail before implementation                                |
| **Coverage**   | Minimum 80% unit test coverage required                                                   |
| **Invocation** | `skill: "managing-tool-wrappers"` (routes to orchestration skills for create)             |

### Directory Structure

```
.claude/skills/managing-tool-wrappers/     # Lifecycle management
├── SKILL.md                              # Main skill documentation
├── scripts/
│   ├── src/
│   │   ├── cli.ts                        # CLI entry point
│   │   ├── tdd-enforcer.ts               # RED/GREEN phase enforcement
│   │   ├── types.ts                      # Shared TypeScript types
│   │   ├── utils.ts                      # Shared utilities
│   │   ├── operations/                   # CLI command implementations
│   │   │   ├── create.ts                 # Create wrapper scaffold
│   │   │   ├── update.ts                 # Update existing wrapper
│   │   │   ├── verify-red.ts             # RED phase verification
│   │   │   ├── verify-green.ts           # GREEN phase verification
│   │   │   ├── generate-skill.ts         # Generate service skill
│   │   │   └── test.ts                   # Test runner
│   │   ├── phases/                       # 11 audit phase implementations
│   │   │   ├── phase1-schema-discovery.ts
│   │   │   ├── phase2-optional-fields.ts
│   │   │   ├── phase3-type-unions.ts
│   │   │   ├── phase4-nested-access.ts
│   │   │   ├── phase5-reference-validation.ts
│   │   │   ├── phase6-unit-coverage.ts
│   │   │   ├── phase7-integration-tests.ts
│   │   │   ├── phase8-test-quality.ts
│   │   │   ├── phase9-security-validation.ts
│   │   │   ├── phase10-typescript-validation.ts
│   │   │   └── phase11-skill-schema-sync.ts  # NEW: Skill-schema synchronization
│   │   └── fixers/                       # Auto-fix implementations
│   │       ├── phase2-fixer.ts
│   │       ├── phase3-fixer.ts
│   │       └── phase4-fixer.ts
│   └── package.json
├── templates/
│   ├── discover-schema.ts                # Schema discovery script template
│   ├── tool-wrapper.ts.tmpl              # Wrapper implementation template
│   └── tsconfig.json.tmpl                # TypeScript config template
└── references/                           # Workflow documentation

.claude/skill-library/claude/mcp-management/
├── orchestrating-mcp-development/        # Multi-agent creation workflow
│   └── SKILL.md                          # 11-phase orchestration workflow
└── orchestrating-api-tool-development/   # REST API wrapper workflow
    └── SKILL.md                          # Simpler TDD workflow for APIs
```

### TDD Workflow (Enforced)

The MCP Manager enforces a strict Red-Green-Refactor cycle. You cannot generate a wrapper until tests exist and fail.

```
┌─────────────────────────────────────────────────────────────┐
│                       🔴 RED Phase                          │
│  1. npm run create -- <service> <tool>                      │
│     → Generates test file ONLY (no wrapper)                 │
│  2. npm run verify-red -- <service>/<tool>                  │
│     → Confirms tests FAIL (proves tests work)               │
└─────────────────────┬───────────────────────────────────────┘
                      │ Blocked until RED passes
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                       🟢 GREEN Phase                        │
│  3. npm run generate-wrapper -- <service>/<tool>            │
│     → Creates wrapper from template                         │
│  4. npm run verify-green -- <service>/<tool>                │
│     → Confirms tests PASS with ≥80% coverage                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                       🔵 REFACTOR Phase                     │
│  5. Add integration tests (optional, recommended)           │
│  6. Optimize implementation (token reduction, security)     │
│  7. Re-run verify-green (must stay green)                   │
└─────────────────────────────────────────────────────────────┘
```

**Key Enforcement**:

- `create` generates test file + `tsconfig.json` (if new service), NOT wrapper
- `generate-wrapper` checks RED phase first, **blocks if not verified**
- `verify-green` requires 80% unit test coverage

### The 11 Audit Phases

MCP wrappers must pass compliance validation across 11 phases:

| Phase | Name                  | Auto-Fix | Description                                                |
| ----- | --------------------- | -------- | ---------------------------------------------------------- |
| 1     | Schema Discovery      |          | Validates discovery docs exist for MCP tool                |
| 2     | Optional Fields       |          | Tests verify `.optional()` Zod usage                       |
| 3     | Type Unions           |          | Tests cover `z.union()` edge cases                         |
| 4     | Nested Access Safety  |          | Tests catch unsafe property access                         |
| 5     | Reference Validation  |          | Detects deprecated MCP tool references                     |
| 6     | Unit Test Coverage    |          | **80% coverage required**                                  |
| 7     | Integration Tests     |          | Tests with real MCP server (recommended)                   |
| 8     | Test Quality          |          | Validates test patterns and structure                      |
| 9     | Security Validation   |          | Scans for dangerous patterns (eval, hardcoded keys)        |
| 10    | TypeScript Validation |          | **CRITICAL if tsconfig.json missing**; detects type errors |
| 11    | Skill-Schema Sync     |          | **Service skill matches wrapper Zod schemas**              |

> **STEPS vs PHASES Clarification:**
>
> - **Workflow PHASES** (0-10): The 11-phase creation workflow in `orchestrating-mcp-development`
> - **Audit PHASES** (1-11): Compliance categories checked by `npm run audit`

### CLI Reference

All commands run from the scripts directory:

```bash
cd .claude/skills/managing-tool-wrappers/scripts
```

#### TDD Workflow Commands

| Command                                        | Description                                 |
| ---------------------------------------------- | ------------------------------------------- |
| `npm run create -- <service> <tool>`           | Generate test file only (RED phase setup)   |
| `npm run verify-red -- <service>/<tool>`       | Verify tests fail (proves tests work)       |
| `npm run generate-wrapper -- <service>/<tool>` | Generate wrapper (blocked until RED passes) |
| `npm run verify-green -- <service>/<tool>`     | Verify tests pass with 80% coverage         |

#### Maintenance Commands

| Command                                     | Description                            |
| ------------------------------------------- | -------------------------------------- |
| `npm run update -- <service> <tool>`        | Update existing wrapper (test-guarded) |
| `npm run audit -- <service>/<tool>`         | Run 11-phase compliance check          |
| `npm run audit -- --all`                    | Audit all wrappers                     |
| `npm run audit -- --service <service>`      | Audit all wrappers in a service        |
| `npm run fix -- <service>/<tool>`           | Auto-fix issues (phases 2, 4, 11)      |
| `npm run fix -- <service>/<tool> --dry-run` | Preview fixes without applying         |
| `npm run test -- <service>/<tool>`          | Run test suite for wrapper             |
| `npm run generate-skill -- <service>`       | Generate/update service skill          |

#### Example: Creating New Wrappers

**Recommended: Use `managing-tool-wrappers` skill** (routes to orchestration workflows):

```bash
# Via /tool-manager command or managing-tool-wrappers skill
# Routes to orchestrating-mcp-development for MCP servers
# Routes to orchestrating-api-tool-development for REST APIs

# The orchestration skill guides you through 11 phases:
# Phase 0-1: Setup workspace and configure MCP server
# Phase 2: Tool discovery - find ALL tools in the MCP service
# Phase 3: Shared architecture design (parallel: tool-lead + security-lead)
# Phase 4: Per-tool architecture + test planning (batched)
# Phase 5: RED Gate - all tests must fail
# Phase 6: Implementation (batched)
# Phase 7: Code review
# Phase 8: GREEN Gate - all tests pass with ≥80% coverage
# Phase 9: Audit - all wrappers pass ≥10/11 phases
# Phase 10: Completion - generate service skill
```

**Alternative: Direct CLI** (for experienced developers):

```bash
cd .claude/skills/managing-tool-wrappers/scripts && npm install
npm run create -- linear get-issue      # Generate test scaffold
npm run verify-red -- linear/get-issue  # Confirm tests fail
npm run generate-wrapper -- linear/get-issue  # Generate wrapper
npm run verify-green -- linear/get-issue      # Confirm tests pass 80%
npm run generate-skill -- linear              # Update service skill
```

### Skill Generation

After creating wrappers, generate service skills for agent access:

```bash
npm run generate-skill -- <service>
```

This creates/updates the service skill at `.claude/skill-library/claude/mcp-tools/mcp-tools-{service}/SKILL.md` with:

- Tool catalog with import paths
- Service-specific examples
- Execution patterns

Service skills are loaded on-demand by agents via the `gateway-mcp-tools` gateway.

---

## Shared Infrastructure

### @claude/testing Library

**Location**: `.claude/lib/testing/`

**Purpose**: Universal testing infrastructure for all MCP wrappers using Vitest.

The `@claude/testing` package provides shared testing utilities that eliminate boilerplate and ensure consistency:

```typescript
// Example unit test using @claude/testing
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMCPMock, LinearResponses, MCPErrors } from "@claude/testing";
import { getIssue } from "./get-issue";
import * as mcpClient from "../config/lib/mcp-client";

vi.mock("../config/lib/mcp-client");

describe("getIssue", () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  it("should filter response for token efficiency", async () => {
    mcpMock.mockResolvedValue(LinearResponses.getIssue({ id: "ENG-1234" }));
    const result = await getIssue.execute({ id: "ENG-1234" });
    expect(result.id).toBe("ENG-1234");
  });
});
```

**Available Utilities**:

| Category              | Exports                                                     | Purpose                          |
| --------------------- | ----------------------------------------------------------- | -------------------------------- |
| **Mocking**           | `createMCPMock()`, `MCPErrors`                              | Mock MCP client, simulate errors |
| **Response Builders** | `LinearResponses`, `Context7Responses`, `CurrentsResponses` | Realistic mock data              |
| **Security Testing**  | `getAllSecurityScenarios()`, `testSecurityScenarios()`      | 12 attack vector tests           |
| **Schema Assertions** | `assertSchemaAccepts()`, `assertSchemaRejects()`            | Zod validation helpers           |
| **Edge Cases**        | `EdgeCaseData.boundary`, `EdgeCaseData.special`             | Boundary/unicode testing         |

**Running Tests** (from workspace root):

```bash
cd .claude
npm run test:run              # All tests once
npm run test:coverage         # With coverage report
npm run test:run -- tools/linear/get-issue  # Single wrapper
```

### find-project-root.ts

**Location**: `.claude/lib/find-project-root.ts`

**Purpose**: Robust project root detection that works from any directory (submodules, nested dirs).

This shared utility solves the "where am I?" problem for all Claude Code infrastructure:

```typescript
import { findProjectRoot, resolveProjectPath } from "../lib/find-project-root.js";

// Works from anywhere in the repo
const PROJECT_ROOT = findProjectRoot(); // /Users/user/chariot-development-platform

// Build paths safely
const skillsDir = resolveProjectPath(".claude", "skills");
const toolsDir = resolveProjectPath(".claude", "tools", "linear");
```

**Key Functions**:

| Function                          | Purpose                                   |
| --------------------------------- | ----------------------------------------- |
| `findProjectRoot()`               | Returns super-repo root from any location |
| `resolveProjectPath(...segments)` | Builds absolute paths from project root   |
| `isInSubmodule()`                 | Detects if running from a submodule       |
| `getCurrentSubmoduleName()`       | Returns submodule name (e.g., 'chariot')  |
| `findSkillPath(name)`             | Locates skill in core or library          |
| `getAllSkillDirectories()`        | Lists all directories containing skills   |

**Detection Strategy**:

1. Check `CLAUDE_PROJECT_DIR` env var (fastest)
2. Git detection with submodule support (`--show-superproject-working-tree`)
3. Filesystem fallback (search upward for `.claude/` directory)

**Why This Matters**: Scripts, wrappers, and tools can run from any working directory without path resolution errors.

### response-utils.ts

**Location**: `.claude/tools/config/lib/response-utils.ts`

**Purpose**: Shared domain logic for response transformation across all MCP wrappers.

This module centralizes common patterns that were previously duplicated across wrappers:

```typescript
import {
  truncate,
  paginate,
  pickFields,
  buildListResponse,
  estimateTokens,
} from "../config/lib/response-utils.js";

// Truncation with presets
truncate(description, "SHORT"); // 200 chars
truncate(content, "MEDIUM"); // 300 chars
truncate(body, "LONG"); // 500 chars

// Pagination
const page = paginate(items, 20, offset);

// Field filtering
const filtered = pickFields(rawIssue, ["id", "title", "status"]);

// List response with metadata
return buildListResponse(assets, 20, transformFn, {
  byType: (a) => a.class,
  byStatus: (a) => a.status,
});

// Token estimation (~4 chars = 1 token)
const tokens = estimateTokens(responseData);
```

**Available Utilities**:

| Category            | Functions                                                | Purpose                         |
| ------------------- | -------------------------------------------------------- | ------------------------------- |
| **Truncation**      | `truncate()`, `truncateWithIndicator()`                  | Token-efficient string limits   |
| **Pagination**      | `paginate()`, `paginateAndTransform()`                   | Array slicing with transform    |
| **Field Filtering** | `pickFields()`, `omitFields()`                           | Type-safe object filtering      |
| **Aggregation**     | `countBy()`, `groupBy()`                                 | Data summarization              |
| **Normalization**   | `normalizeArrayResponse()`, `extractPaginatedResponse()` | Handle inconsistent MCP formats |
| **Metadata**        | `withMetadata()`, `estimateTokens()`                     | Response enrichment             |

**Truncation Presets**:

| Preset     | Chars | Use Case                  |
| ---------- | ----- | ------------------------- |
| `SHORT`    | 200   | List view descriptions    |
| `MEDIUM`   | 300   | Detail view descriptions  |
| `LONG`     | 500   | Single-item views         |
| `ERROR`    | 300   | Error messages            |
| `CONTENT`  | 3000  | Full content (Perplexity) |
| `RESEARCH` | 8000  | Extended research content |

---

## Serena: Semantic Code Analysis

Serena is a special MCP that provides **semantic code analysis via Language Server Protocol (LSP)**. Unlike other MCPs that wrap external APIs, Serena indexes and analyzes your codebase using actual language servers (TypeScript, Python, Go, etc.).

### Why Serena is Different

| Aspect          | Standard MCPs                 | Serena                                      |
| --------------- | ----------------------------- | ------------------------------------------- |
| **Data Source** | External API (Linear, GitHub) | Local codebase via LSP                      |
| **Cold Start**  | ~100ms                        | **~3-5 seconds** (LSP initialization)       |
| **State**       | Stateless                     | **Stateful** (project indexed in memory)    |
| **Scope**       | Single service                | **Module-specific** (one project at a time) |

**Key Constraint** (from Serena GitHub #474): Serena only supports one project at a time. You cannot query multiple modules simultaneouslyyou must switch projects explicitly.

### Serena Wrappers

**Location**: `.claude/tools/serena/`

**23 wrappers** organized by category:

| Category              | Wrappers                                                                                                                                                 | Purpose                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Symbol Operations** | `find_symbol`, `get_symbols_overview`, `find_referencing_symbols`, `replace_symbol_body`, `insert_after_symbol`, `insert_before_symbol`, `rename_symbol` | Semantic code navigation and editing |
| **Memory System**     | `write_memory`, `read_memory`, `list_memories`, `delete_memory`, `edit_memory`                                                                           | Persistent project knowledge         |
| **File/Search**       | `list_dir`, `find_file`, `search_for_pattern`                                                                                                            | Project-aware file operations        |
| **Config**            | `activate_project`, `get_current_config`                                                                                                                 | Project switching                    |
| **Workflow**          | `onboarding`, `initial_instructions`, `check_onboarding_performed`, `think_about_*`                                                                      | Guided analysis helpers              |

### Connection Pool Architecture

The **Serena Connection Pool** (`serena-pool.ts`) solves the cold start problem by maintaining a **warm, pooled connection**:

```

                    Performance Impact

 Metric               Without Pool     With Pool

 Cold start           3-5s per call    3-5s (first only)
 Warm call latency    3-5s             ~2ms
 10 consecutive calls 30-50s           ~5s
 Improvement          -                1500-2500x

```

**Pool State Machine**:

```

          disconnected
      (no active connection)

                  acquire()


           connecting          error
      (spawning uvx process)

                  connected


              idle
     (awaiting next call)

                  acquire() + same module


             in_use            release()
      (executing MCP call)

                  error OR different module


             expired           dispose()
       (pending cleanup)

```

**Key Features**:

| Feature               | Implementation                                  | Purpose                               |
| --------------------- | ----------------------------------------------- | ------------------------------------- |
| **Module Affinity**   | Single connection with `currentModule` tracking | Reuse warm connection for same module |
| **Async Mutex**       | `async-mutex` package                           | Serialize concurrent acquire calls    |
| **TTL Cleanup**       | 5-minute idle timeout                           | Release resources when not in use     |
| **Circuit Breaker**   | Opens after 5 consecutive failures              | Prevent cascade failures              |
| **Health Check**      | `healthCheck()` method                          | Monitor connection state              |
| **Graceful Shutdown** | SIGTERM/SIGINT handlers                         | Clean process exit                    |

**Circuit Breaker Pattern**:

```typescript
// After 5 consecutive failures, circuit opens for 60 seconds
if (consecutiveFailures >= 5) {
  circuitOpenUntil = Date.now() + 60_000;
  // All calls fail fast until reset time
}
```

### Semantic Router

The **Semantic Router** (`semantic-router.ts`) analyzes user intent to determine which module to target in a super-repo:

```typescript
import { routeToSerena } from "./semantic-router.js";

const result = routeToSerena(
  "fix the React component in the UI", // User query
  "/path/to/super-repo" // Project root
);

// Returns:
// {
//   args: ['--project', '/path/to/super-repo/modules/chariot'],
//   scopeDescription: 'chariot (matched: react, frontend)',
//   primaryModule: 'chariot',
//   allMatches: [{ name: 'chariot', relevance: 15, ... }]
// }
```

**Routing Algorithm**:

| Signal                    | Weight | Example                           |
| ------------------------- | ------ | --------------------------------- |
| **Module name mentioned** | +20    | "fix chariot backend"             |
| **Routing hint keyword**  | +10    | "react" chariot, "lambda" chariot |
| **Concern match**         | +5     | "frontend" chariot-ui-components  |
| **Language mention**      | +3     | "typescript" modules with TS      |

**Configuration** (`.serena/project.yml`):

```yaml
name: chariot-development-platform
type: super-repo
default_module: chariot

modules:
  chariot:
    path: modules/chariot
    languages: [go, typescript]
    concerns: [backend, frontend, api, security]
  nebula:
    path: modules/nebula
    languages: [go]
    concerns: [cloud, scanning, aws, azure, gcp]
  # ... 21 total modules

routing_hints:
  react: [chariot]
  lambda: [chariot]
  cloud: [nebula]
  vql: [chariot-aegis-capabilities]
```

### Module Switching

When the target module differs from the current connection, the pool **kills and respawns**:

```
Same module (warm):     ~2ms     Reuse existing connection
Different module:       ~3-5s    Kill process, spawn new
No prior connection:    ~3-5s    Cold start
```

**Best Practice**: Batch calls to the same module together. The semantic router helps by grouping related queries automatically.

### Using Serena Wrappers

```typescript
import { findSymbol } from "./.claude/tools/serena/find-symbol.ts";

// With semantic routing (recommended)
const result = await findSymbol.execute({
  name_path_pattern: "MyClass/myMethod",
  semanticContext: "Find Asset class in React frontend", // Routes to chariot
});

// Direct path restriction
const result = await findSymbol.execute({
  name_path_pattern: "handleSubmit",
  relative_path: "src/components/",
  include_kinds: [6, 12], // Method, Function
});
```

**Symbol Kind Constants**:

```typescript
import { SymbolKind } from "./.claude/tools/serena/find-symbol.ts";

// Common kinds
SymbolKind.Class; // 5
SymbolKind.Method; // 6
SymbolKind.Function; // 12
SymbolKind.Interface; // 11
SymbolKind.Variable; // 13
```

---

## Security Considerations

MCP wrappers execute external code and handle credentials, creating a significant attack surface. This section documents our security model and controls.

### Threat Model

| Threat                  | Attack Vector                             | Impact                                   |
| ----------------------- | ----------------------------------------- | ---------------------------------------- |
| **Injection attacks**   | Malicious input passed to MCP tools       | Command execution, data exfiltration     |
| **Credential leakage**  | API keys in code, logs, or error messages | Unauthorized access to external services |
| **Resource exhaustion** | Unbounded responses, hanging connections  | Memory exhaustion, denial of service     |
| **Supply chain**        | Compromised MCP server or dependency      | Full system compromise                   |

### Input Validation

All wrapper inputs are validated using Zod schemas before reaching MCP servers:

```typescript
const InputSchema = z.object({
  issueId: z.string().min(1),
  includeComments: z.boolean().optional().default(false),
});
```

**Sanitization helpers** in `.claude/tools/config/lib/sanitize.ts`:

- `validateNoPathTraversal()` - Blocks `../` sequences
- `validateNoCommandInjection()` - Blocks shell metacharacters
- `validateNoXSS()` - Blocks script injection patterns
- `validateNoControlChars()` - Blocks null bytes and control characters

### Response Safety

| Control        | Implementation                               | Default                |
| -------------- | -------------------------------------------- | ---------------------- |
| **Timeout**    | `withTimeout()` wrapper aborts hanging calls | 30 seconds             |
| **Size limit** | `ResponseTooLargeError` if exceeded          | 1MB                    |
| **Retries**    | Exponential backoff for transient failures   | 3 retries (1s, 2s, 4s) |
| **Filtering**  | Wrappers return only essential fields        | Per-wrapper            |

### Credential Management

| Principle                  | Implementation                                                   |
| -------------------------- | ---------------------------------------------------------------- |
| **No credentials in code** | All credentials in `credentials.json` or OAuth tokens            |
| **Per-service isolation**  | `getToolConfig(service)` returns ONLY that service's credentials |
| **OAuth preferred**        | Linear uses OAuth; API keys only where OAuth unavailable         |
| **Token storage**          | OAuth tokens in `~/.mcp-auth/` (outside repo)                    |
| **Audit logging**          | Optional via `AUDIT_MCP_CALLS` environment variable              |

### Code Quality

**Static analysis** (Phase 9 audit) scans wrappers for:

- `eval()` or `Function()` constructor usage
- Hardcoded credentials or API keys
- Missing security helper imports

**Test requirements**:

- 80% coverage for all wrappers
- Security test template with 4 attack vector categories
- Integration tests with real MCP servers

### Future: Sandboxing

MCP execution currently runs in the same process as the wrapper. Sandboxing options have been researched but implementation is deferred due to complexity:

| Option               | Isolation                 | Trade-offs                  |
| -------------------- | ------------------------- | --------------------------- |
| Docker containers    | Process + filesystem      | CVE risks, startup overhead |
| isolated-vm          | V8 isolate                | Limited npm support         |
| Deno permissions     | Fine-grained capabilities | Different runtime           |
| Firecracker microVMs | Hardware-level            | Complex setup               |

See **Phase 4.1** and **Phase 6** in Current Status & TODO for implementation roadmap.

**References**: [Anthropic MCP Security](https://modelcontextprotocol.io/docs/concepts/security), [Docker MCP Security](https://www.docker.com/blog/mcp-horror-stories-the-supply-chain-attack/), [Windows MCP Security](https://blogs.windows.com/windowsexperience/2025/05/19/securing-the-model-context-protocol-building-a-safer-agentic-future-on-windows/)

---

## Migration from Legacy MCPs

### Before (October 2024)

```json
// .mcp.json - MCPs loaded at session start
{
  "mcpServers": {
    "praetorian-cli": { "command": "uvx", "args": ["..."] },
    "linear": { "command": "npx", "args": ["..."] },
    "playwright": { "command": "npx", "args": ["..."] }
  }
}
```

**Impact**: 71.8k tokens consumed immediately, every session.

### After (November 2024)

```json
// .mcp.json - Empty or minimal
{
  "mcpServers": {}
}
```

**Impact**: 0 tokens at startup. Tools load on-demand via wrappers.

### Migration Path

1. **Identify MCP** to wrap
2. **Run TDD workflow** via `managing-tool-wrappers` skill (routes to orchestration workflows)
3. **Generate service skill** for agent access
4. **Remove MCP** from `.mcp.json`
5. **Update agents** to use wrapper skill

## Quick Reference

### MCP Wrapper Management Commands

See [MCP Wrapper Management](#mcp-wrapper-management) section for complete CLI reference.

```bash
# Recommended: Use managing-tool-wrappers skill (routes to orchestration)
skill: "managing-tool-wrappers"
# Routes to orchestrating-mcp-development for MCP servers
# Routes to orchestrating-api-tool-development for REST APIs

# Alternative: Direct CLI
cd .claude/skills/managing-tool-wrappers/scripts

# TDD Workflow
npm run create -- <service> <tool>           # 1. Test file only
npm run verify-red -- <service>/<tool>       # 2. Tests fail
npm run generate-wrapper -- <service>/<tool> # 3. Wrapper created
npm run verify-green -- <service>/<tool>     # 4. Tests pass
npm run generate-skill -- <service>          # 5. Update service skill

# Maintenance
npm run audit -- <service>/<tool>            # 11-phase compliance check
npm run audit -- --all                       # Audit all wrappers
npm run fix -- <service>/<tool>              # Auto-fix issues (phases 2, 4, 11)
```

### Execute Wrapper (Agent)

Agents execute wrappers via the Bash tool with `npx tsx`:

```bash
npx tsx -e "(async () => {
  const { toolName } = await import('./.claude/tools/service/tool-name.ts');
  const result = await toolName.execute({ params });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

See service skills in `.claude/skill-library/claude/mcp-tools/` for tool-specific import paths and examples.

---

## References

### Internal Documentation

- **Gateway Skill**: `.claude/skills/gateway-mcp-tools/SKILL.md` (core skill - entry point)
- **Creation Workflow**: `.claude/skill-library/claude/mcp-management/orchestrating-mcp-development/SKILL.md` (11-phase multi-agent workflow)
- **Lifecycle Manager**: `.claude/skills/managing-tool-wrappers/SKILL.md` (audit, fix, update, test)
- **Testing Library**: `.claude/lib/testing/README.md` (@claude/testing documentation)
- **Path Resolution**: `.claude/lib/find-project-root.ts` (shared project root detection)
- **Registry Skill**: `.claude/skill-library/claude/mcp-tools/mcp-tools-registry/SKILL.md` (detailed usage)
- **Service Skills**: `.claude/skill-library/claude/mcp-tools/mcp-tools-{service}/SKILL.md`
- **Skills Architecture**: `docs/SKILLS-ARCHITECTURE.md` (gateway pattern reference)
- **Serena Wrappers**: `.claude/tools/serena/index.ts` (23 semantic code analysis wrappers)
- **Connection Pool Design**: `.claude/tools/serena/CONNECTION-POOL-DESIGN.md` (architecture spec)
- **Semantic Router**: `.claude/tools/serena/semantic-router.ts` (intent-based module routing)
- **Response Utilities**: `.claude/tools/config/lib/response-utils.ts` (shared transformations)
- **Super-repo Config**: `.serena/project.yml` (module definitions for routing)

### Industry White Papers

- [Anthropic MCP Security](https://modelcontextprotocol.io/docs/concepts/security) - Official MCP security considerations
- [Cloudflare Remote MCP](https://blog.cloudflare.com/remote-model-context-protocol-servers-mcp/) - Remote MCP server patterns
- [Jangwook MCP Deep Dive](https://jangwook.net/posts/mcp-deep-dive/) - MCP architecture analysis

### MCP Specification & Proposals

- [MCP Lifecycle Spec](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle) - Timeout and cancellation protocols
- [SEP-1539 Timeout Coordination](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1539) - Per-capability timeout declarations
- [MCP Server Development Guide](https://github.com/cyanheads/model-context-protocol-resources/blob/main/guides/mcp-server-development-guide.md) - Best practices

### Security & Credential Management

- [Infisical MCP Secrets](https://infisical.com/blog/managing-secrets-mcp-servers) - Secret injection patterns, per-server isolation
- [InfraCloud MCP Security](https://www.infracloud.io/blogs/securing-mcp-servers/) - OAuth 2.0, RBAC, tool-level permissions
- [Auth0 MCP Authorization](https://auth0.com/blog/an-introduction-to-mcp-and-authorization/) - Token passthrough prevention
- [Docker MCP Security](https://www.docker.com/blog/mcp-horror-stories-the-supply-chain-attack/) - Supply chain attack prevention
- [Windows MCP Security](https://blogs.windows.com/windowsexperience/2025/05/19/securing-the-model-context-protocol-building-a-safer-agentic-future-on-windows/) - Runtime isolation model

### Context Engineering

- [Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) - Foundation for progressive loading
- [Claude Agent Skills Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

### Related Projects

- [obra/superpowers](https://github.com/obra/superpowers) - Librarian pattern reference
- [Model Context Protocol](https://github.com/modelcontextprotocol) - Official MCP repository
- [node-code-sandbox-mcp](https://github.com/alfonsograziano/node-code-sandbox-mcp) - Docker sandboxing for MCP

---

## Current Status & TODO

### Completed

- [x] **Phase 1: TDD Enforcement** (9 items)
  - `create` only generates test file
  - `verify-red`, `generate-wrapper`, `verify-green` commands
  - Enforcement: wrapper blocked until RED passes

- [x] **Phase 2: Documentation** (4 items)
  - Renamed `tdd-workflow.md` to `new-workflow.md`
  - Fixed Phase 3 autoFixable flag
  - Standardized STEP vs PHASE naming
  - Updated SKILL.md workflow section

- [x] **Phase 3: Security** (6 items)
  - `withTimeout` in mcp-client.ts (118 test references)
  - `sanitize.ts` with validators (48 tests)
  - Security test template with 4 attack vector patterns
  - Phase 9 security validation (static analysis for dangerous patterns)
  - 11-phase audit system (includes Phase 10: TypeScript validation, Phase 11: Skill-Schema Sync)

- [x] **Phase 4: Architecture** (4 items)
  - **Sandboxing Options**: Research complete, implementation deferred (high complexity, low immediate value)
  - **Resource Limits**: IMPLEMENTED - `withTimeout`, `ResponseTooLargeError` (1MB default), exponential backoff retries
  - **Credential Binding**: IMPLEMENTED - `CredentialsFileSchema` validation, per-service isolation via `getToolConfig()`, audit logging
  - **Lazy Loading**: Research complete, not yet implemented (low priority)

- [x] **Phase 5: Test Fixes** (10 items)
  - context7, currents, praetorian-cli, linear wrappers Fixed
  - skill-manager phase13 tests Fixed
  - agent-manager cli Skipped (TDD spec for future CLI)

- [x] **Phase 6: Skill Generation** (5 items)
  - `generate-skill` command ported from archived `mcp-code-2-skill`
  - Auto-generates service skills from wrapper directories
  - Supports `--dry-run` for preview

- [x] **Gateway Skill Architecture**
  - Created `gateway-mcp-tools` in `.claude/skills/` (core skill)
  - Routes to 9 service skills in `.claude/skill-library/claude/mcp-tools/`
  - Single slot in 15K budget, unlimited library skills

- [x] **Phase 10: TypeScript Validation** (Nov 2024)
  - Added `phase10-typescript-validation.ts` to audit pipeline
  - Validates wrapper TypeScript patterns and imports

- [x] **Phase 11: Skill-Schema Sync** (Dec 2024)
  - Added `phase11-skill-schema-sync.ts` to audit pipeline
  - Auto-fixable: `npm run generate-skill` regenerates service skill from wrapper schemas
  - Ensures service skill documentation matches actual Zod schemas in wrappers

- [x] **Multi-Agent Wrapper Creation Architecture** (Jan 2025)
  - Replaced `creating-mcp-wrappers` with `orchestrating-mcp-development` (11-phase multi-agent workflow)
  - Added `orchestrating-api-tool-development` for REST API wrappers
  - Batched parallel execution for comprehensive service coverage
  - Quality gates: code review, coverage enforcement, audit validation

- [x] **Hybrid Wrapper Creation Architecture** (Dec 2024) - DEPRECATED
  - Originally split `tool-manager` into `managing-tool-wrappers` (lifecycle) + `creating-mcp-wrappers` (creation)
  - Superseded by orchestration-based approach in Jan 2025

- [x] **@claude/testing Library** (Dec 2024)
  - Shared testing infrastructure at `.claude/lib/testing/`
  - `createMCPMock()`, `MCPErrors`, response builders
  - 12 security attack vectors automated
  - Used by all MCP wrapper tests

- [x] **find-project-root.ts Utility** (Dec 2024)
  - Shared path resolution at `.claude/lib/find-project-root.ts`
  - Works from submodules, nested directories, any location
  - Used by all skills, wrappers, and tools

- [x] **Serena MCP Integration** (Jan 2025)
  - 23 wrappers for semantic code analysis via LSP
  - Connection pool architecture (`serena-pool.ts`) - reduces latency ~3-5s ~2ms
  - Semantic router for super-repo module targeting (`semantic-router.ts`)
  - Circuit breaker pattern (opens after 5 consecutive failures)
  - Super-repo configuration (`.serena/project.yml`)
  - Wrappers: Symbol operations, Memory system, File/Search, Config, Workflow helpers

- [x] **Shared Response Utilities** (Jan 2025)
  - `response-utils.ts` with truncation, pagination, field filtering
  - Standardized truncation presets (SHORT=200, MEDIUM=300, LONG=500)
  - Token estimation (~4 chars = 1 token)
  - Response normalization for inconsistent MCP formats

- [x] **Vitest Testing Infrastructure** (Jan 2025)
  - `vitest.config.ts`, `vitest.setup.ts`, `vitest.global-teardown.ts`
  - Global setup for MCP mock initialization
  - Proper cleanup to prevent hanging processes
  - Mock response builders in `@claude/testing`

### Test Coverage Summary

| Component                   | Tests | Location                                                                  |
| --------------------------- | ----- | ------------------------------------------------------------------------- |
| `mcp-client.ts`             | 118   | `.claude/tools/config/lib/mcp-client.unit.test.ts`                        |
| `sanitize.ts`               | 48    | `.claude/tools/config/lib/sanitize.unit.test.ts`                          |
| `config-loader.ts`          | 25    | `.claude/tools/config/config-loader.unit.test.ts`                         |
| `serena-pool.ts`            | -     | `.claude/tools/config/lib/serena-pool.ts` (see CONNECTION-POOL-DESIGN.md) |
| `vitest.setup.ts`           | 285   | `.claude/vitest.setup.unit.test.ts`                                       |
| `vitest.global-teardown.ts` | 301   | `.claude/vitest.global-teardown.unit.test.ts`                             |

### Pending

- [ ] **OAuth Migration** (Security Improvement)

  **Goal**: Replace API keys with OAuth where supported for improved security.

  **Why OAuth > API Keys**:

  | Aspect    | OAuth                          | API Keys                                    |
  | --------- | ------------------------------ | ------------------------------------------- |
  | Storage   | `~/.mcp-auth/` (outside repo)  | `credentials.json` + `.env` (repo-adjacent) |
  | Lifetime  | 7-day tokens, auto-refresh     | Permanent until manually revoked            |
  | Scopes    | Granular permissions           | Full account access                         |
  | Consent   | Explicit browser authorization | Silent/implicit                             |
  | If Leaked | Limited window, auto-expires   | Persistent access until discovered          |

  **Current Status**:

  | MCP      | Current Auth  | OAuth Available?                            | Priority |
  | -------- | ------------- | ------------------------------------------- | -------- |
  | Linear   | OAuth         | Yes (implemented)                           | Done     |
  | GitHub   | API Key (PAT) | Yes (investigate `mcp-remote` or OAuth MCP) | High     |
  | Currents | API Key       | Unknown (research needed)                   | Medium   |
  | Context7 | API Key       | Unknown (research needed)                   | Medium   |

  **Migration Pattern** (from Linear implementation):
  1. Check if service has remote MCP server with OAuth (like `mcp.linear.app`)
  2. Update `mcp-client.ts` to use `mcp-remote` with OAuth scopes
  3. Remove API key from `credentials.json`
  4. Update skill documentation with OAuth auth section
  5. Test OAuth flow end-to-end

  **Research Tasks**:
  - [ ] GitHub: Check for official GitHub remote MCP or OAuth-enabled MCP server
  - [ ] Currents: Check if Currents supports OAuth or has remote MCP
  - [ ] Context7: Check if Context7/Upstash supports OAuth
  - [ ] Generic: Document pattern for any new MCP that supports OAuth

  **References**:
  - [Linear OAuth Implementation](https://mcp.linear.app) - Reference implementation
  - [mcp-remote](https://www.npmjs.com/package/mcp-remote) - OAuth proxy for remote MCPs
  - [MCP Authorization Spec](https://modelcontextprotocol.io/specification/draft/basic/authorization)

- [ ] **Sandboxing Implementation** (Security Hardening)

  **Goal**: Isolate MCP execution to limit blast radius of compromised/malicious MCP servers.

  **Research Complete** (see Phase 4 Architecture):

  | Option                    | Isolation Level           | Trade-offs                  | Priority |
  | ------------------------- | ------------------------- | --------------------------- | -------- |
  | Docker containers         | Process + filesystem      | CVE risks, startup overhead | Medium   |
  | isolated-vm               | V8 isolate                | Limited npm support         | Low      |
  | Deno permissions          | Fine-grained capabilities | Different runtime           | Medium   |
  | Firecracker microVMs      | Hardware-level            | Complex setup               | Low      |
  | Windows Runtime Isolation | Declarative privileges    | Windows-only                | Low      |

  **Implementation Tasks**:
  - [ ] Choose sandboxing approach based on security/complexity trade-off
  - [ ] Implement sandbox wrapper for `callMCPTool()`
  - [ ] Add configuration for sandbox enable/disable per-service
  - [ ] Performance benchmarks (startup overhead, memory)
  - [ ] Security testing (escape attempts, resource limits)

  **References**:
  - [Docker MCP Security](https://www.docker.com/blog/mcp-horror-stories-the-supply-chain-attack/)
  - [Windows MCP Security](https://blogs.windows.com/windowsexperience/2025/05/19/securing-the-model-context-protocol-building-a-safer-agentic-future-on-windows/)
  - [node-code-sandbox-mcp](https://github.com/alfonsograziano/node-code-sandbox-mcp)

- [ ] **Response Chunking** (Resource Management)

  **Goal**: Handle large MCP responses gracefully instead of failing at 1MB limit.

  **Implementation Tasks**:
  - [ ] Detect responses approaching size limit
  - [ ] Split into chunks with continuation tokens
  - [ ] Streaming response support for large datasets

- [ ] **Lazy Loading Implementation** (Performance Optimization)

  **Goal**: Load wrappers on-demand when first called instead of at discovery time.

  **Pattern**: TypeScript dynamic `import()` with async/await

  ```typescript
  // Lazy load wrapper only when needed
  async function callWrapper(service: string, tool: string, params: any) {
    const wrapper = await import(`./${service}/${tool}.ts`);
    return wrapper.execute(params);
  }
  ```

  **Benefits**: Faster startup, reduced memory, code splitting
  **Compiler setting**: `--module esnext` for native dynamic imports
  **References**: [TypeScript Dynamic Imports](https://mariusschulz.com/blog/dynamic-import-expressions-in-typescript)
