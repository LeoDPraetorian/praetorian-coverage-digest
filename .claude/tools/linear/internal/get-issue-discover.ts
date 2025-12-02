/**
 * Schema Discovery for Linear get-issue
 *
 * Purpose: Analyze real Linear API responses to discover:
 * - Which fields are REQUIRED vs OPTIONAL
 * - Type variance (priority: number vs object)
 * - Edge cases (null assignee, undefined state)
 *
 * Usage:
 *   npx tsx .claude/tools/linear/get-issue-discover.ts
 */

import { callMCPTool } from '../../config/lib/mcp-client';

/**
 * Test cases covering diverse scenarios
 */
const testCases = [
  {
    description: 'Normal case - CHARIOT-1516 (typical issue)',
    input: {
      id: 'CHARIOT-1516',
    },
  },
  {
    description: 'Edge case - unassigned issue',
    input: {
      id: 'CHARIOT-1234', // Adjust to actual unassigned issue if known
    },
  },
  {
    description: 'Edge case - minimal data (old issue)',
    input: {
      id: 'CHARIOT-100', // Adjust to actual sparse issue if known
    },
  },
];

// Track field occurrences across test cases
const fieldOccurrences = new Map<string, number>();
const fieldTypes = new Map<string, Set<string>>();
const fieldSamples = new Map<string, any[]>();

/**
 * Recursively analyze object structure
 */
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

    // Analyze first element structure
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
    } else if (value === undefined) {
      // Skip undefined (field not present)
      continue;
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

/**
 * Record field occurrence and type
 */
function recordField(
  key: string,
  type: string,
  sample: any,
  caseIndex: number
): void {
  // Track occurrence
  fieldOccurrences.set(key, (fieldOccurrences.get(key) || 0) + 1);

  // Track types
  if (!fieldTypes.has(key)) {
    fieldTypes.set(key, new Set());
  }
  fieldTypes.get(key)!.add(type);

  // Store sample value
  if (!fieldSamples.has(key)) {
    fieldSamples.set(key, []);
  }
  if (fieldSamples.get(key)!.length < 3) {
    fieldSamples.get(key)!.push(sample);
  }
}

/**
 * Main discovery function
 */
async function discoverSchema() {
  console.log('🔍 Linear get-issue Schema Discovery\n');
  console.log('=' .repeat(60));

  // Run test cases
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📋 Test Case ${i + 1}: ${testCase.description}`);
    console.log('-'.repeat(60));

    try {
      const raw = await callMCPTool(
        'linear',
        'get_issue',
        testCase.input
      );

      console.log('✅ Success');
      console.log('Response preview:', JSON.stringify(raw, null, 2).substring(0, 200));

      // Analyze structure
      analyzeStructure(raw, '', i);
    } catch (error) {
      console.error('❌ Failed:', error instanceof Error ? error.message : error);
    }
  }

  // Report findings
  console.log('\n' + '='.repeat(60));
  console.log('📊 SCHEMA DISCOVERY RESULTS');
  console.log('='.repeat(60));

  // Sort fields by key for readability
  const sortedFields = Array.from(fieldOccurrences.keys()).sort();

  console.log('\n🔹 Field Optionality:\n');
  for (const field of sortedFields) {
    const count = fieldOccurrences.get(field)!;
    const isRequired = count === testCases.length;
    const percentage = ((count / testCases.length) * 100).toFixed(0);

    const status = isRequired ? '✅ REQUIRED' : '⚠️  OPTIONAL';
    const presence = `(${count}/${testCases.length} = ${percentage}%)`;

    console.log(`  ${status} ${presence.padEnd(15)} ${field}`);
  }

  console.log('\n🔹 Field Types:\n');
  for (const field of sortedFields) {
    const types = fieldTypes.get(field)!;
    const typeList = Array.from(types).join(' | ');

    if (types.size > 1) {
      console.log(`  ⚠️  TYPE VARIANCE: ${field}`);
      console.log(`      Types: ${typeList}`);

      // Show samples for multi-type fields
      const samples = fieldSamples.get(field) || [];
      samples.forEach((sample, idx) => {
        console.log(`      Sample ${idx + 1}:`, JSON.stringify(sample).substring(0, 80));
      });
    } else {
      console.log(`  ${field}: ${typeList}`);
    }
  }

  // Generate Zod schema suggestion
  console.log('\n🔹 Suggested Zod Schema:\n');
  console.log('```typescript');
  console.log('export const getIssueOutput = z.object({');

  for (const field of sortedFields) {
    // Skip nested fields (will be in nested objects)
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
      // Multiple types - use union
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

  console.log('\n' + '='.repeat(60));
  console.log('✅ Schema discovery complete!');
  console.log('Use these findings to write accurate Zod schema.');
  console.log('='.repeat(60) + '\n');
}

// Run discovery
discoverSchema().catch(error => {
  console.error('Discovery failed:', error);
  process.exit(1);
});
