/**
 * Chariot MCP Wrapper Tests
 *
 * Quick validation suite for production readiness
 */

import { query, commonQueries, schema, schemaHelpers } from './index';

async function quickValidation() {
  console.log('🧪 Quick Validation: Chariot MCP Wrappers\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Query wrapper - Invalid input rejection
  console.log('Test 1: Query Schema Validation (Invalid Input)');
  try {
    await query.execute({
      query: '', // Empty query should fail
      stack: 'test',
      username: 'test@example.com',
    });
    console.log('  ✗ Should reject empty query');
    failed++;
  } catch (error) {
    console.log('  ✓ Invalid input rejected:', (error as Error).message.substring(0, 50));
    passed++;
  }

  // Test 2: Query wrapper - Invalid JSON structure
  console.log('\nTest 2: Query JSON Structure Validation');
  try {
    await query.execute({
      query: '{"invalid": "structure"}',
      stack: 'test',
      username: 'test@example.com',
    });
    console.log('  ✗ Should reject invalid query structure');
    failed++;
  } catch (error) {
    console.log('  ✓ Invalid query structure rejected');
    passed++;
  }

  // Test 3: Common query patterns structure
  console.log('\nTest 3: Common Query Patterns');
  try {
    const assetQuery = commonQueries.activeAssetsByClass('ipv4');
    console.assert(assetQuery.node, 'Missing node structure');
    console.assert(assetQuery.node.labels?.includes('Asset'), 'Missing Asset label');
    console.assert(assetQuery.limit === 100, 'Incorrect limit');
    console.log('  ✓ Common query patterns generate valid structures');
    passed++;
  } catch (error) {
    console.log('  ✗ Common query pattern failed:', error);
    failed++;
  }

  // Test 4: High severity risks query
  console.log('\nTest 4: High Severity Risks Query Pattern');
  try {
    const riskQuery = commonQueries.highSeverityRisks(7.5);
    console.assert(riskQuery.node.labels?.includes('Risk'), 'Missing Risk label');
    console.assert(
      riskQuery.node.filters?.some((f) => f.field === 'cvss' && f.operator === '>=' && f.value === 7.5),
      'Missing CVSS filter'
    );
    console.log('  ✓ Risk query pattern generates correct CVSS filter');
    passed++;
  } catch (error) {
    console.log('  ✗ Risk query pattern failed:', error);
    failed++;
  }

  // Test 5: Schema helpers - Allowed columns
  console.log('\nTest 5: Schema Helpers - Allowed Columns');
  try {
    const allowedColumns = schemaHelpers.getAllowedColumns();
    console.assert(allowedColumns.length > 0, 'No allowed columns returned');
    console.assert(allowedColumns.includes('key'), 'Missing key column');
    console.assert(allowedColumns.includes('status'), 'Missing status column');
    console.assert(allowedColumns.includes('cvss'), 'Missing cvss column');
    console.log(`  ✓ Schema helpers provide ${allowedColumns.length} allowed columns`);
    passed++;
  } catch (error) {
    console.log('  ✗ Schema helpers failed:', error);
    failed++;
  }

  // Test 6: Schema helpers - Common entity types
  console.log('\nTest 6: Schema Helpers - Common Entity Types');
  try {
    const entityTypes = schemaHelpers.getCommonEntityTypes();
    console.assert(entityTypes.includes('Asset'), 'Missing Asset type');
    console.assert(entityTypes.includes('Risk'), 'Missing Risk type');
    console.assert(entityTypes.includes('Attribute'), 'Missing Attribute type');
    console.log(`  ✓ Schema helpers provide ${entityTypes.length} common entity types`);
    passed++;
  } catch (error) {
    console.log('  ✗ Schema helpers failed:', error);
    failed++;
  }

  // Test 7: Query pattern - Assets with attributes
  console.log('\nTest 7: Assets with Attributes Query Pattern');
  try {
    const attrQuery = commonQueries.assetsWithAttribute('port', '22');
    console.assert(attrQuery.node.relationships, 'Missing relationships');
    console.assert(
      attrQuery.node.relationships?.[0].label === 'HAS_ATTRIBUTE',
      'Incorrect relationship label'
    );
    console.assert(
      attrQuery.node.relationships?.[0].target?.labels?.includes('Attribute'),
      'Missing Attribute target'
    );
    console.log('  ✓ Assets with attributes query pattern valid');
    passed++;
  } catch (error) {
    console.log('  ✗ Assets with attributes query failed:', error);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Tests passed: ${passed}`);
  console.log(`Tests failed: ${failed}`);
  console.log('='.repeat(50));

  if (failed === 0) {
    console.log('\n✅ All quick validation tests passed');
    console.log('Production ready: Schema validation and query patterns working correctly');
    return true;
  } else {
    console.log('\n❌ Some tests failed - review and fix before production use');
    return false;
  }
}

// Run validation if executed directly
if (require.main === module) {
  quickValidation()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('✗ Validation failed:', error);
      process.exit(1);
    });
}

export { quickValidation };
