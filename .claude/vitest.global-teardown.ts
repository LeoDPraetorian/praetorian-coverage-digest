// vitest.global-teardown.ts
import { resetSerenaPoolForTesting } from './tools/config/lib/serena-pool';

export default async function globalTeardown() {
  console.log('[Vitest] Running global teardown...');
  await resetSerenaPoolForTesting();
  console.log('[Vitest] Pool cleanup complete');
}
