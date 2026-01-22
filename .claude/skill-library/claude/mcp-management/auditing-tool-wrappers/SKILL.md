---
name: auditing-tool-wrappers
description: Use when validating MCP tool wrapper compliance - runs 12-phase audit on wrappers and services
allowed-tools: Bash, Glob, Read, TodoWrite
---

# Auditing Tool Wrappers

**Validates MCP tool wrappers for structural compliance and quality using the 12-phase compliance system.**

> **You MUST use TodoWrite** to track audit progress for all audits to ensure no phases are skipped.

---

## What This Skill Does

Audits MCP tool wrappers across **12 validation phases** by running the audit CLI and interpreting results.

**Phase categories:**

| Phase | Name                         | Auto-Fix | What it checks                             |
| ----- | ---------------------------- | -------- | ------------------------------------------ |
| 1     | Schema Discovery             | ❌       | Discovery docs exist                       |
| 2     | Optional Fields              | ✅       | `.optional()` usage on non-required fields |
| 3     | Type Unions                  | ❌       | `z.union()` coverage for variant types     |
| 4     | Nested Access Safety         | ✅       | Null-safe property access                  |
| 5     | Reference Validation         | ❌       | No deprecated tool references              |
| 6     | Unit Test Coverage           | ❌       | Test file exists with ≥80% coverage        |
| 7     | Integration Tests            | ❌       | Integration test file exists               |
| 8     | Test Quality                 | ❌       | Factory patterns, edge cases               |
| 9     | Security Validation          | ❌       | No dangerous patterns, input validation    |
| 10    | TypeScript Validation        | ❌       | Compiles without errors                    |
| 11    | Skill-Schema Synchronization | ✅       | Service skill matches wrapper schemas      |
| 12    | Service Metadata             | ⚠️       | `package.json` exists with description     |

**Why this matters:** Structural issues prevent wrappers from working correctly. Schema compliance ensures proper MCP integration. Security validation prevents vulnerabilities.

---

## When to Use

- After editing any wrapper file
- Before committing wrapper changes
- When debugging wrapper issues
- User says "audit the X wrapper"
- As part of create/update workflows (automatic)
- Routed from `managing-tool-wrappers` when user says "audit"

---

## Quick Reference

**Audit commands:**

```bash
# Single wrapper
npm run audit -- <service>/<tool>

# All wrappers in a service
npm run audit -- --service <service>

# Specific phase only
npm run audit -- <service>/<tool> --phase N

# Batch audit all wrappers
npm run audit -- --all
```

**Common scenarios:**

```bash
# Audit context7 search wrapper
npm run audit -- context7/search

# Audit all linear wrappers
npm run audit -- --service linear

# Check only TypeScript compilation (Phase 10)
npm run audit -- context7/search --phase 10

# Full compliance check across all services
npm run audit -- --all
```

---

## How to Audit

### Step 1: Navigate to Repository Root

**Execute BEFORE any audit operation:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

### Step 2: Identify the Audit Target

Determine what to audit:

- **Single wrapper**: `<service>/<tool>` (e.g., `context7/search`)
- **Service**: All wrappers in a service (e.g., `linear`)
- **All**: Complete audit across all services
- **Phase-specific**: Test one phase (e.g., `--phase 6` for coverage)

### Step 3: Run the Audit

**Use TodoWrite to track phases being audited:**

```
TodoWrite([
  { content: 'Run audit command', status: 'in_progress', activeForm: 'Running audit' },
  { content: 'Interpret results', status: 'pending', activeForm: 'Interpreting results' },
  { content: 'Report findings', status: 'pending', activeForm: 'Reporting findings' }
])
```

**Execute the audit:**

```bash
npm run audit -- <target> [options]
```

### Step 4: Interpret Results

The audit outputs pass/fail for each phase with details about violations.

**Output format:**

```
Audit Results for context7/search

✅ Phase 1: Schema Discovery - PASS
✅ Phase 2: Optional Fields - PASS
❌ Phase 3: Type Unions - FAIL
   Warning: 7 fields but 0 unions detected
   Location: wrapper.ts - OutputSchema

✅ Phase 4: Nested Access Safety - PASS
❌ Phase 5: Reference Validation - FAIL
   Critical: Deprecated tool reference 'mcp__linear__getIssue'
   Location: wrapper.ts:42

[... remaining phases ...]

Summary: 8/12 phases passed
Status: NEEDS ATTENTION
```

**Severity levels:**

- **CRITICAL**: Must fix (Phases 1, 4, 5, 6, 10)
- **WARNING**: Should fix (Phases 3, 7, 8, 9)
- **INFO**: Advisory (Phase 11, 12 with partial fixes)

### Step 5: Report Findings

Format findings for the user:

```markdown
# Audit Results: {service}/{tool}

**Overall Status:** {Production Ready / Needs Attention / Requires Remediation}
**Phases Passed:** {count}/12

## Critical Issues ({count})

[CRITICAL] Phase 5: Reference Validation
Location: wrapper.ts:42
Issue: Deprecated tool reference 'mcp**linear**getIssue'
Recommendation: Update to current tool reference via wrapper-manager fix

## Warnings ({count})

[WARNING] Phase 3: Type Unions
Location: wrapper.ts - OutputSchema
Issue: 7 fields but 0 unions detected
Recommendation: Review schema discovery for type variance

## Summary

- ≥11/12 phases: Production ready ✅
- 9-10/12 phases: Needs attention ⚠️
- <9/12 phases: Requires remediation ❌
```

---

## The 12 Audit Phases

For detailed phase information (detection patterns, examples, remediation), see [references/phase-details.md](references/phase-details.md).

### Phase 1: Schema Discovery

**Checks:** Discovery documentation exists in wrapper comments
**Auto-fixable:** ❌ No (requires running discovery with real MCP responses)
**Common failures:**

- Missing discovery comment block
- No required vs optional field analysis
- Insufficient test case sampling

**Remediation:** Run schema discovery via `npm run discover -- <service>/<tool>`

### Phase 2: Optional Fields

**Checks:** Wrappers with 3+ fields use `.optional()` appropriately
**Auto-fixable:** ✅ Yes
**Common failures:**

- All fields marked required (suspicious for real APIs)
- No `.optional()` usage despite discovery showing conditional fields

**Remediation:** Run `npm run fix -- <service>/<tool> --phase 2 --apply`

### Phase 3: Type Unions

**Checks:** Complex wrappers (5+ fields) handle type variance
**Auto-fixable:** ❌ No (requires schema analysis)
**Common failures:**

- No `z.union()` usage despite API returning variant types
- Assuming single type when field can be number OR object

**Remediation:** Review discovery results, add unions for variant fields

### Phase 4: Nested Access Safety

**Checks:** Code safely accesses nested properties with null checks
**Auto-fixable:** ✅ Yes
**Common failures:**

- Direct access like `rawData.state.id` without checking `rawData.state` exists
- Missing optional chaining or conditional checks

**Remediation:** Run `npm run fix -- <service>/<tool> --phase 4 --apply`

### Phase 5: Reference Validation

**Checks:** No deprecated tool references in wrapper code
**Auto-fixable:** ❌ No (requires manual verification)
**Common failures:**

- Using old tool names from deprecation registry
- Calling tools that have been replaced or removed

**Remediation:** Update to current tool reference, check `.claude/lib/deprecation-registry.json`

### Phase 6: Unit Test Coverage

**Checks:** Test file exists with ≥80% coverage across required categories
**Auto-fixable:** ❌ No (requires writing tests)
**Common failures:**

- Missing test file entirely
- Test file exists but lacks schema validation tests
- Coverage below 80% threshold

**Remediation:** Write comprehensive tests via `npm run test -- <service>/<tool>`

### Phase 7: Integration Tests

**Checks:** Integration test file exists for real MCP testing
**Auto-fixable:** ❌ No (requires MCP access configuration)
**Common failures:**

- Missing `.integration.test.ts` file
- Integration tests not configured for service

**Remediation:** Create integration test file, configure MCP access

### Phase 8: Test Quality

**Checks:** Tests follow quality patterns (factory mocks, edge cases)
**Auto-fixable:** ❌ No (requires test enhancement)
**Common failures:**

- Tests lack factory mock patterns for MCP client
- Missing edge case coverage
- No response format validation tests

**Remediation:** Enhance test quality using factory mock patterns for MCP client, add edge case coverage, include response format validation tests

### Phase 9: Security Validation

**Checks:** Static security analysis (no dangerous patterns, input validation)
**Auto-fixable:** ❌ No (requires security review)
**Common failures:**

- Missing input validation refinements on string inputs
- No security imports for sanitization
- Dangerous patterns (eval, Function constructor)

**Remediation:** Add validation refinements, import sanitization utilities

### Phase 10: TypeScript Validation

**Checks:** Wrapper compiles without TypeScript errors
**Auto-fixable:** ❌ No (requires code fixes)
**Common failures:**

- Missing `tsconfig.json` in service directory (CRITICAL)
- Type errors (TS2531, TS2322, TS7006, TS2339, TS2769)
- Null-safety violations

**Remediation:** Fix TypeScript errors, ensure `tsconfig.json` exists

### Phase 11: Skill-Schema Synchronization

**Checks:** Service skill wrapper schemas match actual wrapper files
**Auto-fixable:** ✅ Yes
**Common failures:**

- Service skill documents wrappers that don't exist
- Service skill missing wrappers that do exist
- Schema examples out of sync with implementation

**Remediation:** Run `npm run fix -- <service> --phase 11 --apply`

### Phase 12: Service Metadata

**Checks:** Service has `package.json` with description for discoverability
**Auto-fixable:** ⚠️ Partial (creates template, prompts for description)
**Common failures:**

- Missing `package.json` in service directory
- `package.json` exists but no description field
- Description is placeholder text

**Remediation:** Run `npm run fix -- <service> --phase 12` and provide description

---

## Interpreting Results

### Pass Thresholds

- **≥11/12 phases:** Production ready ✅
  - All CRITICAL phases pass
  - At most 1 WARNING phase fails
  - Ready for deployment

- **9-10/12 phases:** Needs attention ⚠️
  - Some CRITICAL phase failures OR
  - Multiple WARNING failures
  - Requires remediation before production

- **<9/12 phases:** Requires remediation ❌
  - Multiple CRITICAL failures
  - Fundamental issues with wrapper implementation
  - Not ready for use

### Phase Priority

**Fix in this order:**

1. **CRITICAL phases first** (1, 4, 5, 6, 10)
   - These prevent the wrapper from working correctly
   - Can cause runtime crashes or security issues

2. **Auto-fixable WARNING phases** (2, 4, 11)
   - Quick wins via `npm run fix --apply`
   - Improves quality with minimal effort

3. **Manual WARNING phases** (3, 7, 8, 9)
   - Improve robustness and maintainability
   - Lower priority but still valuable

4. **Metadata phase last** (12)
   - Improves discoverability but not functionality
   - Can be addressed during cleanup

---

## Common Failures by Phase

**Top 5 most common failures:**

1. **Phase 10: TypeScript Validation** (45% of audits)
   - Missing `tsconfig.json`
   - Null-safety violations
   - Type mismatches

2. **Phase 6: Unit Test Coverage** (38% of audits)
   - Missing test file
   - Coverage below 80%
   - Missing required test categories

3. **Phase 2: Optional Fields** (28% of audits)
   - All fields marked required
   - Discovery results ignored

4. **Phase 4: Nested Access Safety** (22% of audits)
   - Unsafe property access
   - Missing null checks

5. **Phase 12: Service Metadata** (18% of audits)
   - Missing package.json
   - No description field

---

## Integration

### Called By

- `managing-tool-wrappers` - Routes audit operations to this skill
- Developers - Direct invocation for wrapper validation

### Requires (invoke before starting)

| Skill                      | When  | Purpose                                |
| -------------------------- | ----- | -------------------------------------- |
| `using-skills`             | Start | Understand skill system and invocation |
| Repository root navigation | Start | Ensure correct working directory       |

### Calls (during execution)

None - terminal skill that executes CLI and interprets output

### Pairs With (conditional)

| Skill                   | Trigger           | Purpose                 |
| ----------------------- | ----------------- | ----------------------- |
| `fixing-tool-wrappers`  | Audit finds issue | Fix detected violations |
| `creating-tool-wrapper` | Phase 6/7/8 fail  | Generate missing tests  |

---

## Related Skills

- `managing-tool-wrappers` - Routes to this skill for audit operation
- `fixing-tool-wrappers` - Fixes issues found by audit
- `creating-tool-wrapper` - Creates new wrappers with proper structure
- `updating-tool-wrapper` - Updates existing wrappers
- `listing-tools` - Discovers wrappers for batch auditing

---

## Changelog

See `.history/CHANGELOG` for version history.
