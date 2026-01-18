/**
 * Quick test to verify Serena connection pooling works
 */
import { getSerenaPool } from '../config/lib/serena-pool.js';

const serenaPool = getSerenaPool();

async function testPool() {
  console.log('=== Serena Connection Pool Test ===\n');

  const env: Record<string, string> = {};
  const chariotPath = '/Users/nathansportsman/chariot-development-platform/modules/chariot';
  const cliPath = '/Users/nathansportsman/chariot-development-platform/modules/praetorian-cli';

  // Test 1: First acquisition (cold start)
  console.log('Test 1: First acquisition (cold start expected)...');
  const start1 = Date.now();
  try {
    const client1 = await serenaPool.acquire('chariot', chariotPath, env);
    const time1 = Date.now() - start1;
    console.log(`✓ First acquire: ${time1}ms`);
    console.log(`  Stats:`, serenaPool.stats());
    serenaPool.release();
  } catch (e: any) {
    console.log(`✗ First acquire failed: ${e.message}`);
    return;
  }

  // Test 2: Second acquisition (should be fast - reuse)
  console.log('\nTest 2: Second acquisition (should be fast)...');
  const start2 = Date.now();
  try {
    const client2 = await serenaPool.acquire('chariot', chariotPath, env);
    const time2 = Date.now() - start2;
    console.log(`✓ Second acquire: ${time2}ms ${time2 < 100 ? '(POOLED!)' : '(not pooled?)'}`);
    console.log(`  Stats:`, serenaPool.stats());
    serenaPool.release();
  } catch (e: any) {
    console.log(`✗ Second acquire failed: ${e.message}`);
  }

  // Test 3: Different module (should kill and respawn)
  console.log('\nTest 3: Different module (should kill and respawn)...');
  const start3 = Date.now();
  try {
    const client3 = await serenaPool.acquire('praetorian-cli', cliPath, env);
    const time3 = Date.now() - start3;
    console.log(`✓ Module switch: ${time3}ms`);
    console.log(`  Stats:`, serenaPool.stats());
    serenaPool.release();
  } catch (e: any) {
    console.log(`✗ Module switch failed: ${e.message}`);
  }

  // Cleanup
  console.log('\nCleaning up...');
  await serenaPool.dispose();
  console.log('Done!');
}

testPool().catch(console.error);
