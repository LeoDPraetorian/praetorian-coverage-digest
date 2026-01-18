# Schema Discovery Script Pattern

**How to use and create schema discovery scripts for Linear API.**

## What Are Discovery Scripts?

Discovery scripts are tools that query the Linear API with test cases, analyze the response structure, and generate findings about:

- Which fields are REQUIRED vs OPTIONAL
- Type variance (e.g., `priority` returns `number` not `object`)
- Edge cases (null values, empty arrays, missing fields)
- Suggested Zod schemas based on actual data

## Standard Discovery Pattern

All discovery scripts in `.claude/tools/linear/internal/` follow this pattern:

```typescript
/**
 * Schema Discovery for Linear {operation}
 *
 * Purpose: Analyze real Linear API responses to discover:
 * - Which fields are REQUIRED vs OPTIONAL
 * - Type variance
 * - Edge cases
 *
 * Usage:
 *   npx tsx .claude/tools/linear/internal/{operation}-discover.ts
 */

import { callMCPTool } from '../../config/lib/mcp-client';

// ===== STEP 1: DEFINE TEST CASES =====
const testCases = [
  {
    description: 'Normal case - typical usage',
    input: {
      id: 'CHARIOT-1516',
    },
  },
  {
    description: 'Edge case - unassigned issue',
    input: {
      id: 'CHARIOT-1234',
    },
  },
  {
    description: 'Edge case - minimal data (old issue)',
    input: {
      id: 'CHARIOT-100',
    },
  },
];

// ===== STEP 2: TRACK FIELD OCCURRENCES =====
const fieldOccurrences = new Map<string, number>();
const fieldTypes = new Map<string, Set<string>>();
const fieldSamples = new Map<string, any[]>();

// ===== STEP 3: ANALYZE STRUCTURE RECURSIVELY =====
function analyzeStructure(
  obj: any,
  prefix = '',
  caseIndex: number
): void {
  if (obj === null || obj === undefined) {
    return;
  }

  if (Array.isArray(obj)) {
    const fullKey = prefix || 'root';
    recordField(fullKey, 'array', obj[0], caseIndex);
    if (obj.length > 0 && typeof obj[0] === 'object') {
      analyzeStructure(obj[0], `${fullKey}[0]`, caseIndex);
    }
    return;
  }

  if (typeof obj !== 'object') {
    return;
  }

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value === null) {
      recordField(fullKey, 'null', null, caseIndex);
    } else if (Array.isArray(value)) {
      recordField(fullKey, 'array', value, caseIndex);
      if (value.length > 0 && typeof value[0] === 'object') {
        analyzeStructure(value[0], `${fullKey}[0]`, caseIndex);
      }
    } else if (typeof value === 'object') {
      recordField(fullKey, 'object', value, caseIndex);
      analyzeStructure(value, fullKey, caseIndex);
    } else {
      recordField(fullKey, typeof value, value, caseIndex);
    }
  }
}

// ===== STEP 4: RECORD FIELD DATA =====
function recordField(
  key: string,
  type: string,
  sample: any,
  caseIndex: number
): void {
  fieldOccurrences.set(key, (fieldOccurrences.get(key) || 0) + 1);

  if (!fieldTypes.has(key)) {
    fieldTypes.set(key, new Set());
  }
  fieldTypes.get(key)!.add(type);

  if (!fieldSamples.has(key)) {
    fieldSamples.set(key, []);
  }
  if (fieldSamples.get(key)!.length < 3) {
    fieldSamples.get(key)!.push(sample);
  }
}

// ===== STEP 5: RUN DISCOVERY =====
async function discoverSchema() {
  console.log('🔍 Linear {operation} Schema Discovery\\n');
  console.log('='.repeat(60));

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\\n📋 Test Case ${i + 1}: ${testCase.description}`);
    console.log('-'.repeat(60));

    try {
      const raw = await callMCPTool(
        'linear',
        'operation_name',
        testCase.input
      );

      console.log('✅ Success');
      console.log('Response preview:', JSON.stringify(raw, null, 2).substring(0, 200));

      analyzeStructure(raw, '', i);
    } catch (error) {
      console.error('❌ Failed:', error instanceof Error ? error.message : error);
    }
  }

  // ===== STEP 6: REPORT FINDINGS =====
  console.log('\\n' + '='.repeat(60));
  console.log('📊 SCHEMA DISCOVERY RESULTS');
  console.log('='.repeat(60));

  const sortedFields = Array.from(fieldOccurrences.keys()).sort();

  console.log('\\n🔹 Field Optionality:\\n');
  for (const field of sortedFields) {
    const count = fieldOccurrences.get(field)!;
    const isRequired = count === testCases.length;
    const percentage = ((count / testCases.length) * 100).toFixed(0);

    const status = isRequired ? '✅ REQUIRED' : '⚠️  OPTIONAL';
    const presence = `(${count}/${testCases.length} = ${percentage}%)`;

    console.log(`  ${status} ${presence.padEnd(15)} ${field}`);
  }

  console.log('\\n🔹 Field Types:\\n');
  for (const field of sortedFields) {
    const types = fieldTypes.get(field)!;
    const typeList = Array.from(types).join(' | ');

    if (types.size > 1) {
      console.log(`  ⚠️  TYPE VARIANCE: ${field}`);
      console.log(`      Types: ${typeList}`);

      const samples = fieldSamples.get(field) || [];
      samples.forEach((sample, idx) => {
        console.log(`      Sample ${idx + 1}:`, JSON.stringify(sample).substring(0, 80));
      });
    } else {
      console.log(`  ${field}: ${typeList}`);
    }
  }

  // ===== STEP 7: GENERATE ZOD SCHEMA =====
  console.log('\\n🔹 Suggested Zod Schema:\\n');
  console.log('```typescript');
  console.log('export const operationOutput = z.object({');

  for (const field of sortedFields) {
    if (field.includes('.') || field.includes('[')) continue;

    const count = fieldOccurrences.get(field)!;
    const isOptional = count < testCases.length;
    const types = fieldTypes.get(field)!;

    let zodType = 'z.unknown()';

    if (types.size === 1) {
      const type = Array.from(types)[0];
      switch (type) {
        case 'string': zodType = 'z.string()'; break;
        case 'number': zodType = 'z.number()'; break;
        case 'boolean': zodType = 'z.boolean()'; break;
        case 'array': zodType = 'z.array(z.unknown())'; break;
        case 'object': zodType = 'z.object({ /* TODO */ })'; break;
        case 'null': zodType = 'z.null()'; break;
      }
    } else {
      const typeNames = Array.from(types).map(t => {
        switch (t) {
          case 'string': return 'z.string()';
          case 'number': return 'z.number()';
          case 'object': return 'z.object({ /* TODO */ })';
          case 'null': return 'z.null()';
          default: return 'z.unknown()';
        }
      });
      zodType = `z.union([${typeNames.join(', ')}])`;
    }

    if (isOptional) {
      zodType += '.optional()';
    }

    const comment = isOptional ? '// Optional' : '// Required';
    console.log(`  ${field}: ${zodType}, ${comment}`);
  }

  console.log('});');
  console.log('```');

  console.log('\\n' + '='.repeat(60));
  console.log('✅ Schema discovery complete!');
  console.log('Use these findings to write accurate Zod schema.');
  console.log('='.repeat(60) + '\\n');
}

// ===== RUN =====
discoverSchema().catch(error => {
  console.error('Discovery failed:', error);
  process.exit(1);
});
```

## How to Run Discovery Scripts

```bash
# Navigate to repo root
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
cd "$ROOT"

# Run discovery script
npx tsx .claude/tools/linear/internal/get-issue-discover.ts

# Output:
# 🔍 Linear get-issue Schema Discovery
# =================...
# 📋 Test Case 1: Normal case
# ✅ Success
# 📊 SCHEMA DISCOVERY RESULTS
# 🔹 Field Optionality:
#   ✅ REQUIRED (3/3 = 100%)  id
#   ⚠️  OPTIONAL (2/3 = 67%)   assignee
# 🔹 Suggested Zod Schema:
# ...
```

## When to Run Discovery

1. **Before Adding New Wrapper** - Discover schema first
2. **After GraphQL Error** - Re-check field existence
3. **When API Changes** - Verify current structure
4. **Suspecting New Features** - Check if API added fields

## Creating New Discovery Scripts

Template for new discovery script:

```typescript
// File: internal/new-operation-discover.ts

import { callMCPTool } from '../../config/lib/mcp-client';

const testCases = [
  {
    description: 'Normal case',
    input: { /* typical params */ },
  },
  {
    description: 'Edge case 1',
    input: { /* edge case params */ },
  },
];

// ... (use standard pattern above)

async function discoverSchema() {
  for (const testCase of testCases) {
    const raw = await callMCPTool(
      'linear',
      'operation_name', // ← MCP operation name
      testCase.input
    );
    analyzeStructure(raw, '', 0);
  }
  // ... report findings
}

discoverSchema();
```

## Interpreting Discovery Output

### Field Optionality

```
✅ REQUIRED (3/3 = 100%)  id
⚠️  OPTIONAL (2/3 = 67%)   assignee
⚠️  OPTIONAL (1/3 = 33%)   description
```

**Meaning:**
- `id`: Present in all test cases → Required field
- `assignee`: Present in 2/3 cases → Optional (some issues unassigned)
- `description`: Present in 1/3 cases → Optional (some issues have no description)

### Type Variance

```
⚠️  TYPE VARIANCE: priority
    Types: number | object
    Sample 1: 2
    Sample 2: {"id": "...", "label": "High"}
```

**Meaning:** API can return EITHER a number OR an object for `priority`. This requires union type:

```typescript
priority: z.union([z.number(), z.object({ id: z.string(), label: z.string() })]).optional()
```

## Best Practices

1. **Multiple Test Cases:** Use 3-5 test cases covering normal + edge cases
2. **Diverse Data:** Test with old issues, new issues, assigned/unassigned
3. **Document Findings:** Update wrapper "Schema Discovery Results" comment
4. **Version Control:** Commit discovery scripts with wrappers
5. **Re-run Regularly:** Check for API drift monthly
6. **Error Recovery:** If discovery fails, check auth tokens first

## Related Files

- `.claude/tools/linear/internal/get-issue-discover.ts` - Example discovery script
- `.claude/tools/config/lib/mcp-client.ts` - callMCPTool implementation
- Wrapper files - Use discovery findings to update schemas
