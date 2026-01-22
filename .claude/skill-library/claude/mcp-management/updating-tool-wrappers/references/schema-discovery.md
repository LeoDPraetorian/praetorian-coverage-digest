# Schema Discovery Guide

**How to test and document API field behavior before implementing wrapper changes.**

## Purpose

Schema discovery prevents bugs by understanding actual API behavior instead of assuming it. Test 3+ edge cases for every new field BEFORE updating the wrapper.

---

## Why Discovery Matters

**Without discovery:**

- Assume field is required → API returns null → wrapper crashes
- Assume field is string → API returns object → type error
- Assume field is always present → API omits field → undefined access

**With discovery:**

- Know when field is null vs undefined vs missing
- Understand type (primitive vs object vs union)
- Document valid ranges and constraints
- Design proper Zod schema and response mapping

---

## Discovery Workflow

### Step 1: Create Discovery Script

Create `test-{field}-discovery.ts` in service directory:

```typescript
import { getTool } from './get-tool.js';

async function discoverFieldBehavior() {
  console.log('Discovery: {field} field behavior\n');

  // Test 1: Normal case
  console.log('Test 1: Normal value');
  const normal = await getTool.execute({ id: 'NORMAL-ISSUE' });
  console.log(`  Value: ${JSON.stringify(normal.{field})}`);
  console.log(`  Type: ${typeof normal.{field}}`);

  // Test 2: Null case
  console.log('\nTest 2: Null value');
  const nullCase = await getTool.execute({ id: 'NULL-ISSUE' });
  console.log(`  Value: ${JSON.stringify(nullCase.{field})}`);

  // Test 3: Missing field
  console.log('\nTest 3: Field missing entirely');
  const missing = await getTool.execute({ id: 'OLD-ISSUE' });
  console.log(`  Value: ${JSON.stringify(missing.{field})}`);

  // Test 4: Edge boundary
  console.log('\nTest 4: Boundary value (if numeric)');
  const boundary = await getTool.execute({ id: 'BOUNDARY-ISSUE' });
  console.log(`  Value: ${boundary.{field}}`);
}

discoverFieldBehavior().catch(console.error);
```

### Step 2: Run Discovery Script

```bash
npx tsx test-{field}-discovery.ts
```

### Step 3: Analyze Output

**Look for:**

- **Type**: Primitive (string, number, boolean) vs Complex (object, array)
- **Nullability**: Can be null? undefined? Missing entirely?
- **Structure**: If object, what properties does it have?
- **Range**: If number, what are min/max values?
- **Variance**: Does type change based on context? (union type needed)

**Example output:**

```
Discovery: priority field behavior

Test 1: Normal value
  Value: {"name":"High","value":2}
  Type: object

Test 2: Null value
  Value: null
  Type: object

Test 3: Field missing entirely
  Value: undefined
  Type: undefined

Test 4: Boundary value
  Value: {"name":"Urgent","value":1}
  Type: object
```

**Analysis:**

- Type: Object with `name` (string) and `value` (number)
- Nullability: Can be null or undefined
- Structure: `{ name: string, value: number }`
- Range: value appears to be 0-4 (test more to confirm)
- Wrapper should extract `.value` property

### Step 4: Test Edge Cases (Minimum 3)

**For all field types:**

1. **Normal value** - Expected, common case
2. **Null** - Explicit null from API
3. **Undefined/Missing** - Field not present in response

**For numeric fields:**

4. **Minimum boundary** - Lowest valid value
5. **Maximum boundary** - Highest valid value
6. **Out of range** - Invalid value (if applicable)

**For string fields:**

4. **Empty string** - "" vs null vs undefined
5. **Special characters** - Unicode, emojis, control chars
6. **Long string** - Max length handling

**For object fields:**

4. **Nested null** - Object present but properties null
5. **Partial object** - Some properties missing
6. **Type variance** - Does structure change?

**For array fields:**

4. **Empty array** - [] vs null vs undefined
5. **Single element** - Array with one item
6. **Many elements** - Performance, truncation

### Step 5: Document Findings

Create or update `discovery-docs/{service}-{tool}.md`:

```markdown
## Field: {fieldName}

**Discovered:** 2026-01-17
**Tested with:** {Service} {Tool} API

### API Response Structure

\`\`\`json
{
"{fieldName}": {
"property1": "value",
"property2": 123
}
}
\`\`\`

### Field Characteristics

- **Type**: Object with properties `property1` (string), `property2` (number)
- **Required**: No
- **Nullable**: Yes (API returns null for issues without this field)
- **Valid range**: property2 is 0-4
- **Special cases**: Old issues may not have this field at all (undefined)

### Edge Cases Tested

| Test Case    | Input                | API Response                       | Result           |
| ------------ | -------------------- | ---------------------------------- | ---------------- |
| Normal       | Issue with field     | `{property1: "val", property2: 2}` | Extract values   |
| Null         | Issue without field  | `null`                             | Map to undefined |
| Missing      | Old issue            | Field not present                  | undefined        |
| Boundary min | Issue with min value | `{property1: "val", property2: 0}` | Valid            |
| Boundary max | Issue with max value | `{property1: "val", property2: 4}` | Valid            |

### Zod Schema

\`\`\`typescript
{fieldName}: z.object({
property1: z.string(),
property2: z.number().min(0).max(4)
}).optional()
.describe('{Description of field}')
\`\`\`

### Response Mapping

\`\`\`typescript
// Extract specific property
{fieldName}: response.data.{fieldName}?.property2 ?? undefined

// Or pass through entire object
{fieldName}: response.data.{fieldName} ?? undefined
\`\`\`

### Test Cases Required

\`\`\`typescript
// Schema validation
expect(() => wrapper.parameters.parse({ {fieldName}: validValue })).not.toThrow();
expect(() => wrapper.parameters.parse({ {fieldName}: invalidValue })).toThrow();

// Null handling
const nullResult = await wrapper.execute({ id: 'NULL-CASE' });
expect(nullResult.{fieldName}).toBeUndefined();

// Normal case
const normal = await wrapper.execute({ id: 'NORMAL-CASE' });
expect(normal.{fieldName}).toBe(expectedValue);
\`\`\`
```

---

## Discovery Templates by Field Type

### Numeric Field

```typescript
// Test: Min/max boundaries, negative, zero, decimal
const tests = [
  { id: "MIN-VALUE", expected: 0 },
  { id: "MAX-VALUE", expected: 100 },
  { id: "NEGATIVE", expected: -10 },
  { id: "ZERO", expected: 0 },
  { id: "DECIMAL", expected: 2.5 },
  { id: "NULL-CASE", expected: undefined },
];

for (const test of tests) {
  const result = await getTool.execute({ id: test.id });
  console.log(`${test.id}: ${result.field} (expected: ${test.expected})`);
}
```

**Zod schema:**

```typescript
field: z.number().min(minValue).max(maxValue).optional();
```

### String Field

```typescript
// Test: Empty, whitespace, special chars, long, null
const tests = [
  { id: "EMPTY", desc: "Empty string" },
  { id: "WHITESPACE", desc: "Only whitespace" },
  { id: "UNICODE", desc: "Unicode characters" },
  { id: "LONG", desc: "Very long string (1000+ chars)" },
  { id: "NULL-CASE", desc: "Null value" },
];
```

**Zod schema:**

```typescript
field: z.string()
  .min(minLength)
  .max(maxLength)
  .optional()
  .refine(validateNoControlChars, "Control characters not allowed");
```

### Object Field

```typescript
// Test: Full object, partial object, nested null, missing
const normal = await getTool.execute({ id: "FULL-OBJECT" });
console.log("Full:", JSON.stringify(normal.field, null, 2));

const partial = await getTool.execute({ id: "PARTIAL-OBJECT" });
console.log("Partial:", JSON.stringify(partial.field, null, 2));

const nullProp = await getTool.execute({ id: "NULL-PROPERTIES" });
console.log("Null props:", JSON.stringify(nullProp.field, null, 2));
```

**Zod schema:**

```typescript
field: z.object({
  prop1: z.string(),
  prop2: z.number().optional(),
  nested: z
    .object({
      subProp: z.string(),
    })
    .optional(),
}).optional();
```

### Array Field

```typescript
// Test: Empty array, single element, many elements, null
const tests = [
  { id: "EMPTY-ARRAY", expected: [] },
  { id: "SINGLE", expected: 1 },
  { id: "MANY", expected: 10 },
  { id: "NULL-ARRAY", expected: undefined },
];

for (const test of tests) {
  const result = await getTool.execute({ id: test.id });
  const length = result.field?.length ?? "null";
  console.log(`${test.id}: length=${length}`);
}
```

**Zod schema:**

```typescript
field: z.array(
  z.object({
    id: z.string(),
    name: z.string(),
  })
).optional();
```

### Union Field (Type Variance)

```typescript
// Test: Different types returned based on context
const numberCase = await getTool.execute({ id: "NUMERIC-ID" });
console.log(`Numeric: ${typeof numberCase.field}, value=${numberCase.field}`);

const objectCase = await getTool.execute({ id: "OBJECT-ID" });
console.log(`Object: ${typeof objectCase.field}, value=${JSON.stringify(objectCase.field)}`);
```

**Zod schema:**

```typescript
field: z.union([
  z.number(),
  z.object({
    value: z.number(),
    label: z.string(),
  }),
]).optional();
```

---

## Common Discovery Findings

### Finding 1: Field is Object, Not Primitive

**Symptom:** Expected number, got `{ name: "High", value: 2 }`

**Impact:** Wrapper extracts wrong type

**Fix:** Update OutputSchema to extract `.value` property

```typescript
// Wrong
priority: response.priority;

// Right
priority: response.priority?.value ?? undefined;
```

### Finding 2: Field Can Be Null OR Missing

**Symptom:** API sometimes returns `null`, sometimes omits field

**Impact:** Need optional chaining + null coalescing

**Fix:** Handle both cases

```typescript
field: response.data?.field ?? undefined;
```

### Finding 3: Field Type Changes Based on Context

**Symptom:** Sometimes string, sometimes object

**Impact:** Need union type

**Fix:** Use `z.union()`

```typescript
field: z.union([z.string(), z.object({ id: z.string(), name: z.string() })]).optional();
```

### Finding 4: Field Has Undocumented Constraints

**Symptom:** API rejects certain values not mentioned in docs

**Impact:** Need stricter validation

**Fix:** Add refinement

```typescript
field: z.string()
  .refine((val) => val.length <= 100, "Max 100 characters")
  .refine((val) => !val.includes("<"), "No HTML tags");
```

---

## Verification Checklist

Before proceeding to GREEN phase:

- [ ] Created discovery script
- [ ] Ran script with real API calls
- [ ] Tested minimum 3 edge cases (normal, null, missing)
- [ ] Documented API response structure
- [ ] Determined correct Zod schema
- [ ] Documented response mapping approach
- [ ] Identified test cases required
- [ ] Updated discovery docs file

**Cannot proceed without completing discovery** ✅

---

## Related References

- [TDD Workflow](tdd-workflow.md) - Discovery is part of RED→GREEN cycle
- [Update Patterns](update-patterns.md) - Common field addition patterns
- [Regression Prevention](regression-prevention.md) - Ensure backward compatibility
