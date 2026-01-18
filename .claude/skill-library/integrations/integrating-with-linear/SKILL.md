---
name: integrating-with-linear
description: Use when working with Linear MCP tools - documents where Linear API information lives in the codebase, how to discover API capabilities, and how to verify API changes
allowed-tools: Read, Bash, Grep, Glob
---

# Using Linear APIs

**Documentation for Linear GraphQL API discovery, schema validation, and wrapper maintenance.**

## When to Use

Use this skill when:

- User asks "does Linear API support X feature?"
- You need to verify what fields Linear's GraphQL API actually supports
- You're updating Linear MCP wrappers (`.claude/tools/linear/`)
- You encounter GraphQL errors from Linear API
- You need to discover new Linear API capabilities

**DO NOT:**

- Assume API capabilities without verification
- Search the web for Linear API documentation (use codebase sources)
- Guess field names or types based on similar APIs

## Quick Reference

| Task                             | Tool/File                                     | Purpose                                 |
| -------------------------------- | --------------------------------------------- | --------------------------------------- |
| Discover API schema              | `internal/*-discover.ts`                      | Run schema discovery scripts            |
| Verify current implementation    | Wrapper files (`create-*.ts`, `list-*.ts`)    | Check "Schema Discovery Results" header |
| Query API directly               | `callMCPTool()`                               | Test API calls without wrapper          |
| Check wrapper compliance         | Wrapper file comments                         | Read "INPUT FIELDS" and "OUTPUT" docs   |
| Find supported operations        | `.claude/tools/linear/index.ts`               | See all exported wrappers               |
| Validate GraphQL query           | `graphql-helpers.ts` + Linear MCP             | executeGraphQL() with test query        |

---

## Source of Truth: Our Codebase, Not External Docs

**Critical Principle:** Linear API documentation lives in **wrapper file comments**, not external sources.

### Why Not External Documentation?

1. **External docs lag behind API changes** - Linear may update their API without updating docs
2. **Our wrappers may intentionally differ** - We filter fields for token efficiency
3. **Schema drift** - External docs don't show what OUR implementation supports
4. **Version mismatch** - External docs may reference newer/older API versions

### Our Sources of Truth (in order):

1. **Wrapper file "Schema Discovery Results"** - Tested against actual API responses
2. **`internal/*-discover.ts` scripts** - Live schema discovery tools
3. **`graphql-helpers.ts` + MCP client** - Direct API query capability
4. **Wrapper Zod schemas** - What our implementation actually validates

**See:** [references/sources-of-truth.md](references/sources-of-truth.md) for detailed explanation.

---

## Core Pattern: Schema Discovery Scripts

Linear's API may change. When you need to verify what the API actually supports, use schema discovery scripts.

### Discovery Script Pattern

All discovery scripts follow this pattern:

```typescript
// File: internal/{operation}-discover.ts

import { callMCPTool } from '../../config/lib/mcp-client';

// 1. Define test cases covering diverse scenarios
const testCases = [
  { description: 'Normal case', input: { ... } },
  { description: 'Edge case - missing field', input: { ... } },
];

// 2. Run test cases and analyze response structure
for (const testCase of testCases) {
  const raw = await callMCPTool('linear', 'operation_name', testCase.input);
  analyzeStructure(raw);
}

// 3. Generate findings report
// - Field optionality (REQUIRED vs OPTIONAL)
// - Type variance (string vs object)
// - Suggested Zod schema
```

**See:** [references/discovery-script-pattern.md](references/discovery-script-pattern.md)

### Running Discovery Scripts

```bash
# Navigate to repo root
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"

# Run discovery script
npx tsx .claude/tools/linear/internal/get-issue-discover.ts

# Output: Field optionality, type analysis, Zod schema suggestions
```

**When to run discovery:**

- GraphQL error says field doesn't exist
- Suspecting API has new capabilities (like templates)
- After Linear announces API changes
- Before adding new wrapper parameters

**See:** [references/running-discovery.md](references/running-discovery.md)

---

## Wrapper File Anatomy

Every Linear wrapper follows a standard structure. Understanding this structure helps you quickly find API information.

### File Structure

```typescript
/**
 * {operation} - Linear GraphQL Wrapper
 *
 * Token Optimization: [stats]
 *
 * Schema Discovery Results (tested with CHARIOT workspace):
 *
 * INPUT FIELDS:     ← SOURCE OF TRUTH for what API accepts
 * - field1: type (required/optional) - Description
 * - field2: type (optional) - Description
 *
 * OUTPUT (after filtering):    ← What our wrapper returns
 * - field1: type - Description
 * - field2: type - Description
 *
 * Edge cases discovered:    ← Important behavioral notes
 * - Specific behaviors observed during testing
 *
 * @example    ← Usage examples
 * ```typescript
 * await operation.execute({ ... });
 * ```
 */

// GraphQL query/mutation
const OPERATION_QUERY = `...`;

// Input validation (Zod schema)
export const operationParams = z.object({ ... });

// Output validation (Zod schema)
export const operationOutput = z.object({ ... });

// Execute function
export const operation = {
  name: 'linear.operation',
  async execute(input, testToken?) { ... }
};
```

**Key sections:**

1. **Schema Discovery Results** - Field-by-field API documentation
2. **Edge cases discovered** - Behavioral quirks and gotchas
3. **Zod schemas** - Enforced validation rules
4. **Examples** - Working usage patterns

**See:** [references/wrapper-anatomy.md](references/wrapper-anatomy.md)

---

## Common Tasks

### Task: Verify if API Supports a Field

**Example:** "Does Linear's project API support `templateId`?"

**Step-by-step:**

1. **Check wrapper file first:**

   ```bash
   # Read the relevant wrapper
   cat .claude/tools/linear/create-project.ts | grep -A 50 "INPUT FIELDS"
   ```

2. **If field not in wrapper, run discovery:**

   ```bash
   # Check if discovery script exists
   ls .claude/tools/linear/internal/*project*

   # If no script, query API directly (see next section)
   ```

3. **Query API directly:**

   ```typescript
   // Use callMCPTool to test
   const result = await callMCPTool(
     'linear',
     'projectCreate',
     { name: 'Test', team: 'TEAM-ID', templateId: 'TEMPLATE-ID' }
   );
   // If no error → field supported
   // If error → field not supported or invalid value
   ```

**See:** [references/field-verification.md](references/field-verification.md)

### Task: Fix GraphQL Error

**Example:** Error: `Field "state" must not have a selection since type "String!" has no subfields`

**This means:** API schema changed - `state` used to be an object, now it's a string scalar.

**Step-by-step:**

1. **Identify the affected query** (error shows which file)
2. **Check wrapper's GraphQL query** - look for `state { id name type }`
3. **Update query** - remove nested selection: `state { ... }` → `state`
4. **Update TypeScript interfaces** - change type from object to string
5. **Update Zod schemas** - change validation rules
6. **Test with discovery script**

**See:** [references/fixing-graphql-errors.md](references/fixing-graphql-errors.md)

### Task: Add New Wrapper Parameter

**Example:** Add `templateId` support to `create-project.ts`

**Step-by-step:**

1. **Verify field exists** (use discovery or direct query)
2. **Update Zod input schema:**

   ```typescript
   templateId: z.string()
     .refine(validateNoControlChars, 'Control characters not allowed')
     .optional()
     .describe('Project template ID')
   ```

3. **Update GraphQL query** (if needed)
4. **Update "Schema Discovery Results" comment**
5. **Add example usage**
6. **Test with real API call**

**See:** [references/adding-parameters.md](references/adding-parameters.md)

---

## Direct API Querying

Sometimes you need to bypass wrappers and query Linear's API directly.

### Using callMCPTool

```typescript
import { callMCPTool } from './.claude/tools/config/lib/mcp-client';

// Query API without wrapper
const raw = await callMCPTool(
  'linear',           // MCP server name
  'get_issue',        // Operation name (snake_case)
  { id: 'CHARIOT-123' }  // Parameters
);

console.log(JSON.stringify(raw, null, 2));
```

### Finding Operation Names

```bash
# List all Linear MCP operations
npx mcp-remote https://mcp.linear.app/sse list

# Common operations:
# - get_issue, list_issues, create_issue, update_issue
# - get_project, list_projects, create_project, update_project
# - list_teams, get_team
# - list_users
```

**See:** [references/direct-querying.md](references/direct-querying.md)

---

## Integration

### Called By

- `/linear` command - Routes natural language to Linear operations
- `mcp-tools-linear` skill - Low-level MCP wrapper execution patterns

### Requires (invoke before starting)

None - standalone documentation skill

### Calls (during execution)

None - this is a documentation skill, not an execution skill

### Pairs With (conditional)

| Skill                       | Trigger                          | Purpose                           |
| --------------------------- | -------------------------------- | --------------------------------- |
| `tool-manager`              | Adding/updating Linear wrappers  | Wrapper creation and testing      |
| `debugging-systematically`  | GraphQL errors from Linear       | Root cause analysis for API errors|

---

## Anti-Patterns

### ❌ Anti-Pattern: Web Search for API Capabilities

**Wrong:**

```
User: "Does Linear support project templates?"
Agent: *Searches web for "Linear API project templates"*
Agent: "Yes, based on Linear's documentation..."
```

**Why wrong:**

- External docs may be outdated
- Can't verify what OUR wrappers support
- No way to test claims

**Right:**

```
User: "Does Linear support project templates?"
Agent: *Checks .claude/tools/linear/create-project.ts INPUT FIELDS section*
Agent: "Current wrapper does NOT include templateId. Let me verify if API supports it..."
Agent: *Runs direct API query with templateId parameter*
Agent: "API supports it but wrapper needs update. Here's the exact field structure..."
```

### ❌ Anti-Pattern: Assuming Field Names

**Wrong:**

```typescript
// "I assume templates use 'template' field"
await createProject.execute({
  name: 'Test',
  template: 'template-id'  // ❌ Guessed field name
});
```

**Right:**

```typescript
// First: Check schema discovery or test with callMCPTool
const test = await callMCPTool('linear', 'projectCreate', {
  name: 'Test',
  team: 'TEAM-ID',
  templateId: 'template-id'  // ✅ Verified field name
});
```

### ❌ Anti-Pattern: Ignoring "Schema Discovery Results"

**Wrong:**

- "The wrapper is outdated, I'll trust external docs"
- "This field should exist based on similar APIs"

**Right:**

- "Schema Discovery Results says field X is optional with type Y"
- "Edge cases section warns about Z behavior"
- "Let me run discovery script to verify current state"

**See:** [references/anti-patterns.md](references/anti-patterns.md)

---

## Related Skills

| Skill                           | Access Method | Purpose                                   |
| ------------------------------- | ------------- | ----------------------------------------- |
| `tool-manager`                  | Core          | Create/update/test MCP wrappers           |
| `mcp-tools-linear`              | Library       | Low-level Linear MCP wrapper patterns     |
| `debugging-systematically`      | Core          | Debug GraphQL/API errors                  |
| `verifying-before-completion`   | Core          | Verify wrapper changes work               |

---

## References

For detailed information, see:

- [sources-of-truth.md](references/sources-of-truth.md) - Why codebase > external docs
- [wrapper-anatomy.md](references/wrapper-anatomy.md) - Complete file structure breakdown
- [discovery-script-pattern.md](references/discovery-script-pattern.md) - How discovery scripts work
- [field-verification.md](references/field-verification.md) - Step-by-step field checking
- [fixing-graphql-errors.md](references/fixing-graphql-errors.md) - Common errors and solutions
- [adding-parameters.md](references/adding-parameters.md) - Add new fields to wrappers
- [direct-querying.md](references/direct-querying.md) - Bypass wrappers for testing
- [anti-patterns.md](references/anti-patterns.md) - What NOT to do
