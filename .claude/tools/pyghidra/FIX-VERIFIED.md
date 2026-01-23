# PyGhidra list_cross_references from_function Field - FIX VERIFIED

**Date**: 2026-01-20
**Issue**: `from_function` field returns "unknown" instead of actual function names
**Status**: ✅ **FIXED AND VERIFIED**

---

## Root Cause: Field Name Mismatch

### The Problem

The wrapper was reading the wrong field name:

```typescript
// BEFORE (WRONG - field doesn't exist in MCP response)
from_function: ref.from_function || 'unknown',
```

### The Evidence

**Actual PyGhidra MCP Response** (captured via HTTP client test):

```json
{
  "cross_references": [
    {
      "function_name": "_start",  // ← Server uses "function_name"
      "from_address": "00010e1c",
      "to_address": "00010a6c",
      "type": "PARAM"              // ← Server uses "type"
    }
  ]
}
```

**NOT** `from_function` or `ref_type` as the schema discovery documentation suggested.

---

## The Fix

### 1. Updated Raw MCP Interface

**File**: `list-cross-references.ts:171-180`

```typescript
interface RawMcpCrossReference {
  from_address: string;
  function_name?: string | null;  // ← ACTUAL field name from MCP server
  to_address: string;
  type: string;                   // ← ACTUAL field name from MCP server

  // Legacy field names (backwards compatibility)
  from_function?: string;
  ref_type?: string;
}
```

### 2. Fixed Field Mapping

**File**: `list-cross-references.ts:243-254`

```typescript
from_function: (() => {
  const funcName = ref.function_name || ref.from_function;  // ← Read function_name FIRST
  return funcName && String(funcName).trim() !== '' && funcName !== 'null'
    ? String(funcName)
    : 'unknown';
})(),
```

### 3. Fixed Type Filtering

**File**: `list-cross-references.ts:236`

```typescript
// Before: ref.ref_type === filterType (WRONG - field doesn't exist)
// After:
allRefs.filter((ref) => (ref.type || ref.ref_type) === filterType);
```

### 4. Updated BinaryNameSchema

**File**: `lib/schemas.ts:36-42`

Removed `validateNoPathSeparators` check to allow PyGhidra's `/binary-name-hash` format.

### 5. Updated Test Mocks

**File**: `list-cross-references.unit.test.ts:36-42`

```typescript
function createMockXref(index: number, type: string = 'CALL') {
  return {
    from_address: `0x${(0x401000 + index * 0x10).toString(16)}`,
    function_name: `caller${index}`,  // ← Changed from from_function
    to_address: '0x401000',
    type: type,  // ← Changed from ref_type
  };
}
```

---

## Verification Results

### Test Case: automotive binary `afw_vehcle_info_boot_tool`

**Raw MCP Response** (3 cross-references to `main`):

| XRef | function_name | from_address | Result |
|------|---------------|--------------|---------|
| #1 | `null` | _elfSectionHeaders::00000214 | → "unknown" (legitimate) |
| #2 | `null` | Entry Point | → "unknown" (legitimate) |
| #3 | `"_start"` | 00010e1c | → **"_start"** ✅ |

**Before Fix**:
- 0/3 cross-references populated (0%) - all showing "unknown"
- Wrapper reading wrong field: `from_function`

**After Fix**:
- 1/3 cross-references populated (33.3%) - correct behavior
- XRef #3 now shows: `from_function: "_start"` ✅
- XRef #1, #2 legitimately "unknown" (not in named functions)

### Unit Tests

✅ **All 27 tests passing**

```
Test Files  1 passed (1)
Tests  27 passed (27)
Duration  216ms
```

---

## Why This Happened

### Documentation Mismatch

**Schema Discovery Document** said:
```typescript
interface CrossReferenceInfo {
  from_function?: string;  // ← WRONG
  type: string;            // ← Correct
}
```

**Actual MCP Server Returns**:
```typescript
{
  function_name?: string;  // ← ACTUAL field name
  type: string;            // ← Correct
}
```

The schema discovery was incomplete/incorrect, leading to the wrong field name in our wrapper.

---

## Impact

### Before Fix
- ❌ **0% function names** populated in vulnerability traces
- ❌ Pattern matching ineffective (all callers show "unknown")
- ❌ No visibility into actual calling functions

### After Fix
- ✅ **Function names populated** when address is in a named function
- ✅ Pattern matching now works (can identify external API patterns)
- ✅ Clear visibility: "_start", "main", etc. vs legitimate "unknown" (Entry Point)

### Example from Vulnerability Trace

**Before**:
```json
{
  "caller": {
    "name": "unknown",  // ← No useful information
    "address": "00010e1c"
  }
}
```

**After**:
```json
{
  "caller": {
    "name": "_start",  // ← Actual function name!
    "address": "00010e1c"
  }
}
```

---

## Files Modified

| File | Changes |
|------|---------|
| `list-cross-references.ts` | Fixed field mapping: function_name → from_function |
| `list-cross-references.ts` | Fixed type filtering: use `type` field |
| `list-cross-references.ts` | Updated interface documentation |
| `lib/schemas.ts` | Allow `/` in binary names (PyGhidra format) |
| `list-cross-references.unit.test.ts` | Updated mocks to match actual MCP response |

**Test Results**: ✅ 27/27 passing

---

## Verification Commands

```bash
cd .claude/tools/pyghidra

# 1. Verify with simulation (no server needed)
npx tsx verify-fix.ts

# 2. Test with real PyGhidra server
npx tsx test-final.ts  # Requires HTTP server on port 8765

# 3. Run unit tests
cd .. && npx vitest pyghidra/list-cross-references.unit.test.ts --run
```

---

## Conclusion

✅ **ROOT CAUSE IDENTIFIED**: Field name mismatch (function_name vs from_function)
✅ **FIX APPLIED**: Wrapper now reads correct field
✅ **FIX VERIFIED**: XRef #3 shows "_start" instead of "unknown"
✅ **TESTS PASSING**: All 27 unit tests pass
✅ **BACKWARDS COMPATIBLE**: Falls back to old field names if server changes

**The from_function field now populates correctly** when the PyGhidra MCP server provides function names (i.e., when the address is inside a named function).

Addresses legitimately showing "unknown" (Entry Point, section headers) are **working as expected** since those locations aren't inside named functions.
