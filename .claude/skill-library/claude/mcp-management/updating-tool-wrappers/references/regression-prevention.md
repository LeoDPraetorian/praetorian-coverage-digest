# Regression Prevention

**Strategies for maintaining backward compatibility when updating tool wrappers.**

## Why Regression Prevention Matters

Every wrapper update risks breaking existing callers. A "small change" can cascade:

- Changed field type → caller's code breaks
- New required field → existing calls fail validation
- Modified response shape → downstream code expects old structure
- Stricter validation → previously valid calls now rejected

**The goal:** Update the wrapper without breaking ANY existing usage.

---

## Pre-Update Checklist

Before making ANY changes:

- [ ] Read existing wrapper code completely
- [ ] Identify all current input fields and their constraints
- [ ] Identify all current output fields and their types
- [ ] Check if wrapper is used by other wrappers (dependencies)
- [ ] Review existing test suite (understand current behavior)
- [ ] Document current API contract

---

## Safe Update Strategies

### Strategy 1: Add Optional Fields Only

✅ **Safe:** New optional input fields

```typescript
// Before
export const params = z.object({
  id: z.string(),
});

// After - backward compatible
export const params = z.object({
  id: z.string(),
  priority: z.number().optional(), // New, optional
});
```

**Why safe:** Existing calls `{ id: 'TEST-1' }` still validate.

❌ **Unsafe:** New required fields

```typescript
export const params = z.object({
  id: z.string(),
  priority: z.number(), // Required! Breaks existing calls
});
```

### Strategy 2: Extend Output, Don't Change It

✅ **Safe:** Add new output fields

```typescript
// Before
return {
  id: issue.id,
  title: issue.title,
};

// After - backward compatible
return {
  id: issue.id,
  title: issue.title,
  priority: issue.priority?.value, // New field, existing fields unchanged
};
```

**Why safe:** Callers ignoring new field continue working.

❌ **Unsafe:** Change existing field structure

```typescript
// Before
return {
  priority: issue.priority, // Object
};

// After - BREAKS callers expecting object
return {
  priority: issue.priority?.value, // Number
};
```

**Fix:** Add new field, deprecate old one

```typescript
return {
  priority: issue.priority, // Keep for compatibility
  priorityValue: issue.priority?.value, // New field
};
```

### Strategy 3: Loosen Validation, Don't Tighten It

✅ **Safe:** Accept more input

```typescript
// Before
id: z.string().min(5);

// After - accepts more
id: z.string().min(1); // Looser constraint
```

❌ **Unsafe:** Reject previously valid input

```typescript
// Before
id: z.string();

// After - rejects short IDs
id: z.string().min(10); // Stricter! May break calls with short IDs
```

### Strategy 4: Make Optional, Not Required

✅ **Safe progression:**

1. No field → Optional field → Required field (over 3 releases)
2. Give callers time to adopt before requiring

❌ **Unsafe:** Immediately required

1. No field → Required field (breaks everyone)

---

## Testing for Regressions

### Test Suite Structure

```typescript
describe("Backward compatibility", () => {
  it("should work with minimal params (existing behavior)", async () => {
    // Test OLD API still works
    const result = await wrapper.execute({ id: "TEST-1" });
    expect(result).toBeDefined();
    expect(result.id).toBe("issue-1");
  });

  it("should work with new optional params", async () => {
    // Test NEW API works too
    const result = await wrapper.execute({ id: "TEST-1", priority: 2 });
    expect(result.priority).toBe(2);
  });

  it("should not break existing output consumers", async () => {
    const result = await wrapper.execute({ id: "TEST-1" });

    // Verify ALL existing fields still present and same type
    expect(typeof result.id).toBe("string");
    expect(typeof result.title).toBe("string");
    expect(typeof result.state).toBe("string");
  });
});
```

### Regression Test Workflow

1. **Before changing code:** Run full test suite, ensure all pass
2. **After changing code:** Run full test suite again
3. **Compare:** Any new failures = regression
4. **Fix:** Adjust implementation to maintain old behavior

```bash
# Baseline
npm test > baseline.txt

# Make changes

# Compare
npm test > after-changes.txt
diff baseline.txt after-changes.txt
```

---

## Common Regression Scenarios

### Scenario 1: Type Change

**Problem:** Change from object to primitive

```typescript
// Before
priority: { name: 'High', value: 2 }

// After
priority: 2
```

**Impact:** Callers using `result.priority.name` break

**Fix:** Add new field instead

```typescript
return {
  priority: response.priority, // Keep object
  priorityValue: response.priority?.value, // Add number
};
```

### Scenario 2: Validation Tightening

**Problem:** Add stricter validation

```typescript
// Before
id: z.string();

// After
id: z.string().regex(/^[A-Z]+-\d+$/); // Only accepts PROJECT-123 format
```

**Impact:** Calls with UUID IDs (previously valid) now fail

**Fix:** Keep loose validation OR provide migration path

```typescript
id: z.string().refine(
  (val) => /^[A-Z]+-\d+$/.test(val) || /^[0-9a-f-]{36}$/.test(val),
  "Must be PROJECT-123 format or UUID"
);
```

### Scenario 3: Response Shape Change

**Problem:** Flatten nested structure

```typescript
// Before
return {
  state: { name: "In Progress", type: "started" },
};

// After
return {
  state: "In Progress", // Flattened
};
```

**Impact:** Callers using `result.state.name` break

**Fix:** Provide both formats temporarily

```typescript
return {
  state: response.state.name, // New format
  stateObj: response.state, // Keep old format
};
```

### Scenario 4: Null Handling Change

**Problem:** Change null behavior

```typescript
// Before
return {
  priority: response.priority ?? null, // Returns null
};

// After
return {
  priority: response.priority ?? undefined, // Returns undefined
};
```

**Impact:** Callers checking `=== null` break

**Fix:** Maintain null behavior OR document breaking change

```typescript
// If callers expect null, keep returning null
priority: response.priority ?? null;
```

---

## Deprecation Protocol

When you MUST make a breaking change:

### Step 1: Add Deprecation Warning

```typescript
/**
 * @deprecated Use priorityValue instead. This field will return an object until v2.0,
 * then will be removed. Migrate by using priorityValue (number) instead of priority (object).
 */
priority?: { name: string; value: number };
priorityValue?: number;  // New field
```

### Step 2: Log Warning at Runtime

```typescript
if (params.oldField !== undefined) {
  console.warn("Warning: oldField is deprecated. Use newField instead.");
}
```

### Step 3: Provide Migration Period

- **v1.0:** Add new field, deprecate old field (both work)
- **v1.5:** Warn when old field used
- **v2.0:** Remove old field

### Step 4: Update Documentation

````markdown
## Breaking Changes in v2.0

- `priority` field removed. Use `priorityValue` instead.

  **Before:**

  ```typescript
  const { priority } = await getIssue.execute({ id: "TEST-1" });
  const value = priority.value; // Extract from object
  ```
````

**After:**

```typescript
const { priorityValue } = await getIssue.execute({ id: "TEST-1" });
const value = priorityValue; // Direct number
```

```

---

## Verification Checklist

Before completing update:

- [ ] All existing tests still pass
- [ ] New tests added for new behavior
- [ ] Tested with minimal params (backward compat)
- [ ] Tested with new params (new functionality)
- [ ] No existing output fields changed type
- [ ] No existing input fields made more restrictive
- [ ] Coverage maintained ≥80%
- [ ] No TypeScript errors
- [ ] Documentation updated with migration notes (if breaking)

---

## Emergency Rollback

If regression discovered after merge:

1. **Identify impact:** Which callers broken? How many?
2. **Quick fix:** Revert breaking change, re-deploy
3. **Root cause:** Why didn't tests catch it?
4. **Add tests:** Reproduce regression, ensure test fails
5. **Re-implement:** Fix with proper backward compatibility
6. **Verify:** All regression tests pass before re-deploying

---

## Related References

- [TDD Workflow](tdd-workflow.md) - Regression check is part of GREEN phase
- [Update Patterns](update-patterns.md) - Safe patterns for common changes
- [Audit Requirements](audit-requirements.md) - Phase 6 checks test coverage
```
