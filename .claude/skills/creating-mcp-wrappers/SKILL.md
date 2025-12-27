---
name: creating-mcp-wrappers
description: Use when creating MCP wrappers - guides schema discovery, test design, implementation with mechanical TDD verification via CLI
allowed-tools: Read, Write, Bash, Grep, Glob, TodoWrite, AskUserQuestion
---

# Creating MCP Wrappers

**Hybrid approach: Claude reasoning + CLI enforcement.**

**You MUST use TodoWrite before starting to track all phases.**

## Quick Reference

| Phase                 | Handler | Tool             | Verification         |
| --------------------- | ------- | ---------------- | -------------------- |
| 1. Schema Discovery   | Claude  | Bash, Write      | Discovery doc exists |
| 2. Test Design        | Claude  | Write            | Test file exists     |
| 3. RED Gate           | CLI     | verify-red       | Tests fail ✅        |
| 4. Wrapper Generation | CLI     | generate-wrapper | Wrapper exists       |
| 5. Implementation     | Claude  | Edit             | Code complete        |
| 6. GREEN Gate         | CLI     | verify-green     | Tests pass ✅, ≥80%  |
| 7. Audit              | CLI     | audit            | ≥10/11 phases ✅     |
| 8. Service Skill      | CLI     | generate-skill   | Skill updated        |

**Total Time**: ~20-30 minutes

---

## Workflow Overview

### Step 1: Schema Discovery (Claude)

Explore MCP tool interactively, document schema.
**See**: [references/schema-discovery-guide.md](references/schema-discovery-guide.md)

### Step 2: Test Design (Claude)

Generate test file with ≥18 tests across 6 categories.
**See**: [references/test-design-patterns.md](references/test-design-patterns.md)

### Step 3: RED Gate (CLI - Mechanical)

```bash
npm run verify-red -- {service}/{tool}
# ✅ Must pass: tests exist, impl doesn't, tests fail
```

### Step 4: Wrapper Generation (CLI)

```bash
npm run generate-wrapper -- {service}/{tool}
# Blocks if RED didn't pass
```

### Step 5: Implementation (Claude)

Implement wrapper from discovery docs.
**See**: [references/implementation-guide.md](references/implementation-guide.md)

### Step 6: GREEN Gate (CLI - Mechanical)

```bash
npm run verify-green -- {service}/{tool}
# ✅ Must pass: tests pass, coverage ≥80%
```

### Step 7: Audit (CLI)

```bash
npm run audit -- {service}/{tool}
# ✅ Target: ≥10/11 phases
```

### Step 8: Service Skill Update (CLI)

```bash
npm run generate-skill -- {service}
# Updates mcp-tools-{service} skill
```

---

## Phase Descriptions

### Phase 1: Schema Discovery (Automated Setup)

**Goal**: Understand MCP tool behavior through exploration.

**Mode Selection**:

Ask user which tools to wrap:

```
Which tools from {service} MCP should I wrap?

Options:
1. All tools (batch mode) - Wrap every tool available
2. Specific tool - Choose one tool to wrap
3. Multiple specific tools - Choose several tools
```

**Tasks for Single Tool**:

1. Ask user for service/tool names (AskUserQuestion)
2. **Auto-install MCP**: `npx -y @modelcontextprotocol/server-{service}` (automatic)
3. **Auto-start server**: Start in background, capture PID for cleanup
4. **Verify connection**: Test connectivity, detect credential requirements
5. Create docs directory: `mkdir -p .claude/tools/{service}/docs`
6. Explore MCP tool with ≥3 test cases
7. Document findings in `.claude/tools/{service}/docs/{tool}-discovery.md`
8. **Cleanup**: Stop MCP server (kill PID)

**Tasks for Batch Mode (All Tools)**:

1. Ask user for service name only
2. **Auto-install MCP**: Same as single tool
3. **Auto-start server**: Same as single tool
4. **Enumerate ALL tools**: Call `tools/list` to get complete tool list
5. **For each tool discovered**:
   - Create docs directory
   - Explore with ≥3 test cases
   - Document findings
   - Generate tests (Phase 2)
   - Run through RED → GREEN → Audit cycle
6. **Cleanup**: Stop MCP server after all tools processed

**Automated setup**:

- npx auto-downloads MCP on first run (no manual install)
- Bash starts server in background
- Connection test detects if credentials needed
- Server stopped automatically after exploration

**Key outputs** (per tool):

- Input schema (required + optional fields)
- Output schema (always present + conditional fields)
- Token counts (original response size)
- Token reduction strategy (target 80% reduction)
- Security considerations

**Batch mode benefits**:

- Single MCP server session for all tools (efficient)
- Consistent exploration across all tools
- Complete service coverage in one workflow

**Detailed guide**: [references/schema-discovery-guide.md](references/schema-discovery-guide.md)

**Verification (Single)**:

- [ ] MCP server auto-started
- [ ] Connection successful (or credential guidance provided)
- [ ] Discovery doc exists
- [ ] ≥3 test cases documented
- [ ] Token reduction strategy defined
- [ ] MCP server stopped after exploration

**Verification (Batch)**:

- [ ] MCP server auto-started once
- [ ] All tools enumerated from `tools/list`
- [ ] Discovery doc exists for EACH tool
- [ ] Tests generated for EACH tool
- [ ] All wrappers pass GREEN gate
- [ ] MCP server stopped after all tools processed

---

### Phase 2: Test Design

**Goal**: Generate test file with cases based on discovered schema.

**Tasks**:

1. Read discovery docs
2. Design tests across 6 categories (≥18 total)
3. Write test file at `.claude/tools/{service}/{tool}.unit.test.ts`

**Test categories** (minimum tests):

- Input Validation (≥3)
- MCP Integration (≥2)
- Response Filtering (≥2)
- Security (≥4)
- Edge Cases (≥4)
- Error Handling (≥3)

**Detailed guide**: [references/test-design-patterns.md](references/test-design-patterns.md)

**Verification**:

- [ ] Test file exists
- [ ] ≥18 tests across 6 categories
- [ ] Tests reference discovery findings

---

### Phase 3: RED Gate (CLI)

**Goal**: Mechanical verification that TDD is being followed.

**CLI Command**:

```bash
cd .claude/skills/managing-mcp-wrappers/scripts
npm run verify-red -- {service}/{tool}
```

**Mechanical checks**:

1. Test file exists ✓
2. Implementation does NOT exist ✓
3. Tests FAIL when run ✓

**Cannot proceed without this passing.**

**Verification**:

- [ ] Command exits with code 0
- [ ] Output shows "✅ RED PHASE VALIDATED"

---

### Phase 4: Wrapper Generation (CLI)

**Goal**: Generate wrapper scaffold from template.

**CLI Command**:

```bash
npm run generate-wrapper -- {service}/{tool}
```

**Blocks if RED gate didn't pass.**

**Verification**:

- [ ] Wrapper file created
- [ ] Contains template scaffold

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

### Phase 6: GREEN Gate (CLI)

**Goal**: Mechanical verification that tests pass with coverage.

**CLI Command**:

```bash
npm run verify-green -- {service}/{tool}
```

**Mechanical checks**:

1. Tests PASS ✓
2. Coverage ≥80% ✓

**Cannot proceed without this passing.**

**Verification**:

- [ ] Command exits with code 0
- [ ] Coverage ≥80% reported

---

### Phase 7: Audit (CLI)

**Goal**: Validate 11 structural compliance phases.

**CLI Command**:

```bash
npm run audit -- {service}/{tool}
```

**Target**: ≥10/11 phases pass (Phase 7 integration tests optional)

**Verification**:

- [ ] ≥10/11 phases pass

---

### Phase 8: Service Skill Update (CLI)

**Goal**: Update service skill with new wrapper documentation.

**CLI Command**:

```bash
npm run generate-skill -- {service}
```

**Automatically extracts schemas and updates skill.**

**Verification**:

- [ ] Service skill updated
- [ ] New wrapper documented

---

## Batch Mode (All Tools)

**When to use**: User wants to wrap ALL tools from a service

**Workflow**:

1. Start MCP server ONCE
2. Call `tools/list` to enumerate all tools
3. **For EACH tool** in the list:
   - Phase 1: Explore and document (3+ test cases)
   - Phase 2: Generate tests (18+ tests)
   - Phase 3: verify-red (mechanical gate)
   - Phase 4: generate-wrapper
   - Phase 5: Implement wrapper
   - Phase 6: verify-green (mechanical gate)
   - Phase 7: audit (11 phases)
4. Phase 8: generate-skill ONCE (includes all tools)
5. Stop MCP server ONCE

**Efficiency**:

- One MCP start/stop for N tools
- Parallel-ready (could process tools concurrently)
- Single service skill generation at end

**Example**:

```
User: /mcp-manager create zen
Skill: Which tools to wrap?
User: All tools

Skill discovers 8 tools from zen MCP:
1. get-document ✅ (2 min)
2. search-docs ✅ (2 min)
3. create-doc ✅ (2 min)
4. update-doc ✅ (2 min)
5. delete-doc ✅ (2 min)
6. list-docs ✅ (2 min)
7. get-metadata ✅ (2 min)
8. search-metadata ✅ (2 min)

Total: 16 minutes for 8 wrappers
Service skill: mcp-tools-zen with 8 tools documented
```

---

## Critical Rules

### CLI Gates Are Non-Negotiable

You MUST run CLI commands and show output:

```bash
npm run verify-red -- {service}/{tool}
# Output must show: "✅ RED PHASE VALIDATED"

npm run verify-green -- {service}/{tool}
# Output must show: Coverage percentage ≥80%
```

**In batch mode**: Run gates for EACH tool (cannot skip any)

**Not acceptable**:

- ❌ Claiming gate passed without running command
- ❌ Skipping gates due to time pressure
- ❌ Generating wrapper before RED passes
- ❌ Skipping a tool because "it looks similar to another"

**The gates are mechanical - they literally run tests.**

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

Create todos for all 8 phases at start:

```
- Phase 1: Schema Discovery (IN_PROGRESS)
- Phase 2: Test Design (PENDING)
- Phase 3: RED Gate (PENDING)
- Phase 4: Wrapper Generation (PENDING)
- Phase 5: Implementation (PENDING)
- Phase 6: GREEN Gate (PENDING)
- Phase 7: Audit (PENDING)
- Phase 8: Service Skill Update (PENDING)
```

Mark each complete after verification passes.

---

## Detailed Guides

### Schema Discovery

**See**: [references/schema-discovery-guide.md](references/schema-discovery-guide.md)

- MCP connection patterns
- Test case design (happy path, edge, error)
- Response analysis techniques
- Token reduction calculation
- Documentation templates

### Test Design

**See**: [references/test-design-patterns.md](references/test-design-patterns.md)

- 6 test categories with examples
- 18+ minimum test requirements
- Coverage targets per category
- Mocking strategies
- Anti-patterns to avoid

### Implementation

**See**: [references/implementation-guide.md](references/implementation-guide.md)

- Complete implementation example
- InputSchema patterns
- Response filtering techniques
- Error handling
- Common patterns and anti-patterns

### Complete Example

**See**: [examples/linear-get-issue.md](examples/linear-get-issue.md)

- End-to-end walkthrough
- All 8 phases with actual commands
- Expected outputs
- 20-minute timeline

---

## Prerequisites

**MCP server available**:

```bash
npx -y @modelcontextprotocol/server-{service} --version
```

**MCP manager CLI setup** (one-time):

```bash
cd .claude/skills/managing-mcp-wrappers/scripts
npm install
```

---

## Troubleshooting

### verify-red fails

**"Tests are passing"**:

- Tests too generic or implementation exists
- Delete wrapper file, make tests more specific

**"Test file not found"**:

- Test file not created yet
- Run Phase 2 (Test Design)

### verify-green fails

**"Tests failing"**:

- Implementation incomplete or incorrect
- Review test errors, fix implementation

**"Coverage <80%"**:

- Not enough tests or branches
- Add tests for uncovered code paths

### Audit fails

**"Schema discovery docs missing"**:

- Phase 1 incomplete
- Create discovery doc

**"Coverage below 80%"**:

- Phase 6 (GREEN gate) should have caught this
- Add more tests

---

## Related Skills

- `managing-mcp-wrappers` - Main MCP manager skill (delegates here)
- `developing-with-tdd` - TDD methodology
- `verifying-before-completion` - Final validation
- `gateway-mcp-tools` - Routes to this skill
