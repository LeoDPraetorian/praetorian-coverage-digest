---
name: creating-mcp-wrappers
description: Use when creating MCP wrappers - guides schema discovery, test design, implementation with TDD verification using @claude/testing infrastructure
allowed-tools: Read, Write, Bash, Grep, Glob, TodoWrite, AskUserQuestion
---

# Creating MCP Wrappers

**Claude-driven TDD workflow using @claude/testing infrastructure.**

**You MUST use TodoWrite before starting to track all phases.**

## Quick Reference

| Phase                 | Handler | Tool          | Verification          |
| --------------------- | ------- | ------------- | --------------------- |
| 0. Prerequisites      | Claude  | Bash          | Workspace ready       |
| 1. Schema Discovery   | Claude  | Bash, Write   | Discovery doc exists  |
| 2. Test Design        | Claude  | Write         | Test file exists      |
| 3. RED Verification   | Claude  | Bash (vitest) | Tests fail ✅         |
| 4. Wrapper Generation | Claude  | Write         | Wrapper file exists   |
| 5. Implementation     | Claude  | Edit          | Code complete         |
| 6. GREEN Verification | Claude  | Bash (vitest) | Tests pass ✅, ≥80%   |
| 7. Structural Audit   | Claude  | Grep, Read    | All artifacts exist   |
| 8. Service Skill      | Claude  | Write         | Skill created/updated |

**Total Time**: ~20-30 minutes

> **Note**: All phases are Claude-driven. No external CLI infrastructure required.

---

## Workflow Overview

### Step 0: Prerequisites (Claude)

Verify workspace, credentials, and infrastructure.
**CRITICAL**: Get `$ROOT` before any file operations.

### Step 1: Schema Discovery (Claude)

Explore MCP tool interactively, document schema.
**See**: [references/schema-discovery-guide.md](references/schema-discovery-guide.md)

### Step 2: Test Design (Claude)

Generate test file using `@claude/testing` infrastructure.
**See**: [references/test-design-patterns.md](references/test-design-patterns.md)

### Step 3: RED Verification (Claude)

```bash
cd $ROOT/.claude && npm run test:run -- tools/{service}/{tool}
# ✅ Must pass: tests exist and FAIL (no implementation yet)
```

### Step 4: Wrapper Generation (Claude)

Create wrapper scaffold at `$ROOT/.claude/tools/{service}/{tool}.ts`

### Step 5: Implementation (Claude)

Implement wrapper from discovery docs.
**See**: [references/implementation-guide.md](references/implementation-guide.md)

### Step 6: GREEN Verification (Claude)

```bash
cd $ROOT/.claude && npm run test:run -- tools/{service}/{tool}
# ✅ Must pass: tests PASS, coverage ≥80%
```

### Step 7: Structural Audit (Claude)

Verify all artifacts exist:

- [ ] Discovery doc at `tools/{service}/docs/{tool}-discovery.md`
- [ ] Test file at `tools/{service}/{tool}.unit.test.ts`
- [ ] Wrapper at `tools/{service}/{tool}.ts`
- [ ] Coverage ≥80%

### Step 8: Service Skill Update (Claude)

Create/update `mcp-tools-{service}` skill in skill-library.

---

## Phase Descriptions

### Phase 0: Prerequisites & Infrastructure Setup

**Goal**: Verify workspace and infrastructure before starting.

**CRITICAL - Path Safety**:

```bash
# ALWAYS get project root FIRST before ANY file operation
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
echo "Working in: $ROOT"
```

**Tasks**:

1. **Get project root** (MANDATORY first step):

   ```bash
   ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
   ```

2. **Install workspace dependencies**:

   ```bash
   cd $ROOT/.claude && npm install
   ```

3. **Verify @claude/testing is available**:

   ```bash
   ls $ROOT/.claude/lib/testing/src/
   ```

4. **Check credentials exist** (if MCP requires auth):

   ```bash
   cat $ROOT/.claude/tools/config/credentials.json | grep -q "{service}" || echo "Credentials needed"
   ```

5. **Add MCP client configuration** (if new service):
   - Edit `$ROOT/.claude/tools/config/lib/mcp-client.ts`
   - Add service to the MCP client map

**Verification**:

- [ ] `$ROOT` variable set
- [ ] npm workspace installed
- [ ] @claude/testing package accessible
- [ ] Credentials configured (if required)
- [ ] MCP client configured for service

---

### Phase 1: Schema Discovery

**Goal**: Understand MCP tool behavior through exploration.

**Detailed guide**: [references/schema-discovery-guide.md](references/schema-discovery-guide.md)

**Critical tasks**:

1. **Discover MCP package name** (DO NOT ASSUME naming convention):
   - Search npm: `npm search mcp {service}` or web search
   - Example: Perplexity is `@perplexity-ai/mcp-server`, NOT `@modelcontextprotocol/server-perplexity`
2. Install and start MCP server
3. **Detect response format**: JSON vs text/markdown
4. Explore with ≥3 test cases
5. Document in `$ROOT/.claude/tools/{service}/docs/{tool}-discovery.md`

**Key outputs**:

- Input schema (required + optional fields)
- Output schema + response format (JSON or text)
- Token reduction strategy (target 80% reduction)

**Verification**:

- [ ] Discovery doc exists with ≥3 test cases
- [ ] Response format documented
- [ ] Token reduction strategy defined

---

### Phase 2: Test Design

**Goal**: Generate test file using `@claude/testing` infrastructure.

**CRITICAL**: Use shared testing utilities, NOT custom mocks.

**Detailed guide**: [references/test-design-patterns.md](references/test-design-patterns.md)

**Tasks**:

1. Copy test template from `$ROOT/.claude/lib/testing/src/templates/unit-test.template.ts`
2. Import from `@claude/testing`: `createMCPMock`, `MCPErrors`, `testSecurityScenarios`
3. Add response builder to `$ROOT/.claude/lib/testing/src/mocks/response-builders.ts`
4. Write ≥18 tests across 6 categories

**Test categories**: Input Validation (≥3), MCP Integration (≥2), Response Filtering (≥2), Security (≥4), Edge Cases (≥4), Error Handling (≥3)

**Running Tests**: `cd $ROOT/.claude && npm run test:run -- tools/{service}`

**Verification**:

- [ ] Test file at `$ROOT/.claude/tools/{service}/{tool}.unit.test.ts`
- [ ] Imports from @claude/testing (not custom mocks)
- [ ] Response builder added to response-builders.ts

---

### Phase 3: RED Verification (Claude-Driven)

**Goal**: Verify TDD is being followed - tests exist and FAIL.

**Command**:

```bash
cd $ROOT/.claude && npm run test:run -- tools/{service}/{tool}
```

**Verification checks** (Claude performs manually):

1. ✅ Test file exists at `$ROOT/.claude/tools/{service}/{tool}.unit.test.ts`
2. ✅ Implementation does NOT exist yet at `$ROOT/.claude/tools/{service}/{tool}.ts`
3. ✅ Tests FAIL when run (expected - no implementation)

**Example expected output**:

```
FAIL  tools/{service}/{tool}.unit.test.ts
✘ 18 tests failed
```

**Cannot proceed until tests fail properly.**

**Verification**:

- [ ] Test file exists
- [ ] Wrapper file does NOT exist yet
- [ ] Tests run and FAIL (this is correct behavior)

---

### Phase 4: Wrapper Generation (Claude-Driven)

**Goal**: Create wrapper scaffold at `$ROOT/.claude/tools/{service}/{tool}.ts`

**Detailed guide**: [references/implementation-guide.md](references/implementation-guide.md)

**Required exports**: `InputSchema` (Zod), `FilteredResult` (interface), `{toolName}` (with execute stub)

**Verification**:

- [ ] Wrapper file created at correct path
- [ ] Contains InputSchema, FilteredResult, execute stub

---

### Phase 5: Implementation

**Goal**: Implement wrapper to make tests pass.

**Tasks**:

1. Read discovery docs
2. Implement InputSchema (Zod from discovery)
3. Implement FilteredResult (token reduction from discovery)
4. Implement execute() function
5. Implement error handling

**Detailed guide**: [references/implementation-guide.md](references/implementation-guide.md)

**Verification**:

- [ ] All sections implemented
- [ ] Implementation matches discovery

---

### Phase 6: GREEN Verification (Claude-Driven)

**Goal**: Verify tests pass with ≥80% coverage.

**Command**:

```bash
cd $ROOT/.claude && npm run test:coverage -- tools/{service}/{tool}
```

**Verification checks** (Claude performs manually):

1. ✅ Tests PASS
2. ✅ Coverage ≥80%

**Example expected output**:

```
✓ tools/{service}/{tool}.unit.test.ts (18 tests)
Coverage: 85%
```

**Cannot proceed without tests passing and coverage ≥80%.**

**Verification**:

- [ ] All tests pass
- [ ] Coverage ≥80% reported
- [ ] No skipped tests

---

### Phase 7: Structural Audit (Claude-Driven)

**Goal**: Verify all required artifacts exist and are correct.

**Checklist** (Claude checks manually):

| Artifact          | Path                                         | Status |
| ----------------- | -------------------------------------------- | ------ |
| Discovery doc     | `tools/{service}/docs/{tool}-discovery.md`   | ✅/❌  |
| Test file         | `tools/{service}/{tool}.unit.test.ts`        | ✅/❌  |
| Wrapper           | `tools/{service}/{tool}.ts`                  | ✅/❌  |
| Response builder  | `lib/testing/src/mocks/response-builders.ts` | ✅/❌  |
| MCP client config | `tools/config/lib/mcp-client.ts`             | ✅/❌  |

**Commands to verify**:

```bash
ls $ROOT/.claude/tools/{service}/docs/{tool}-discovery.md
ls $ROOT/.claude/tools/{service}/{tool}.unit.test.ts
ls $ROOT/.claude/tools/{service}/{tool}.ts
grep -l "{Service}Responses" $ROOT/.claude/lib/testing/src/mocks/response-builders.ts
```

**Verification**:

- [ ] All 5 artifacts exist
- [ ] Coverage still ≥80%

---

### Phase 8: Service Skill Update (CLI)

**Goal**: Generate service skill and update gateway automatically.

**Command**:

```bash
cd $ROOT/.claude/skills/managing-mcp-wrappers/scripts
npm run generate-skill -- {service}
```

**What this command does**:

1. Scans `$ROOT/.claude/tools/{service}/` for wrapper files
2. Extracts Zod schemas, export names, token estimates from code
3. Generates `mcp-tools-{service}` skill at `.claude/skill-library/claude/mcp-tools/`
4. **Automatically syncs gateway-mcp-tools** (adds new service to gateway)

**Verification**:

- [ ] Skill generated at `skill-library/claude/mcp-tools/mcp-tools-{service}/SKILL.md`
- [ ] Gateway synced (check gateway-mcp-tools includes new service)

---

## Batch Mode (All Tools)

**When to use**: User wants to wrap ALL tools from a service.

**See**: [references/batch-mode-guide.md](references/batch-mode-guide.md)

**Summary**: Start MCP once → enumerate tools → run full TDD cycle for each tool → create service skill → stop MCP.

---

## Critical Rules

### TDD Gates Are Non-Negotiable

You MUST run vitest and verify output:

```bash
# RED phase - tests must FAIL
cd $ROOT/.claude && npm run test:run -- tools/{service}/{tool}
# Expected: FAIL (no implementation yet)

# GREEN phase - tests must PASS with coverage
cd $ROOT/.claude && npm run test:coverage -- tools/{service}/{tool}
# Expected: PASS, coverage ≥80%
```

**In batch mode**: Run gates for EACH tool (cannot skip any)

**Not acceptable**:

- ❌ Claiming gate passed without running vitest
- ❌ Skipping gates due to time pressure
- ❌ Generating wrapper before RED fails properly
- ❌ Skipping a tool because "it looks similar to another"
- ❌ Using relative paths (always use `$ROOT`)
- ❌ Creating custom mocks instead of using @claude/testing

**The gates run actual tests - you must show output.**

### Discovery Before Tests

You MUST complete schema discovery before writing tests.

**Required**:

- [ ] ≥3 test cases explored
- [ ] Token counts measured
- [ ] Discovery doc written

**Then** write tests based on discovery.

### Tests Before Implementation

The TDD cycle is enforced by CLI:

1. Write tests (Phase 2)
2. verify-red MUST pass (Phase 3)
3. Then and only then generate wrapper (Phase 4)

**Cannot skip or reorder.**

### TodoWrite Tracking

Create todos for all 9 phases at start:

```
- Phase 0: Prerequisites (IN_PROGRESS)
- Phase 1: Schema Discovery (PENDING)
- Phase 2: Test Design (PENDING)
- Phase 3: RED Verification (PENDING)
- Phase 4: Wrapper Generation (PENDING)
- Phase 5: Implementation (PENDING)
- Phase 6: GREEN Verification (PENDING)
- Phase 7: Structural Audit (PENDING)
- Phase 8: Service Skill Update (PENDING)
```

Mark each complete after verification passes.

---

## Detailed Guides

| Guide            | Path                                                                         | Contents                                    |
| ---------------- | ---------------------------------------------------------------------------- | ------------------------------------------- |
| Schema Discovery | [references/schema-discovery-guide.md](references/schema-discovery-guide.md) | MCP connection, test cases, token reduction |
| Test Design      | [references/test-design-patterns.md](references/test-design-patterns.md)     | 6 categories, mocking, coverage             |
| Implementation   | [references/implementation-guide.md](references/implementation-guide.md)     | Schemas, filtering, error handling          |
| Batch Mode       | [references/batch-mode-guide.md](references/batch-mode-guide.md)             | Multi-tool workflow                         |
| Complete Example | [examples/linear-get-issue.md](examples/linear-get-issue.md)                 | End-to-end walkthrough                      |

---

## Prerequisites

**Workspace setup** (one-time):

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
cd $ROOT/.claude && npm install
```

**@claude/testing available**:

```bash
ls $ROOT/.claude/lib/testing/src/
```

**MCP package discoverable** (search before assuming):

```bash
npm search mcp {service}
# OR web search for "{service} mcp server npm"
```

---

## Troubleshooting

| Problem                     | Cause                 | Solution                                                        |
| --------------------------- | --------------------- | --------------------------------------------------------------- |
| Files in wrong location     | Relative paths        | Use `$ROOT` (set in Phase 0) for all paths                      |
| Cannot find test file       | Wrong directory       | Run tests from workspace: `cd $ROOT/.claude`                    |
| Package not found           | Wrong naming          | Search npm/web - names vary (e.g., `@perplexity-ai/mcp-server`) |
| MCP returns text not JSON   | AI-based MCPs         | Document format in discovery, handle text parsing               |
| Cannot find @claude/testing | Missing install       | Run `cd $ROOT/.claude && npm install`                           |
| Import errors               | Wrong paths           | Use `@claude/testing`, no `.js` extensions                      |
| Tests pass in RED phase     | Implementation exists | Delete wrapper file before Phase 3                              |
| Coverage <80%               | Missing tests         | Run `npm run test:coverage` to find gaps                        |
| Missing artifacts           | Skipped steps         | Run Phase 7 checklist, create missing files                     |
| Response builder not found  | Not added             | Add to `lib/testing/src/mocks/response-builders.ts`             |

---

## Related Skills

- `managing-mcp-wrappers` - Main MCP manager skill (delegates here)
- `developing-with-tdd` - TDD methodology
- `verifying-before-completion` - Final validation
- `gateway-mcp-tools` - Routes to this skill
