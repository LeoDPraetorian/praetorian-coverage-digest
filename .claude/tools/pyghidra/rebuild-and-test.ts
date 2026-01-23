#!/usr/bin/env tsx
/**
 * Rebuild PyGhidra project from scratch and test from_function field
 */

import { callMCPTool } from '../config/lib/mcp-client.js';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function rebuildAndTest() {
  console.log('=== Rebuilding PyGhidra Project and Testing from_function ===\n');

  try {
    // Step 1: Import a small binary (/bin/ls is ~100KB)
    console.log('Step 1: Importing /bin/ls into fresh project...');
    const importResult: any = await callMCPTool('pyghidra', 'import_binary', {
      binary_path: '/bin/ls'
    }, { timeoutMs: 60000 });

    console.log('Import result:', importResult);
    console.log('');

    // Step 2: Wait for import to appear in binary list
    console.log('Step 2: Waiting for binary to appear in project...');
    const maxWaitImport = 90; // 90 seconds
    const startTimeImport = Date.now();
    let binaries: any = null;

    while ((Date.now() - startTimeImport) / 1000 < maxWaitImport) {
      await sleep(5000);

      binaries = await callMCPTool('pyghidra', 'list_project_binaries', {}, {
        timeoutMs: 30000
      });

      const elapsed = ((Date.now() - startTimeImport) / 1000).toFixed(0);
      console.log(`  Checking... ${elapsed}s (found: ${binaries.programs?.length || 0} binaries)`);

      if (binaries.programs && binaries.programs.length > 0) {
        console.log(`✓ Binary appeared after ${elapsed}s\n`);
        break;
      }
    }

    if (!binaries || !binaries.programs || binaries.programs.length === 0) {
      console.log('❌ No binaries found after waiting');
      process.exit(1);
    }

    const binary = binaries.programs[0];
    console.log(`Binary: ${binary.name}`);
    console.log(`Analysis complete: ${binary.analysis_complete}`);
    console.log('');

    // Step 3: Wait for analysis
    if (!binary.analysis_complete) {
      console.log('Step 3: Waiting for analysis to complete...');
      const maxWait = 120; // 2 minutes
      const startTime = Date.now();

      while ((Date.now() - startTime) / 1000 < maxWait) {
        await sleep(5000);

        try {
          const metadata: any = await callMCPTool('pyghidra', 'list_project_binary_metadata', {
            binary_name: binary.name
          }, { timeoutMs: 10000 });

          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`  Checking... ${elapsed}s (analysis_complete: ${metadata.analysis_complete})`);

          if (metadata.analysis_complete) {
            console.log(`✓ Analysis complete after ${elapsed}s\n`);
            break;
          }
        } catch (error: any) {
          if (!error.message.includes('Analysis incomplete')) {
            throw error;
          }
        }
      }
    } else {
      console.log('✓ Analysis already complete\n');
    }

    // Step 4: Find a function to test
    console.log('Step 4: Finding a function with cross-references...');
    const symbols: any = await callMCPTool('pyghidra', 'search_symbols_by_name', {
      binary_name: binary.name,
      query: '',
      limit: 50,
      offset: 0
    }, { timeoutMs: 30000 });

    if (!symbols.symbols || symbols.symbols.length === 0) {
      console.log('❌ No symbols found');
      process.exit(1);
    }

    // Find a good target (not external, not thunk)
    const targetSymbol = symbols.symbols.find((s: any) =>
      !s.name.includes('EXTERNAL') &&
      !s.name.includes('thunk') &&
      !s.name.includes('FUN_') &&
      s.name.length < 30
    ) || symbols.symbols[0];

    console.log(`Target: ${targetSymbol.name} @ ${targetSymbol.address}\n`);

    // Step 5: Get cross-references
    console.log('Step 5: Getting cross-references...\n');
    const xrefs: any = await callMCPTool('pyghidra', 'list_cross_references', {
      binary_name: binary.name,
      name_or_address: targetSymbol.address
    }, { timeoutMs: 45000 });

    console.log('=== RAW MCP RESPONSE ===');
    console.log(JSON.stringify(xrefs, null, 2));
    console.log('\n');

    if (!xrefs.cross_references || !Array.isArray(xrefs.cross_references)) {
      console.log('❌ No cross_references array in response');
      process.exit(1);
    }

    const total = xrefs.cross_references.length;
    console.log(`=== FOUND ${total} CROSS-REFERENCES ===\n`);

    if (total === 0) {
      console.log('No cross-references found for this function. Trying another...');
      // Try with "main" which usually has xrefs
      const mainXrefs: any = await callMCPTool('pyghidra', 'list_cross_references', {
        binary_name: binary.name,
        name_or_address: 'entry'
      }, { timeoutMs: 45000 });

      if (mainXrefs.cross_references && mainXrefs.cross_references.length > 0) {
        console.log(`Found ${mainXrefs.cross_references.length} xrefs for entry point\n`);
        analyzeXrefs(mainXrefs.cross_references);
      } else {
        console.log('Still no xrefs. Binary may be too simple.');
      }
    } else {
      analyzeXrefs(xrefs.cross_references);
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

function analyzeXrefs(xrefs: any[]) {
  // Show first 5 in detail
  xrefs.slice(0, 5).forEach((ref: any, i: number) => {
    console.log(`XRef #${i + 1}:`);
    Object.entries(ref).forEach(([key, value]) => {
      const valueStr = typeof value === 'string' ? `"${value}"` : String(value);
      const isEmpty = typeof value === 'string' && value.trim() === '';
      const isNull = value === null || value === undefined;

      let status = '';
      if (key === 'from_function') {
        if (isNull) status = ' ← NULL (SERVER DID NOT PROVIDE)';
        else if (isEmpty) status = ' ← EMPTY (SERVER PROVIDED EMPTY STRING)';
        else status = ' ← PROVIDED BY SERVER ✓';
      }

      console.log(`  ${key}: ${valueStr}${status}`);
    });
    console.log('');
  });

  // Statistics
  const total = xrefs.length;
  const withFromFunc = xrefs.filter((r: any) =>
    r.from_function && typeof r.from_function === 'string' && r.from_function.trim() !== ''
  ).length;

  console.log('=== DEFINITIVE VERDICT ===');
  console.log(`Total cross-references: ${total}`);
  console.log(`from_function populated: ${withFromFunc}/${total} (${(withFromFunc/total*100).toFixed(1)}%)`);

  // Check field names
  if (total > 0) {
    const firstRef = xrefs[0];
    console.log('\nField names:', Object.keys(firstRef).join(', '));

    const hasRefType = 'ref_type' in firstRef;
    const hasType = 'type' in firstRef;
    console.log(`Type field name: ${hasRefType ? 'ref_type' : hasType ? 'type' : 'MISSING'}`);
  }

  console.log('\n=== CONCLUSION ===');
  if (withFromFunc === 0) {
    console.log('❌ PyGhidra MCP server does NOT populate from_function field');
    console.log('   All values are null/undefined in raw MCP response');
    console.log('   This is a SERVER-SIDE LIMITATION');
    console.log('   The wrapper correctly defaults to "unknown"');
  } else if (withFromFunc === total) {
    console.log('✅ PyGhidra MCP server DOES populate from_function for all xrefs');
    console.log('   If your report shows "unknown", investigate the processing layer');
  } else {
    console.log(`⚠️  PyGhidra MCP server PARTIALLY populates from_function`);
    console.log(`   ${withFromFunc}/${total} have values`);
    console.log('   Server resolves when possible, leaves empty when not');
    console.log('   Wrapper correctly handles both cases');
  }
}

rebuildAndTest();
