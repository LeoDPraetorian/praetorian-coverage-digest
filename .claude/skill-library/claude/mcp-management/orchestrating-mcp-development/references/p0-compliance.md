# P0 Compliance Validation

**Patterns from orchestrating-multi-agent-workflows**:

- **Pattern 4.4** (lines 186-201): Requirements Verification - architecture requirements implemented
- **Pattern 4.7**: Domain-specific technical compliance checks

**When**: After Phase 8 (Implementation), before Phase 10 (Code Review)
**Blocking**: ❌ Violations found → 🛑 Human Checkpoint → Must fix or document

## Two-Stage P0 Compliance

| Stage | Name                      | Verifies                              | Output                       |
| ----- | ------------------------- | ------------------------------------- | ---------------------------- |
| 1     | Architecture Requirements | Phase 5 decisions implemented         | requirements-verification.md |
| 2     | Technical P0              | Token optimization, Zod schemas, etc. | p0-compliance-report.md      |

**Both stages must pass before proceeding to Phase 10 Code Review.**

---

## Stage 1: Architecture Requirements Verification

Verify all architecture requirements from Phase 5 (architecture-shared.md) and Phase 6 (per-tool architecture.md) are implemented before technical P0 checks.

**Gate**: All architecture.md requirements implemented OR user-approved deferrals

### Verification Protocol

For each tool in completed implementation batch:

1. **Read architecture sources**:
   - `tools/{tool}/architecture.md` (Phase 6 output)
   - `architecture-shared.md` (Phase 5 shared patterns)
   - `security-assessment.md` (Phase 5 security patterns)

2. **Create requirements checklist** from architecture files:
   - [ ] Uses token optimization pattern from architecture-shared.md
   - [ ] Implements response filtering as specified in architecture.md
   - [ ] Uses error handling pattern from architecture-shared.md
   - [ ] Applies security patterns from security-assessment.md
   - [ ] Follows all tool-specific architecture decisions from architecture.md

3. **Verify each requirement** in wrapper implementation:

   ```bash
   grep -n 'expected pattern' .claude/tools/{service}/{tool}.ts
   ```

4. **Document verification** in `tools/{tool}/requirements-verification.md`

### Requirements Verification Report Format

```markdown
# Requirements Verification: {service} - {tool}

**Status**: COMPLIANT | NON-COMPLIANT
**Unimplemented Requirements**: {count}

## Architecture Requirements Checklist

| Requirement                | Source                    | Status | Evidence                       |
| -------------------------- | ------------------------- | ------ | ------------------------------ |
| Token optimization pattern | architecture-shared.md:45 | ✅/❌  | {tool}.ts:67 uses pickFields() |
| Response caching           | architecture.md:23        | ✅/❌  | {tool}.ts:89 implements cache  |
| Error handling pattern     | architecture-shared.md:78 | ✅/❌  | {tool}.ts:102 uses Result<T,E> |

## Gaps (if any)

### {Requirement} - Missing

- Required by: architecture.md line 23
- Not found in: {tool}.ts
- Impact: Violates architecture spec
```

### Stage 1 Gate Enforcement

If ANY tool has unimplemented requirements: 🛑 Human Checkpoint

- Show requirements-verification.md for failed tools
- Options: Fix violations, Defer with justification, Revise architecture

**Only proceed to Stage 2 (Technical P0) after ALL tools pass Stage 1 OR have approved deferrals.**

---

## Gate Override Protocol

**Foundation Pattern**: orchestrating-multi-agent-workflows Pattern 4.6, lines 203-221

When P0 gate (Stage 1 or Stage 2) cannot be satisfied:

1. **Use AskUserQuestion** with explicit risk disclosure
2. **Present options**: proceed with limitations, block until resolved, abort
3. **Document override** in MANIFEST.yaml:

```yaml
gate_override:
  gate_name: p0_validation_stage1
  override_reason: "User-approved deferral of requirement"
  risk_accepted: "Feature delayed to v2"
  timestamp: "2026-01-19T15:30:00Z"
```

**Example**: "P0 Stage 1 failed: Architecture requirement not implemented. Risk: May require rework. Proceed?"

---

## Stage 2: Technical P0 Requirements

## MCP Wrapper P0 Requirements

| Check                      | Verification Method                                                             | Blocker |
| -------------------------- | ------------------------------------------------------------------------------- | ------- |
| Token optimization applied | Response size reduced 80-99% (measure raw vs filtered)                          | YES     |
| Zod schema accuracy        | Input schema matches MCP tool schema exactly                                    | YES     |
| Result pattern used        | Uses Result<T,E> from implementing-result-either-pattern, no raw throws         | YES     |
| Response filtering         | Uses response-utils.ts (truncate, pickFields), not manual string manipulation   | YES     |
| Sanitization applied       | Uses sanitize.ts Zod refinements (validateNoPathTraversal, validateNoXSS, etc.) | YES     |
| Shared infrastructure      | Uses mcp-client.ts callMCPTool(), not direct MCP calls                          | YES     |
| Error handling complete    | All MCP error codes handled (404, 401, 429, 400, 500)                           | YES     |

## P0 Validation Protocol

After Phase 8 implementation batch completes:

**Stage 1: Architecture Requirements (Pattern 4.4)**

1. For each tool, verify ALL architecture requirements from Phase 3/4
2. Generate requirements-verification.md per tool
3. If ANY architecture requirement missing: 🛑 Human Checkpoint
4. Only proceed to Stage 2 after ALL tools pass Stage 1

**Stage 2: Technical P0 Requirements** 5. For each tool, verify ALL 7 technical requirements (do not stop at first failure) 6. Generate P0 Compliance Report per tool 7. If ANY tool fails ANY P0 check: 🛑 Human Checkpoint with options:

- Fix violations (proceed to fix, then re-validate)
- Document and defer (requires justification)
- Show violation details

8. Only proceed to Phase 10 after ALL tools pass both stages OR have user-approved deferrals

## P0 Compliance Report Format

```markdown
# P0 Compliance Report: {service} - {tool}

**Status**: COMPLIANT | NON-COMPLIANT
**Violations**: {count}

## Requirements Summary

| Requirement           | Status | Evidence                                                |
| --------------------- | ------ | ------------------------------------------------------- |
| Token optimization    | ✅/❌  | Raw: {N} tokens → Filtered: {M} tokens ({X}% reduction) |
| Zod schema accuracy   | ✅/❌  | Schema matches MCP tool input                           |
| Result pattern        | ✅/❌  | {file}:{line} uses Result<T,E>                          |
| Response filtering    | ✅/❌  | {file}:{line} uses response-utils                       |
| Sanitization          | ✅/❌  | {file}:{line} uses sanitize.ts refinements              |
| Shared infrastructure | ✅/❌  | {file}:{line} uses callMCPTool()                        |
| Error handling        | ✅/❌  | Handles: 404, 401, 429, 400, 500                        |

## Violations Details (if any)

### {Requirement} - {file}:{line}

- Current: [code snippet]
- Required: [what should change]
- Reference: [example from existing wrapper]
```
