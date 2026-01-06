---
name: managing-mcp-wrappers
description: Use when creating, updating, auditing, or fixing MCP wrappers - enforces TDD (tests first), validates compliance (10 phases), supports batch operations. Handles errors like "ENOENT", "validation failed", "coverage below 80%", "RED phase not verified", TypeScript errors. Manages wrapper.ts files, test.ts files, schema discovery docs. Works with MCP servers (context7, praetorian-cli, linear). CLI-based with mandatory ≥80% test coverage.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite
---

# MCP Wrapper Lifecycle Manager

**Complete MCP wrapper lifecycle with mandatory TDD enforcement.**

**You MUST use TodoWrite before starting to track all steps in this workflow.**

## Quick Reference

### Create Workflow (Instruction-Driven)

| Operation  | Method                                          | Time      |
| ---------- | ----------------------------------------------- | --------- |
| **Create** | Routes to `orchestrating-mcp-development` skill | 30-60 min |
| Update     | `npm run update -- <service> <tool>`            | 10-20 min |
| Audit      | `npm run audit -- <service>/<tool>`             | 2-5 min   |

### TDD Workflow (CLI Gates - Used by orchestrating-mcp-development)

| Step            | Command                                        | What It Does                            |
| --------------- | ---------------------------------------------- | --------------------------------------- |
| 1. Verify RED   | `npm run verify-red -- <service>/<tool>`       | Confirms tests fail (mechanical)        |
| 2. Generate     | `npm run generate-wrapper -- <service>/<tool>` | Creates wrapper (blocks if RED fails)   |
| 3. Verify GREEN | `npm run verify-green -- <service>/<tool>`     | Confirms tests pass (≥80%) (mechanical) |

### Other Operations

| Operation      | Command                               | Time      |
| -------------- | ------------------------------------- | --------- |
| Update         | `npm run update -- <service> <tool>`  | 10-20 min |
| Audit          | `npm run audit -- <service>/<tool>`   | 2-5 min   |
| Audit Service  | `npm run audit -- <service>`          | 5-15 min  |
| Audit All      | `npm run audit -- --all`              | 5-30 min  |
| Audit Phase    | `npm run audit -- <name> --phase N`   | 1-2 min   |
| Fix            | `npm run fix -- <name> [--dry-run]`   | 5-15 min  |
| Fix Phase      | `npm run fix -- <name> --phase N`     | 2-5 min   |
| Test           | `npm run test -- <name> [--coverage]` | 1-10 min  |
| Generate Skill | `npm run generate-skill -- <service>` | ~5 sec    |

## Prerequisites

**Workspace setup:**

```bash
# Navigate to workspace from any location
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT/.claude/skills/managing-mcp-wrappers/scripts"
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

## TDD Workflow (ENFORCED)

### 🔴 RED Phase (Tests First)

```bash
npm run create -- <service> <tool>       # 1. Generate test file ONLY
# Edit tests based on schema discovery
npm run verify-red -- <service>/<tool>   # 2. MUST FAIL (no implementation)
```

### 🟢 GREEN Phase (Minimal Implementation)

```bash
npm run generate-wrapper -- <service>/<tool>  # 3. Generate wrapper (blocks if RED fails)
# Implement wrapper to pass tests
npm run verify-green -- <service>/<tool>      # 4. MUST PASS with ≥80% coverage
```

### 🔵 REFACTOR Phase (Optimization)

5. Add integration tests (optional, recommended)
6. Optimize implementation (token reduction, security)
7. Re-run `verify-green` (must stay green)

**`generate-wrapper` will NOT run until `verify-red` passes.**

## The 11 Audit Phases

| Phase | Name                             | Auto-Fix  | TDD Integration                                    |
| ----- | -------------------------------- | --------- | -------------------------------------------------- |
| 1     | Schema Discovery                 | ❌ Manual | Validates discovery docs exist                     |
| 2     | Optional Fields                  | ✅ Yes    | Tests verify .optional() usage                     |
| 3     | Type Unions                      | ❌ Manual | Tests cover z.union() cases                        |
| 4     | Nested Access Safety             | ✅ Yes    | Tests catch unsafe access                          |
| 5     | Reference Validation             | ❌ Manual | Deprecated tool detection                          |
| 6     | **Unit Test Coverage**           | ❌ Manual | **≥80% required**                                  |
| 7     | **Integration Tests**            | ❌ Manual | **Recommended**                                    |
| 8     | **Test Quality**                 | ❌ Manual | **Pattern validation**                             |
| 9     | **Security Validation**          | ❌ Manual | **Dangerous pattern detection**                    |
| 10    | **TypeScript Validation**        | ❌ Manual | **CRITICAL if tsconfig.json missing**; type errors |
| 11    | **Skill-Schema Synchronization** | ✅ Yes    | **Service skill matches wrapper schemas**          |

> **STEPS vs PHASES Clarification:**
>
> - **Workflow STEPS** (1-4 or 1-7): Sequential CLI commands you execute (create, verify-red, generate-wrapper, verify-green)
> - **Audit PHASES** (1-11): Compliance validation categories checked by `npm run audit`
>
> Don't confuse them: Steps are what you DO, Phases are what the audit CHECKS.

**Audit Checklist:**

When auditing wrappers, verify:

- [ ] Tests use `@claude/testing` imports (not custom mocks)
- [ ] Response builder added to `response-builders.ts`
- [ ] Tests run from `.claude/` workspace root

## Operations

### Create (Routes to orchestrating-mcp-development)

**Wrapper creation uses multi-agent orchestration for 100% tool coverage.**

Load the orchestration skill:

```
Read(".claude/skill-library/claude/mcp-management/orchestrating-mcp-development/SKILL.md")
```

The `orchestrating-mcp-development` skill provides:

1. **Phase 0-1**: Setup workspace and configure MCP server
2. **Phase 2**: Tool discovery - find ALL tools in the MCP service
3. **Phase 3**: Shared architecture design (mcp-tool-lead + security-lead in PARALLEL)
4. **Phase 4**: Per-tool architecture + test planning (BATCHED, 3-5 tools)
5. **Phase 5**: RED Gate - all tests must fail
6. **Phase 6**: Implementation (mcp-tool-developer, BATCHED)
7. **Phase 7**: Code review (mcp-tool-reviewer, max 1 retry per tool)
8. **Phase 8**: GREEN Gate - all tests pass with ≥80% coverage
9. **Phase 9**: Audit - all wrappers pass ≥10/11 phases
10. **Phase 10**: Completion - generate service skill

**Why multi-agent orchestration?**

- **100% tool coverage** - wraps ALL tools in an MCP service
- **Shared patterns** - consistent architecture across all wrappers
- **Batched parallel execution** - efficient processing of multiple tools
- **Quality gates** - human checkpoint, code review, coverage enforcement
- **CLI gates still enforce mechanical TDD** (verify-red, verify-green unchanged)

**After creation, verify compliance:**

```bash
npm run audit -- {service}
# Target: ≥10/11 phases pass for ALL wrappers
```

**See**: `orchestrating-mcp-development` skill for complete 11-phase workflow

### Update (Test-Guarded Changes)

**Ensures no regressions via test suite.**

```bash
npm run update -- <service> <tool> --add-field <field>
```

**Workflow:**

1. **Update Tests** - Add tests for new behavior (RED)
2. **Schema Discovery** - Test new field with 3+ cases
3. **Update Implementation** - Modify wrapper (GREEN)
4. **Verify** - All tests pass, no regressions
5. **Audit** - Re-validate 10 phases

**See:** [references/update-workflow.md](references/update-workflow.md)

### Audit (10-Phase Validation)

**Detects compliance issues across all phases.**

```bash
# Audit single wrapper
npm run audit -- <service>/<tool>

# Audit all wrappers in service
npm run audit -- --service <service>

# Audit specific phase
npm run audit -- --phase 6

# Batch audit all
npm run audit -- --all
```

**Output:** Pre-formatted markdown report (display verbatim)

**See:** [references/audit-workflow.md](references/audit-workflow.md)

### Fix (Test-Validated Remediation)

**Auto-fixes deterministic issues, validates via tests.**

```bash
# Preview fixes
npm run fix -- <service>/<tool> --dry-run

# Apply fixes
npm run fix -- <service>/<tool>

# Fix specific phase
npm run fix -- <service>/<tool> --phase 2
```

**Auto-fixable:** Phases 2, 4
**Manual guidance:** Phases 1, 3, 5, 6, 7, 8, 9, 10

**See:** [references/audit-workflow.md](references/audit-workflow.md) (includes fix guidance)

### Test (Comprehensive Validation)

**Unit tests (mocked, fast) + Integration tests (real MCP, slow).**

```bash
# Unit tests only (development)
npm run test:unit -- <service>/<tool>

# Integration tests (pre-deploy)
npm run test:integration -- <service>/<tool>

# Full suite with coverage
npm run test:all -- <service>/<tool>

# Coverage report
npm run test:coverage -- <service>/<tool>
```

**Targets:**

- Unit test coverage: ≥80%
- Security testing: 12 scenarios automated
- Response format: 3 formats tested
- Token reduction: ≥80% verified

**See:** [references/new-workflow.md](references/new-workflow.md)

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

- Create with TDD (RED-GREEN-REFACTOR)
- Audit for compliance
- Fix deterministic issues

**Comprehensive (60 min):**

- Full TDD cycle with integration tests
- Performance benchmarks
- Security validation
- Coverage reporting

**Deep Dives (references):**

- [TDD methodology](references/new-workflow.md)
- [Update workflow](references/update-workflow.md)
- [10 audit phases](references/audit-workflow.md)

## Example Wrappers

**Existing implementations in `.claude/tools/`:**

- `context7/` - Context7 documentation library wrappers
- `praetorian-cli/` - Chariot API wrappers

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

1. **Tests First** - Cannot implement without failing tests
2. **Coverage Required** - ≥80% for production readiness
3. **Security Automated** - 12 attack vectors tested automatically
4. **Response Formats** - Defensive handling (array/tuple/object)
5. **Progressive Disclosure** - Quick ref → deep docs on-demand
6. **Per-Wrapper Test Files** - One test file per wrapper (never monolithic)

### Why Per-Wrapper Test Files Matter

**The Problem:** Monolithic test files (e.g., `linear.unit.test.ts` containing all 15 Linear wrappers) break TDD tooling integration.

**Impact:**

- `verify-red`/`verify-green` can't target individual wrappers
- Coverage reports are aggregated, hiding per-wrapper gaps
- Debugging requires searching 1500+ line files
- Merge conflicts when multiple developers work on different wrappers
- Shared fixtures create coupling between unrelated wrappers

**The Solution:** One test file per wrapper (e.g., `get-issue.unit.test.ts`, `create-issue.unit.test.ts`).

**Benefits:**

- TDD commands work: `npm run verify-red -- linear/get-issue`
- Per-wrapper coverage metrics: `npm run test:coverage -- linear/get-issue`
- Faster test execution: Run only changed wrappers
- No merge conflicts: Independent development
- Clear ownership: Each wrapper's tests are self-contained

**Template enforcement:** The `npm run create` command generates per-wrapper test files by default. Don't combine them manually.

**See:** [references/new-workflow.md](references/new-workflow.md) for anti-pattern examples.

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
1. Not in correct directory (need .claude/skills/managing-mcp-wrappers/scripts)
2. npm dependencies not installed
3. Invalid service/tool name format

Corrective action:
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT/.claude/skills/managing-mcp-wrappers/scripts" && npm install
```

## Related Skills

- **developing-with-tdd** - TDD methodology and best practices
- **debugging-systematically** - When wrappers fail in production
- **verifying-before-completion** - Final validation checklist
