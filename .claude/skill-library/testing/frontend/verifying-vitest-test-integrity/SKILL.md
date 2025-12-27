---
name: verifying-vitest-test-integrity
description: Use when reviewing PR test files - detects test-production logic duplication anti-pattern in Vitest unit tests
license: MIT
allowed-tools: [Read, Write, Edit, Grep, Bash]
metadata:
  version: 1.0.0
  platform: chariot
  domains: [testing, frontend, quality-assurance, vitest, code-review]
  last-updated: 2025-11-04
  author: Chariot Platform Team
  related-skills: [react-performance-optimization, vitest-virtuoso]
---

# Vitest Test Integrity (PR-Scoped Review)

> **IMPORTANT**: You MUST use TodoWrite before starting to track all steps of the review process.

## When to Use This Skill

Use this skill when:

- **Reviewing a PR** with new or modified `.test.ts` or `.test.tsx` files
- **Before submitting a PR** to self-review test quality
- **Responding to PR feedback** about test implementation
- **Writing new unit tests** to ensure they follow best practices
- **Investigating why tests pass but production has bugs**

**Scope**: Only analyzes tests **added or modified in the current branch**, not the entire codebase.

---

## The Anti-Pattern: Test-Production Logic Duplication

### What It Looks Like

**❌ BAD: Test Contains Copy of Production Logic**

```typescript
// File: src/hooks/__tests__/useData.test.ts

// Test file defines its own implementation (COPY of production logic)
function processData(items: Item[]): Item[] {
  const unique = new Map<string, Item>();
  items.forEach((item) => {
    if (item.id && !unique.has(item.id)) {
      unique.set(item.id, item);
    }
  });
  return Array.from(unique.values());
}

describe("processData", () => {
  it("removes duplicates", () => {
    const result = processData([item1, item2, item1]);
    expect(result).toHaveLength(2); // ✅ Test passes
  });
});
```

**Production Code** (`src/hooks/useData.ts`):

```typescript
// Production has additional logic NOT in test copy
const unique = new Map<string, Item>();
items.forEach((item) => {
  if (item.id && !unique.has(item.id)) {
    unique.set(item.id, item);
  } else if (item.id && import.meta.env.DEV) {
    console.warn("Duplicate detected!"); // ← Missing in test!
  }
});
```

**Problem**:

1. ❌ Test validates itself, not production code
2. ❌ Production's dev warning is untested
3. ❌ If production changes, test might not catch bugs
4. ❌ Violates DRY (logic exists in 2 places)

---

### What It Should Look Like

**✅ GOOD: Test Imports Actual Production Code**

```typescript
// File: src/utils/dataProcessing.util.ts (EXTRACTED)
export function deduplicateById(items: Item[]): Item[] {
  const unique = new Map<string, Item>();
  items.forEach((item) => {
    if (item.id && !unique.has(item.id)) {
      unique.set(item.id, item);
    } else if (item.id && import.meta.env.DEV) {
      console.warn(`Duplicate detected: ${item.id}`);
    }
  });
  return Array.from(unique.values());
}

// File: src/hooks/useData.ts (USES UTILITY)
import { deduplicateById } from "@/utils/dataProcessing.util";

const data = deduplicateById(items);

// File: src/utils/__tests__/dataProcessing.util.test.ts (TESTS ACTUAL CODE)
import { deduplicateById } from "@/utils/dataProcessing.util";

describe("deduplicateById", () => {
  it("removes duplicates", () => {
    const result = deduplicateById([item1, item2, item1]);
    expect(result).toHaveLength(2); // ✅ Tests actual production code
  });

  it("warns in dev mode", () => {
    const spy = vi.spyOn(console, "warn");
    deduplicateById([item1, item1]);
    expect(spy).toHaveBeenCalled(); // ✅ Tests dev warning
  });
});
```

---

## PR-Scoped Detection Algorithm

### Step 1: Get Test Files Modified in Branch

```bash
# Find test files added or modified in current branch vs main
git diff main...HEAD --name-only | grep -E "\.test\.(ts|tsx)$|__tests__/"
```

**Output**: List of test files to review

### Step 2: Analyze Each Modified Test File

For each test file found:

```bash
# Check what it imports from production
grep "^import.*from '@/" test-file.test.ts

# Find functions defined in the test
grep -n "^\s*function\|^\s*const.*=.*(" test-file.test.ts
```

### Step 3: Identify Suspicious Functions

Flag functions that:

- ✅ Are >10 lines long
- ✅ Contain business logic (map, filter, reduce, complex conditionals)
- ❌ Are NOT obviously test helpers (not named `setup*`, `create*`, `mock*`)

### Step 4: Search for Production Equivalent

```bash
# Search production code for similar function names
git diff main...HEAD --name-only | grep -v test | \
  xargs grep -l "functionName"
```

**If found**: Likely duplication anti-pattern

### Step 5: Assess Severity

**HIGH**: Complex algorithms, business logic, >20 lines
**MEDIUM**: Moderate logic, 10-20 lines
**LOW**: Simple helpers, clearly test-only

---

## Refactoring Workflow

### Scenario: Found Duplicated Logic in Test

**Given**: Test file contains `processItems()` function that duplicates production logic

**Steps to Fix**:

#### 1. Extract to Utility Function

```typescript
// Create: src/utils/itemProcessing.util.ts
export function processItems(items: Item[]): ProcessedItem[] {
  // Move EXACT production logic here (including error handling, logging, etc.)
  return items.map((item) => ({
    ...item,
    processed: true,
    timestamp: new Date().toISOString(),
  }));
}
```

#### 2. Update Production Code

```typescript
// Modify: src/hooks/useItems.ts
import { processItems } from "@/utils/itemProcessing.util";

// Replace inline logic with:
const processed = processItems(rawItems);
```

#### 3. Update Test to Import

```typescript
// Modify: src/hooks/__tests__/useItems.test.ts
import { processItems } from "@/utils/itemProcessing.util";

describe("processItems", () => {
  it("processes items correctly", () => {
    const result = processItems([item1, item2]);
    expect(result).toHaveLength(2);
    expect(result[0].processed).toBe(true);
  });
});
```

#### 4. Verify

```bash
# Run affected tests
npm test -- itemProcessing.util.test.ts

# Type check
npx tsc --noEmit

# Ensure imports are correct
grep "processItems" src/hooks/useItems.ts src/**/*.test.ts
```

---

## Detection Script for PR

Use this script to automatically find suspicious patterns in modified tests:

```bash
#!/bin/bash
# File: scripts/check-test-integrity.sh

echo "🔍 Checking test integrity for modified files in branch..."

# Get modified test files
MODIFIED_TESTS=$(git diff main...HEAD --name-only | grep -E "\.test\.(ts|tsx)$|__tests__/")

if [ -z "$MODIFIED_TESTS" ]; then
  echo "✅ No test files modified in this branch"
  exit 0
fi

echo "📝 Modified test files:"
echo "$MODIFIED_TESTS"
echo ""

# Check each test file
for TEST_FILE in $MODIFIED_TESTS; do
  echo "Analyzing: $TEST_FILE"

  # Find function definitions (excluding mocks/fixtures)
  FUNCTIONS=$(grep -n "function [a-z]" "$TEST_FILE" | grep -v "mock\|Mock\|fixture\|Fixture")

  if [ -n "$FUNCTIONS" ]; then
    echo "⚠️  Found function definitions:"
    echo "$FUNCTIONS"

    # Check if test imports from production
    IMPORTS=$(grep "from '@/" "$TEST_FILE")
    if [ -z "$IMPORTS" ]; then
      echo "🚨 WARNING: No production imports found!"
      echo "   This test might be testing copied logic"
    fi
  fi

  echo ""
done
```

---

## Common Patterns in Chariot Codebase

### Pattern 1: Deduplication Logic

**Anti-pattern found**: `useAssets.deduplication.test.ts` (fixed in CHARIOT-1526)

**Correct pattern**:

```typescript
// ✅ Extract to utility
export function deduplicateAssetsByKey(assets: Asset[]): Asset[];

// ✅ Test actual function
import { deduplicateAssetsByKey } from "@/utils/entities/asset.util";
```

### Pattern 2: Hook Testing

**Correct pattern** (already used in codebase):

```typescript
// ✅ Test actual hook with renderHook
import { renderHook } from "@testing-library/react";
import { useTableRemountOnTransition } from "@/hooks/useTableRemountOnTransition";

const { result } = renderHook(() => useTableRemountOnTransition(isEmpty, length, sortKey));
```

**Don't do this**:

```typescript
// ❌ Reimplementing hook logic in test
function simulateRemountBehavior(isEmpty, length) {
  // Copy of hook logic
}
```

---

## Testing Dev-Only Behavior

### Pattern: Console Warnings/Errors

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("feature with dev warnings", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("warns in dev mode", () => {
    // Call actual production function
    deduplicateAssetsByKey([asset1, asset1]);

    if (import.meta.env.DEV) {
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Duplicate detected"));
    }
  });
});
```

---

## PR Review Checklist

When reviewing tests in a PR:

### ✅ Test Integrity Checks

- [ ] Test imports actual production code (not defining own version)
- [ ] All production code paths are tested (error handling, dev warnings, edge cases)
- [ ] Complex logic is extracted to testable utilities (not inline in hooks/components)
- [ ] Test uses `renderHook` for hooks (not reimplementing hook behavior)
- [ ] Console spies used for testing logging/warnings
- [ ] Environment-specific behavior tested (DEV vs PROD)

### ❌ Red Flags

- [ ] Function defined in test that looks like production logic
- [ ] Test doesn't import from `@/` (only imports test utilities)
- [ ] Comment says "simulating production behavior" (should test actual behavior!)
- [ ] Test passes but similar production code exists elsewhere
- [ ] Complex algorithm (>10 lines) defined inline in test

---

## Quick Reference: Fix Workflow

**Found duplicated logic in test?**

1. **Extract** to `src/utils/` or `src/[domain]/utils/`
2. **Import** in production code
3. **Import** in test code
4. **Test** actual function (not copy)
5. **Verify** all production paths tested (including dev warnings)

**Time estimate**: 15-20 minutes per occurrence

---

## Real-World Example: CHARIOT-1526

**Problem Found**:

```typescript
// useAssets.deduplication.test.ts had this:
function deduplicateAssets(data: Asset[]): Asset[] {
  // COPY of production logic (missing dev warnings)
}
```

**Fixed By**:

1. Created `src/utils/entities/asset.util.ts`
2. Exported `deduplicateAssetsByKey()` with full production logic
3. Updated `useAssets.tsx` to import utility
4. Updated test to import and test actual function
5. Added 5 new tests for dev warning behavior

**Result**:

- ✅ Tests now validate actual browser code
- ✅ Dev warnings properly tested
- ✅ Single source of truth (DRY)
- ✅ 13 tests passing (8 original + 5 new)

---

## Commands for PR Review

### Detect Modified Test Files

```bash
# Show test files changed in current branch
git diff main...HEAD --name-only | grep -E "\.test\.(ts|tsx)$|__tests__/"
```

### Analyze Specific Test File

```bash
# Find function definitions (excluding mocks)
grep -n "function [a-z]" src/hooks/__tests__/example.test.ts | \
  grep -v "mock\|Mock\|create\|setup"

# Check production imports
grep "from '@/" src/hooks/__tests__/example.test.ts
```

### Verify Test Uses Production Code

```bash
# Search for where function is actually used in production
grep -r "functionName" src/ --include="*.ts" --include="*.tsx" | \
  grep -v test
```

---

## References

- **Testing Library**: https://testing-library.com/docs/react-testing-library/api
- **Vitest Docs**: https://vitest.dev/guide/
- **PR Example**: CHARIOT-1526 deduplication refactor (commit 3d48d5f5e)
- **Chariot Patterns**: `docs/DESIGN-PATTERNS.md`

---

## Related Skills

- **vitest-virtuoso**: Comprehensive Vitest testing patterns
- **react-performance-optimization**: React 19 testing patterns

---

## Changelog

### Version 1.0.0 (2025-11-04)

- Initial release
- PR-scoped test review algorithm
- Test-production logic duplication detection
- Refactoring workflow for fixing duplications
- Console spy and environment mocking patterns
- Real-world example from CHARIOT-1526
