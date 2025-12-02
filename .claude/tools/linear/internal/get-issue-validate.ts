/**
 * Validation script for Linear get-issue wrapper
 *
 * Tests the fixed schema with CHARIOT-1516
 *
 * Usage:
 *   npx tsx .claude/tools/linear/get-issue-validate.ts
 */

import { getIssue } from '../get-issue';

async function validateWrapper() {
  console.log('🧪 Validating Linear get-issue wrapper\n');
  console.log('='.repeat(60));

  const testCases = [
    { id: 'CHARIOT-1516', description: 'Normal case - typical issue with priority' },
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.description}`);
    console.log(`   ID: ${testCase.id}`);
    console.log('-'.repeat(60));

    try {
      const result = await getIssue.execute({ id: testCase.id });

      console.log('✅ PASSED - No schema validation errors');
      console.log('   Result preview:');
      console.log(`   - ID: ${result.id}`);
      console.log(`   - Identifier: ${result.identifier}`);
      console.log(`   - Title: ${result.title}`);

      if (result.priority) {
        console.log(`   - Priority: ${result.priority.name} (value: ${result.priority.value})`);
      } else {
        console.log(`   - Priority: not set`);
      }

      if (result.estimate) {
        console.log(`   - Estimate: ${result.estimate.name} (value: ${result.estimate.value})`);
      }

      if (result.assignee) {
        console.log(`   - Assignee: ${result.assignee}`);
      } else {
        console.log(`   - Assignee: unassigned`);
      }

      if (result.state) {
        console.log(`   - State: ${result.state.name}`);
      }

      console.log(`   - Branch: ${result.branchName || 'none'}`);

      passed++;
    } catch (error) {
      console.error('❌ FAILED');
      if (error instanceof Error) {
        console.error(`   Error: ${error.message}`);
        if (error.stack) {
          console.error(`   Stack:\n${error.stack.split('\n').slice(0, 5).join('\n')}`);
        }
      } else {
        console.error(`   Error:`, error);
      }
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 VALIDATION RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Total: ${testCases.length}`);

  if (failed > 0) {
    console.log('\n❌ Validation failed - schema needs further fixes');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed - schema is correct!');
    process.exit(0);
  }
}

// Run validation
validateWrapper().catch(error => {
  console.error('Validation script failed:', error);
  process.exit(1);
});
