# Schema Discovery Methodology

**Comprehensive exploration of MCP tools to understand behavior before wrapper design.**

## Purpose

Schema discovery answers these questions BEFORE we design architecture:

1. What inputs does this tool accept? (required vs optional, types, constraints)
2. What does the response look like? (structure, field types, nesting)
3. How many tokens does the raw response consume?
4. What edge cases and errors exist?
5. What fields are essential vs noise for LLM context?

## Discovery Process

### Step 1: Get Tool Metadata

If the MCP provides tool descriptions, start there:

```typescript
// Many MCPs expose tool metadata
const toolInfo = await callMCPTool("{service}", "list_tools", {});
// Extract: name, description, input schema, output schema (if available)
```

### Step 2: Comprehensive Input Exploration

For EACH input parameter, test:

| Category        | What to Test  | Example                                  |
| --------------- | ------------- | ---------------------------------------- |
| Required fields | Valid values  | { id: 'ISSUE-123' }                      |
| Required fields | Missing field | {} - expect error                        |
| Required fields | Null value    | { id: null }                             |
| Required fields | Wrong type    | { id: 12345 } (number instead of string) |
| Optional fields | With value    | { id: 'X', includeComments: true }       |
| Optional fields | Without value | { id: 'X' }                              |
| String inputs   | Empty string  | { id: '' }                               |
| String inputs   | Very long     | { id: 'A'.repeat(10000) }                |
| String inputs   | Special chars | { id: '../../../etc/passwd' }            |
| String inputs   | Unicode       | { id: '日本語' }                         |
| Numeric inputs  | Zero          | { limit: 0 }                             |
| Numeric inputs  | Negative      | { limit: -1 }                            |
| Numeric inputs  | Very large    | { limit: 999999 }                        |
| Array inputs    | Empty array   | { ids: [] }                              |
| Array inputs    | Single item   | { ids: ['X'] }                           |
| Array inputs    | Many items    | { ids: ['A', 'B', 'C', ...] }            |

### Step 3: Response Structure Analysis

For successful calls, document:

## Response Structure

### Top-Level Fields

| Field       | Type        | Always Present     | Example                    |
| ----------- | ----------- | ------------------ | -------------------------- |
| id          | string      | Yes                | 'abc-123'                  |
| title       | string      | Yes                | 'Fix bug'                  |
| description | string      | No (null if empty) | 'Long text...'             |
| status      | object      | Yes                | { id: '1', name: 'Open' }  |
| assignee    | object/null | No                 | { id: 'u1', name: 'John' } |

### Nested Objects

| Parent   | Field | Type   | Notes                   |
| -------- | ----- | ------ | ----------------------- |
| status   | id    | string | Status UUID             |
| status   | name  | string | Human-readable name     |
| status   | color | string | Hex color code          |
| assignee | id    | string | User UUID               |
| assignee | name  | string | Display name            |
| assignee | email | string | May be null for privacy |

### Arrays

| Field       | Item Type | Typical Size | Notes                    |
| ----------- | --------- | ------------ | ------------------------ |
| labels      | object    | 0-10         | Each has id, name, color |
| comments    | object    | 0-100+       | Can be very large        |
| attachments | object    | 0-20         | URLs to files            |

### Step 4: Error Scenario Mapping

Document ALL error responses:

| Scenario      | Input                 | Error Type | Response                                         |
| ------------- | --------------------- | ---------- | ------------------------------------------------ |
| Not found     | { id: 'nonexistent' } | 404        | { error: 'Issue not found' }                     |
| Unauthorized  | Invalid token         | 401        | { error: 'Invalid API key' }                     |
| Rate limited  | Many requests         | 429        | { error: 'Rate limit exceeded', retryAfter: 60 } |
| Invalid input | { id: null }          | 400        | { error: 'id is required' }                      |
| Server error  | N/A                   | 500        | { error: 'Internal error' }                      |

### Step 5: Token Measurement

For EACH tool, measure token consumption:

## Token Analysis

| Metric                    | Value         |
| ------------------------- | ------------- |
| Raw response size         | ~15,000 chars |
| Estimated raw tokens      | ~3,750 tokens |
| Essential fields only     | ~800 chars    |
| Estimated filtered tokens | ~200 tokens   |
| **Reduction potential**   | **95%**       |

### High-Token Fields (candidates for filtering)

| Field       | Typical Size     | Essential?         |
| ----------- | ---------------- | ------------------ |
| description | 500-5000 chars   | Truncate to 300    |
| comments    | 1000-50000 chars | Exclude or limit 5 |
| history     | 2000-10000 chars | Exclude            |
| metadata    | 500-2000 chars   | Exclude            |

## Schema Discovery Output Template

For each tool, create tools/{tool}/schema-discovery.md:

```markdown
# Schema Discovery: {tool}

## Tool Overview

- **Name:** {tool}
- **Description:** {description from MCP}
- **Discovered:** {date}

## Input Schema

### Required Parameters

| Parameter | Type   | Constraints             | Example     |
| --------- | ------ | ----------------------- | ----------- |
| id        | string | Non-empty, alphanumeric | 'ISSUE-123' |

### Optional Parameters

| Parameter       | Type    | Default | Example |
| --------------- | ------- | ------- | ------- |
| includeComments | boolean | false   | true    |
| limit           | number  | 50      | 100     |

## Output Schema

### Response Structure

[Document all fields as shown in Step 3]

### Type Variants Discovered

- `priority` can be: number (1-4) OR object ({ name, value }) OR null
- `assignee` can be: string (name only) OR object ({ id, name }) OR null

## Error Responses

[Document all errors as shown in Step 4]

## Token Analysis

[Document token measurements as shown in Step 5]

## Edge Cases Discovered

1. Empty description returns null, not empty string
2. Deleted users show as { id: 'deleted', name: 'Deleted User' }
3. Rate limit headers: X-RateLimit-Remaining, X-RateLimit-Reset

## Recommendations for Wrapper Design

1. **Input validation:** Require non-empty id, validate format
2. **Output filtering:** Keep id, title, status.name, assignee.name; drop comments, history
3. **Token target:** 200 tokens (95% reduction from raw)
4. **Error handling:** Map 404 to null return, propagate others
```

## Multi-Tool Efficiency

When discovering schemas for ALL tools in a service:

1. **Start with list/get tools** - Usually simplest schemas
2. **Group similar tools** - create/update share input patterns
3. **Identify shared patterns** - Common fields across tools become shared architecture
4. **Document variance** - Note where tools differ from the pattern

## Verification Checklist

Schema discovery is complete when:

- ✓ All input parameters documented (required + optional)
- ✓ All response fields documented with types
- ✓ Type variants identified (fields that can be multiple types)
- ✓ All error scenarios documented
- ✓ Token measurements recorded
- ✓ Filtering recommendations made
- ✓ Edge cases noted
