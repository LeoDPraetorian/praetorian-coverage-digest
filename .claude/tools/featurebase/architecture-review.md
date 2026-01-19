# FeatureBase MCP Tool Architecture Review

**Date:** 2026-01-17
**Reviewer:** mcp-lead
**Scope:** SyncTypeConfig generic type design, type assertions, and test failures

---

## Executive Summary

The FeatureBase MCP tool implementation has undergone recent refactoring to address type safety issues. After evidence-based analysis of 16 source files and comparison against established MCP wrapper patterns (Shodan), this review identifies:

- **SyncTypeConfig generic type design:** Architecturally sound but implementation has type bridging gaps
- **Type assertions:** Used appropriately but indicate underlying design tension
- **Failing tests (22 of 71):** Root cause is schema mismatch, not architectural flaw

**Verdict: CHANGES REQUESTED** - Fix schema mismatches between tests and implementation, not the generic type design.

---

## 1. SyncTypeConfig Generic Type Design Analysis

### Source Reference

**File:** `/Users/nathansportsman/chariot-development-platform2/.claude/tools/featurebase/sync-from-markdown.ts` (lines 68-104)

```typescript
interface SyncTypeConfig<TFrontmatter, TCreateInput, TUpdateInput, TGetInput = unknown> {
  dirname: string;
  checkConflicts: boolean;
  getTool?: {
    execute: (input: TGetInput, client: HTTPPort) => Promise<Record<string, unknown>>;
  };
  createTool: {
    execute: (input: TCreateInput, client: HTTPPort) => Promise<Record<string, unknown>>;
  };
  updateTool: {
    execute: (input: TUpdateInput, client: HTTPPort) => Promise<unknown>;
  };
  extractFrontmatter: (data: Record<string, unknown>, body: string) => TFrontmatter & { featurebaseId?: string; updatedAt?: string };
  buildCreateInput: (frontmatter: TFrontmatter, body: string) => TCreateInput;
  buildUpdateInput: (id: string, frontmatter: TFrontmatter, body: string) => TUpdateInput;
  idParamKey: string;
  resultKey: string;
}
```

### Assessment

| Aspect | Rating | Analysis |
|--------|--------|----------|
| **Flexibility** | Good | Four generic parameters allow type-safe configuration per content type |
| **Default handling** | Good | `TGetInput = unknown` provides sensible default for optional getTool |
| **Tool signatures** | Acceptable | `Promise<Record<string, unknown>>` is pragmatic for varying API response shapes |
| **Composition** | Good | Separates concerns: extraction, building, tool execution |

### Design Decision: Why `Record<string, unknown>` Return Types

The generic type uses `Record<string, unknown>` for tool return types rather than fully typed returns. This is an acceptable trade-off because:

1. **FeatureBase API response shapes vary** - Posts, changelog, and articles have different response structures
2. **Runtime validation exists** - Each individual tool (createPost, getPost, etc.) validates its own output with Zod schemas
3. **The sync function only needs specific fields** - It extracts `resultKey` and accesses `id` property

**Recommendation:** KEEP current design. The generic type correctly abstracts the sync pattern while tools maintain their own type safety.

---

## 2. Type Assertions Analysis

### Source Reference

**File:** `/Users/nathansportsman/chariot-development-platform2/.claude/tools/featurebase/sync-from-markdown.ts` (lines 141-172)

```typescript
// Line 141: Type assertion for dynamic input construction
const getInput = { [config.idParamKey]: frontmatter.featurebaseId } as TGetInput;

// Line 143: Type assertion for result extraction
const currentData = current[config.resultKey] as { updatedAt: string };

// Line 172: Type assertion for created entity ID
const createdData = created[config.resultKey] as { id: string };
```

### Assessment

| Assertion | Justification | Risk | Acceptable |
|-----------|---------------|------|------------|
| `as TGetInput` (L141) | Dynamic property key requires assertion | Low - keys are known at config time | Yes |
| `as { updatedAt: string }` (L143) | Extracting from `Record<string, unknown>` | Medium - relies on API contract | Yes |
| `as { id: string }` (L172) | Extracting from `Record<string, unknown>` | Medium - relies on API contract | Yes |

### Design Tension

The type assertions indicate a fundamental tension:
- **Compile-time:** SyncTypeConfig needs to work with varying shapes
- **Runtime:** Each tool knows its exact shape

This is the correct place to use assertions. The alternative (fully generic response types) would require complex type inference that TypeScript cannot resolve without runtime type guards.

**Recommendation:** KEEP current assertions. They are localized, justified, and backed by Zod validation in individual tools.

---

## 3. Failing Tests Root Cause Analysis

### Verified Test State

Based on the task context: **22 failing, 49 passing (71 total tests)**

### Root Cause Pattern Identification

After analyzing the test files and implementation, the failing tests exhibit these patterns:

#### Pattern 1: API Field Name Mismatch (Tests vs Implementation)

**Tests expect:**
```typescript
// __tests__/create-post.unit.test.ts (lines 17-30)
createPost.execute({ title: '', body: 'Content', boardId: 'board_1' }, testClient)
```

**Implementation expects:**
```typescript
// create-post.ts (lines 10-34)
export const createPostParams = z.object({
  title: z.string()...,
  content: z.string()...,  // NOT "body"
  categoryId: z.string()...,  // NOT "boardId"
});
```

The implementation uses `content` and `categoryId` (matching FeatureBase API), but tests use `body` and `boardId` (legacy field names).

#### Pattern 2: Output Schema Field Mismatch

**Tests expect:**
```typescript
// __tests__/get-post.unit.test.ts (line 40)
expect(result.post).toMatchObject({
  body: 'Test content',  // Tests expect "body"
});
```

**Implementation returns:**
```typescript
// get-post.ts (line 26)
content: z.string(),  // Implementation returns "content"
```

#### Pattern 3: Pagination Schema Mismatch

**Tests expect:**
```typescript
// __tests__/list-posts.unit.test.ts (lines 44-46)
expect(result.nextCursor).toBeNull();
expect(result.totalCount).toBe(1);
```

**Implementation returns:**
```typescript
// list-posts.ts (lines 86-89)
page: z.number(),  // Page-based, not cursor-based
totalPages: z.number(),
totalResults: z.number(),  // NOT "totalCount"
```

### MSW Handler Mismatch

**MSW handlers return:**
```typescript
// __tests__/msw-handlers.ts (lines 17-36)
{
  object: 'list',
  data: [...],  // Returns "data" array
  nextCursor: null,
  total: 1,
}
```

**Implementation expects:**
```typescript
// list-posts.ts (lines 124-150)
{
  results: [...],  // Expects "results" array
  page: number,
  totalPages: number,
  totalResults: number,
}
```

### Summary of Schema Drift

| Component | Test Expectation | Implementation Reality | Fix Location |
|-----------|------------------|------------------------|--------------|
| Post body field | `body` | `content` | Tests |
| Board/Category field | `boardId` | `categoryId` | Tests |
| List pagination | `nextCursor`, `totalCount` | `page`, `totalPages`, `totalResults` | Tests |
| API array key | `data` | `results` | MSW handlers |

---

## 4. Architectural Recommendation

### Verdict: CHANGES REQUESTED

The architectural changes to `SyncTypeConfig` are sound. The failing tests are NOT an indication of architectural problems but rather **test/implementation drift during the API field name updates**.

### Required Actions

**Priority 1: Update Test Input Schemas**

Update all test files to use correct field names:
- `body` -> `content`
- `boardId` -> `categoryId`
- `totalCount` -> `totalResults`
- `nextCursor` -> (remove or adapt for page-based)

**Priority 2: Update MSW Handlers**

Update `__tests__/msw-handlers.ts` to return correct API response shape:
```typescript
// Change from:
{ object: 'list', data: [...], nextCursor, total }

// Change to:
{ results: [...], page: 1, totalPages: 1, totalResults: N }
```

**Priority 3: Update Test Assertions**

Update output assertions to match new schema:
- `result.post.body` -> `result.post.content`
- `result.nextCursor` -> `result.page` / `result.totalPages`

### What NOT to Change

- **SyncTypeConfig generic design** - It is correct
- **Type assertions in sync-from-markdown.ts** - They are justified
- **Individual tool Zod schemas** - They correctly reflect FeatureBase API

---

## 5. Comparison with Established Patterns

### Reference: Shodan MCP Wrapper

**File:** `/Users/nathansportsman/chariot-development-platform2/.claude/tools/shodan/host-info.ts`

The Shodan wrapper demonstrates the gold standard pattern:

```typescript
// Clear separation of schemas
const InputSchema = z.object({...});
const RawResponseSchema = z.object({...});  // API response
const FilteredOutputSchema = z.object({...});  // Token-optimized output
```

### FeatureBase Alignment

The FeatureBase implementation follows this pattern per-tool (good):
- `listPostsParams` (input)
- Inline API response type (acceptable for simpler cases)
- `listPostsOutput` (filtered output)

The `SyncTypeConfig` abstraction is an **additional layer** for sync operations, which is appropriate given the complexity of bidirectional sync.

---

## 6. Code Quality Issues

| Severity | Issue | Location | Action |
|----------|-------|----------|--------|
| MEDIUM | Debug console.log left in | `list-changelog.ts:105`, `list-articles.ts:114` | Remove before merge |
| LOW | No TSDoc on SyncTypeConfig | `sync-from-markdown.ts:68` | Add documentation |

---

## Metadata

```json
{
  "agent": "mcp-lead",
  "output_type": "architecture-review",
  "timestamp": "2026-01-17T00:00:00Z",
  "feature_directory": ".claude/tools/featurebase",
  "skills_invoked": [
    "using-skills",
    "discovering-reusable-code",
    "semantic-code-operations",
    "calibrating-time-estimates",
    "enforcing-evidence-based-analysis",
    "gateway-mcp-tools",
    "gateway-typescript",
    "persisting-agent-outputs",
    "brainstorming",
    "writing-plans",
    "verifying-before-completion",
    "adhering-to-dry",
    "adhering-to-yagni",
    "debugging-systematically"
  ],
  "library_skills_read": [
    ".claude/skill-library/claude/mcp-management/reviewing-mcp-wrappers/SKILL.md",
    ".claude/skill-library/development/typescript/validating-with-zod-schemas/SKILL.md",
    ".claude/skill-library/development/typescript/implementing-result-either-pattern/SKILL.md",
    ".claude/skill-library/claude/mcp-tools/mcp-tools-serena/SKILL.md"
  ],
  "source_files_verified": [
    ".claude/tools/featurebase/sync-from-markdown.ts:68-315",
    ".claude/tools/featurebase/sync-to-markdown.ts:1-198",
    ".claude/tools/featurebase/list-posts.ts:1-193",
    ".claude/tools/featurebase/create-post.ts:1-108",
    ".claude/tools/featurebase/get-post.ts:1-121",
    ".claude/tools/featurebase/update-post.ts:1-114",
    ".claude/tools/featurebase/list-changelog.ts:1-135",
    ".claude/tools/featurebase/list-articles.ts:1-145",
    ".claude/tools/featurebase/__tests__/sync-from-markdown.unit.test.ts:1-645",
    ".claude/tools/featurebase/__tests__/sync-to-markdown.unit.test.ts:1-236",
    ".claude/tools/featurebase/__tests__/list-posts.unit.test.ts:1-82",
    ".claude/tools/featurebase/__tests__/create-post.unit.test.ts:1-76",
    ".claude/tools/featurebase/__tests__/get-post.unit.test.ts:1-63",
    ".claude/tools/featurebase/__tests__/msw-handlers.ts:1-179",
    ".claude/tools/featurebase/__tests__/fixtures.ts:1-33",
    ".claude/tools/shodan/host-info.ts:1-158"
  ],
  "status": "complete",
  "handoff": {
    "next_agent": "tool-developer",
    "context": "Fix test schema mismatches - do NOT change SyncTypeConfig design"
  }
}
```
