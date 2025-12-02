/**
 * Schema Discovery Template
 *
 * MANDATORY: Run BEFORE writing Zod schemas for MCP wrappers
 *
 * Purpose: Analyze 3+ real MCP responses to discover:
 * - Which fields are REQUIRED vs OPTIONAL
 * - Type variance (number vs object, string vs array)
 * - Edge cases (null, undefined, empty arrays)
 *
 * Usage:
 *   1. Copy to .claude/tools/{mcp-name}/discover-schema.ts
 *   2. Update testCases with diverse inputs
 *   3. Run: npx tsx .claude/tools/{mcp-name}/discover-schema.ts
 *   4. Use output to design accurate Zod schema
 */

import { callMCPTool } from '../config/lib/mcp-client';

/**
 * Define diverse test cases to discover schema structure
 *
 * CRITICAL: Include edge cases:
 * - Normal case (typical usage)
 * - Minimal case (sparse data)
 * - Maximal case (all fields populated)
 * - Edge case (empty/null values)
 */
const testCases = [
  {
    description: 'Normal case - typical usage',
    input: {
      // TODO: Replace with actual input for your MCP tool
      id: 'example-id',
    },
  },
  {
    description: 'Edge case - minimal data',
    input: {
      // TODO: Minimal input that should still work
      id: 'minimal-id',
    },
  },
  {
    description: 'Edge case - maximal data',
    input: {
      // TODO: Input that triggers all optional fields
      id: 'maximal-id',
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
  console.log('🔍 MCP Schema Discovery\n');
  console.log('=' .repeat(60));

  // Track response format across test cases
  let textResponseCount = 0;
  let jsonResponseCount = 0;

  // Run test cases
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📋 Test Case ${i + 1}: ${testCase.description}`);
    console.log('-'.repeat(60));

    try {
      // TODO: Update with your MCP server name and tool name
      const raw = await callMCPTool(
        'mcp-server-name',
        'tool-name',
        testCase.input
      );

      console.log('✅ Success');

      // CRITICAL: Detect response format (text vs JSON)
      console.log(`Response Type: ${typeof raw}`);

      if (typeof raw === 'string') {
        // TEXT FORMAT DETECTED - MCP returns plain text (like Context7)
        textResponseCount++;
        console.log('📄 TEXT FORMAT DETECTED');
        console.log(`Response Length: ${raw.length} characters (~${Math.ceil(raw.length / 4)} tokens)`);
        console.log(`Response Preview (first 300 chars):\n${raw.substring(0, 300)}...\n`);

        // Check for common delimiters in text responses
        const hasDelimiters = raw.includes('----------') || raw.includes('---\n') || raw.includes('\n\n');
        if (hasDelimiters) {
          console.log('⚠️  Contains delimiters - may need text parser');
          console.log('   Common patterns: "----------", "---", double newlines');
        }

        // Skip JSON structure analysis for text
        console.log('\n⚠️  TEXT RESPONSE: Cannot analyze JSON structure');
        console.log('   You will need to implement a TEXT PARSER in your wrapper.');
        console.log('   See: .claude/tools/context7/ for working text parser example');
      } else {
        // JSON FORMAT - standard object/array response
        jsonResponseCount++;
        console.log('📦 JSON FORMAT DETECTED');
        console.log('Response preview:', JSON.stringify(raw, null, 2).substring(0, 200));

        // Analyze structure (only for JSON responses)
        analyzeStructure(raw, '', i);
      }
    } catch (error) {
      console.error('❌ Failed:', error);
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
  console.log('export const OutputSchema = z.object({');

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

  // Response Format Summary
  console.log('\n🔹 Response Format Summary:\n');
  console.log(`  Text responses: ${textResponseCount}/${testCases.length}`);
  console.log(`  JSON responses: ${jsonResponseCount}/${testCases.length}`);

  if (textResponseCount > 0) {
    console.log('\n' + '⚠️'.repeat(30));
    console.log('  ⚠️  TEXT RESPONSE FORMAT DETECTED');
    console.log('  ⚠️'.repeat(30));
    console.log(`
  This MCP returns PLAIN TEXT, not JSON objects.

  REQUIRED ACTIONS:
  1. Implement a text parser function in your wrapper
  2. Use regex to extract structured data from text
  3. Return parsed data as structured object

  REFERENCE IMPLEMENTATION:
  See .claude/tools/context7/resolve-library-id.ts for working example:
  - parseLibraryResults() function extracts data from delimited text
  - Handles "----------" block separators
  - Uses regex patterns like /- Title: (.+)/ to extract fields

  TEMPLATE:
  See .claude/skills/mcp-code-write/templates/text-parser-example.ts
`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Schema discovery complete!');
  if (jsonResponseCount > 0) {
    console.log('Use findings above to write accurate Zod schema.');
  }
  if (textResponseCount > 0) {
    console.log('Implement text parser before writing Zod schema.');
  }
  console.log('='.repeat(60) + '\n');
}

// Run discovery
discoverSchema().catch(error => {
  console.error('Discovery failed:', error);
  process.exit(1);
});
