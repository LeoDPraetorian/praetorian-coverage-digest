# Linear Wrapper File Anatomy

**Complete breakdown of Linear MCP wrapper file structure.**

## Three-Layer Architecture

Modern Linear wrappers follow a consistent three-layer architecture discovered through research analysis:

```
┌─────────────────────────────────────────┐
│        Handler Layer (Validation)        │
├─────────────────────────────────────────┤
│ • Input sanitization                    │
│ • Zod schema validation                 │
│ • Parameter transformation              │
└─────────────────┬───────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────┐
│    Operations Layer (Business Logic)    │
├─────────────────────────────────────────┤
│ • Atomic operations                     │
│ • Composite operations                  │
│ • Fragment-based composition            │
└─────────────────┬───────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────┐
│      Client Layer (Execution)           │
├─────────────────────────────────────────┤
│ • callMCPTool() or HTTP POST            │
│ • Bearer token injection                │
│ • Error parsing                         │
│ • Response filtering                    │
└─────────────────────────────────────────┘
```

## Complete File Structure

Every Linear wrapper follows this standard structure:

```typescript
/**
 * {operation} - Linear GraphQL Wrapper
 *
 * {Brief description}
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~{N} tokens ({description})
 * - vs MCP: Consistent behavior, no server dependency
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with CHARIOT workspace):
 *
 * INPUT FIELDS:
 * - field1: type (required/optional) - Description
 * - field2: type (required/optional) - Description
 * ...
 *
 * OUTPUT (after filtering):
 * - field1: type - Description
 * - field2: type - Description
 * ...
 *
 * Edge cases discovered:
 * - Specific behavior 1
 * - Specific behavior 2
 * ...
 *
 * @example
 * ```typescript
 * // Usage example 1
 * await operation.execute({ ... });
 *
 * // Usage example 2
 * await operation.execute({ ... });
 * ```
 */

// ===== SECTION 1: IMPORTS =====
import { z } from 'zod';
import { createLinearClient } from './client.js';
import { executeGraphQL } from './graphql-helpers.js';
import {
  validateNoControlChars,
  validateNoPathTraversal,
  validateNoCommandInjection,
} from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import type { HTTPPort } from '../config/lib/http-client.js';

// ===== SECTION 2: GRAPHQL DEFINITION =====
const OPERATION_QUERY = `
  query/mutation OperationName($param1: Type!) {
    operationName(param1: $param1) {
      field1
      field2
      nestedObject {
        nestedField1
      }
    }
  }
`;

// ===== SECTION 3: ZOD INPUT SCHEMA =====
export const operationParams = z.object({
  // User content fields - control chars only
  userContent: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .describe('User-provided content'),

  // Reference fields - full validation
  referenceField: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Reference to another entity'),

  // Optional fields
  optionalField: z.string().optional(),

  // Enums
  enumField: z.enum(['value1', 'value2']).optional(),
});

export type OperationInput = z.infer<typeof operationParams>;

// ===== SECTION 4: ZOD OUTPUT SCHEMA =====
export const operationOutput = z.object({
  field1: z.string(),
  field2: z.string().optional(),
  nestedObject: z.object({
    nestedField1: z.string(),
  }).optional(),
  estimatedTokens: z.number(),
});

export type OperationOutput = z.infer<typeof operationOutput>;

// ===== SECTION 5: TYPESCRIPT INTERFACES =====
interface GraphQLResponse {
  operationName: {
    field1: string;
    field2?: string | null;
    nestedObject?: {
      nestedField1: string;
    } | null;
  } | null;
}

// ===== SECTION 6: EXECUTE FUNCTION =====
export const operation = {
  name: 'linear.operation_name',
  description: 'Brief description of operation',
  parameters: operationParams,

  async execute(
    input: OperationInput,
    testToken?: string
  ): Promise<OperationOutput> {
    // 6.1 Validate input
    const validated = operationParams.parse(input);

    // 6.2 Create client
    const client = await createLinearClient(testToken);

    // 6.3 Build GraphQL variables
    const variables: Record<string, unknown> = {
      param1: validated.field1,
      // ... map validated input to GraphQL variables
    };

    // 6.4 Execute GraphQL query
    const response = await executeGraphQL<GraphQLResponse>(
      client,
      OPERATION_QUERY,
      variables
    );

    // 6.5 Handle null/missing data
    if (!response.operationName) {
      throw new Error(`Operation failed: ${JSON.stringify(variables)}`);
    }

    // 6.6 Filter to essential fields
    const baseData = {
      field1: response.operationName.field1,
      field2: response.operationName.field2 || undefined,
      nestedObject: response.operationName.nestedObject ? {
        nestedField1: response.operationName.nestedObject.nestedField1,
      } : undefined,
    };

    // 6.7 Add token estimate
    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData),
    };

    // 6.8 Validate output
    return operationOutput.parse(filtered);
  },

  // ===== SECTION 7: TOKEN ESTIMATE METADATA =====
  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 500,
    reduction: '99%',
  },
};
```

## Section-by-Section Breakdown

### Section 1: Imports

**Purpose:** Bring in validation, client creation, and type utilities

**Key imports:**
- `zod` - Runtime validation
- `createLinearClient` - OAuth/API key authentication
- `executeGraphQL` - GraphQL query execution with error handling
- Sanitization validators - Security (control chars, path traversal, command injection)
- `estimateTokens` - Calculate response token usage

### Section 2: GraphQL Definition

**Purpose:** Define the exact GraphQL query or mutation sent to Linear's API

**Patterns:**
```typescript
// Query pattern
const GET_OPERATION_QUERY = `
  query OperationName($id: String!) {
    operationName(id: $id) {
      ...fields
    }
  }
`;

// Mutation pattern
const CREATE_OPERATION_MUTATION = `
  mutation OperationCreate($input: OperationCreateInput!) {
    operationCreate(input: $input) {
      success
      operation {
        ...fields
      }
    }
  }
`;

// List pattern with pagination
const LIST_OPERATIONS_QUERY = `
  query Operations($first: Int, $after: String) {
    operations(first: $first, after: $after) {
      nodes {
        ...fields
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
```

**Best practices:**
- Use descriptive operation names (e.g., `GetIssueById` not just `GetIssue`)
- Include only fields you actually need (reduces tokens)
- Use fragments for repeated field sets
- Document nested selections in wrapper comments

### Section 3: Zod Input Schema

**Purpose:** Validate user input before sending to API

**Validation levels:**

1. **User Content** (control chars only):
```typescript
description: z.string()
  .refine(validateNoControlChars, 'Control characters not allowed')
```

2. **Reference Fields** (full validation):
```typescript
team: z.string()
  .refine(validateNoControlChars, 'Control characters not allowed')
  .refine(validateNoPathTraversal, 'Path traversal not allowed')
  .refine(validateNoCommandInjection, 'Invalid characters detected')
```

3. **Optional Fields**:
```typescript
description: z.string().optional()
```

4. **Enums**:
```typescript
priority: z.enum(['0', '1', '2', '3', '4']).optional()
```

5. **Numbers with constraints**:
```typescript
limit: z.number().min(1).max(250).default(50)
```

**Pattern:** Use `.describe()` for documentation:
```typescript
field: z.string()
  .min(1)
  .describe('Brief description of what this field does')
```

### Section 4: Zod Output Schema

**Purpose:** Validate API response matches expected structure

**Key differences from input schema:**
- No sanitization validators (data coming from API, not user)
- Includes `estimatedTokens` field
- May have different optionality (e.g., API returns `null`, we convert to `undefined`)

**Token optimization pattern:**
```typescript
description: z.string().optional()
// In execute function:
description: response.description?.substring(0, 200) || undefined
```

This reduces 5000-char descriptions to 200 chars = ~80-90% token reduction.

### Section 5: TypeScript Interfaces

**Purpose:** Type the raw GraphQL response before filtering

**Pattern:**
```typescript
interface GraphQLResponse {
  operationName: {
    field: string;
    optionalField?: string | null;  // GraphQL nullable
  } | null;  // Entire response can be null
}
```

**Why separate from Zod schema:**
- GraphQL uses `null`, Zod uses `optional()`
- Raw response has all fields, filtered response is minimal
- TypeScript interfaces for compile-time, Zod for runtime

### Section 6: Execute Function

**The main operation handler with 8 steps:**

**6.1 Validate Input**
```typescript
const validated = operationParams.parse(input);
```
- Runs all Zod validators
- Throws descriptive error if validation fails
- Ensures type safety going forward

**6.2 Create Client**
```typescript
const client = await createLinearClient(testToken);
```
- Handles OAuth token refresh automatically
- Injects Bearer prefix for OAuth, none for API keys
- Returns HTTPPort for GraphQL execution

**6.3 Build GraphQL Variables**
```typescript
const variables: Record<string, unknown> = {
  param1: validated.field1,
  param2: validated.field2,
};
```
- Map validated input to GraphQL variable names
- Only include defined values (skip `undefined`)
- Handle optional parameters

**6.4 Execute GraphQL Query**
```typescript
const response = await executeGraphQL<GraphQLResponse>(
  client,
  OPERATION_QUERY,
  variables
);
```
- Sends POST request to `https://api.linear.app/graphql`
- Parses errors array (even with HTTP 200)
- Throws on network errors or GraphQL errors
- Returns typed response

**6.5 Handle Null/Missing Data**
```typescript
if (!response.operationName) {
  throw new Error(`Operation failed: ${JSON.stringify(variables)}`);
}
```
- GraphQL allows null responses
- Fail fast if data missing
- Include context in error message

**6.6 Filter to Essential Fields**
```typescript
const baseData = {
  field1: response.operationName.field1,
  field2: response.operationName.field2 || undefined,  // null → undefined
  description: response.operationName.description?.substring(0, 200) || undefined,  // Truncate
  nestedObject: response.operationName.nestedObject ? {
    nestedField: response.operationName.nestedObject.nestedField,
  } : undefined,
};
```

**Token optimization techniques:**
- Truncate long text fields (descriptions, bodies)
- Filter nested objects to essential fields only
- Convert `null` to `undefined` (reduces JSON size)
- Skip empty arrays/objects

**6.7 Add Token Estimate**
```typescript
const filtered = {
  ...baseData,
  estimatedTokens: estimateTokens(baseData),
};
```
- Calculate approximate token count of response
- Helps monitor token usage
- Used for optimization metrics

**6.8 Validate Output**
```typescript
return operationOutput.parse(filtered);
```
- Ensures response matches Zod schema
- Catches bugs where API returns unexpected structure
- Provides type safety to caller

### Section 7: Token Estimate Metadata

**Purpose:** Document token optimization impact

```typescript
tokenEstimate: {
  withoutCustomTool: 46000,     // Tokens if loading full MCP schema
  withCustomTool: 0,             // Tokens when using filesystem discovery
  whenUsed: 500,                 // Tokens when actually calling this wrapper
  reduction: '99%',              // Percentage reduction
}
```

## Atomic vs Composite Operations

### Atomic Operations

**Definition:** Single GraphQL query/mutation with no orchestration logic

**Example:**
```typescript
// get-issue.ts
export const getIssue = {
  async execute(input: { id: string }) {
    const response = await executeGraphQL(client, GET_ISSUE_QUERY, { id: input.id });
    return response.issue;
  }
};
```

**Characteristics:**
- One GraphQL operation
- No business logic beyond filtering
- Fast and predictable
- Easy to test

### Composite Operations

**Definition:** Orchestrates multiple atomic operations with business logic

**Example:**
```typescript
// create-epic-with-stories.ts
export const createEpicWithStories = {
  async execute(input: { epicTitle: string, stories: string[] }) {
    // 1. Create parent epic (atomic)
    const epic = await createIssue.execute({
      title: input.epicTitle,
      priority: 1,
    });

    // 2. Create child stories (multiple atomic calls)
    const stories = await Promise.all(
      input.stories.map(title =>
        createIssue.execute({
          title,
          parentId: epic.id,  // Business logic: link to parent
        })
      )
    );

    // 3. Return composed result
    return { epic, stories };
  }
};
```

**Characteristics:**
- Multiple GraphQL operations
- Business logic between steps
- Transactional concerns
- More complex error handling

**When to use:**
- Composite: User-facing features with multiple steps
- Atomic: Building blocks for composites, simple operations

## Fragment-Based Composition

**Purpose:** Reuse field selections across multiple operations

**Pattern:**
```typescript
// Common issue fields fragment
const ISSUE_FIELDS = `
  fragment IssueFields on Issue {
    id
    title
    identifier
    state {
      id
      name
    }
    assignee {
      id
      name
      email
    }
  }
`;

// Use in query
const GET_ISSUE_QUERY = `
  ${ISSUE_FIELDS}

  query GetIssue($id: String!) {
    issue(id: $id) {
      ...IssueFields
      description
      comments {
        nodes {
          body
        }
      }
    }
  }
`;

// Reuse in list query
const LIST_ISSUES_QUERY = `
  ${ISSUE_FIELDS}

  query ListIssues($first: Int!) {
    issues(first: $first) {
      nodes {
        ...IssueFields
      }
    }
  }
`;
```

**Benefits:**
- Consistency across operations
- Easy to add/remove fields
- Reduces duplication
- Clearer structure

## Key Principles

1. **Three Layers:** Handler (validate) → Operations (logic) → Client (execute)
2. **Token Optimization:** Truncate descriptions, filter nested objects
3. **Type Safety:** Zod for runtime, TypeScript for compile-time
4. **Error Handling:** Check errors array, handle nulls, fail fast
5. **Documentation:** "Schema Discovery Results" is source of truth
6. **Atomic First:** Build atomic operations, compose when needed
7. **Fragment Reuse:** Share field selections across operations
8. **Validation Levels:** Different rules for user content vs references

## Related Files

- `client.ts` - OAuth authentication and HTTP client creation
- `graphql-helpers.ts` - executeGraphQL with error parsing
- `../config/lib/sanitize.ts` - Input sanitization validators
- `../config/lib/response-utils.ts` - Token estimation
- `internal/*-discover.ts` - Schema discovery scripts
