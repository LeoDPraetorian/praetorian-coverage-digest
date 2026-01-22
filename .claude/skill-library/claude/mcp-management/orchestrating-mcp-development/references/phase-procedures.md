# Phase Procedures

**Complete phase-by-phase procedures for MCP wrapper orchestration.**

This index links to detailed procedures for all 12 phases of the MCP wrapper creation workflow. The main SKILL.md provides summaries; these files contain full step-by-step details.

---

## Phase Index

### Phase 1: Setup

Create service workspace and initialize tracking.

**Key actions:**

- Create service directory structure
- Initialize MANIFEST.yaml
- Create package.json with user-facing description
- Verify description quality

**Details:** [phases/phase-0-setup.md](phases/phase-0-setup.md)

---

### Phase 1: MCP Setup

Ensure the MCP is configured before tool discovery.

**Key actions:**

- Check if MCP already configured
- Invoke setting-up-mcp-servers skill if needed
- Update MANIFEST with configuration status

**Details:** [phases/phase-1-mcp-setup.md](phases/phase-1-mcp-setup.md)

---

### Phase 3: Tool Discovery

Discover ALL tools in the MCP and perform schema discovery.

**Key actions:**

- List all available tools
- Confirm tool selection with user (default: all tools)
- Perform schema discovery for each tool
- Create tools-manifest.json

**Details:** [phases/phase-2-discovery.md](phases/phase-2-discovery.md)

---

### Phase 5: Shared Architecture (PARALLEL)

Design SHARED patterns that apply to ALL tools.

**Key actions:**

- Spawn tool-lead for architecture patterns
- Spawn security-lead for security assessment
- Human checkpoint for approval before proceeding

**Details:** [phases/phase-3-architecture.md](phases/phase-3-architecture.md)

---

### Phase 6: Per-Tool Work (BATCHED)

Create tool-specific architecture, test plans, and test implementations.

**Key actions:**

- Process tools in batches of 3-5
- Per-tool architecture (tool-lead)
- Test planning (tool-tester)
- Test implementation (tool-tester)

**Details:** [phases/phase-4-per-tool.md](phases/phase-4-per-tool.md)

---

### Phase 7: Test Planning

ALL tests must fail (no implementations yet).

**Key actions:**

- Run test suite for all tools
- Verify all tests fail as expected
- Cannot proceed if any tests pass

**Details:** [phases/phase-5-red-gate.md](phases/phase-5-red-gate.md)

---

### Phase 8: Implementation (BATCHED)

Implement ALL wrappers in batches.

**Key actions:**

- Process tools in batches
- Implement wrapper per architecture (tool-developer)
- Update MANIFEST after each batch

**Details:** [phases/phase-6-implementation.md](phases/phase-6-implementation.md)

---

### Phase 9: P0 Compliance

Verify P0 compliance for all wrappers.

**Key actions:**

- Run P0 compliance checks on all tools
- Verify token optimization, Zod schemas, Result patterns, etc.
- Human checkpoint if violations found
- Fix or defer violations before proceeding

**Details:** [phases/phase-7-p0-gate.md](phases/phase-7-p0-gate.md)

---

### Phase 10: Code Review (BATCHED)

Review ALL wrappers in batches (max 1 retry per tool).

**Key actions:**

- Review each wrapper (tool-reviewer)
- Handle CHANGES_REQUESTED with retry logic
- All tools must be APPROVED to proceed

**Details:** [phases/phase-8-review.md](phases/phase-8-review.md)

---

### Phase 11: Testing

ALL tests must pass with >=80% coverage.

**Key actions:**

- Run test suite with coverage
- Verify all tests pass
- Confirm >=80% coverage per wrapper

**Details:** [phases/phase-9-green-gate.md](phases/phase-9-green-gate.md)

---

### Phase 12: Audit

ALL wrappers must pass audit (>=10/11 phases).

**Key actions:**

- Run audit script for service
- Fix any audit failures
- Verify all wrappers meet quality gates

**Details:** [phases/phase-10-audit.md](phases/phase-10-audit.md)

---

### Phase 13: Completion

Finalize wrappers and generate service skill.

**Key actions:**

- Generate service skill
- Verify package.json description accuracy
- Final build and test verification
- Report summary to user

**Details:** [phases/phase-11-completion.md](phases/phase-11-completion.md)

---

## Quick Reference

| Phase | Name                | Type     | Key Output                 |
| ----- | ------------------- | -------- | -------------------------- |
| 0     | Setup               | Serial   | Service workspace          |
| 1     | MCP Setup           | Serial   | MCP configured             |
| 2     | Discovery           | Serial   | Schema discoveries         |
| 3     | Shared Architecture | Parallel | Architecture + security    |
| 4     | Per-Tool Work       | Batched  | Test plans + tests         |
| 5     | Test Planning       | Serial   | All tests failing          |
| 6     | Implementation      | Batched  | Wrapper implementations    |
| 7     | P0 Compliance       | Serial   | P0 compliance verified     |
| 8     | Code Review         | Batched  | Review approvals           |
| 9     | Testing             | Serial   | All tests passing          |
| 10    | Audit               | Serial   | Audit reports              |
| 11    | Completion          | Serial   | Service skill + final docs |
