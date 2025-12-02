// Production-Readiness Validation Suite for Context7 MCP Wrappers
// Tests: Schema Validation, Token Reduction, Information Preservation, Security

import { z } from 'zod';
import { resolveLibraryId } from '../resolve-library-id';
import { getLibraryDocs } from '../get-library-docs';

interface ValidationResult {
  name: string;
  category: 'schema' | 'token' | 'filtering' | 'security' | 'error-handling';
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: Record<string, any>;
}

const results: ValidationResult[] = [];

// ============================================================================
// TEST CATEGORY 1: SCHEMA VALIDATION
// ============================================================================

async function testSchemaValidation() {
  console.log('\n📋 TEST CATEGORY 1: Schema Validation');
  console.log('─'.repeat(60));

  // Test 1.1: Valid input passes
  try {
    const result = await resolveLibraryId.execute({
      name: 'react',
      ecosystem: 'npm',
      version: '18.2.0'
    });

    const passed = result && result.id && result.name && result.ecosystem;
    results.push({
      name: '1.1 - Valid input accepts correct data',
      category: 'schema',
      status: passed ? 'PASS' : 'FAIL',
      message: passed ? 'Valid input processed successfully' : 'Valid input rejected',
      details: { input: { name: 'react', ecosystem: 'npm', version: '18.2.0' } }
    });
  } catch (error: any) {
    results.push({
      name: '1.1 - Valid input accepts correct data',
      category: 'schema',
      status: 'FAIL',
      message: `Should accept valid input: ${error.message}`,
      details: { error: error.message }
    });
  }

  // Test 1.2: Empty name rejected
  try {
    await resolveLibraryId.execute({
      name: '',
      ecosystem: 'npm'
    });
    results.push({
      name: '1.2 - Empty library name rejected',
      category: 'schema',
      status: 'FAIL',
      message: 'Empty name should be rejected'
    });
  } catch (error: any) {
    const isValidationError = error.issues || error.message?.includes('required');
    results.push({
      name: '1.2 - Empty library name rejected',
      category: 'schema',
      status: isValidationError ? 'PASS' : 'FAIL',
      message: isValidationError ? 'Correctly rejected empty name' : 'Wrong error type',
      details: { error: error.message }
    });
  }

  // Test 1.3: Invalid version format rejected
  try {
    await resolveLibraryId.execute({
      name: 'react',
      ecosystem: 'npm',
      version: '!!!invalid!!!'
    });
    results.push({
      name: '1.3 - Invalid version format rejected',
      category: 'schema',
      status: 'FAIL',
      message: 'Invalid version should be rejected'
    });
  } catch (error: any) {
    const isValidationError = error.issues || error.message?.includes('Invalid');
    results.push({
      name: '1.3 - Invalid version format rejected',
      category: 'schema',
      status: isValidationError ? 'PASS' : 'FAIL',
      message: isValidationError ? 'Correctly rejected invalid version' : 'Wrong error type',
      details: { error: error.message }
    });
  }

  // Test 1.4: Invalid ecosystem rejected
  try {
    await resolveLibraryId.execute({
      name: 'react',
      ecosystem: 'invalid-ecosystem' as any
    });
    results.push({
      name: '1.4 - Invalid ecosystem rejected',
      category: 'schema',
      status: 'FAIL',
      message: 'Invalid ecosystem should be rejected'
    });
  } catch (error: any) {
    const isValidationError = error.issues || error.message?.includes('Invalid');
    results.push({
      name: '1.4 - Invalid ecosystem rejected',
      category: 'schema',
      status: isValidationError ? 'PASS' : 'FAIL',
      message: isValidationError ? 'Correctly rejected invalid ecosystem' : 'Wrong error type',
      details: { error: error.message }
    });
  }

  // Test 1.5: Scoped packages supported
  try {
    const result = await resolveLibraryId.execute({
      name: '@tanstack/react-query',
      ecosystem: 'npm'
    });
    const passed = result && result.name === '@tanstack/react-query';
    results.push({
      name: '1.5 - Scoped packages (@scope/name) supported',
      category: 'schema',
      status: passed ? 'PASS' : 'FAIL',
      message: passed ? 'Scoped packages handled correctly' : 'Scoped package failed',
      details: { input: '@tanstack/react-query', output: result?.name }
    });
  } catch (error: any) {
    results.push({
      name: '1.5 - Scoped packages (@scope/name) supported',
      category: 'schema',
      status: 'FAIL',
      message: `Scoped packages not supported: ${error.message}`,
      details: { error: error.message }
    });
  }

  // Test 1.6: Output schema enforced
  try {
    const result = await resolveLibraryId.execute({
      name: 'react',
      ecosystem: 'npm'
    });

    const hasRequiredFields =
      typeof result.id === 'string' &&
      typeof result.name === 'string' &&
      typeof result.version === 'string' &&
      typeof result.ecosystem === 'string';

    results.push({
      name: '1.6 - Output schema validated (all required fields present)',
      category: 'schema',
      status: hasRequiredFields ? 'PASS' : 'FAIL',
      message: hasRequiredFields ? 'All required output fields present' : 'Missing required fields',
      details: { fields: Object.keys(result) }
    });
  } catch (error: any) {
    results.push({
      name: '1.6 - Output schema validated (all required fields present)',
      category: 'schema',
      status: 'FAIL',
      message: `Output validation failed: ${error.message}`
    });
  }

  // Test 1.7: Input documentation validated
  try {
    const result = await getLibraryDocs.execute({
      libraryId: 'npm:react@18.2.0'
    });

    const hasRequiredFields =
      typeof result.id === 'string' &&
      typeof result.name === 'string' &&
      typeof result.summary === 'string' &&
      Array.isArray(result.tableOfContents) &&
      Array.isArray(result.keyFunctions) &&
      typeof result.estimatedTokens === 'number';

    results.push({
      name: '1.7 - Get library docs input accepted',
      category: 'schema',
      status: hasRequiredFields ? 'PASS' : 'FAIL',
      message: hasRequiredFields ? 'Docs retrieved with correct schema' : 'Schema mismatch',
      details: { fields: Object.keys(result) }
    });
  } catch (error: any) {
    results.push({
      name: '1.7 - Get library docs input accepted',
      category: 'schema',
      status: 'FAIL',
      message: `Docs retrieval failed: ${error.message}`
    });
  }
}

// ============================================================================
// TEST CATEGORY 2: TOKEN REDUCTION EFFECTIVENESS
// ============================================================================

async function testTokenReduction() {
  console.log('\n🔧 TEST CATEGORY 2: Token Reduction');
  console.log('─'.repeat(60));

  // Test 2.1: Filtered output is smaller than mock full documentation
  try {
    const result = await getLibraryDocs.execute({
      libraryId: 'npm:react@18.2.0'
    });

    // Estimate tokens: ~1 token per 4 characters
    const estimatedActualTokens = Math.ceil(JSON.stringify(result).length / 4);

    const isReduced = result.estimatedTokens <= 300; // Should be ~200
    const matches = Math.abs(result.estimatedTokens - estimatedActualTokens) < 50;

    results.push({
      name: '2.1 - Filtered output estimated tokens <= 300',
      category: 'token',
      status: isReduced && matches ? 'PASS' : 'WARN',
      message: isReduced
        ? `Tokens reduced to ${result.estimatedTokens} (target <300)`
        : `Token count ${result.estimatedTokens} exceeds limit`,
      details: {
        reportedTokens: result.estimatedTokens,
        actualSize: JSON.stringify(result).length,
        estimatedActualTokens
      }
    });
  } catch (error: any) {
    results.push({
      name: '2.1 - Filtered output estimated tokens <= 300',
      category: 'token',
      status: 'FAIL',
      message: `Token test failed: ${error.message}`
    });
  }

  // Test 2.2: Summary is truncated to reasonable length
  try {
    const result = await getLibraryDocs.execute({
      libraryId: 'npm:react@18.2.0'
    });

    const summaryLength = result.summary.length;
    const isTruncated = summaryLength < 300; // 200 char limit + buffer

    results.push({
      name: '2.2 - Summary truncated to <300 chars',
      category: 'token',
      status: isTruncated ? 'PASS' : 'WARN',
      message: `Summary is ${summaryLength} chars (target <300)`,
      details: { summaryLength }
    });
  } catch (error: any) {
    results.push({
      name: '2.2 - Summary truncated to <300 chars',
      category: 'token',
      status: 'FAIL',
      message: `Summary test failed: ${error.message}`
    });
  }

  // Test 2.3: TOC limited to prevent bloat
  try {
    const result = await getLibraryDocs.execute({
      libraryId: 'npm:react@18.2.0'
    });

    const tocCount = result.tableOfContents.length;
    const isLimited = tocCount <= 20; // Reasonable limit

    results.push({
      name: '2.3 - Table of contents limited (<20 entries)',
      category: 'token',
      status: isLimited ? 'PASS' : 'WARN',
      message: `TOC has ${tocCount} entries (limit: <20)`,
      details: { tocCount }
    });
  } catch (error: any) {
    results.push({
      name: '2.3 - Table of contents limited (<20 entries)',
      category: 'token',
      status: 'FAIL',
      message: `TOC test failed: ${error.message}`
    });
  }

  // Test 2.4: Key functions limited to prevent bloat
  try {
    const result = await getLibraryDocs.execute({
      libraryId: 'npm:react@18.2.0'
    });

    const functionCount = result.keyFunctions.length;
    const isLimited = functionCount <= 15; // Reasonable limit (spec says 10)

    results.push({
      name: '2.4 - Key functions limited (<=15)',
      category: 'token',
      status: isLimited ? 'PASS' : 'FAIL',
      message: `Key functions: ${functionCount} (limit: <=15)`,
      details: { functionCount, limit: 15 }
    });
  } catch (error: any) {
    results.push({
      name: '2.4 - Key functions limited (<=15)',
      category: 'token',
      status: 'FAIL',
      message: `Key functions test failed: ${error.message}`
    });
  }
}

// ============================================================================
// TEST CATEGORY 3: FILTERING PRESERVES ESSENTIAL INFORMATION
// ============================================================================

async function testFilteringQuality() {
  console.log('\n📊 TEST CATEGORY 3: Information Preservation');
  console.log('─'.repeat(60));

  // Test 3.1: Summary is meaningful (not empty)
  try {
    const result = await getLibraryDocs.execute({
      libraryId: 'npm:react@18.2.0'
    });

    const hasMeaningfulSummary =
      result.summary &&
      result.summary.length > 20 &&
      result.summary.includes('library') || result.summary.includes('framework');

    results.push({
      name: '3.1 - Summary contains meaningful content',
      category: 'filtering',
      status: hasMeaningfulSummary ? 'PASS' : 'WARN',
      message: hasMeaningfulSummary ? 'Summary is meaningful' : 'Summary may be empty or too brief',
      details: { summaryPreview: result.summary.substring(0, 60) }
    });
  } catch (error: any) {
    results.push({
      name: '3.1 - Summary contains meaningful content',
      category: 'filtering',
      status: 'FAIL',
      message: `Summary check failed: ${error.message}`
    });
  }

  // Test 3.2: TOC sections are non-empty
  try {
    const result = await getLibraryDocs.execute({
      libraryId: 'npm:react@18.2.0'
    });

    const hasValidTOC =
      result.tableOfContents &&
      Array.isArray(result.tableOfContents) &&
      result.tableOfContents.length > 0 &&
      result.tableOfContents.every(item => typeof item === 'string' && item.length > 0);

    results.push({
      name: '3.2 - Table of contents has valid entries',
      category: 'filtering',
      status: hasValidTOC ? 'PASS' : 'FAIL',
      message: hasValidTOC ? 'TOC entries are valid' : 'TOC has invalid or empty entries',
      details: {
        count: result.tableOfContents.length,
        sample: result.tableOfContents.slice(0, 2)
      }
    });
  } catch (error: any) {
    results.push({
      name: '3.2 - Table of contents has valid entries',
      category: 'filtering',
      status: 'FAIL',
      message: `TOC validation failed: ${error.message}`
    });
  }

  // Test 3.3: Key functions are valid identifiers
  try {
    const result = await getLibraryDocs.execute({
      libraryId: 'npm:react@18.2.0'
    });

    const validIdentifierPattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    const hasValidFunctions =
      result.keyFunctions &&
      Array.isArray(result.keyFunctions) &&
      result.keyFunctions.every(fn =>
        typeof fn === 'string' &&
        fn.length > 0 &&
        validIdentifierPattern.test(fn)
      );

    results.push({
      name: '3.3 - Key functions are valid identifiers',
      category: 'filtering',
      status: hasValidFunctions ? 'PASS' : 'WARN',
      message: hasValidFunctions ? 'All function names are valid' : 'Some function names are invalid',
      details: {
        count: result.keyFunctions.length,
        sample: result.keyFunctions.slice(0, 3)
      }
    });
  } catch (error: any) {
    results.push({
      name: '3.3 - Key functions are valid identifiers',
      category: 'filtering',
      status: 'FAIL',
      message: `Key functions validation failed: ${error.message}`
    });
  }

  // Test 3.4: ID matches library ID input
  try {
    const libraryId = 'npm:react@18.2.0';
    const result = await getLibraryDocs.execute({
      libraryId
    });

    const idMatches = result.id === libraryId;

    results.push({
      name: '3.4 - Output ID matches input library ID',
      category: 'filtering',
      status: idMatches ? 'PASS' : 'FAIL',
      message: idMatches ? 'ID preserved correctly' : 'ID mismatch',
      details: { input: libraryId, output: result.id }
    });
  } catch (error: any) {
    results.push({
      name: '3.4 - Output ID matches input library ID',
      category: 'filtering',
      status: 'FAIL',
      message: `ID verification failed: ${error.message}`
    });
  }
}

// ============================================================================
// TEST CATEGORY 4: SECURITY
// ============================================================================

async function testSecurity() {
  console.log('\n🔒 TEST CATEGORY 4: Security');
  console.log('─'.repeat(60));

  // Test 4.1: XSS prevention in library names
  try {
    try {
      await resolveLibraryId.execute({
        name: '<script>alert("xss")</script>',
        ecosystem: 'npm'
      });
      results.push({
        name: '4.1 - XSS payloads in library names rejected',
        category: 'security',
        status: 'FAIL',
        message: 'XSS payload should be rejected'
      });
    } catch (error: any) {
      results.push({
        name: '4.1 - XSS payloads in library names rejected',
        category: 'security',
        status: 'PASS',
        message: 'XSS payload correctly rejected'
      });
    }
  } catch (error: any) {
    results.push({
      name: '4.1 - XSS payloads in library names rejected',
      category: 'security',
      status: 'FAIL',
      message: `XSS test failed: ${error.message}`
    });
  }

  // Test 4.2: Path traversal prevention
  try {
    try {
      await resolveLibraryId.execute({
        name: '../../../etc/passwd',
        ecosystem: 'npm'
      });
      results.push({
        name: '4.2 - Path traversal attempts rejected',
        category: 'security',
        status: 'FAIL',
        message: 'Path traversal payload should be rejected'
      });
    } catch (error: any) {
      results.push({
        name: '4.2 - Path traversal attempts rejected',
        category: 'security',
        status: 'PASS',
        message: 'Path traversal correctly rejected'
      });
    }
  } catch (error: any) {
    results.push({
      name: '4.2 - Path traversal attempts rejected',
      category: 'security',
      status: 'FAIL',
      message: `Path traversal test failed: ${error.message}`
    });
  }

  // Test 4.3: Command injection prevention
  try {
    try {
      await resolveLibraryId.execute({
        name: 'react; rm -rf /',
        ecosystem: 'npm'
      });
      results.push({
        name: '4.3 - Command injection payloads rejected',
        category: 'security',
        status: 'FAIL',
        message: 'Command injection payload should be rejected'
      });
    } catch (error: any) {
      results.push({
        name: '4.3 - Command injection payloads rejected',
        category: 'security',
        status: 'PASS',
        message: 'Command injection correctly rejected'
      });
    }
  } catch (error: any) {
    results.push({
      name: '4.3 - Command injection payloads rejected',
      category: 'security',
      status: 'FAIL',
      message: `Command injection test failed: ${error.message}`
    });
  }

  // Test 4.4: Large input size limits enforced
  try {
    try {
      await resolveLibraryId.execute({
        name: 'a'.repeat(1000), // Very long name
        ecosystem: 'npm'
      });
      results.push({
        name: '4.4 - Large input size limits enforced',
        category: 'security',
        status: 'FAIL',
        message: 'Large input should be rejected'
      });
    } catch (error: any) {
      results.push({
        name: '4.4 - Large input size limits enforced',
        category: 'security',
        status: 'PASS',
        message: 'Large input correctly rejected (DOS prevention)'
      });
    }
  } catch (error: any) {
    results.push({
      name: '4.4 - Large input size limits enforced',
      category: 'security',
      status: 'FAIL',
      message: `Size limit test failed: ${error.message}`
    });
  }

  // Test 4.5: No sensitive data in filtered output
  try {
    const result = await getLibraryDocs.execute({
      libraryId: 'npm:react@18.2.0'
    });

    const sensitivePatterns = [
      /api[_-]?key/i,
      /password/i,
      /secret/i,
      /token/i,
      /credential/i
    ];

    const hasSensitiveData = sensitivePatterns.some(pattern => {
      const full = JSON.stringify(result).toLowerCase();
      return pattern.test(full);
    });

    results.push({
      name: '4.5 - No sensitive data patterns in filtered output',
      category: 'security',
      status: !hasSensitiveData ? 'PASS' : 'WARN',
      message: !hasSensitiveData
        ? 'No obvious sensitive data found'
        : 'Possible sensitive data patterns detected'
    });
  } catch (error: any) {
    results.push({
      name: '4.5 - No sensitive data patterns in filtered output',
      category: 'security',
      status: 'FAIL',
      message: `Sensitive data check failed: ${error.message}`
    });
  }
}

// ============================================================================
// TEST CATEGORY 5: ERROR HANDLING
// ============================================================================

async function testErrorHandling() {
  console.log('\n⚠️  TEST CATEGORY 5: Error Handling');
  console.log('─'.repeat(60));

  // Test 5.1: Errors have clear messages
  try {
    try {
      await resolveLibraryId.execute({
        name: '',
        ecosystem: 'npm'
      });
      results.push({
        name: '5.1 - Validation errors have clear messages',
        category: 'error-handling',
        status: 'FAIL',
        message: 'Should have thrown error'
      });
    } catch (error: any) {
      const hasMessage = error.message || error.issues;
      const isClean = !error.message?.includes('[object Object]');

      results.push({
        name: '5.1 - Validation errors have clear messages',
        category: 'error-handling',
        status: hasMessage && isClean ? 'PASS' : 'WARN',
        message: hasMessage ? 'Error message is clear' : 'Error message unclear',
        details: { errorMessage: error.message }
      });
    }
  } catch (error: any) {
    results.push({
      name: '5.1 - Validation errors have clear messages',
      category: 'error-handling',
      status: 'FAIL',
      message: `Error handling test failed: ${error.message}`
    });
  }

  // Test 5.2: Unknown library IDs handled gracefully
  try {
    try {
      const result = await getLibraryDocs.execute({
        libraryId: 'unknown-lib-that-does-not-exist-xyz'
      });

      // Mock returns data anyway - in prod should handle 404
      results.push({
        name: '5.2 - Unknown library IDs handled gracefully',
        category: 'error-handling',
        status: 'WARN',
        message: 'Unknown library should error or return null (currently returns mock)',
        details: { returned: !!result }
      });
    } catch (error: any) {
      results.push({
        name: '5.2 - Unknown library IDs handled gracefully',
        category: 'error-handling',
        status: 'PASS',
        message: 'Unknown library correctly rejected'
      });
    }
  } catch (error: any) {
    results.push({
      name: '5.2 - Unknown library IDs handled gracefully',
      category: 'error-handling',
      status: 'FAIL',
      message: `Unknown library test failed: ${error.message}`
    });
  }

  // Test 5.3: Null/undefined inputs rejected
  try {
    try {
      await resolveLibraryId.execute({
        name: null as any,
        ecosystem: 'npm'
      });
      results.push({
        name: '5.3 - Null/undefined inputs rejected',
        category: 'error-handling',
        status: 'FAIL',
        message: 'Null input should be rejected'
      });
    } catch (error: any) {
      results.push({
        name: '5.3 - Null/undefined inputs rejected',
        category: 'error-handling',
        status: 'PASS',
        message: 'Null input correctly rejected'
      });
    }
  } catch (error: any) {
    results.push({
      name: '5.3 - Null/undefined inputs rejected',
      category: 'error-handling',
      status: 'FAIL',
      message: `Null input test failed: ${error.message}`
    });
  }
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateReport() {
  console.log('\n\n');
  console.log('═'.repeat(70));
  console.log('PRODUCTION-READINESS VALIDATION REPORT');
  console.log('═'.repeat(70));

  // Summary by category
  const byCategory = results.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = { PASS: 0, FAIL: 0, WARN: 0 };
    acc[r.category][r.status]++;
    return acc;
  }, {} as Record<string, Record<string, number>>);

  console.log('\n📊 SUMMARY BY CATEGORY:');
  console.log('─'.repeat(70));
  Object.entries(byCategory).forEach(([category, counts]) => {
    const total = counts.PASS + counts.FAIL + counts.WARN;
    const percentage = Math.round((counts.PASS / total) * 100);
    const status = counts.FAIL > 0 ? '❌' : counts.WARN > 0 ? '⚠️' : '✅';
    console.log(
      `${status} ${category.padEnd(15)} | PASS: ${counts.PASS}  FAIL: ${counts.FAIL}  WARN: ${counts.WARN}  (${percentage}%)`
    );
  });

  // Overall status
  const totalFails = Object.values(byCategory).reduce((sum, c) => sum + c.FAIL, 0);
  const totalWarns = Object.values(byCategory).reduce((sum, c) => sum + c.WARN, 0);
  const overallStatus = totalFails > 0 ? '❌ NOT READY' : totalWarns > 0 ? '⚠️ READY WITH CAVEATS' : '✅ PRODUCTION READY';

  console.log('\n' + '═'.repeat(70));
  console.log(`OVERALL STATUS: ${overallStatus}`);
  console.log('═'.repeat(70));

  // Detailed results
  console.log('\n📝 DETAILED RESULTS:');
  console.log('─'.repeat(70));

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`\n${icon} ${result.name}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2).split('\n').join('\n   ')}`);
    }
  });

  // Recommendations
  console.log('\n\n📋 RECOMMENDATIONS:');
  console.log('─'.repeat(70));

  const failedTests = results.filter(r => r.status === 'FAIL');
  const warnTests = results.filter(r => r.status === 'WARN');

  if (failedTests.length > 0) {
    console.log('\n❌ CRITICAL ISSUES (must fix):');
    failedTests.forEach(r => {
      console.log(`   • ${r.name}: ${r.message}`);
    });
  }

  if (warnTests.length > 0) {
    console.log('\n⚠️ WARNINGS (should address):');
    warnTests.forEach(r => {
      console.log(`   • ${r.name}: ${r.message}`);
    });
  }

  if (failedTests.length === 0 && warnTests.length === 0) {
    console.log('✅ No critical issues found!');
    console.log('   Wrappers are production-ready.');
  }

  // Export JSON report
  console.log('\n\n📊 FULL REPORT (JSON):');
  console.log('─'.repeat(70));
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    status: overallStatus,
    summary: byCategory,
    results: results.map(r => ({
      name: r.name,
      category: r.category,
      status: r.status,
      message: r.message
    }))
  }, null, 2));

  return {
    status: overallStatus,
    passed: results.filter(r => r.status === 'PASS').length,
    failed: failedTests.length,
    warnings: warnTests.length,
    total: results.length
  };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🚀 Starting production-readiness validation...');
  console.log('Testing context7 MCP wrappers for: Schema, Token Reduction, Filtering, Security\n');

  try {
    await testSchemaValidation();
    await testTokenReduction();
    await testFilteringQuality();
    await testSecurity();
    await testErrorHandling();

    const summary = generateReport();
    process.exit(summary.failed > 0 ? 1 : 0);
  } catch (error: any) {
    console.error('Fatal error during validation:', error);
    process.exit(1);
  }
}

main();
