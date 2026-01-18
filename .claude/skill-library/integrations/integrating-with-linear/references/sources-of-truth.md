# Sources of Truth for Linear API Information

**Why our codebase documentation is more reliable than external sources.**

## The Problem with External Documentation

When working with Linear's GraphQL API, you might be tempted to search the web or rely on external documentation. This approach has several critical flaws:

### 1. Documentation Lag

External documentation (blog posts, tutorials, Stack Overflow) often lags behind API changes:

- Linear may update their GraphQL schema without updating all external references
- Community tutorials may reference older API versions
- Even official docs may not reflect the latest production deployment

**Example from research:** The GitHub issue "from-linear script broken due to Linear Schema updates" (github.com/terrastruct/byelinear/issues/5) shows how schema changes break implementations relying on outdated assumptions.

### 2. Implementation Differences

Our Linear MCP wrappers intentionally differ from standard GraphQL responses:

- **Token optimization:** We truncate descriptions to 200-500 chars (80-90% token reduction)
- **Field filtering:** We return only essential fields, not full objects
- **Response transformation:** We convert raw GraphQL responses to Zod-validated outputs

**External docs won't tell you this** - they describe Linear's API, not our wrapper implementation.

### 3. Version Mismatches

External documentation may reference:
- Newer API features we haven't implemented yet
- Deprecated fields we still support for backward compatibility
- Different authentication methods than we use

### 4. No Local Context

External docs can't tell you:
- Which fields our wrappers actually support
- What our `callMCPTool()` function expects
- How our internal discovery scripts work
- What our Zod schemas validate

## Our Sources of Truth (Ranked)

### 1. Wrapper File "Schema Discovery Results" Comments (HIGHEST PRIORITY)

Every Linear wrapper file has a header like this:

```typescript
/**
 * create_project - Linear GraphQL Wrapper
 *
 * Schema Discovery Results (tested with CHARIOT workspace):
 *
 * INPUT FIELDS:
 * - name: string (required) - Project name
 * - description: string (optional) - Full project description
 * - team: string (required) - Team name or ID
 * - lead: string (optional) - User ID, name, email, or "me"
 * ...
 *
 * OUTPUT (after filtering):
 * - id: string - Project UUID
 * - name: string - Project display name
 * - url: string - Linear URL for the project
 *
 * Edge cases discovered:
 * - Team must exist or error is thrown
 * - Lead can be "me" to assign current user
 */
```

**Why this is the source of truth:**
- Tested against actual API responses in our workspace
- Documents what OUR implementation supports (not theoretical API)
- Includes edge cases discovered through real usage
- Updated when wrapper code changes

**Location pattern:**
- `.claude/tools/linear/create-*.ts` - Creation operations
- `.claude/tools/linear/list-*.ts` - List operations
- `.claude/tools/linear/get-*.ts` - Retrieval operations
- `.claude/tools/linear/update-*.ts` - Update operations

### 2. Internal Discovery Scripts (SECOND PRIORITY)

Schema discovery scripts test the actual API and analyze responses:

```typescript
// File: internal/get-issue-discover.ts

// 1. Define test cases
const testCases = [
  { description: 'Normal case', input: { id: 'CHARIOT-1516' } },
  { description: 'Edge case - unassigned', input: { id: 'CHARIOT-1234' } },
];

// 2. Query actual API
for (const testCase of testCases) {
  const raw = await callMCPTool('linear', 'get_issue', testCase.input);
  analyzeStructure(raw); // Determine field optionality and types
}

// 3. Output findings
// - Which fields are REQUIRED vs OPTIONAL
// - Type variance (e.g., priority: number vs object)
// - Suggested Zod schema
```

**Why these are sources of truth:**
- Query the live Linear API directly
- Analyze real response structures (not documentation claims)
- Detect field optionality through multiple test cases
- Generate Zod schema suggestions based on actual data

**Location:**
- `.claude/tools/linear/internal/*-discover.ts`

**How to use:**
```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
cd "$ROOT"
npx tsx .claude/tools/linear/internal/get-issue-discover.ts
```

### 3. Direct API Queries via callMCPTool (THIRD PRIORITY)

When wrapper documentation doesn't exist yet, query the API directly:

```typescript
import { callMCPTool } from './.claude/tools/config/lib/mcp-client';

// Test if templateId field is supported
const result = await callMCPTool(
  'linear',
  'projectCreate',
  {
    name: 'Test Project',
    team: 'TEAM-ID',
    templateId: 'TEMPLATE-ID' // Testing this field
  }
);

// If no error → field supported
// If error → field not supported or invalid value
```

**Why this is a source of truth:**
- Bypasses wrappers entirely - goes straight to Linear's API
- Tests actual API behavior, not documentation
- Reveals exact error messages for debugging
- Can test experimental/undocumented fields

### 4. Wrapper Zod Schemas (FOURTH PRIORITY)

Zod schemas define what our wrappers validate:

```typescript
export const createProjectParams = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  team: z.string(),
  lead: z.string().optional(),
  // ... more fields
});
```

**Why this matters:**
- Enforced at runtime - these are the ACTUAL validation rules
- If a field isn't in the Zod schema, wrapper will reject it
- Shows required vs optional fields precisely
- Documents validation rules (min/max, patterns, etc.)

**Location pattern:**
- Look for `export const {operation}Params = z.object({...})`
- Usually near top of wrapper file after GraphQL query definition

## When to Use Each Source

### Scenario: "Does Linear support field X?"

**Step 1:** Check wrapper file "Schema Discovery Results" → INPUT FIELDS section
- ✅ Field listed → Supported in our implementation
- ❌ Field not listed → Continue to Step 2

**Step 2:** Run discovery script (if one exists for this operation)
- ✅ Field appears in discovery output → API supports it, wrapper doesn't (yet)
- ❌ Field doesn't appear → Continue to Step 3

**Step 3:** Query API directly with callMCPTool
- ✅ No error → API supports field (update wrapper!)
- ❌ Error → API doesn't support field

### Scenario: "What type is field Y?"

**Step 1:** Check wrapper Zod schema
```typescript
// Tells you the exact TypeScript/Zod type
priority: z.number().min(0).max(4).optional()
```

**Step 2:** Check "Schema Discovery Results" comment
```typescript
// Tells you the GraphQL API type
priority: number (optional) - 0=No priority, 1=Urgent, ...
```

**Step 3:** Run discovery script for runtime analysis
```typescript
// Shows actual response structure from API
{
  priority: 2, // Observed type: number
  ...
}
```

### Scenario: "Has the API changed?"

**Step 1:** Check GraphQL error message
```
Error: Field "state" must not have a selection since type "String!" has no subfields
```

**Step 2:** Re-run discovery script
```bash
npx tsx .claude/tools/linear/internal/get-project-discover.ts
```

**Step 3:** Compare discovery output to wrapper "Schema Discovery Results" comment
- If different → API has changed, wrapper needs update

## Anti-Pattern: Trusting External Docs

**❌ WRONG:**
```typescript
// "I read on Linear's blog that projects support templates"
await createProject.execute({
  name: 'Test',
  template: 'template-id' // Guessed field name from blog post
});
```

**Why this fails:**
- Blog may be outdated
- Field name might be `templateId` not `template`
- Our wrapper may not expose this field yet
- Type might be wrong (string vs object)

**✅ RIGHT:**
```typescript
// Step 1: Check wrapper file
Read('.claude/tools/linear/create-project.ts')
// → No templateId in Schema Discovery Results

// Step 2: Query API directly
const test = await callMCPTool('linear', 'projectCreate', {
  name: 'Test',
  team: 'TEAM-ID',
  templateId: 'template-id' // Testing actual API
});
// → Success! API supports it, wrapper doesn't (yet)

// Step 3: Update wrapper to add templateId support
```

## Verification Workflow

When you need to verify API capabilities, follow this workflow:

```
┌─────────────────────────────────────┐
│ Need: Verify if API supports field │
└─────────────────┬───────────────────┘
                  │
                  ↓
┌─────────────────────────────────────┐
│ 1. Check wrapper "Schema Discovery  │
│    Results" comment                 │
└─────────────────┬───────────────────┘
                  │
         ┌────────┴────────┐
         ↓                 ↓
    Found?           Not found?
         │                 │
         ↓                 ↓
    ✅ DONE        ┌─────────────────┐
                   │ 2. Run discovery│
                   │    script       │
                   └────────┬────────┘
                            │
                   ┌────────┴────────┐
                   ↓                 ↓
              Found?           Not found?
                   │                 │
                   ↓                 ↓
    ┌──────────────────┐  ┌─────────────────┐
    │ API supports,    │  │ 3. Query API    │
    │ wrapper doesn't  │  │    directly     │
    └──────────────────┘  └────────┬────────┘
                                    │
                           ┌────────┴────────┐
                           ↓                 ↓
                      Success?          Error?
                           │                 │
                           ↓                 ↓
             ┌──────────────────┐   ┌──────────────┐
             │ API supports,    │   │ API doesn't  │
             │ wrapper doesn't  │   │ support      │
             └──────────────────┘   └──────────────┘
```

## Key Principles

1. **Codebase First:** Always check our codebase before searching the web
2. **Test, Don't Trust:** Verify API claims with actual queries
3. **Document Findings:** Update "Schema Discovery Results" comments when you learn something new
4. **Drift Detection:** Re-run discovery scripts after GraphQL errors
5. **Version Control:** Wrapper comments are versioned with code, external docs aren't

## Summary

**Sources of truth (in order):**

1. Wrapper file "Schema Discovery Results" comments → What we implement
2. Internal discovery scripts → What the API actually returns
3. Direct callMCPTool queries → Live API testing
4. Wrapper Zod schemas → Runtime validation rules

**Never trust:**
- External blog posts or tutorials
- Stack Overflow answers without dates
- Generic GraphQL documentation applied to Linear
- Assumptions based on similar APIs

**The rule:** If it's not in our codebase, verify it with the API before trusting it.
