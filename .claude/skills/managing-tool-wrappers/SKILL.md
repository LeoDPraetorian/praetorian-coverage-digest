---
name: managing-tool-wrappers
description: Use when creating, updating, auditing, fixing, or listing MCP wrappers or REST API wrappers - enforces TDD (tests first), validates compliance (12 phases), supports batch operations. Handles errors like "ENOENT", "validation failed", "coverage below 80%", "RED phase not verified", TypeScript errors. Manages wrapper.ts files, test.ts files, schema discovery docs. Works with MCP servers (context7, perplexity) and REST APIs (shodan, linear). CLI-based with mandatory ≥80% test coverage.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion
---

# Tool Wrapper Lifecycle Manager

**Complete wrapper lifecycle for MCP servers and REST APIs with mandatory TDD enforcement.**

**You MUST use TodoWrite before starting to track all steps in this workflow.**

## Quick Reference

| Operation          | Routes To                      | Time      |
| ------------------ | ------------------------------ | --------- |
| **Create**         | orchestrating-mcp-development  | 30-60 min |
| **Update**         | updating-tool-wrappers         | 10-20 min |
| **Audit**          | auditing-tool-wrappers         | 2-30 min  |
| **Fix**            | fixing-tool-wrappers           | 5-15 min  |
| **Test**           | testing-mcp-wrappers           | 1-10 min  |
| **List**           | listing-tools                  | 1 min     |
| **Generate Skill** | (keep inline - simple command) | ~5 sec    |

## Understanding This Skill (Two-Tier System)

**How you got here**: You invoked this skill via Skill tool:

```
skill: "managing-tool-wrappers"
```

**What this skill provides**: A routing table to specialized tool wrapper operations in the library skill system.

**Critical: Two-Tier Skill Access**

| Skill                             | Location                                                   | How to Invoke                                                                                          |
| --------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **orchestrating-mcp-development** | `.claude/skill-library/.../orchestrating-mcp-development/` | `Read(".claude/skill-library/claude/mcp-management/orchestrating-mcp-development/SKILL.md")` (LIBRARY) |
| **updating-tool-wrappers**        | `.claude/skill-library/.../updating-tool-wrappers/`        | `Read(".claude/skill-library/claude/mcp-management/updating-tool-wrappers/SKILL.md")` (LIBRARY)        |
| **auditing-tool-wrappers**        | `.claude/skill-library/.../auditing-tool-wrappers/`        | `Read(".claude/skill-library/claude/mcp-management/auditing-tool-wrappers/SKILL.md")` (LIBRARY)        |
| **fixing-tool-wrappers**          | `.claude/skill-library/.../fixing-tool-wrappers/`          | `Read(".claude/skill-library/claude/mcp-management/fixing-tool-wrappers/SKILL.md")` (LIBRARY)          |
| **testing-mcp-wrappers**          | `.claude/skill-library/.../testing-mcp-wrappers/`          | `Read(".claude/skill-library/claude/mcp-management/testing-mcp-wrappers/SKILL.md")` (LIBRARY)          |
| **listing-tools**                 | `.claude/skill-library/.../listing-tools/`                 | `Read(".claude/skill-library/claude/mcp-management/listing-tools/SKILL.md")` (LIBRARY)                 |

<IMPORTANT>
Library skills listed above are NOT available via Skill tool.
You MUST use Read tool to load them.

❌ WRONG: `skill: "updating-tool-wrappers"` ← Will fail, not a core skill
✅ RIGHT: `Read(".claude/skill-library/claude/mcp-management/updating-tool-wrappers/SKILL.md")`
</IMPORTANT>

## Router Architecture

**managing-tool-wrappers is a pure router.** It delegates all operations to specialized library skills.

### Delegation Map

| When user says...                   | Delegate to...                  | Implementation                    |
| ----------------------------------- | ------------------------------- | --------------------------------- |
| "create wrapper", "new tool"        | `orchestrating-mcp-development` | 11-phase orchestrated workflow    |
| "update wrapper", "modify tool"     | `updating-tool-wrappers`        | Test-guarded TDD updates          |
| "audit wrapper", "check compliance" | `auditing-tool-wrappers`        | 12-phase compliance validation    |
| "fix wrapper", "remediate"          | `fixing-tool-wrappers`          | Auto-fix deterministic issues     |
| "test wrapper", "run tests"         | `testing-mcp-wrappers`          | Unit + integration test execution |
| "list tools", "show tools"          | `listing-tools`                 | Display all MCP tool services     |

## Prerequisites

**Workspace setup:**

```bash
# Navigate to workspace from any location
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT/.claude/skills/managing-tool-wrappers/scripts"
npm install
```

**MCP Server Required:** This pattern requires functional MCP server

```bash
npx -y @modelcontextprotocol/server-{mcp-name} --version
```

## Shared Infrastructure

Testing utilities are in `@claude/testing` package (`.claude/lib/testing/`):

- **MCP mocks**: `createMCPMock()`, `MCPErrors`
- **Security tests**: `testSecurityScenarios()`, `getAllSecurityScenarios()`
- **Test templates**: `src/templates/unit-test.template.ts`
- **Response builders**: `src/mocks/response-builders.ts`

**Run tests from workspace root:**

```bash
cd .claude && npm run test:run
```

**See:** `.claude/lib/testing/README.md` for complete documentation

## Tool Usage

**Router tools** (used by managing-tool-wrappers directly):

- **Read** - Load delegated library skills
- **Bash** - Execute system commands for file operations
- **Grep/Glob** - Discover and validate wrappers
- **TodoWrite** - Track multi-phase workflows (MANDATORY)
- **Skill** - Invoke core skills (e.g., `skill: "using-skills"`)
- **AskUserQuestion** - Interactive confirmations

**Delegated tools** (used by library skills, not the router):

- Write, Edit - Content modifications (used by updating-tool-wrappers, fixing-tool-wrappers)
- Task - Agent orchestration (used by orchestrating-mcp-development for parallel agents)

## Operations

This skill routes to 6 specialized operations. Each operation has comprehensive workflows, CLI commands, and safety protocols in their respective library skills.

**Operation summary:**

- **Create** - Multi-agent orchestration workflow via `orchestrating-mcp-development`
- **Update** - Test-guarded TDD update workflow via `updating-tool-wrappers`
- **Audit** - 12-phase compliance validation via `auditing-tool-wrappers`
- **Fix** - Auto-fix deterministic issues via `fixing-tool-wrappers`
- **Test** - Unit + integration testing via `testing-mcp-wrappers`
- **List** - Display all MCP services via `listing-tools`

### Generate Skill (Agent Access Control)

**Creates service-specific skill for granular agent access.**

After creating wrappers, generate a skill so agents can discover and use them:

```bash
# Generate skill for service (scans .claude/tools/{service}/)
npm run generate-skill -- <service>

# Preview without writing
npm run generate-skill -- <service> --dry-run
```

**Output:** `.claude/skill-library/claude/mcp-tools/mcp-tools-{service}/SKILL.md`

**What it does:**

- Scans `.claude/tools/{service}/` for wrapper files
- Extracts metadata (name, export, purpose, tokens)
- **Extracts Zod schemas (InputSchema, OutputSchema) and generates TypeScript interface documentation**
- Generates skill with tool catalog + schema documentation
- Enables granular agent access control

**When to run:**

- After creating new wrappers (`verify-green` passes)
- After adding tools to existing service
- After updating wrapper metadata
- **When Phase 11 audit detects schema mismatches** (run via fix command)

**Why service-specific skills matter:**

- Agent with `mcp-tools-linear`: Can access Linear tools
- Agent without `mcp-tools-linear`: Cannot discover Linear tools
- Principle of least privilege: Grant only needed service access

## Progressive Disclosure

**Quick Start (15 min):**

- Route to appropriate library skill
- Follow delegated workflow
- Use TodoWrite for tracking

**Comprehensive (60 min):**

- Full TDD cycles via orchestrating-mcp-development
- Compliance validation via auditing-tool-wrappers
- Test-guarded updates via updating-tool-wrappers

**Deep Dives (library skills):**

Load via Read tool:

- `orchestrating-mcp-development` - Complete creation workflow
- `updating-tool-wrappers` - Update methodology
- `auditing-tool-wrappers` - 12-phase validation
- `fixing-tool-wrappers` - Remediation patterns
- `testing-mcp-wrappers` - Test execution
- `listing-tools` - Service discovery

## Example Wrappers

**Existing implementations in `.claude/tools/`:**

**MCP Wrappers** (use `callMCPTool` from mcp-client):

- `context7/` - Context7 documentation library
- `perplexity/` - Perplexity AI research
- `praetorian-cli/` - Chariot platform API
- `currents/` - Currents test reporting

**API Wrappers** (use `createHTTPClient` from http-client):

- `shodan/` - Shodan security search engine
- `linear/` - Linear project management (GraphQL API)

## Migration from Old Skills

This skill consolidates:

- `mcp-code-write` → use `npm run create` or `npm run update`
- `mcp-code-compliance` → use `npm run audit`
- `mcp-code-audit` → use `npm run audit -- --all`
- `mcp-code-fix` → use `npm run fix`
- `mcp-code-test` → use `npm run test`
- `mcp-code-2-skill` → use `npm run generate-skill`

**See:** `.claude/skill-library/lib/deprecation-registry.json` for redirect mappings

## Key Principles

1. **Router Pattern** - `/tool-manager` command delegates to this skill
2. **Pure Delegation** - All operations route to specialized library skills
3. **TDD Always** - Enforced via orchestrating-mcp-development workflow
4. **Coverage Required** - ≥80% validated via auditing-tool-wrappers
5. **Progressive Disclosure** - Lean SKILL.md + detailed library skills
6. **TodoWrite Tracking** - You MUST use TodoWrite before starting to track all workflow steps

## Error Handling

### Tool Errors vs Violations

When CLI commands fail, distinguish between:

**Tool Errors (Technical Failures):**

```
[Tool Error] ENOENT: File not found at .claude/tools/service/tool.ts
[Tool Error] npm ERR! missing script: create
[Tool Error] TypeScript compilation failed: Type 'string' is not assignable to type 'number'
```

**Violations (Policy/Standard Failures):**

```
❌ Coverage below 80% (current: 65%)
❌ RED phase not verified - run `npm run verify-red` first
❌ Phase 2: Optional field 'status' missing .optional() in schema
```

**Display format:**

- Prefix all technical errors with `[Tool Error]`
- Display violations as-is (already formatted by CLI)
- Always suggest corrective action

**Example Error Response:**

```
[Tool Error] Command failed: npm run create -- context7 get-docs

This is a tool execution error, not a compliance violation.

Possible causes:
1. Not in correct directory (need .claude/skills/managing-tool-wrappers/scripts)
2. npm dependencies not installed
3. Invalid service/tool name format

Corrective action:
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT/.claude/skills/managing-tool-wrappers/scripts" && npm install
```

## Related Skills

| Skill                             | Access Method                                                                                          | Purpose                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| **orchestrating-mcp-development** | `Read(".claude/skill-library/claude/mcp-management/orchestrating-mcp-development/SKILL.md")` (LIBRARY) | 11-phase orchestrated wrapper creation          |
| **updating-tool-wrappers**        | `Read(".claude/skill-library/claude/mcp-management/updating-tool-wrappers/SKILL.md")` (LIBRARY)        | Test-guarded TDD update workflow                |
| **auditing-tool-wrappers**        | `Read(".claude/skill-library/claude/mcp-management/auditing-tool-wrappers/SKILL.md")` (LIBRARY)        | 12-phase compliance validation                  |
| **fixing-tool-wrappers**          | `Read(".claude/skill-library/claude/mcp-management/fixing-tool-wrappers/SKILL.md")` (LIBRARY)          | Automated compliance remediation                |
| **testing-mcp-wrappers**          | `Read(".claude/skill-library/claude/mcp-management/testing-mcp-wrappers/SKILL.md")` (LIBRARY)          | Unit + integration test execution               |
| **listing-tools**                 | `Read(".claude/skill-library/claude/mcp-management/listing-tools/SKILL.md")` (LIBRARY)                 | Display all MCP tool services with descriptions |
| **developing-with-tdd**           | `skill: "developing-with-tdd"` (CORE)                                                                  | TDD methodology and best practices              |
| **debugging-systematically**      | `skill: "debugging-systematically"` (CORE)                                                             | When wrappers fail in production                |
| **verifying-before-completion**   | `skill: "verifying-before-completion"` (CORE)                                                          | Final validation checklist                      |
