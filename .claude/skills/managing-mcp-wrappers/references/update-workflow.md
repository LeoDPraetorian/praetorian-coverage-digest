# Update Workflow for MCP Wrappers

Complete TDD-guarded workflow for updating existing MCP wrappers.

## Overview

Updates to existing wrappers MUST follow TDD to prevent regressions:
1. **Baseline**: Verify existing tests pass
2. **RED**: Add tests for new behavior (must fail)
3. **GREEN**: Implement changes (all tests pass)
4. **VERIFY**: Confirm no regressions

## Complete Workflow

### Phase 1: Verify Baseline

**Purpose:** Ensure existing tests pass before making changes.

```bash
cd .claude && npm run test:unit -- tools/{service}/{tool}.unit.test.ts
```

**Requirement:** All tests MUST pass. If any fail, fix them first.

### Phase 2: Add New Tests (RED)

**Purpose:** Write tests for the new behavior BEFORE implementing it.

```typescript
// Add to existing test file
describe('New Feature', () => {
  it('should handle new field', async () => {
    const response = {
      id: '123',
      newField: 'value'  // New field being added
    };
    const result = await wrapper({ id: '123' });
    expect(result.newField).toBe('value');
  });

  it('should validate new input format', async () => {
    // Test new input handling
  });
});
```

**Verify RED Phase:**
```bash
cd .claude && npm run test:unit -- tools/{service}/{tool}.unit.test.ts
# Expected: NEW tests FAIL, OLD tests PASS
```

### Phase 3: Schema Discovery (If Needed)

**Purpose:** Discover actual API response format for new fields.

```bash
npx tsx .claude/skills/managing-mcp-wrappers/templates/discover-schema.ts \
  --mcp {service} \
  --tool {tool} \
  --cases 3
```

Document new field requirements/optionality.

### Phase 4: Update Implementation (GREEN)

**Purpose:** Make minimum changes to pass new tests.

Changes to make:
1. Update Zod schemas for new fields
2. Add token reduction for new data
3. Update response formatting
4. Handle new response formats defensively

```typescript
// Update schema with new field
export const OutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  newField: z.string().optional(),  // Added
});

// Update filtering
const filtered = {
  id: rawData.id,
  name: rawData.name,
  newField: rawData.newField,  // Added
};
```

**Verify GREEN Phase:**
```bash
cd .claude && npm run test:unit -- tools/{service}/{tool}.unit.test.ts
# Expected: ALL tests PASS (old AND new)
```

### Phase 5: Verify No Regressions

**Purpose:** Confirm coverage hasn't decreased.

```bash
cd .claude && npm run test:coverage -- tools/{service}/{tool}.unit.test.ts
```

Coverage must remain ≥80%.

### Phase 6: Integration Test

**Purpose:** Verify changes work with real MCP server.

```bash
RUN_INTEGRATION_TESTS=true npm run test:integration -- {service}/{tool}
```

### Phase 7: Re-Audit

**Purpose:** Ensure compliance after changes.

```bash
npm run audit -- {service}/{tool}
```

All 10 phases must pass.

## Update Types

### Adding New Fields

1. Schema discovery for field optionality
2. Add tests for field presence/absence
3. Update Zod schema
4. Update filtering logic
5. Re-audit

### Changing Field Types

1. Schema discovery with edge cases
2. Add tests for all type variants
3. Use `z.union()` if multiple types
4. Update filtering for all types
5. Re-audit

### Removing Fields

1. Add tests verifying field is NOT in output
2. Remove from schema
3. Remove from filtering
4. Re-audit

### Bug Fixes

1. Write test that reproduces the bug
2. Verify test fails (proves bug exists)
3. Fix the implementation
4. Verify test passes
5. Re-audit

## Common Mistakes

### ❌ Skipping Baseline Verification

```bash
# DON'T: Make changes without verifying baseline
git add . && git commit -m "Update wrapper"

# DO: Always verify first
npm run test:unit -- {wrapper}
# Only proceed if ALL PASS
```

### ❌ Implementing Before Testing

```typescript
// DON'T: Update schema without tests
export const OutputSchema = z.object({
  newField: z.string(),  // Added without tests
});

// DO: Write tests FIRST, then implement
```

### ❌ Ignoring Coverage Drop

```bash
# DON'T: Accept coverage decrease
Coverage: 75% (was 85%)
"It's still pretty good..."

# DO: Add tests to maintain ≥80%
```

## Checklist

- [ ] Baseline tests pass
- [ ] New tests written for changes
- [ ] New tests fail (RED verified)
- [ ] Implementation updated
- [ ] All tests pass (GREEN verified)
- [ ] Coverage maintained ≥80%
- [ ] Integration tests pass
- [ ] 10-phase audit passes
- [ ] Changes committed
