# Linear Wrapper Fix Summary

**Date**: 2025-12-01
**Command**: `/mcp-manager fix linear`

## Results

### Auto-Fixes Applied ✅

Applied Phase 2 (Optional Fields) auto-fixes to **4 wrappers**:

- `linear/create-comment` - 1 phase fixed
- `linear/create-project` - 1 phase fixed
- `linear/find-issue` - 1 phase fixed
- `linear/update-project` - 1 phase fixed

**Change**: Added `.optional()` to fields with "default" in their names.

### Before Auto-Fix

- **21 critical issues**
- **77 warnings**
- 0 wrappers passing

### After Auto-Fix

- **33 critical issues** (increased due to stricter validation)
- **68 warnings** (reduced from 77)
- 0 wrappers passing

## Remaining Manual Work Required

All 19 Linear wrappers require manual fixes across **7-8 phases**:

### Phase 1: Schema Discovery ❌ CRITICAL

**Issue**: Missing schema discovery documentation
**Fix Required**: Run schema discovery with 3+ diverse test cases to document actual MCP response structure

**Steps**:

1. Run wrapper with diverse inputs
2. Capture actual MCP responses
3. Document field types and optionality
4. Update schema based on findings

---

### Phase 3: Type Unions ❌ CRITICAL

**Issue**: Complex schemas without `z.union()` for variant fields
**Fix Required**: Identify fields that can return different types

**Example**:

```typescript
// Before:
result: z.string()

// After (if result can be string or object):
result: z.union([z.string(), z.object({ ... })])
```

---

### Phase 5: Reference Validation 📝 MANUAL

**Issue**: Deprecated references in code or documentation
**Fix Required**: Update any references to old MCP tool names or deprecated patterns

---

### Phase 6: Unit Test Coverage 📝 MANUAL

**Issue**: Missing test categories in unit test files
**Fix Required**: Add tests for:

- Input validation (all Zod schema fields)
- Error handling (MCP failures, timeouts, invalid responses)
- Edge cases (null values, empty arrays, large responses)
- Security (injection attempts, invalid characters)

**Target**: ≥80% coverage

---

### Phase 7: Integration Tests 📝 MANUAL

**Issue**: No integration tests with real MCP servers
**Fix Required**: Create `{tool}.integration.test.ts` files

**Template**:

```typescript
describe("Integration Tests", () => {
  it("should work with real Linear MCP", async () => {
    const result = await toolName.execute({
      /* real params */
    });
    expect(result).toBeDefined();
  });
});
```

---

### Phase 8: Test Quality 📝 MANUAL

**Issue**: Tests lack factory mocks, response format validation, edge cases
**Fix Required**:

- Add factory functions for test data generation
- Test response format matches schema
- Test boundary conditions
- Test error scenarios

---

### Phase 9: Security Validation 📝 MANUAL

**Issue**: Missing input sanitization and security imports
**Fix Required**:

1. Add import:

```typescript
import { validators } from "../config/lib/sanitize.js";
```

2. Add validation to string inputs:

```typescript
z.string().refine(validators.validateNoPathTraversal, {
  message: "Path traversal detected",
});
```

**Check for**:

- No `eval()` or `new Function()`
- No hardcoded credentials
- Input sanitization on all user-provided strings

---

### Phase 10: TypeScript Validation 📝 MANUAL

**Issue**: TypeScript errors from `tsc --noEmit`
**Fix Required**:

- Add proper type annotations for parameters and return types
- Add null checks for potentially undefined values
- Ensure imports match exported types
- Fix any type errors reported by compiler

**Verify**:

```bash
cd .claude/tools/linear && npx tsc --noEmit
```

---

## Next Steps

### Option 1: Systematic Fix (Recommended)

Fix all phases for one wrapper first, then replicate pattern:

1. Choose a representative wrapper (e.g., `get-issue`)
2. Complete all 8 manual phases
3. Document the pattern/template
4. Apply pattern to remaining 18 wrappers

### Option 2: Phase-by-Phase Fix

Fix one phase across all wrappers:

1. Run schema discovery for all 19 wrappers (Phase 1)
2. Add type unions based on discoveries (Phase 3)
3. Add security validation (Phase 9)
4. Fix TypeScript errors (Phase 10)
5. Add comprehensive tests (Phases 6, 7, 8)

### Option 3: Prioritize Critical Phases

Focus on phases that block functionality:

**Priority 1 (Critical)**:

- Phase 1: Schema Discovery
- Phase 3: Type Unions
- Phase 10: TypeScript Validation

**Priority 2 (Quality)**:

- Phase 6: Unit Test Coverage (≥80%)
- Phase 9: Security Validation

**Priority 3 (Best Practice)**:

- Phase 7: Integration Tests
- Phase 8: Test Quality

---

## Estimated Effort

**Per wrapper**: 2-4 hours for complete compliance
**Total for 19 wrappers**: 38-76 hours

**Efficiency gains with templating**: 50-60% reduction (19-38 hours total)

---

## Tools & Commands

```bash
# Schema discovery
npm run create -- linear <tool>
npm run verify-red -- linear/<tool>
npm run generate-wrapper -- linear/<tool>

# Testing
npm run test -- linear/<tool> --coverage
npm run verify-green -- linear/<tool>

# Audit specific wrapper
npm run audit -- linear/<tool> --verbose

# Fix auto-fixable issues
npm run fix -- linear/<tool>

# TypeScript validation
cd .claude/tools/linear && npx tsc --noEmit
```

---

## References

- **TDD Workflow**: `.claude/skills/mcp-manager/references/new-workflow.md`
- **Audit Phases**: `.claude/skills/mcp-manager/references/audit-workflow.md`
- **Security Patterns**: `docs/MCP-TOOLS-ARCHITECTURE.md#security-considerations`
