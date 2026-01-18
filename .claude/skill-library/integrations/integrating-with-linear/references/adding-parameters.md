# Adding New Parameters to Linear Wrappers

**Step-by-step guide to add fields to existing wrappers.**

## When to Add Parameters

Add parameters when:
- API supports a field but wrapper doesn't
- You verified field exists (via discovery or direct query)
- Field is documented in Linear's GraphQL schema
- You need the field for your use case

## 6-Step Addition Process

### Step 1: Verify Field Exists

Before adding, confirm API supports it:

```bash
# Method 1: Run discovery script
npx tsx .claude/tools/linear/internal/create-project-discover.ts

# Method 2: Query API directly
npx tsx -e "
import { callMCPTool } from './.claude/tools/config/lib/mcp-client.js';
const result = await callMCPTool('linear', 'projectCreate', {
  name: 'Test',
  team: 'TEAM-ID',
  templateId: 'TEMPLATE-ID'  // Testing this new field
});
console.log('Success! Field supported:', result);
"
```

If no error → Field supported. Proceed to Step 2.

### Step 2: Update Zod Input Schema

Add field with appropriate validation:

```typescript
// File: .claude/tools/linear/create-project.ts

export const createProjectParams = z.object({
  // ... existing fields ...

  // NEW FIELD: Add here
  templateId: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('Project template ID to use'),
});
```

**Validation rules by field type:**

**User content** (descriptions, titles):
```typescript
description: z.string()
  .refine(validateNoControlChars, 'Control characters not allowed')
  .optional()
```

**Reference fields** (IDs, names):
```typescript
teamId: z.string()
  .refine(validateNoControlChars, 'Control characters not allowed')
  .refine(validateNoPathTraversal, 'Path traversal not allowed')
  .refine(validateNoCommandInjection, 'Invalid characters detected')
  .optional()
```

**Enums**:
```typescript
priority: z.enum(['0', '1', '2', '3', '4']).optional()
```

**Numbers with constraints**:
```typescript
limit: z.number().min(1).max(250).default(50).optional()
```

**Booleans**:
```typescript
includeArchived: z.boolean().optional()
```

### Step 3: Update "Schema Discovery Results" Comment

Document the new field in the file header:

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
 * - templateId: string (optional) - Project template ID to use   ← ADD THIS
 * ...
 */
```

### Step 4: Update GraphQL Query/Mutation

**For mutations:** Field usually goes in `$input` object:

```typescript
const CREATE_PROJECT_MUTATION = `
  mutation ProjectCreate($input: ProjectCreateInput!) {
    projectCreate(input: $input) {
      success
      project {
        id
        name
        url
      }
    }
  }
`;

// No change needed - templateId is part of ProjectCreateInput
```

**For queries:** May need to add as separate parameter:

```typescript
// Before:
const LIST_PROJECTS_QUERY = `
  query Projects($first: Int) {
    projects(first: $first) {
      nodes { ... }
    }
  }
`;

// After (adding filter parameter):
const LIST_PROJECTS_QUERY = `
  query Projects($first: Int, $state: String) {
    projects(first: $first, filter: { state: { eq: $state } }) {
      nodes { ... }
    }
  }
`;
```

### Step 5: Pass to GraphQL Variables

Add field to variables object in execute function:

```typescript
export const createProject = {
  async execute(input: CreateProjectInput) {
    const validated = createProjectParams.parse(input);

    const client = await createLinearClient();

    // Build variables
    const variables: Record<string, unknown> = {
      input: {
        name: validated.name,
        description: validated.description,
        teamId: validated.team,
        templateId: validated.templateId,  // ← ADD THIS
        // ... other fields
      }
    };

    const response = await executeGraphQL(
      client,
      CREATE_PROJECT_MUTATION,
      variables
    );

    // ... rest of function
  }
};
```

**Important:** Only include defined values:

```typescript
// ❌ WRONG: Always includes field (sends undefined/null)
const variables = {
  input: {
    name: validated.name,
    templateId: validated.templateId,  // Could be undefined
  }
};

// ✅ RIGHT: Only include if defined
const variables: Record<string, unknown> = {
  input: {
    name: validated.name,
  }
};

if (validated.templateId !== undefined) {
  variables.input.templateId = validated.templateId;
}

// OR using spread operator:
const variables = {
  input: {
    name: validated.name,
    ...(validated.templateId && { templateId: validated.templateId }),
  }
};
```

### Step 6: Add Example Usage

Update examples in file header:

```typescript
/**
 * @example
 * ```typescript
 * // Create project without template
 * await createProject.execute({
 *   name: 'Q3 2025 Auth Overhaul',
 *   team: 'Engineering'
 * });
 *
 * // Create project WITH template (NEW EXAMPLE)
 * await createProject.execute({
 *   name: 'Q3 2025 Performance',
 *   team: 'Engineering',
 *   templateId: 'abc-123-def'  ← SHOW NEW FIELD IN USE
 * });
 * ```
 */
```

## Complete Example: Adding templateId

**Before:**
```typescript
export const createProjectParams = z.object({
  name: z.string().min(1),
  team: z.string(),
  lead: z.string().optional(),
});

export const createProject = {
  async execute(input: CreateProjectInput) {
    const validated = createProjectParams.parse(input);
    const variables = {
      input: {
        name: validated.name,
        teamId: validated.team,
        leadId: validated.lead,
      }
    };
    // ...
  }
};
```

**After:**
```typescript
export const createProjectParams = z.object({
  name: z.string().min(1),
  team: z.string(),
  lead: z.string().optional(),
  templateId: z.string()  // ← ADDED
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('Project template ID to use'),
});

export const createProject = {
  async execute(input: CreateProjectInput) {
    const validated = createProjectParams.parse(input);
    const variables: Record<string, unknown> = {
      input: {
        name: validated.name,
        teamId: validated.team,
        ...(validated.lead && { leadId: validated.lead }),
        ...(validated.templateId && { templateId: validated.templateId }),  // ← ADDED
      }
    };
    // ...
  }
};
```

## Testing New Parameters

### Test 1: Validation Works

```typescript
// Should throw validation error
try {
  await createProject.execute({
    name: 'Test',
    team: 'Engineering',
    templateId: '', // Empty string should fail
  });
} catch (error) {
  console.log('✅ Validation working:', error.message);
}
```

### Test 2: API Accepts Parameter

```typescript
// Should succeed with real template ID
const result = await createProject.execute({
  name: 'Test Project',
  team: 'Engineering',
  templateId: 'real-template-id-here',
});
console.log('✅ API accepts parameter:', result);
```

### Test 3: Parameter is Optional

```typescript
// Should succeed without new parameter
const result = await createProject.execute({
  name: 'Test Project',
  team: 'Engineering',
  // templateId omitted
});
console.log('✅ Still works without new parameter:', result);
```

## Common Pitfalls

### Pitfall 1: Wrong Validation Level

```typescript
// ❌ WRONG: User content with full validation
description: z.string()
  .refine(validateNoControlChars, 'Control characters not allowed')
  .refine(validateNoPathTraversal, 'Path traversal not allowed')  // TOO STRICT
  .refine(validateNoCommandInjection, 'Invalid characters detected')

// ✅ RIGHT: User content with control chars only
description: z.string()
  .refine(validateNoControlChars, 'Control characters not allowed')
```

### Pitfall 2: Not Handling Optional Fields

```typescript
// ❌ WRONG: Always passes field (even if undefined)
const variables = {
  input: {
    templateId: validated.templateId,  // Sends null if undefined
  }
};

// ✅ RIGHT: Only include if defined
const variables: Record<string, unknown> = { input: {} };
if (validated.templateId) {
  variables.input.templateId = validated.templateId;
}
```

### Pitfall 3: Forgetting Documentation

```typescript
// ❌ WRONG: No .describe()
templateId: z.string().optional()

// ✅ RIGHT: Documented
templateId: z.string()
  .optional()
  .describe('Project template ID to use')
```

### Pitfall 4: Not Updating "Schema Discovery Results"

```typescript
// ❌ WRONG: Added field to code but not to comment

// ✅ RIGHT: Update INPUT FIELDS section:
/**
 * INPUT FIELDS:
 * ...
 * - templateId: string (optional) - Project template ID
 */
```

## Verification Checklist

After adding a parameter:

- [ ] Field verified to exist in API (Step 1)
- [ ] Zod schema updated with correct validation (Step 2)
- [ ] "Schema Discovery Results" comment updated (Step 3)
- [ ] GraphQL query/mutation updated if needed (Step 4)
- [ ] Variables object includes new field (Step 5)
- [ ] Example usage added (Step 6)
- [ ] Validation test passes (rejects invalid input)
- [ ] API test passes (accepts valid input)
- [ ] Optional test passes (works without new field)
- [ ] TypeScript compiles without errors

## Related Files

- Wrapper files - Where to add parameters
- `../config/lib/sanitize.ts` - Validation functions
- `field-verification.md` - How to verify field exists
- `wrapper-anatomy.md` - Complete wrapper structure
- `sources-of-truth.md` - Where to find field documentation
