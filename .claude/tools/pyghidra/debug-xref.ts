#!/usr/bin/env tsx
/**
 * Debug script to check actual PyGhidra MCP response for list_cross_references
 * This will enable debug logging to see what the server actually returns
 */

// Enable debug logging
process.env.DEBUG_PYGHIDRA = '1';

import { callMCPTool } from '../config/lib/mcp-client.js';

async function debugXref() {
  console.log('=== Debug: list_cross_references MCP Response ===\n');

  try {
    // Get list of binaries
    const binaries: any = await callMCPTool('pyghidra', 'list_project_binaries', {});

    if (!binaries.programs || binaries.programs.length === 0) {
      console.log('No binaries found in project');
      process.exit(1);
    }

    const binaryName = binaries.programs[0].name;
    console.log(`Testing with binary: ${binaryName}\n`);

    // Call list_cross_references with RAW MCP client (not the wrapper)
    console.log('Step 1: Raw MCP call to list_cross_references...\n');

    const rawResponse: any = await callMCPTool('pyghidra', 'list_cross_references', {
      binary_name: binaryName,
      name_or_address: 'main'
    }, { timeoutMs: 30000 });

    console.log('=== RAW MCP RESPONSE ===');
    console.log(JSON.stringify(rawResponse, null, 2));
    console.log('\n');

    if (rawResponse.cross_references && rawResponse.cross_references.length > 0) {
      console.log('=== FIRST 3 CROSS-REFERENCES (Detailed) ===\n');

      rawResponse.cross_references.slice(0, 3).forEach((ref: any, i: number) => {
        console.log(`XRef #${i + 1}:`);
        Object.keys(ref).forEach(key => {
          const value = ref[key];
          const isEmpty = typeof value === 'string' && value.trim() === '';
          const isNull = value === null || value === undefined;
          console.log(`  ${key}: ${JSON.stringify(value)}${isEmpty ? ' [EMPTY]' : isNull ? ' [NULL]' : ''}`);
        });
        console.log('');
      });

      // Statistics
      const total = rawResponse.cross_references.length;
      const withFromFunc = rawResponse.cross_references.filter((r: any) =>
        r.from_function && typeof r.from_function === 'string' && r.from_function.trim() !== ''
      ).length;
      const withToFunc = rawResponse.cross_references.filter((r: any) =>
        r.to_function && typeof r.to_function === 'string' && r.to_function.trim() !== ''
      ).length;

      console.log('=== ANALYSIS ===');
      console.log(`Total: ${total}`);
      console.log(`from_function populated: ${withFromFunc}/${total} (${(withFromFunc/total*100).toFixed(1)}%)`);
      console.log(`to_function populated: ${withToFunc}/${total} (${(withToFunc/total*100).toFixed(1)}%)`);

      if (withFromFunc === 0) {
        console.log('\n❌ ROOT CAUSE: PyGhidra MCP server does NOT populate from_function');
        console.log('   This is a SERVER-SIDE limitation, not a wrapper bug');
        console.log('   The wrapper correctly defaults to "unknown" when field is missing');
      } else if (withFromFunc < total) {
        console.log(`\n⚠️  PARTIAL: ${withFromFunc}/${total} have from_function`);
        console.log('   Some addresses may not resolve to function names');
      } else {
        console.log('\n✅ All from_function fields populated - wrapper should work correctly');
      }

      // Check field names
      const firstRef = rawResponse.cross_references[0];
      console.log('\n=== FIELD NAME CHECK ===');
      console.log('Fields in MCP response:', Object.keys(firstRef).join(', '));

      if ('ref_type' in firstRef) {
        console.log('✓ Uses ref_type field');
      } else if ('type' in firstRef) {
        console.log('✓ Uses type field');
      } else {
        console.log('⚠️  No type/ref_type field found!');
      }
    }

  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

debugXref();
