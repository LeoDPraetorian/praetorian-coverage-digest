# Operator Mappings

Complete mapping table for transforming old Query Builder operators to new format.

## Complete Operator Mapping Table

| Old Operator             | New Operator         | Value Type              | Example Old                                                     | Example New                                     |
| ------------------------ | -------------------- | ----------------------- | --------------------------------------------------------------- | ----------------------------------------------- |
| `equals`                 | `=` or `EQUALS`      | string, number, boolean | `{"operator": "equals", "value": "A"}`                          | `{"operator": "=", "value": "A"}`               |
| `not equals`             | `!=` or `NOT_EQUALS` | string, number, boolean | `{"operator": "not equals", "value": true}`                     | `{"operator": "!=", "value": true}`             |
| `contains`               | `CONTAINS`           | string                  | `{"operator": "contains", "value": "admin"}`                    | `{"operator": "CONTAINS", "value": "admin"}`    |
| `does not contain`       | `NOT_CONTAINS`       | string                  | `{"operator": "does not contain", "value": "test"}`             | `{"operator": "NOT_CONTAINS", "value": "test"}` |
| `starts with`            | `STARTS WITH`        | string                  | `{"operator": "starts with", "value": "mail"}`                  | `{"operator": "STARTS WITH", "value": "mail"}`  |
| `ends with`              | `ENDS WITH`          | string                  | `{"operator": "ends with", "value": ".com"}`                    | `{"operator": "ENDS WITH", "value": ".com"}`    |
| `is any of`              | `IN`                 | array                   | `{"operator": "is any of", "value": ["C","H"]}`                 | `{"operator": "IN", "value": ["C","H"]}`        |
| `is none of`             | `NOT IN`             | array                   | `{"operator": "is none of", "value": ["ignored"]}`              | `{"operator": "NOT IN", "value": ["ignored"]}`  |
| `greater than`           | `>`                  | number, date string     | `{"operator": "greater than", "value": 1024}`                   | `{"operator": ">", "value": 1024}`              |
| `less than`              | `<`                  | number, date string     | `{"operator": "less than", "value": 5.0}`                       | `{"operator": "<", "value": 5.0}`               |
| `greater than or equals` | `>=`                 | number, date string     | `{"operator": "greater than or equals", "value": "2025-01-01"}` | `{"operator": ">=", "value": "2025-01-01"}`     |
| `less than or equals`    | `<=`                 | number, date string     | `{"operator": "less than or equals", "value": 7.0}`             | `{"operator": "<=", "value": 7.0}`              |
| `between`                | `BETWEEN`            | array[2]                | `{"operator": "between", "value": [80, 443]}`                   | `{"operator": "BETWEEN", "value": [80, 443]}`   |
| `before`                 | `<`                  | date string             | `{"operator": "before", "value": "2025-01-01"}`                 | `{"operator": "<", "value": "2025-01-01"}`      |
| `after`                  | `>`                  | date string             | `{"operator": "after", "value": "2024-12-01"}`                  | `{"operator": ">", "value": "2024-12-01"}`      |
| `in the last`            | Custom logic         | Computed range          | `{"operator": "in the last", "value": "7 days"}`                | Convert to `>=` with computed date              |
| `within`                 | `BETWEEN`            | array[2] computed       | `{"operator": "within", "value": "30 days"}`                    | Convert to `BETWEEN` with date range            |
| `exists`                 | `EXISTS`             | N/A                     | `{"operator": "exists"}`                                        | `{"operator": "EXISTS"}`                        |
| `not exists`             | `NOT EXISTS`         | N/A                     | `{"operator": "not exists"}`                                    | `{"operator": "NOT EXISTS"}`                    |

## Operator Categories

### Equality Operators

**Symbols (preferred in new format):**

- `=` - equals
- `!=` - not equals

**Alternative (also valid):**

- `EQUALS` - equals
- `NOT_EQUALS` - not equals

**Recommendation**: Use symbols (`=`, `!=`) for consistency with Neo4j Cypher.

### String Operators

All string operators use UPPERCASE in new format:

- `CONTAINS`
- `NOT_CONTAINS`
- `STARTS WITH`
- `ENDS WITH`

**Case sensitivity**: Depends on backend Neo4j query construction. Generally case-insensitive.

### Set Operators

- `IN` - Value must be in the provided array
- `NOT IN` - Value must not be in the provided array

**Value requirement**: Array with 1+ elements.

### Comparison Operators

**Numeric and date comparisons:**

- `>` - greater than
- `<` - less than
- `>=` - greater than or equals
- `<=` - less than or equals

**Date handling**: ISO 8601 strings are compared lexicographically (works for dates).

### Range Operators

- `BETWEEN` - Value falls within range [min, max] inclusive

**Value requirement**: Array with exactly 2 elements `[min, max]`.

### Existence Operators

- `EXISTS` - Field exists on the node
- `NOT EXISTS` - Field does not exist on the node

**Value requirement**: No value field needed.

## Special Case Transformations

### Time-Relative Operators → Computed Dates

**Old format "in the last":**

```json
{
  "attribute": "visited",
  "operator": "in the last",
  "value": "7 days"
}
```

**New format (computed):**

```json
{
  "field": "visited",
  "operator": ">=",
  "value": "2025-01-01T00:00:00.000Z" // Computed: now - 7 days
}
```

**Algorithm:**

1. Parse value: extract number and unit (days, weeks, months)
2. Compute date: `new Date(Date.now() - duration).toISOString()`
3. Use `>=` operator

**Old format "within":**

```json
{
  "attribute": "created",
  "operator": "within",
  "value": "30 days"
}
```

**New format (computed range):**

```json
{
  "field": "created",
  "operator": "BETWEEN",
  "value": ["2024-12-08T00:00:00.000Z", "2025-01-07T23:59:59.999Z"]
}
```

### Date Operators → Comparison

**"before" → `<`**
**"after" → `>`**

These are semantic aliases that map to standard comparison operators.

## TypeScript Transformation Function

```typescript
interface OldFilter {
  attribute: string;
  operator: string;
  value: any;
}

interface NewFilter {
  field: string;
  operator: string;
  value?: any;
}

function transformOperator(oldOp: string): string {
  const mapping: Record<string, string> = {
    equals: "=",
    "not equals": "!=",
    contains: "CONTAINS",
    "does not contain": "NOT_CONTAINS",
    "starts with": "STARTS WITH",
    "ends with": "ENDS WITH",
    "is any of": "IN",
    "is none of": "NOT IN",
    "greater than": ">",
    "less than": "<",
    "greater than or equals": ">=",
    "less than or equals": "<=",
    between: "BETWEEN",
    before: "<",
    after: ">",
    exists: "EXISTS",
    "not exists": "NOT EXISTS",
  };

  const normalized = oldOp.toLowerCase().trim();
  return mapping[normalized] || oldOp; // Fallback to original
}

function transformFilter(oldFilter: OldFilter): NewFilter {
  const newFilter: NewFilter = {
    field: oldFilter.attribute,
    operator: transformOperator(oldFilter.operator),
  };

  // Handle special time-relative operators
  if (oldFilter.operator === "in the last") {
    newFilter.operator = ">=";
    newFilter.value = computeRelativeDate(oldFilter.value);
  } else if (oldFilter.operator === "within") {
    newFilter.operator = "BETWEEN";
    newFilter.value = computeDateRange(oldFilter.value);
  } else if (oldFilter.operator !== "exists" && oldFilter.operator !== "not exists") {
    // Existence operators have no value
    newFilter.value = oldFilter.value;
  }

  return newFilter;
}

function computeRelativeDate(spec: string): string {
  // Parse "7 days", "2 weeks", "1 month", etc.
  const match = spec.match(/^(\d+)\s+(day|week|month|year)s?$/);
  if (!match) throw new Error(`Invalid time spec: ${spec}`);

  const [, amount, unit] = match;
  const multipliers = {
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000, // Approximate
    year: 365 * 24 * 60 * 60 * 1000, // Approximate
  };

  const ms = parseInt(amount) * multipliers[unit as keyof typeof multipliers];
  return new Date(Date.now() - ms).toISOString();
}

function computeDateRange(spec: string): [string, string] {
  // Similar to computeRelativeDate but returns [start, end]
  const end = new Date();
  const start = new Date(end.getTime() - parseTimeSpec(spec));
  return [start.toISOString(), end.toISOString()];
}
```

## Validation

### Operator Compatibility

**Check operator is valid for field type:**

| Field Type      | Valid Operators                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| String          | `=`, `!=`, `CONTAINS`, `NOT_CONTAINS`, `STARTS WITH`, `ENDS WITH`, `IN`, `NOT IN`, `EXISTS`, `NOT EXISTS` |
| Number          | `=`, `!=`, `>`, `<`, `>=`, `<=`, `BETWEEN`, `IN`, `NOT IN`, `EXISTS`, `NOT EXISTS`                        |
| Boolean         | `=`, `!=`, `EXISTS`, `NOT EXISTS`                                                                         |
| Date (ISO 8601) | `=`, `!=`, `>`, `<`, `>=`, `<=`, `BETWEEN`, `EXISTS`, `NOT EXISTS`                                        |
| Array           | `IN`, `NOT IN` (for checking if value in array field)                                                     |

### Value Type Validation

**Ensure value matches operator requirements:**

```typescript
function validateOperatorValue(operator: string, value: any): boolean {
  switch (operator) {
    case "IN":
    case "NOT IN":
      return Array.isArray(value) && value.length > 0;

    case "BETWEEN":
      return Array.isArray(value) && value.length === 2;

    case "EXISTS":
    case "NOT EXISTS":
      return value === undefined; // No value allowed

    default:
      return value !== undefined && value !== null;
  }
}
```

## Common Errors

### 1. Lowercase Operator Names

**Error**: `{"operator": "contains", "value": "test"}`

**Fix**: `{"operator": "CONTAINS", "value": "test"}`

**Why**: New format uses UPPERCASE for string operators to match Neo4j Cypher conventions.

### 2. Wrong Array Structure for BETWEEN

**Error**: `{"operator": "BETWEEN", "value": 80}`

**Fix**: `{"operator": "BETWEEN", "value": [80, 443]}`

**Why**: BETWEEN requires array with exactly 2 elements.

### 3. Missing Value for Comparison

**Error**: `{"field": "status", "operator": "="}`

**Fix**: `{"field": "status", "operator": "=", "value": "A"}`

**Why**: All operators except EXISTS/NOT EXISTS require value.

### 4. Value Present for Existence Check

**Error**: `{"field": "tags", "operator": "EXISTS", "value": null}`

**Fix**: `{"field": "tags", "operator": "EXISTS"}`

**Why**: Existence operators should not have value field.

## Testing Transformed Operators

### Unit Test Structure

```typescript
describe('Operator Transformation', () => {
  test('equals -> =', () => {
    const old = {attribute: 'status', operator: 'equals', value: 'A'};
    const new = transformFilter(old);
    expect(new).toEqual({field: 'status', operator: '=', value: 'A'});
  });

  test('is any of -> IN', () => {
    const old = {attribute: 'severity', operator: 'is any of', value: ['C','H']};
    const new = transformFilter(old);
    expect(new).toEqual({field: 'severity', operator: 'IN', value: ['C','H']});
  });

  test('exists has no value', () => {
    const old = {attribute: 'tags', operator: 'exists'};
    const new = transformFilter(old);
    expect(new).toEqual({field: 'tags', operator: 'EXISTS'});
    expect(new.value).toBeUndefined();
  });
});
```

### Integration Test

After migration, test the query against actual backend:

```bash
# Query Neo4j to verify syntax
curl -X POST http://localhost:7474/db/neo4j/tx/commit \
  -H "Content-Type: application/json" \
  -d '{"statements": [{"statement": "MATCH (n:Asset) WHERE n.status = '\''A'\'' RETURN n LIMIT 1"}]}'
```

## References

- Neo4j Cypher operator docs: https://neo4j.com/docs/cypher-manual/current/syntax/operators/
- Old Query Builder operator list: `SAVED_QUERIES_JSON_STRUCTURES.md`
- New GraphQuery types: `modules/chariot/ui/src/types.ts`
