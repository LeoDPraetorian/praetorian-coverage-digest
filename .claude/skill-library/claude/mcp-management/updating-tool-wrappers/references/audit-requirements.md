# Audit Requirements for Tool Wrappers

**Understanding the 12-phase compliance system for MCP tool wrapper quality.**

## Overview

Tool wrappers must pass ≥11/12 audit phases to be production-ready. This document explains each phase and how updates can impact compliance.

**Audit command:**

```bash
npm run audit -- {service}/{tool}
```

---

## The 12 Audit Phases

| Phase | Name                         | Severity | Auto-Fix | Common Update Impact                  |
| ----- | ---------------------------- | -------- | -------- | ------------------------------------- |
| 1     | Schema Discovery             | CRITICAL | ❌       | Must update docs when adding fields   |
| 2     | Optional Fields              | WARNING  | ✅       | Check after adding fields             |
| 3     | Type Unions                  | WARNING  | ❌       | May need unions for variant types     |
| 4     | Nested Access Safety         | CRITICAL | ✅       | Check after response mapping changes  |
| 5     | Reference Validation         | CRITICAL | ❌       | Update if calling other tools         |
| 6     | Unit Test Coverage           | CRITICAL | ❌       | Must maintain ≥80% after updates      |
| 7     | Integration Tests            | WARNING  | ❌       | Add if behavior changes significantly |
| 8     | Test Quality                 | WARNING  | ❌       | Improve when adding complex features  |
| 9     | Security Validation          | WARNING  | ❌       | Add validation for new input fields   |
| 10    | TypeScript Validation        | CRITICAL | ❌       | Must compile without errors           |
| 11    | Skill-Schema Synchronization | INFO     | ✅       | Auto-sync service skill docs          |
| 12    | Service Metadata             | INFO     | ⚠️       | Update package.json description       |

---

## Phase Details

### Phase 1: Schema Discovery (CRITICAL)

**What it checks:** Discovery documentation exists in wrapper comments

**When updates affect it:**

- Adding new input field → Update discovery docs
- Changing response filtering → Document new output fields
- Fixing bug related to field behavior → Update edge case docs

**How to fix:**

```typescript
/**
 * Schema Discovery Results:
 *
 * INPUT FIELDS:
 * - id: string (required) - Issue ID
 * - priority: number (optional) - Priority filter 0-4  // NEW
 *
 * OUTPUT FIELDS:
 * - id: string
 * - priority: number (optional) - Priority value  // NEW
 *
 * Edge cases discovered:
 * - priority can be null (mapped to undefined)  // NEW
 * - priority is object in API, extract .value  // NEW
 */
```

---

### Phase 2: Optional Fields (WARNING, Auto-fix)

**What it checks:** Wrappers with 3+ fields use `.optional()` appropriately

**When updates affect it:**

- Adding new field that's not always required
- API can return null for new field

**How to fix:**

```bash
npm run fix -- {service}/{tool} --phase 2 --apply
```

Or manually:

```typescript
// If field can be null/undefined
newField: z.string().optional();
```

---

### Phase 3: Type Unions (WARNING)

**What it checks:** Complex wrappers handle type variance

**When updates affect it:**

- Adding field that can be multiple types
- API sometimes returns string, sometimes object

**How to fix:**

```typescript
// Field that can be string OR object
priority: z.union([
  z.number(),
  z.object({
    name: z.string(),
    value: z.number(),
  }),
]).optional();
```

---

### Phase 4: Nested Access Safety (CRITICAL, Auto-fix)

**What it checks:** Code safely accesses nested properties

**When updates affect it:**

- Extracting nested values from new field
- Adding response mapping for complex objects

**How to fix:**

```bash
npm run fix -- {service}/{tool} --phase 4 --apply
```

Or manually:

```typescript
// Use optional chaining
return {
  assigneeName: response.issue.assignee?.name ?? undefined,
  teamLeadEmail: response.issue.team?.lead?.email ?? undefined,
};
```

---

### Phase 5: Reference Validation (CRITICAL)

**What it checks:** No deprecated tool references

**When updates affect it:**

- Adding call to another wrapper
- Updating reference to renamed tool

**How to fix:**

Check `.claude/lib/deprecation-registry.json`, update to current tool name:

```typescript
// Wrong
import { oldTool } from "./deprecated-tool";

// Right
import { newTool } from "./current-tool";
```

---

### Phase 6: Unit Test Coverage (CRITICAL)

**What it checks:** Test file exists with ≥80% coverage

**When updates affect it:**

- **EVERY UPDATE** - Adding code increases untested lines
- New branches, new fields, new logic all need tests

**How to verify:**

```bash
npm test -- __tests__/{tool}.unit.test.ts --coverage
```

**Expected:**

```
----------------------|---------|----------|---------|---------|
File                  | % Stmts | % Branch | % Funcs | % Lines |
----------------------|---------|----------|---------|---------|
{tool}.ts             |   87.5  |   85.71  |     100 |   87.5  |
----------------------|---------|----------|---------|---------|
```

**Must be ≥80% on ALL columns.**

**How to fix:** Add tests for untested code paths

---

### Phase 7: Integration Tests (WARNING)

**What it checks:** Integration test file exists

**When updates affect it:**

- Significant behavior changes
- New filtering logic that needs real API testing
- Bug fixes that should be verified against live API

**How to fix:**

Create `.integration.test.ts` file:

```typescript
import { describe, it, expect } from "vitest";
import { getTool } from "../get-tool";

describe("get-tool integration tests", () => {
  it("should work with real API - priority filter", async () => {
    const result = await getTool.execute({
      id: "REAL-ISSUE-ID",
      priority: 2,
    });

    expect(result.priority).toBe(2);
  });
});
```

---

### Phase 8: Test Quality (WARNING)

**What it checks:** Tests follow quality patterns

**When updates affect it:**

- Adding complex features
- Need for factory mocks, edge case coverage

**Patterns to follow:**

```typescript
// Factory pattern for mock client
function createMockClient(overrides = {}) {
  return {
    request: vi.fn().mockResolvedValue({
      ok: true,
      data: { data: { issue: { id: "issue-1", ...overrides } } },
    }),
  };
}

// Edge case tests
it("should handle null", async () => {
  /* ... */
});
it("should handle missing field", async () => {
  /* ... */
});
it("should handle boundary values", async () => {
  /* ... */
});
```

---

### Phase 9: Security Validation (WARNING)

**What it checks:** Static security analysis, input validation

**When updates affect it:**

- Adding new string input fields
- User-provided data in queries

**How to fix:**

```typescript
import {
  validateNoControlChars,
  validateNoPathTraversal,
  validateNoCommandInjection,
} from "../config/lib/sanitize.js";

newField: z.string()
  .refine(validateNoControlChars, "Control characters not allowed")
  .refine(validateNoPathTraversal, "Path traversal not allowed")
  .refine(validateNoCommandInjection, "Invalid characters detected");
```

---

### Phase 10: TypeScript Validation (CRITICAL)

**What it checks:** Wrapper compiles without errors

**When updates affect it:**

- **EVERY UPDATE** - Type errors from new code

**How to verify:**

```bash
cd .claude/tools/{service} && npx tsc --noEmit
```

**Common errors after updates:**

- TS2339: Property doesn't exist on type
- TS2322: Type not assignable
- TS2531: Object is possibly null
- TS7006: Parameter implicitly has 'any' type

**How to fix:** Add proper types, null checks, type assertions

---

### Phase 11: Skill-Schema Synchronization (INFO, Auto-fix)

**What it checks:** Service skill docs match wrapper schemas

**When updates affect it:**

- Adding/removing wrapper functions
- Changing input/output schemas

**How to fix:**

```bash
npm run fix -- {service} --phase 11 --apply
```

Automatically updates service skill file to match wrapper implementation.

---

### Phase 12: Service Metadata (INFO, Partial Auto-fix)

**What it checks:** Service has `package.json` with description

**When updates affect it:**

- Rarely - only if creating new service

**How to fix:**

```bash
npm run fix -- {service} --phase 12
```

Prompts for description, creates `package.json`.

---

## Post-Update Audit Workflow

### 1. Run Audit

```bash
npm run audit -- {service}/{tool}
```

### 2. Interpret Results

```
Audit Results for linear/get-issue

✅ Phase 1: Schema Discovery - PASS
✅ Phase 2: Optional Fields - PASS
❌ Phase 3: Type Unions - FAIL
   Warning: 8 fields but 0 unions detected
   Location: wrapper.ts - OutputSchema

✅ Phase 4: Nested Access Safety - PASS
❌ Phase 6: Unit Test Coverage - FAIL
   Critical: Coverage 72% (target: ≥80%)
   Location: __tests__/get-issue.unit.test.ts

[... remaining phases ...]

Summary: 9/12 phases passed
Status: NEEDS ATTENTION
```

### 3. Fix Critical Issues First

Priority order:

1. **Phase 6 (Coverage)** - Add missing tests
2. **Phase 10 (TypeScript)** - Fix compilation errors
3. **Phase 1 (Discovery)** - Update docs
4. **Phase 4 (Safety)** - Add null checks
5. **Phase 5 (References)** - Update deprecated refs

### 4. Fix Auto-Fixable Warnings

```bash
npm run fix -- {service}/{tool} --phase 2 --apply
npm run fix -- {service}/{tool} --phase 4 --apply
npm run fix -- {service} --phase 11 --apply
```

### 5. Manually Fix Remaining Issues

Follow phase-specific guidance above.

### 6. Re-Run Audit

```bash
npm run audit -- {service}/{tool}
```

### 7. Verify ≥11/12 Pass

**Cannot complete update until ≥11/12 phases pass** ✅

---

## Audit Pass Thresholds

| Phases Passed | Status               | Meaning                       |
| ------------- | -------------------- | ----------------------------- |
| 12/12         | Perfect              | Production-ready, no issues   |
| 11/12         | Production Ready     | One minor issue, acceptable   |
| 9-10/12       | Needs Attention      | Fix before production         |
| <9/12         | Requires Remediation | Fundamental issues, not ready |

---

## Troubleshooting Common Audit Failures

### "Phase 6: Coverage below 80%"

**Cause:** Added code without tests

**Fix:**

1. Run coverage report: `npm test -- --coverage`
2. Identify untested lines
3. Add tests for those lines
4. Re-run until ≥80%

### "Phase 10: TypeScript errors"

**Cause:** Type mismatches, null-safety violations

**Fix:**

1. Run `npx tsc --noEmit`
2. Read error messages
3. Add types, null checks, or assertions
4. Re-compile until clean

### "Phase 1: Missing schema discovery"

**Cause:** Forgot to update discovery docs

**Fix:** Add discovery comment block to wrapper file

### "Phase 4: Unsafe nested access"

**Cause:** Direct property access without null checks

**Fix:** Use optional chaining `?.` and null coalescing `??`

---

## Related References

- [TDD Workflow](tdd-workflow.md) - Re-audit is part of GREEN phase
- [Update Patterns](update-patterns.md) - Common changes and their audit impact
- [Regression Prevention](regression-prevention.md) - Maintain coverage during updates
- [auditing-tool-wrappers skill](.claude/skill-library/claude/mcp-management/auditing-tool-wrappers/SKILL.md) - Complete audit documentation
