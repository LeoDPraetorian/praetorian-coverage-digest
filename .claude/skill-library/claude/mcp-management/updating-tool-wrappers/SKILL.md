---
name: updating-tool-wrappers
description: Use when modifying existing MCP tool wrappers - test-guarded changes with regression prevention
allowed-tools: Bash, Glob, Read, Edit, Write, TodoWrite
---

# Updating Tool Wrappers

**Test-guarded updates to existing MCP tool wrappers with TDD enforcement and regression prevention.**

## When to Use

Use this skill when:

- Modifying an existing MCP tool wrapper (`.claude/tools/*/src/*/wrapper.ts`)
- User says "update the [service] wrapper" or "add field to wrapper"
- Adding new fields, changing response filtering, or fixing bugs in wrappers
- Routed from `managing-tool-wrappers` when operation is "update"

**You MUST use TodoWrite** to track progress through all phases.

## Quick Reference

| Phase         | Purpose                            | Command                                    |
| ------------- | ---------------------------------- | ------------------------------------------ |
| 1. 🔴 RED     | Update tests first, verify failure | `npm run verify-red -- <service>/<tool>`   |
| 2. Discovery  | Test new field with 3+ edge cases  | Document in discovery docs                 |
| 3. 🟢 GREEN   | Update implementation, verify pass | `npm run verify-green -- <service>/<tool>` |
| 4. Regression | Ensure existing tests still pass   | `npm test`                                 |
| 5. Coverage   | Verify coverage still ≥80%         | Check test output                          |
| 6. Re-audit   | Validate 12-phase compliance       | `npm run audit -- <service>/<tool>`        |

---

## Step 0: Navigate to Repository Root (MANDATORY)

**Execute BEFORE any wrapper operation:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

**⚠️ If wrapper file not found:** You are in the wrong directory. Navigate to repo root first.

**Cannot proceed without navigating to repo root** ✅

---

## Rationalization Prevention

Watch for these phrases that indicate skipping TDD discipline:

| Rationalization                  | Reality                                    |
| -------------------------------- | ------------------------------------------ |
| "Tests can come after"           | RED phase is mandatory, tests ALWAYS first |
| "Quick fix doesn't need tests"   | All changes need tests, no exceptions      |
| "I'll update tests while coding" | Tests before implementation, not during    |
| "Existing tests cover this"      | New behavior needs new tests               |
| "Discovery docs can wait"        | Schema discovery prevents API misuse       |
| "Just a small change"            | Small changes break things too             |

**Key principle**: Detect rationalization → STOP → Return to Phase 1 (RED) → Write tests first.

---

## Phase 1: 🔴 RED Phase (Update Tests First)

**You CANNOT skip this phase. TDD is mandatory for all wrapper updates.**

### 1.1 Identify What Needs Testing

Ask: "What behavior are we adding/changing?"

Document:

- New field being added
- Changed response filtering
- Bug being fixed
- Expected behavior change

### 1.2 Navigate to Wrapper Directory

```bash
cd .claude/tools/{service}
```

### 1.3 Add Tests for New Behavior

**Create or update test file:**

For new fields:

```typescript
it('should validate {field} parameter', () => {
  // Test valid values
  expect(() =>
    wrapper.parameters.parse({ ..., {field}: validValue })
  ).not.toThrow();

  // Test invalid values
  expect(() =>
    wrapper.parameters.parse({ ..., {field}: invalidValue })
  ).toThrow('expected error message');
});

it('should filter by {field}', async () => {
  // Mock response with field
  mockRequest.mockResolvedValueOnce({ ... });

  // Execute with field filter
  const result = await wrapper.execute({ ..., {field}: value });

  // Verify field in result
  expect(result.{field}).toBe(expectedValue);
});
```

For response filtering changes:

```typescript
it('should return new response shape', async () => {
  // Mock full API response
  mockRequest.mockResolvedValueOnce({ ... });

  // Execute wrapper
  const result = await wrapper.execute({ ... });

  // Verify new fields present
  expect(result).toHaveProperty('newField');
  expect(result.newField).toBe(expectedValue);
});
```

For bug fixes:

```typescript
it('should fix {bug description}', async () => {
  // Set up scenario that triggers bug
  mockRequest.mockResolvedValueOnce({ ... });

  // Execute (should fail until implementation fixed)
  const result = await wrapper.execute({ ... });

  // Verify correct behavior
  expect(result).toBe(expectedCorrectValue);
});
```

### 1.4 Run Tests and Verify Failure

**Execute:**

```bash
npm run verify-red -- {service}/{tool}
```

**Expected output:**

```
RED Phase Verification: PASS
✓ Tests exist for new behavior
✗ Tests fail as expected (implementation not updated yet)
```

**If tests pass:** You didn't add new test cases OR implementation already covers this (wrong phase).

**If verify-red not available:** Run `npm test -- __tests__/{tool}.test.ts` and verify failures.

**Cannot proceed to GREEN phase without failing tests** ✅

---

## Phase 2: Schema Discovery

**Purpose**: Test new field with 3+ edge cases to understand API behavior before implementing.

### 2.1 Test Edge Cases

For new fields, test:

1. **Valid values**: Expected input range
2. **Null/undefined**: How API handles missing field
3. **Invalid values**: Out-of-range, wrong type
4. **Edge boundaries**: Min/max values, empty strings

### 2.2 Document Findings

Update or create `discovery-docs/{service}-{tool}.md`:

````markdown
## Field: {fieldName}

**API Behavior:**

- Type: {observed type from API}
- Required: {yes/no}
- Valid range: {observed valid values}
- Null handling: {what happens when null}
- Error cases: {what errors are thrown}

**Edge Cases Tested:**

1. Normal value: {result}
2. Null/undefined: {result}
3. Invalid value: {error or result}
4. Boundary value: {result}

**Schema Update Required:**

```typescript
{fieldName}: z.{zodType}()
  .{constraints}()
  .describe('{description}')
```
````

````

### 2.3 Update InputSchema

Based on discovery, add field to Zod schema in `wrapper.ts`:

```typescript
export const {tool}Params = z.object({
  // ... existing fields
  {fieldName}: z.{zodType}()
    .{constraints}()
    .optional()  // if optional
    .describe('{field description with valid range}')
});
````

**Do NOT update implementation yet** - only schema and tests in RED phase.

---

## Phase 3: 🟢 GREEN Phase (Update Implementation)

**Now that tests fail for the right reasons, implement the changes.**

### 3.1 Update Wrapper Implementation

**For new fields:**

1. **Pass field to API query:**

```typescript
const query = `query Get{Thing}($id: String!, ${newField}: ${Type}) { ... }`
const variables = { id: validated.id, {newField}: validated.{newField} };
```

2. **Add validation logic (if needed):**

```typescript
if (validated.{field} !== undefined) {
  // Validation or filtering logic
}
```

3. **Update response transformation:**

```typescript
return {
  // ... existing fields
  {newField}: response.data.{newField} ?? undefined
};
```

**For response filtering changes:**

1. **Update filterResponse function:**

```typescript
function filterResponse(response: ApiResponse): FilteredResponse {
  return {
    // Add new fields to filtered output
    newField: response.data.nested.newField,
    // Update existing field filtering
    existingField: transformValue(response.data.existingField),
  };
}
```

2. **Update OutputSchema:**

```typescript
export const {tool}Output = z.object({
  // ... existing fields
  newField: z.{zodType}().describe('{description}')
});
```

**For bug fixes:**

1. **Identify root cause** from failing test
2. **Apply minimal fix** to make test pass
3. **Verify fix doesn't break existing behavior**

### 3.2 Run Tests and Verify Pass

**Execute:**

```bash
npm run verify-green -- {service}/{tool}
```

**Expected output:**

```
GREEN Phase Verification: PASS
✓ All tests pass (new + existing)
✓ Implementation complete
```

**If tests fail:** Implementation incomplete or incorrect. Debug and fix.

**Cannot proceed to regression check without passing tests** ✅

---

## Phase 4: Verify No Regressions

**Ensure existing functionality still works.**

### 4.1 Run Full Test Suite

```bash
cd .claude/tools/{service} && npm test
```

### 4.2 Check for Failures

**All tests must pass**, including:

- Existing tests for other wrapper functions
- Integration tests
- Regression tests

**If any test fails:**

1. Identify what broke (check diff)
2. Fix implementation to maintain backward compatibility
3. Re-run tests until all pass

### 4.3 Verify Coverage Maintained

Check test output for coverage report:

```
Coverage: 85.2% (target: ≥80%)
```

**If coverage dropped below 80%:**

- Add tests for new code paths
- Ensure all branches covered

**Cannot proceed to re-audit with failing tests or coverage < 80%** ✅

---

## Phase 5: Re-audit Wrapper

**Validate wrapper still complies with 12-phase requirements.**

### 5.1 Run Audit Command

```bash
npm run audit -- {service}/{tool}
```

### 5.2 Review Audit Results

**Must pass ≥11/12 phases:**

| Phase | Requirement            | Status |
| ----- | ---------------------- | ------ |
| 1     | InputSchema with Zod   | ✓      |
| 2     | OutputSchema with Zod  | ✓      |
| 3     | Execute function       | ✓      |
| 4     | Error handling         | ✓      |
| 5     | Response filtering     | ✓      |
| 6     | Token optimization     | ✓      |
| 7     | Test coverage ≥80%     | ✓      |
| 8     | Discovery docs         | ✓      |
| 9     | Type safety            | ✓      |
| 10    | Security validation    | ✓      |
| 11    | Documentation          | ✓      |
| 12    | Integration (optional) | ○      |

### 5.3 Fix Any Failing Phases

**If audit fails:**

1. Note which phase(s) failed
2. Use `fixing-tool-wrappers` skill: `Read(".claude/skill-library/claude/mcp-management/fixing-tool-wrappers/SKILL.md")`
3. Apply fixes
4. Re-run audit until ≥11/12 phases pass

**Cannot complete update with failing audit** ✅

---

## Common Update Scenarios

### Scenario 1: Adding a New Field

**Example**: Add `priority` field to Linear get-issue wrapper

**Workflow:**

1. **RED**: Add test for priority parameter validation
2. **RED**: Add test for priority filtering behavior
3. **Discovery**: Test priority values (0-4), null handling, edge cases
4. **GREEN**: Add priority to InputSchema with `z.number().min(0).max(4)`
5. **GREEN**: Add priority validation logic after fetching issue
6. **GREEN**: Update documentation with priority field
7. **Regression**: Run full test suite, verify all pass
8. **Re-audit**: Confirm ≥11/12 phases pass

### Scenario 2: Changing Response Filtering

**Example**: Add `branchName` to get-issue output for improved dev workflow

**Workflow:**

1. **RED**: Add test expecting `branchName` in output
2. **Discovery**: Test various branch name formats (null, special chars, long names)
3. **GREEN**: Update OutputSchema with `branchName: z.string().optional()`
4. **GREEN**: Update response mapping: `branchName: response.issue.branchName ?? undefined`
5. **GREEN**: Verify token count still meets target (may need to remove other field)
6. **Regression**: Run tests, ensure no breaking changes
7. **Re-audit**: Confirm token optimization phase still passes

### Scenario 3: Fixing a Bug

**Example**: Linear wrapper returning full priority object instead of value

**Workflow:**

1. **RED**: Add test that fails with current bug (expects number, gets object)
2. **GREEN**: Fix response mapping: `priority: response.issue.priority?.value ?? undefined`
3. **GREEN**: Verify test now passes
4. **Regression**: Ensure fix doesn't break null priority handling
5. **Re-audit**: Confirm no new issues introduced

---

## Verification Checklist

Before marking update complete, verify:

- [ ] Tests written BEFORE implementation (RED phase)
- [ ] Schema discovery documented for new fields
- [ ] Tests fail in RED phase (verified with verify-red)
- [ ] Implementation makes tests pass (verified with verify-green)
- [ ] All existing tests still pass (no regressions)
- [ ] Coverage ≥80% maintained
- [ ] Audit passes ≥11/12 phases
- [ ] Discovery docs updated (if new field added)
- [ ] README updated with new parameter (if public API changed)

---

## Integration

### Called By

- `managing-tool-wrappers` - Routes update operations to this skill
- `/tool-manager update` command - Direct invocation via command

### Requires (invoke before starting)

| Skill                 | When  | Purpose                        |
| --------------------- | ----- | ------------------------------ |
| `developing-with-tdd` | Start | TDD methodology and discipline |

### Calls (during execution)

| Skill                    | Phase | Purpose                         |
| ------------------------ | ----- | ------------------------------- |
| `fixing-tool-wrappers`   | 5     | Fix audit failures after update |
| `auditing-tool-wrappers` | 5     | Validate compliance post-update |

### Pairs With (conditional)

| Skill                    | Trigger               | Purpose              |
| ------------------------ | --------------------- | -------------------- |
| `creating-tool-wrappers` | Wrapper doesn't exist | Create before update |

---

## Related Skills

- `managing-tool-wrappers` - Router skill that delegates to this skill
- `auditing-tool-wrappers` - Validates wrapper compliance (used in Phase 5)
- `fixing-tool-wrappers` - Fixes audit failures (used when Phase 5 fails)
- `creating-tool-wrappers` - Creates new wrappers (alternative if wrapper doesn't exist)
- `developing-with-tdd` - TDD methodology (enforced throughout workflow)

---

## References

- [TDD Workflow Details](references/tdd-workflow.md) - Deep dive into RED-GREEN-REFACTOR for wrappers
- [Schema Discovery Guide](references/schema-discovery.md) - How to test and document API field behavior
- [Common Update Patterns](references/update-patterns.md) - Field addition, filtering changes, bug fixes
- [Regression Prevention](references/regression-prevention.md) - Ensuring backward compatibility
- [Audit Phase Requirements](references/audit-requirements.md) - Understanding 12-phase compliance
