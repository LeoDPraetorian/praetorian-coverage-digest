# MCP Wrapper Audit Phases Reference

Complete reference for all 10 compliance audit phases.

## Phase 1: Schema Discovery

**Purpose:** Validates that wrappers have documented schema discovery results.

**Detection:** Missing "Schema Discovery Results" comment block.

**Red Flag:** Wrapper file without discovery documentation.

**Auto-Fix:** ❌ Not auto-fixable (requires running discovery with real MCP responses)

**Example:**
```typescript
// ❌ BAD: No discovery documentation
export const OutputSchema = z.object({
  id: z.string(),
  name: z.string(),
});

// ✅ GOOD: Discovery-based schema
/**
 * Schema Discovery Results (3 test cases):
 * REQUIRED: id (100%), name (100%)
 * OPTIONAL: email (67%), avatar (33%)
 */
export const OutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  avatar: z.string().optional(),
});
```

---

## Phase 2: Optional Fields

**Purpose:** Validates that wrappers properly mark optional fields.

**Detection:** Wrapper has 3+ fields but ZERO `.optional()` usage.

**Why Suspicious:** Real APIs rarely have 100% required fields.

**Auto-Fix:** ✅ Auto-fixable via CLI fix command

**Example:**
```typescript
// ❌ BAD: All required (suspicious for APIs)
export const OutputSchema = z.object({
  id: z.string(),
  assignee: z.object({ name: z.string() }),
});

// ✅ GOOD: Discovery reveals assignee is optional
export const OutputSchema = z.object({
  id: z.string(),
  assignee: z.object({ name: z.string() }).optional(),
});
```

---

## Phase 3: Type Unions

**Purpose:** Validates that complex wrappers handle type variance.

**Detection:** Wrapper with 5+ fields but ZERO `z.union()` usage.

**Why Suspicious:** Complex APIs often return different types for same field.

**Auto-Fix:** ❌ Not auto-fixable (requires schema discovery analysis)

**Example:**
```typescript
// ❌ BAD: Assumes priority is always number
export const OutputSchema = z.object({
  priority: z.number(),
});

// ✅ GOOD: Handles both number and object
export const OutputSchema = z.object({
  priority: z.union([
    z.number(),
    z.object({ value: z.number() })
  ]),
});
```

---

## Phase 4: Nested Access Safety

**Purpose:** Validates that filtering logic safely accesses nested fields.

**Detection:** Code accesses `rawData.field.nestedField` without null checks.

**Crash Risk:** `TypeError: Cannot read property of undefined`

**Auto-Fix:** ✅ Auto-fixable via CLI fix command

**Example:**
```typescript
// ❌ BAD: Unsafe nested access
const filtered = {
  state: {
    id: rawData.state.id,
    name: rawData.state.name
  }
};

// ✅ GOOD: Safe with null check
const filtered = {
  state: rawData.state ? {
    id: rawData.state.id,
    name: rawData.state.name
  } : undefined
};
```

---

## Phase 5: Reference Validation

**Purpose:** Validates that wrappers use current (non-deprecated) tool references.

**Detection:** Check against deprecation registry.

**Registry:** `.claude/lib/deprecation-registry.json`

**Auto-Fix:** ❌ Not auto-fixable (requires manual verification)

**Example:**
```typescript
// ❌ BAD: Deprecated tool reference
const result = await mcp__linear__getIssue({ id });

// ✅ GOOD: Current tool reference
const result = await mcp__linear__get_issue({ id });
```

---

## Phase 6: Unit Test Coverage

**Purpose:** Validates unit test files exist with required test categories.

**Required Categories:**
- Schema validation tests
- Filtering logic tests
- Token reduction tests
- Error handling tests

**Detection:** Missing test file or missing required test categories.

**Auto-Fix:** ❌ Not auto-fixable (requires manual test writing)

**Example Test Structure:**
```typescript
describe('Service/Tool Wrapper', () => {
  describe('Schema Validation', () => {
    it('should validate required fields', async () => { ... });
    it('should handle optional fields', async () => { ... });
  });

  describe('Filtering', () => {
    it('should filter to essential fields', async () => { ... });
    it('should handle nested objects safely', async () => { ... });
  });

  describe('Token Reduction', () => {
    it('should reduce output size', async () => { ... });
  });

  describe('Error Handling', () => {
    it('should handle invalid input', async () => { ... });
    it('should handle MCP errors', async () => { ... });
  });
});
```

---

## Phase 7: Integration Tests

**Purpose:** Validates integration test files exist for real MCP testing.

**Detection:** Missing `.integration.test.ts` file.

**Auto-Fix:** ❌ Not auto-fixable (requires MCP access configuration)

**Running Integration Tests:**
```bash
RUN_INTEGRATION_TESTS=true npm run test:integration -- service/tool
```

---

## Phase 8: Test Quality

**Purpose:** Validates test quality patterns are followed.

**Required Patterns:**
- Factory mock patterns for MCP client
- Response format validation tests
- Edge case coverage

**Detection:** Missing quality patterns in test files.

**Auto-Fix:** ❌ Not auto-fixable (requires manual test enhancement)

**Example Factory Pattern:**
```typescript
function createMockMCPClient(response: any) {
  return {
    callTool: vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(response) }]
    })
  };
}
```

---

## Phase 9: Security Validation

**Purpose:** Static security analysis for MCP wrappers.

**Detection:**
- Dangerous patterns (eval, Function constructor)
- Hardcoded credentials
- Missing security imports for string inputs
- Missing input validation refinements

**Auto-Fix:** ❌ Not auto-fixable (requires manual security review)

**Example:**
```typescript
// ❌ BAD: Dangerous pattern
const result = eval(userInput);

// ❌ BAD: No security validation on string inputs
export const InputSchema = z.object({
  query: z.string(),
});

// ✅ GOOD: Security validation with refinements
import { validators } from '../config/lib/sanitize.js';

export const InputSchema = z.object({
  query: z.string()
    .refine(validators.noInjection, 'Invalid characters detected'),
});
```

---

## Phase 10: TypeScript Validation

**Purpose:** Validates wrappers compile without TypeScript errors.

**Detection:**
- **CRITICAL:** Missing `tsconfig.json` in service directory
- Runs `tsc --noEmit` against wrapper files
- Parses TypeScript errors with file, line, and error code
- Finds nearest `tsconfig.json` for proper project context

**Auto-Fix:** ❌ Not auto-fixable (requires manual code fixes or running create)

**tsconfig.json Requirement:**

A `tsconfig.json` is **REQUIRED** in each service directory. Without it:
- TypeScript falls back to single-file mode (misses cross-file errors)
- Shared dependencies (`mcp-client.ts`, `sanitize.ts`) aren't type-checked together
- Import errors may not be caught

**Resolution:** Run `npm run create -- <service> <tool>` to auto-generate, or create manually:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true
  },
  "include": [
    "*.ts",
    "../config/config-loader.ts",
    "../config/lib/mcp-client.ts",
    "../config/lib/sanitize.ts"
  ],
  "exclude": ["node_modules", "*.test.ts"]
}
```

**Common Errors:**
- TS2531: Object is possibly null
- TS2322: Type assignment incompatibility
- TS7006: Missing parameter type annotation
- TS2339: Property does not exist on type
- TS2769: No overload matches this call (often Zod schema issues)

**Example:**
```typescript
// ❌ BAD: TypeScript error TS2531
const name = response.user.name;  // user may be null

// ✅ GOOD: Null-safe access
const name = response.user?.name;
```

---

## Summary

| Phase | Name | Auto-Fix | Severity |
|-------|------|----------|----------|
| 1 | Schema Discovery | ❌ | CRITICAL |
| 2 | Optional Fields | ✅ | WARNING |
| 3 | Type Unions | ❌ | WARNING |
| 4 | Nested Access Safety | ✅ | CRITICAL |
| 5 | Reference Validation | ❌ | CRITICAL |
| 6 | Unit Test Coverage | ❌ | CRITICAL |
| 7 | Integration Tests | ❌ | WARNING |
| 8 | Test Quality | ❌ | WARNING |
| 9 | Security Validation | ❌ | WARNING |
| 10 | TypeScript Validation | ❌ | CRITICAL |

**Pass Threshold:** All CRITICAL phases must pass. WARNING phases are advisory.
