# Field Verification Methods

**Three-level approach to verifying Linear API fields.**

## The Three-Level Verification Approach

Based on research synthesis, field verification happens at three distinct levels:

### Level 1: Compile-Time Verification

**Tools:** GraphQL Code Generator, TypeScript compiler

**Purpose:** Catch invalid fields during development, before runtime

**How it works:**
```bash
# Generate TypeScript types from Linear schema
npx graphql-codegen --config codegen.yml

# TypeScript compiler catches errors
tsc --noEmit
```

**Example:**
```typescript
// codegen.yml generated this type:
interface Issue {
  id: string;
  title: string;
  // ... other fields
}

// TypeScript catches typo at compile time
const query = `
  query GetIssue {
    issue {
      titl  // ← TypeScript error: 'titl' does not exist on type 'Issue'
    }
  }
`;
```

**Benefits:**
- Fastest feedback (instant in IDE)
- Zero runtime cost
- Prevents field errors before deployment

**Limitations:**
- Requires code generation setup
- Only catches static queries
- Doesn't verify dynamic field construction

### Level 2: Runtime Verification

**Tools:** Zod schemas, parameter validation

**Purpose:** Validate inputs before making API calls

**How it works:**
```typescript
// Zod schema in wrapper
export const getIssueParams = z.object({
  id: z.string().min(1),
  includeDescription: z.boolean().optional(),
});

// Validation runs before API call
const validated = getIssueParams.parse(input);  // ← Throws if invalid
```

**Example:**
```typescript
// User provides invalid input
await getIssue.execute({
  id: '',  // ← Empty string
  invalidField: 'foo',  // ← Not in schema
});

// Zod throws before API call:
// ZodError: [
//   {
//     "code": "too_small",
//     "path": ["id"],
//     "message": "String must contain at least 1 character(s)"
//   },
//   {
//     "code": "unrecognized_keys",
//     "path": [],
//     "message": "Unrecognized key(s) in object: 'invalidField'"
//   }
// ]
```

**Benefits:**
- Validates user input
- Provides clear error messages
- Prevents unnecessary API calls

**Limitations:**
- Only validates wrapper inputs
- Doesn't check GraphQL query structure
- Can't detect API schema changes

### Level 3: Dynamic Verification

**Tools:** Introspection queries, discovery scripts

**Purpose:** Check if fields exist in current API schema

**How it works:**
```typescript
// Introspection query
const INTROSPECTION_QUERY = `
  query IntrospectField {
    __type(name: "Project") {
      fields {
        name
        type {
          name
        }
      }
    }
  }
`;

const result = await callMCPTool('linear', '__introspection', {
  query: INTROSPECTION_QUERY
});

// Check if 'templateId' field exists
const hasTemplateId = result.__type.fields.some(f => f.name === 'templateId');
```

**Example using discovery script:**
```bash
# Run discovery to check current schema
npx tsx .claude/tools/linear/internal/get-project-discover.ts

# Output shows field optionality
⚠️  OPTIONAL (0/3 = 0%)   templateId

# Means: templateId doesn't appear in any test case responses
# → Either field doesn't exist, or our test cases don't trigger it
```

**Benefits:**
- Verifies against live API
- Detects schema changes
- No build step required

**Limitations:**
- Requires network call
- Slower than compile-time
- Needs valid auth token

## Complete Verification Workflow

**Step-by-step guide to verify if API supports a field:**

### Step 1: Check Wrapper Documentation

```bash
# Read the wrapper file
cat .claude/tools/linear/create-project.ts | grep -A 50 "INPUT FIELDS"
```

**Look for:**
```
INPUT FIELDS:
- name: string (required) - Project name
- description: string (optional) - Full project description
- team: string (required) - Team name or ID
- templateId: string (optional) - Project template ID    ← IS IT HERE?
```

**Result:**
- ✅ Field listed → Wrapper supports it, skip to Step 5 (use it!)
- ❌ Field not listed → Continue to Step 2

### Step 2: Run Discovery Script (if exists)

```bash
# Check if discovery script exists
ls .claude/tools/linear/internal/*project*

# Run it
npx tsx .claude/tools/linear/internal/create-project-discover.ts
```

**Look at output:**
```
🔹 Field Optionality:
  ✅ REQUIRED (3/3 = 100%)  name
  ⚠️  OPTIONAL (3/3 = 100%)  templateId    ← FOUND IT!
```

**Result:**
- ✅ Field appears → API supports it, wrapper doesn't (yet). Continue to Step 4 (add to wrapper)
- ❌ Field doesn't appear → Continue to Step 3

### Step 3: Query API Directly

```typescript
import { callMCPTool } from './.claude/tools/config/lib/mcp-client';

// Test with templateId field
try {
  const result = await callMCPTool(
    'linear',
    'projectCreate',
    {
      name: 'Test Project',
      team: 'TEAM-ID',
      templateId: 'TEMPLATE-ID'  // ← Testing this field
    }
  );
  console.log('✅ API supports templateId:', result);
} catch (error) {
  console.log('❌ API error:', error.message);
  // "Cannot query field templateId on type ProjectCreateInput"
  // → API doesn't support this field
}
```

**Result:**
- ✅ No error → API supports field! Continue to Step 4
- ❌ Error "Cannot query field" → API doesn't support field. STOP.

### Step 4: Add Field to Wrapper

If API supports field but wrapper doesn't, update the wrapper:

```typescript
// 1. Add to Zod input schema
export const createProjectParams = z.object({
  // ... existing fields ...
  templateId: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('Project template ID'),
});

// 2. Update "Schema Discovery Results" comment
/**
 * INPUT FIELDS:
 * ...
 * - templateId: string (optional) - Project template ID to use
 */

// 3. Pass to GraphQL variables
const variables = {
  // ... existing variables ...
  templateId: validated.templateId,
};

// 4. Update GraphQL mutation if needed
const CREATE_PROJECT_MUTATION = `
  mutation ProjectCreate($input: ProjectCreateInput!) {
    projectCreate(input: $input) {
      ...
    }
  }
`;
// Note: templateId goes in $input, not separate parameter
```

### Step 5: Use the Field

```typescript
// Now safe to use in your code
await createProject.execute({
  name: 'My Project',
  team: 'Engineering',
  templateId: 'abc-123-def',  // ✅ Verified to work
});
```

## Verification Decision Tree

```
                 ┌─────────────────────┐
                 │ Need to verify      │
                 │ if field exists?    │
                 └──────────┬──────────┘
                            │
                            ↓
          ┌─────────────────────────────────┐
          │ 1. Check wrapper documentation  │
          │    "Schema Discovery Results"   │
          └──────────┬──────────────────────┘
                     │
            ┌────────┴────────┐
            ↓                 ↓
       Field listed?     Not listed?
            │                 │
            ↓                 ↓
         ✅ DONE      ┌──────────────────┐
                      │ 2. Run discovery │
                      │    script        │
                      └────────┬─────────┘
                               │
                      ┌────────┴────────┐
                      ↓                 ↓
                 Found?           Not found?
                      │                 │
                      ↓                 ↓
       ┌──────────────────┐   ┌────────────────┐
       │ API supports,    │   │ 3. Query API   │
       │ wrapper doesn't  │   │    directly    │
       │ → Add to wrapper │   └───────┬────────┘
       └──────────────────┘           │
                               ┌──────┴──────┐
                               ↓             ↓
                          Success?       Error?
                               │             │
                               ↓             ↓
                ┌──────────────────┐   ┌─────────────┐
                │ API supports,    │   │ API doesn't │
                │ add to wrapper   │   │ support     │
                └──────────────────┘   └─────────────┘
```

## Common Verification Scenarios

### Scenario: "Does Linear support project templates?"

```bash
# 1. Check wrapper
grep -A 20 "INPUT FIELDS" .claude/tools/linear/create-project.ts
# → No templateId listed

# 2. Query API directly (fastest)
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
cd "$ROOT"
npx tsx -e "
import { callMCPTool } from './.claude/tools/config/lib/mcp-client.js';

const test = await callMCPTool('linear', 'projectCreate', {
  name: 'Test',
  team: 'TEAM-ID',
  templateId: 'TEMPLATE-ID'
});
console.log('Result:', test);
"
# → If succeeds: API supports it!
# → If error "Cannot query field": API doesn't support it
```

### Scenario: "What type is the priority field?"

```bash
# 1. Check wrapper Zod schema
grep -A 5 "priority:" .claude/tools/linear/create-issue.ts
# Output:
#   priority: z.number().min(0).max(4).optional()

# 2. Check "Schema Discovery Results"
grep -A 50 "INPUT FIELDS" .claude/tools/linear/create-issue.ts | grep priority
# Output:
#   - priority: number (optional) - 0=No priority, 1=Urgent, ...

# Answer: number (0-4), optional
```

### Scenario: "Has the state field changed from object to string?"

```bash
# Error message says:
# "Field 'state' must not have a selection since type 'String!' has no subfields"

# 1. Check current wrapper
grep -A 10 "state" .claude/tools/linear/get-project.ts
# Shows:
#   state {
#     id
#     name
#     type
#   }

# 2. Run discovery to verify current API structure
npx tsx .claude/tools/linear/internal/get-project-discover.ts
# Output shows:
#   state: string  // ← Changed to string!

# 3. Update wrapper GraphQL query
# Change from:
#   state {
#     id
#     name
#   }
# To:
#   state  // ← No nested selection
```

## Tools Summary

| Tool | Level | Speed | Purpose |
|------|-------|-------|---------|
| GraphQL Code Generator | Compile-time | Instant | Catch typos in static queries |
| TypeScript Compiler | Compile-time | Instant | Type checking for generated types |
| Zod Schemas | Runtime | Fast | Validate user input before API call |
| Discovery Scripts | Dynamic | Medium | Analyze live API responses |
| Direct API Queries | Dynamic | Medium | Test specific fields immediately |
| Apollo Studio | Dynamic | Slow | Interactive schema exploration |
| Introspection Queries | Dynamic | Slow | Programmatic schema checking |

## Best Practices

1. **Check wrapper docs first** - Fastest, most accurate for what we implement
2. **Run discovery when unsure** - Reveals current API structure
3. **Query API directly for quick tests** - Immediate feedback on field support
4. **Update wrapper docs after verification** - Keep "Schema Discovery Results" current
5. **Use compile-time verification when possible** - Catches errors earliest
6. **Trust runtime errors** - If Zod/API says field invalid, it is

## Related Files

- Wrapper files (`.claude/tools/linear/*.ts`) - "Schema Discovery Results" comments
- Discovery scripts (`.claude/tools/linear/internal/*-discover.ts`) - Schema analysis tools
- `graphql-helpers.ts` - executeGraphQL with error parsing
- `sources-of-truth.md` - Why codebase sources are reliable
