# Implementation Checklist

## Phase 6: Wrapper Implementation

Follow this checklist when implementing the wrapper in Phase 6:

### 1. Input Schema (Zod)

```typescript
import { z } from "zod";

export const InputSchema = z.object({
  // Define per architecture.md
  // Example:
  // query: z.string().min(1),
  // limit: z.number().int().positive().optional()
});

export type Input = z.infer<typeof InputSchema>;
```

**Checklist:**

- [ ] All required fields defined
- [ ] Optional fields marked with `.optional()`
- [ ] Refinements added for complex validation
- [ ] Type exported via `z.infer`

### 2. Filtered Result Interface

```typescript
export interface FilteredResult {
  // Define per token optimization strategy
  // Only include fields that provide value
  // Example:
  // id: string;
  // title: string;
  // status: string;
  // // Omit: createdAt, updatedAt, metadata (unnecessary for LLM)
}
```

**Checklist:**

- [ ] Only essential fields included
- [ ] Token reduction target met (80-99%)
- [ ] Field types match MCP response schema
- [ ] TSDoc comments explain filtering rationale

### 3. Execute Function

```typescript
export async function execute(input: Input): Promise<FilteredResult[]> {
  // 1. Validate input
  const validatedInput = InputSchema.parse(input);

  // 2. Call MCP server
  const response = await mcpClient.callTool(toolName, validatedInput);

  // 3. Filter response per architecture
  const filtered = response.map(filterResult);

  // 4. Return filtered results
  return filtered;
}
```

**Checklist:**

- [ ] Input validation with Zod parse
- [ ] MCP client call with error handling
- [ ] Response filtering per architecture
- [ ] Return type matches FilteredResult

### 4. Error Handling

Per architecture design (Result type or exceptions):

**Option A: Result Type (Recommended)**

```typescript
import { Result, ok, err } from "./result";

export async function execute(input: Input): Promise<Result<FilteredResult[], Error>> {
  try {
    const validatedInput = InputSchema.parse(input);
    // ...
    return ok(filtered);
  } catch (error) {
    return err(error);
  }
}
```

**Option B: Exceptions**

```typescript
export async function execute(input: Input): Promise<FilteredResult[]> {
  try {
    const validatedInput = InputSchema.parse(input);
    // ...
    return filtered;
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(error.message);
    }
    throw error;
  }
}
```

**Checklist:**

- [ ] Error handling pattern matches architecture
- [ ] Zod validation errors handled
- [ ] MCP errors wrapped appropriately
- [ ] No error message leakage

### 5. Security Validation

Per security-assessment.md:

```typescript
import { sanitizeInput } from "./sanitization";

export async function execute(input: Input): Promise<FilteredResult[]> {
  // Sanitize inputs
  const sanitized = {
    ...validatedInput,
    query: sanitizeInput(validatedInput.query),
  };

  // ...
}
```

**Checklist:**

- [ ] Input sanitization implemented
- [ ] Path traversal prevention
- [ ] XSS prevention in outputs
- [ ] Control character filtering
- [ ] Rate limiting considered

### 6. TSDoc Documentation

```typescript
/**
 * Execute MCP wrapper for {tool}
 *
 * @param input - Validated input parameters
 * @returns Filtered results optimized for LLM consumption
 * @throws {ValidationError} If input validation fails
 * @throws {MCPError} If MCP server call fails
 *
 * @remarks
 * This wrapper reduces token count by 85% by filtering unnecessary fields.
 * See architecture.md for filtering strategy.
 */
export async function execute(input: Input): Promise<FilteredResult[]> {
  // ...
}
```

**Checklist:**

- [ ] Function documented with TSDoc
- [ ] Parameters documented
- [ ] Return type documented
- [ ] Exceptions documented
- [ ] Remarks explain token optimization

## Verification

Run these commands before submitting for review:

```bash
# Type check
npx tsc --noEmit

# Run tests (should PASS after implementation)
npm run test:run -- tools/{service}/{tool}

# Coverage check
npm run test:coverage -- tools/{service}/{tool}
```

**Expected results:**

- Type check: 0 errors
- Tests: All pass
- Coverage: ≥80%
