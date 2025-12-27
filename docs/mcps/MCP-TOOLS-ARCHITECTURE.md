# MCP Tools Architecture

## The Problem

MCP (Model Context Protocol) servers represent the largest token sink in Claude Code. Unlike skills which load progressively, MCPs load eagerly—every tool definition, parameter schema, and description enters the context window at session start. With 5 MCP servers, 71,800 tokens were consumed before any work began, leaving only ~128K of a 200K context window for actual code and conversation. Anthropic's research warns that "context must be treated as a finite resource with diminishing marginal returns"—LLMs have an "attention budget" that degrades as token counts increase. Starting every session with 36% of context consumed puts agents in a degraded attention state before writing a single line of code.

MCP (Model Context Protocol) servers consume **10,000-20,000+ tokens EACH** at session start. When Claude Code loads MCP servers from `.mcp.json`, every tool definition, parameter schema, and description enters the context window immediately—before any work begins. With 5+ MCP servers, **71,800 tokens** were consumed at startup, leaving only ~130k tokens for actual work. This creates:

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

We implemented progressive loading for MCPs through TypeScript wrappers that achieve 0 tokens at session start while maintaining full functionality. A single gateway skill (gateway-mcp-tools) routes to service-specific skills in the library, which catalog available wrappers. When an agent needs an MCP tool, it executes a lightweight TypeScript wrapper (~50 tokens) that spawns the MCP connection on-demand, calls the tool, filters the response for token efficiency, and closes the connection. The MCP server runs as an external process—never entering Claude's context. The result: 92% reduction in MCP token costs (71,800 → ~5,500 for a typical 10-call session), with added benefits of Zod input validation, response size limits, and per-service credential isolation.

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

| MCP Server          | Tools   | Before (startup)  | After (startup) | Savings   |
|---------------------|---------|-------------------|-----------------|-----------|
| `praetorian-cli`    | 17      | 25,000 tokens     | 0 tokens        | **25k**   |
| `linear`            | 23      | 15,000 tokens     | 0 tokens        | **15k**   |
| `playwright`        | 25      | 14,000 tokens     | 0 tokens        | **14k**   |
| `currents`          | 8       | 8,000 tokens      | 0 tokens        | **8k**    |
| `context7`          | 2       | 2,000 tokens      | 0 tokens        | **2k**    |
| **TOTAL**           | **75+** | **64,000 tokens** | **0 tokens**    | **64k**   |

Additional savings from eliminated MCP infrastructure: **7,800 tokens**

**Total freed context: 71,800 tokens (7.2% of context window)**

---

## Skill Architecture (Gateway Pattern)

### Layer 1: MCP Manager (Lifecycle)

**Location**: `.claude/skills/mcp-manager/`

**Purpose**: Create, test, audit, and maintain MCP wrappers with mandatory TDD enforcement.

> **See [MCP Manager](#mcp-manager) section below for complete documentation** including TDD workflow, 10-phase audit system, directory structure, and CLI reference.

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

| Component               | Location                 | Discovery Cost      | Execution Cost        |
|-------------------------|--------------------------|---------------------|-----------------------|
| `gateway-mcp-tools`     | `.claude/skills/`        | ~100 chars (1 slot) | ~500 tokens           |
| `mcp-tools-{service}`   | `.claude/skill-library/` | 0 (library)         | ~300-500 tokens       |
| `mcp-tools-registry`    | `.claude/skill-library/` | 0 (library)         | ~1500 tokens          |
| TypeScript wrappers     | `.claude/tools/`         | 0                   | ~50-100 tokens each   |
| MCP servers             | (spawned on-demand)      | 0                   | 0 (external process)  |

**Total at session start: 1 slot (~100 chars) vs legacy 71.8k tokens**

---

## How It Works Together

### Creating a New MCP Wrapper

```
User: /mcp-manager new linear get-issue

1. Command routes to mcp-manager skill
2. Skill executes TDD workflow:
   a. npm run create -- linear get-issue
      → Generates test file ONLY
   b. npm run verify-red -- linear/get-issue
      → Confirms tests fail (no implementation)
   c. npm run generate-wrapper -- linear/get-issue
      → Creates wrapper from template (blocked until RED passes)
   d. npm run verify-green -- linear/get-issue
      → Confirms tests pass with ≥80% coverage
3. npm run generate-skill -- linear
   → Creates/updates mcp-tools-linear skill
4. Agents can now discover and use the new wrapper
```

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

## MCP Manager

The MCP Manager is the lifecycle management system for MCP wrappers. It enforces Test-Driven Development (TDD), validates compliance across 10 phases, and provides tooling for creating, updating, auditing, and fixing wrappers.

### Overview

| Aspect           | Details                                                    |
|------------------|-----------------------------------------------------------|
| **Location**     | `.claude/skills/mcp-manager/`                              |
| **Purpose**      | Create, test, audit, and maintain MCP wrappers             |
| **Philosophy**   | TDD-first: tests must exist and fail before implementation |
| **Coverage**     | Minimum 80% unit test coverage required                    |
| **Invocation**   | Via `/mcp-manager` command or `mcp-manager` skill          |

### Directory Structure

```
.claude/skills/mcp-manager/
├── SKILL.md                    # Main skill documentation
├── scripts/
│   ├── src/
│   │   ├── cli.ts              # CLI entry point
│   │   ├── tdd-enforcer.ts     # RED/GREEN phase enforcement
│   │   ├── types.ts            # Shared TypeScript types
│   │   ├── utils.ts            # Shared utilities
│   │   ├── operations/         # CLI command implementations
│   │   │   ├── verify-red.ts   # RED phase verification
│   │   │   ├── verify-green.ts # GREEN phase verification
│   │   │   └── test.ts         # Test runner
│   │   ├── phases/             # 10 audit phase implementations
│   │   │   ├── phase1-schema-discovery.ts
│   │   │   ├── phase2-optional-fields.ts
│   │   │   ├── phase3-type-unions.ts
│   │   │   ├── phase4-nested-access.ts
│   │   │   ├── phase5-reference-validation.ts
│   │   │   ├── phase6-unit-coverage.ts
│   │   │   ├── phase7-integration-tests.ts
│   │   │   ├── phase8-test-quality.ts
│   │   │   ├── phase9-security-validation.ts
│   │   │   └── phase10-typescript-validation.ts
│   │   └── fixers/             # Auto-fix implementations
│   │       ├── phase2-fixer.ts
│   │       ├── phase3-fixer.ts
│   │       └── phase4-fixer.ts
│   ├── package.json
│   └── node_modules/
├── templates/
│   ├── discover-schema.ts      # Schema discovery script template
│   ├── tool-wrapper.ts.tmpl    # Wrapper implementation template
│   ├── unit-test.ts.tmpl       # Unit test template
│   └── tsconfig.json.tmpl      # TypeScript config template (auto-applied by create)
├── references/                 # Workflow documentation
└── examples/                   # Example wrappers
```

### TDD Workflow (Enforced)

The MCP Manager enforces a strict Red-Green-Refactor cycle. You cannot generate a wrapper until tests exist and fail.

```
┌─────────────────────────────────────────────────────────────┐
│                    🔴 RED Phase                              │
│  1. npm run create -- <service> <tool>                      │
│     → Generates test file ONLY (no wrapper)                 │
│  2. npm run verify-red -- <service>/<tool>                  │
│     → Confirms tests FAIL (proves tests work)               │
└─────────────────────┬───────────────────────────────────────┘
                      │ Blocked until RED passes
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    🟢 GREEN Phase                            │
│  3. npm run generate-wrapper -- <service>/<tool>            │
│     → Creates wrapper from template                         │
│  4. npm run verify-green -- <service>/<tool>                │
│     → Confirms tests PASS with ≥80% coverage                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    🔵 REFACTOR Phase                         │
│  5. Add integration tests (optional, recommended)           │
│  6. Optimize implementation (token reduction, security)     │
│  7. Re-run verify-green (must stay green)                   │
└─────────────────────────────────────────────────────────────┘
```

**Key Enforcement**:

- `create` generates test file + `tsconfig.json` (if new service), NOT wrapper
- `generate-wrapper` checks RED phase first, **blocks if not verified**
- `verify-green` requires ≥80% unit test coverage

### The 10 Audit Phases

MCP wrappers must pass compliance validation across 10 phases:

| Phase | Name                   | Auto-Fix | Description                                                  |
|-------|------------------------|----------|--------------------------------------------------------------|
| 1     | Schema Discovery       | ❌       | Validates discovery docs exist for MCP tool                  |
| 2     | Optional Fields        | ✅       | Tests verify `.optional()` Zod usage                         |
| 3     | Type Unions            | ❌       | Tests cover `z.union()` edge cases                           |
| 4     | Nested Access Safety   | ✅       | Tests catch unsafe property access                           |
| 5     | Reference Validation   | ❌       | Detects deprecated MCP tool references                       |
| 6     | Unit Test Coverage     | ❌       | **≥80% coverage required**                                   |
| 7     | Integration Tests      | ❌       | Tests with real MCP server (recommended)                     |
| 8     | Test Quality           | ❌       | Validates test patterns and structure                        |
| 9     | Security Validation    | ❌       | Scans for dangerous patterns (eval, hardcoded keys)          |
| 10    | TypeScript Validation  | ❌       | **CRITICAL if tsconfig.json missing**; detects type errors   |

> **STEPS vs PHASES Clarification:**
>
> - **Workflow STEPS** (1-7): Sequential CLI commands you execute
> - **Audit PHASES** (1-10): Compliance categories checked by `npm run audit`

### CLI Reference

All commands run from the scripts directory:

```bash
cd .claude/skills/mcp-manager/scripts
```

#### TDD Workflow Commands

| Command                                        | Description                                  |
|------------------------------------------------|----------------------------------------------|
| `npm run create -- <service> <tool>`           | Generate test file only (RED phase setup)    |
| `npm run verify-red -- <service>/<tool>`       | Verify tests fail (proves tests work)        |
| `npm run generate-wrapper -- <service>/<tool>` | Generate wrapper (blocked until RED passes)  |
| `npm run verify-green -- <service>/<tool>`     | Verify tests pass with ≥80% coverage         |

#### Maintenance Commands

| Command                                     | Description                             |
|---------------------------------------------|-----------------------------------------|
| `npm run update -- <service> <tool>`        | Update existing wrapper (test-guarded)  |
| `npm run audit -- <service>/<tool>`         | Run 10-phase compliance check           |
| `npm run audit -- --all`                    | Audit all wrappers                      |
| `npm run audit -- --service <service>`      | Audit all wrappers in a service         |
| `npm run fix -- <service>/<tool>`           | Auto-fix issues (phases 2, 4)           |
| `npm run fix -- <service>/<tool> --dry-run` | Preview fixes without applying          |
| `npm run test -- <service>/<tool>`          | Run test suite for wrapper              |
| `npm run generate-skill -- <service>`       | Generate/update service skill           |

#### Example: Creating a New Wrapper

```bash
# 1. Setup
cd .claude/skills/mcp-manager/scripts
npm install

# 2. RED Phase - Create tests first
npm run create -- linear get-issue
# Edit the generated test file with expected behavior
npm run verify-red -- linear/get-issue
# ✅ Tests fail (expected - no implementation yet)

# 3. GREEN Phase - Implement wrapper
npm run generate-wrapper -- linear/get-issue
# Implement the wrapper logic
npm run verify-green -- linear/get-issue
# ✅ Tests pass with 85% coverage

# 4. Generate service skill for agent access
npm run generate-skill -- linear
# ✅ Updated .claude/skill-library/claude/mcp-tools/mcp-tools-linear/SKILL.md
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

## Security Considerations

MCP wrappers execute external code and handle credentials, creating a significant attack surface. This section documents our security model and controls.

### Threat Model

| Threat                  | Attack Vector                             | Impact                                    |
|-------------------------|-------------------------------------------|-------------------------------------------|
| **Injection attacks**   | Malicious input passed to MCP tools       | Command execution, data exfiltration      |
| **Credential leakage**  | API keys in code, logs, or error messages | Unauthorized access to external services  |
| **Resource exhaustion** | Unbounded responses, hanging connections  | Memory exhaustion, denial of service      |
| **Supply chain**        | Compromised MCP server or dependency      | Full system compromise                    |

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

| Control         | Implementation                               | Default                |
|-----------------|----------------------------------------------|------------------------|
| **Timeout**     | `withTimeout()` wrapper aborts hanging calls | 30 seconds             |
| **Size limit**  | `ResponseTooLargeError` if exceeded          | 1MB                    |
| **Retries**     | Exponential backoff for transient failures   | 3 retries (1s, 2s, 4s) |
| **Filtering**   | Wrappers return only essential fields        | Per-wrapper            |

### Credential Management

| Principle                   | Implementation                                                   |
|-----------------------------|------------------------------------------------------------------|
| **No credentials in code**  | All credentials in `credentials.json` or OAuth tokens            |
| **Per-service isolation**   | `getToolConfig(service)` returns ONLY that service's credentials |
| **OAuth preferred**         | Linear uses OAuth; API keys only where OAuth unavailable         |
| **Token storage**           | OAuth tokens in `~/.mcp-auth/` (outside repo)                    |
| **Audit logging**           | Optional via `AUDIT_MCP_CALLS` environment variable              |

### Code Quality

**Static analysis** (Phase 9 audit) scans wrappers for:

- `eval()` or `Function()` constructor usage
- Hardcoded credentials or API keys
- Missing security helper imports

**Test requirements**:

- ≥80% coverage for all wrappers
- Security test template with 4 attack vector categories
- Integration tests with real MCP servers

### Future: Sandboxing

MCP execution currently runs in the same process as the wrapper. Sandboxing options have been researched but implementation is deferred due to complexity:

| Option                | Isolation                 | Trade-offs                  |
|-----------------------|---------------------------|-----------------------------|
| Docker containers     | Process + filesystem      | CVE risks, startup overhead |
| isolated-vm           | V8 isolate                | Limited npm support         |
| Deno permissions      | Fine-grained capabilities | Different runtime           |
| Firecracker microVMs  | Hardware-level            | Complex setup               |

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
2. **Run TDD workflow** via mcp-manager
3. **Generate service skill** for agent access
4. **Remove MCP** from `.mcp.json`
5. **Update agents** to use wrapper skill

## Quick Reference

### MCP Manager Commands

See [MCP Manager](#mcp-manager) section for complete CLI reference.

```bash
cd .claude/skills/mcp-manager/scripts

# TDD Workflow
npm run create -- <service> <tool>           # 1. Test file only
npm run verify-red -- <service>/<tool>       # 2. Tests fail
npm run generate-wrapper -- <service>/<tool> # 3. Wrapper created
npm run verify-green -- <service>/<tool>     # 4. Tests pass
npm run generate-skill -- <service>          # 5. Update service skill

# Maintenance
npm run audit -- <service>/<tool>            # 10-phase compliance check
npm run audit -- --all                       # Audit all wrappers
npm run fix -- <service>/<tool>              # Auto-fix issues
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
- **MCP Manager**: `.claude/skills/mcp-manager/SKILL.md` (lifecycle management)
- **Registry Skill**: `.claude/skill-library/claude/mcp-tools/mcp-tools-registry/SKILL.md` (detailed usage)
- **Service Skills**: `.claude/skill-library/claude/mcp-tools/mcp-tools-{service}/SKILL.md`
- **Skills Architecture**: `docs/SKILLS-ARCHITECTURE.md` (gateway pattern reference)
- **Corrections Plan**: `docs/plans/mcp-tool-corrections.md`

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
  - 10-phase audit system (includes Phase 10: TypeScript validation)

- [x] **Phase 4: Architecture** (4 items)
  - **Sandboxing Options**: Research complete, implementation deferred (high complexity, low immediate value)
  - **Resource Limits**: ✅ IMPLEMENTED - `withTimeout`, `ResponseTooLargeError` (1MB default), exponential backoff retries
  - **Credential Binding**: ✅ IMPLEMENTED - `CredentialsFileSchema` validation, per-service isolation via `getToolConfig()`, audit logging
  - **Lazy Loading**: Research complete, not yet implemented (low priority)

- [x] **Phase 5: Test Fixes** (10 items)
  - context7, currents, praetorian-cli, linear wrappers → Fixed
  - skill-manager phase13 tests → Fixed
  - agent-manager cli → Skipped (TDD spec for future CLI)

- [x] **Phase 6: Skill Generation** (5 items)
  - `generate-skill` command ported from archived `mcp-code-2-skill`
  - Auto-generates service skills from wrapper directories
  - Supports `--dry-run` for preview

- [x] **Gateway Skill Architecture**
  - Created `gateway-mcp-tools` in `.claude/skills/` (core skill)
  - Routes to 8 service skills in `.claude/skill-library/claude/mcp-tools/`
  - Single slot in 15K budget, unlimited library skills

- [x] **Phase 10: TypeScript Validation** (Nov 2024)
  - Added `phase10-typescript-validation.ts` to audit pipeline
  - Validates wrapper TypeScript patterns and imports

### Test Coverage Summary

| Component         | Tests | Location                                           |
|-------------------|-------|----------------------------------------------------|
| `mcp-client.ts`   | 118   | `.claude/tools/config/lib/mcp-client.unit.test.ts` |
| `sanitize.ts`     | 48    | `.claude/tools/config/lib/sanitize.unit.test.ts`   |
| `config-loader.ts`| 25    | `.claude/tools/config/config-loader.unit.test.ts`  |

### Pending

- [ ] **OAuth Migration** (Security Improvement)

  **Goal**: Replace API keys with OAuth where supported for improved security.

  **Why OAuth > API Keys**:

  | Aspect     | OAuth                            | API Keys                                 |
  |------------|----------------------------------|------------------------------------------|
  | Storage    | `~/.mcp-auth/` (outside repo)    | `credentials.json` + `.env` (repo-adjacent) |
  | Lifetime   | 7-day tokens, auto-refresh       | Permanent until manually revoked         |
  | Scopes     | Granular permissions             | Full account access                      |
  | Consent    | Explicit browser authorization   | Silent/implicit                          |
  | If Leaked  | Limited window, auto-expires     | Persistent access until discovered       |

  **Current Status**:

  | MCP      | Current Auth  | OAuth Available?                           | Priority |
  |----------|---------------|--------------------------------------------|----------|
  | Linear   | ✅ OAuth      | Yes (implemented)                          | Done     |
  | GitHub   | API Key (PAT) | Yes (investigate `mcp-remote` or OAuth MCP) | High     |
  | Currents | API Key       | Unknown (research needed)                  | Medium   |
  | Context7 | API Key       | Unknown (research needed)                  | Medium   |

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

  | Option                    | Isolation Level           | Trade-offs                 | Priority |
  |---------------------------|---------------------------|----------------------------|----------|
  | Docker containers         | Process + filesystem      | CVE risks, startup overhead | Medium   |
  | isolated-vm               | V8 isolate                | Limited npm support        | Low      |
  | Deno permissions          | Fine-grained capabilities | Different runtime          | Medium   |
  | Firecracker microVMs      | Hardware-level            | Complex setup              | Low      |
  | Windows Runtime Isolation | Declarative privileges    | Windows-only               | Low      |

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
