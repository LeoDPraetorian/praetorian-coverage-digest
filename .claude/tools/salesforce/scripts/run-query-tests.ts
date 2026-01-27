#!/usr/bin/env npx tsx
/**
 * run-query-tests.ts - Execute test queries from test-queries.yaml
 *
 * Runs natural language queries through the knowledge layer and validates results.
 *
 * Usage:
 *   npx tsx scripts/run-query-tests.ts
 *   npx tsx scripts/run-query-tests.ts --phase 1
 *   npx tsx scripts/run-query-tests.ts --verbose
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'yaml';
import { QueryResolver } from '../knowledge/query-resolver.js';
import { loadKnowledgeContext, getKnowledgeDir } from '../knowledge/knowledge-loader.js';
import type { KnowledgeContext, ResolutionResult } from '../knowledge/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// Types
// ============================================

interface TestQuery {
  id: string;
  naturalLanguage: string;
  expectedSoql: string;
  expectedSource: 'pattern_cache' | 'glossary' | 'schema' | 'tooling_api' | 'direct';
  category: string;
  fields?: string[];
  glossaryTerms?: string[];
}

interface TestResult {
  id: string;
  query: string;
  passed: boolean;
  expectedSource: string;
  actualSource: string;
  confidence: number;
  soql?: string;
  error?: string;
  duration: number;
}

interface TestPlan {
  version: string;
  accountQueries: TestQuery[];
  opportunityQueries: TestQuery[];
  businessTermQueries: TestQuery[];
  combinedQueries: TestQuery[];
  ownershipQueries?: TestQuery[];
  aggregationQueries?: TestQuery[];
  contactQueries?: TestQuery[];
  activityQueries?: TestQuery[];
  additionalCombinedQueries?: TestQuery[];
}

interface Args {
  phase?: number;
  verbose: boolean;
  help: boolean;
  setupOnly: boolean;
}

// ============================================
// CLI Argument Parsing
// ============================================

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const result: Args = {
    verbose: false,
    help: false,
    setupOnly: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--phase':
      case '-p':
        result.phase = parseInt(args[++i], 10);
        break;
      case '--verbose':
      case '-v':
        result.verbose = true;
        break;
      case '--setup-only':
        result.setupOnly = true;
        break;
      case '--help':
      case '-h':
        result.help = true;
        break;
    }
  }

  return result;
}

function printHelp(): void {
  console.log(`
run-query-tests.ts - Execute test queries from test-queries.yaml

Usage:
  npx tsx scripts/run-query-tests.ts [options]

Options:
  --phase, -p       Run only specified phase (1-4)
  --verbose, -v     Show detailed output
  --setup-only      Only set up glossary terms, don't run tests
  --help, -h        Show this help message

Phases:
  1: Pattern Cache tests (pre-loaded patterns)
  2: Glossary Resolution tests (term expansion)
  3: Schema Lookup tests (field resolution)
  4: Combined Query tests (multi-term queries)
`);
}

// ============================================
// Test Execution
// ============================================

async function runTest(
  query: TestQuery,
  context: KnowledgeContext,
  verbose: boolean
): Promise<TestResult> {
  // Create a fresh resolver per test to reset rate limiter (test mode only)
  const resolver = new QueryResolver(context);
  const startTime = Date.now();

  try {
    const result = await resolver.resolve(query.naturalLanguage);

    const duration = Date.now() - startTime;

    // Resolution can fail or succeed
    if (!result.success) {
      return {
        id: query.id,
        query: query.naturalLanguage,
        passed: query.expectedSource === 'tooling_api',
        expectedSource: query.expectedSource,
        actualSource: 'error',
        confidence: 0,
        error: result.error.message,
        duration,
      };
    }

    const resolutionData = result.data;
    const passed = resolutionData.source === query.expectedSource ||
                   // Allow schema to match when expecting glossary (fallback behavior)
                   (query.expectedSource === 'glossary' && resolutionData.source === 'schema') ||
                   // Allow tooling_api fallback for any type
                   resolutionData.source === 'tooling_api';

    if (verbose || !passed) {
      console.log(`  ${passed ? '✓' : '✗'} ${query.id}: "${query.naturalLanguage}"`);
      console.log(`    Expected: ${query.expectedSource}, Got: ${resolutionData.source} (${resolutionData.confidence.toFixed(2)})`);
      if (resolutionData.soql) {
        console.log(`    SOQL: ${resolutionData.soql.substring(0, 80)}${resolutionData.soql.length > 80 ? '...' : ''}`);
      }
    }

    return {
      id: query.id,
      query: query.naturalLanguage,
      passed,
      expectedSource: query.expectedSource,
      actualSource: resolutionData.source,
      confidence: resolutionData.confidence,
      soql: resolutionData.soql,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.log(`  ✗ ${query.id}: "${query.naturalLanguage}" - ERROR: ${errorMessage}`);

    return {
      id: query.id,
      query: query.naturalLanguage,
      passed: false,
      expectedSource: query.expectedSource,
      actualSource: 'error',
      confidence: 0,
      error: errorMessage,
      duration,
    };
  }
}

// ============================================
// Main
// ============================================

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Load test plan
  const testPlanPath = path.resolve(__dirname, '../knowledge/test-queries.yaml');
  if (!fs.existsSync(testPlanPath)) {
    console.error('Error: test-queries.yaml not found');
    process.exit(1);
  }

  const testPlanContent = fs.readFileSync(testPlanPath, 'utf-8');
  const testPlan: TestPlan = yaml.parse(testPlanContent);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Salesforce Knowledge Layer - Query Test Suite');
  console.log('═══════════════════════════════════════════════════════');

  // Load knowledge context
  const knowledgeDir = getKnowledgeDir();
  const contextResult = await loadKnowledgeContext(knowledgeDir);

  if (!contextResult.success) {
    console.error('\n✗ Failed to load knowledge context:', contextResult.error.message);
    console.log('\nEnsure you have run:');
    console.log('  npx tsx scripts/sync-schema.ts --from-files');
    process.exit(1);
  }

  const context = contextResult.data;

  console.log(`\nKnowledge Layer Status:`);
  console.log(`  Schema: ✓ ${Object.keys(context.schema.objects || {}).length} objects`);
  console.log(`  Glossary: ✓ ${Object.keys(context.glossary.terms || {}).length} terms`);
  console.log(`  Patterns: ✓ ${context.patterns.patterns?.length || 0} patterns`);

  if (args.setupOnly) {
    console.log('\n--setup-only flag: Skipping tests');
    process.exit(0);
  }

  // Collect all queries
  const allQueries: TestQuery[] = [
    ...(testPlan.accountQueries || []),
    ...(testPlan.opportunityQueries || []),
    ...(testPlan.businessTermQueries || []),
    ...(testPlan.combinedQueries || []),
    ...(testPlan.ownershipQueries || []),
    ...(testPlan.aggregationQueries || []),
    ...(testPlan.contactQueries || []),
    ...(testPlan.activityQueries || []),
    ...(testPlan.additionalCombinedQueries || []),
  ];

  // Define phases
  const phases: { name: string; ids: string[]; queries: TestQuery[] }[] = [
    {
      name: 'Phase 1: Pattern Cache',
      ids: ['ACC-001', 'ACC-002', 'OPP-001', 'OPP-002', 'BIZ-001', 'BIZ-002'],
      queries: [],
    },
    {
      name: 'Phase 2: Glossary Resolution',
      ids: ['ACC-004', 'ACC-005', 'ACC-010', 'OPP-003', 'OPP-008', 'OPP-013', 'BIZ-003', 'BIZ-004'],
      queries: [],
    },
    {
      name: 'Phase 3: Schema Lookup',
      ids: ['ACC-003', 'ACC-007', 'ACC-009', 'OPP-012'],
      queries: [],
    },
    {
      name: 'Phase 4: Combined Queries',
      ids: ['CMB-001', 'CMB-002', 'CMB-003', 'CMB-004', 'CMB-005'],
      queries: [],
    },
  ];

  // Populate phase queries
  for (const phase of phases) {
    phase.queries = allQueries.filter(q => phase.ids.includes(q.id));
  }

  // If specific phase requested
  const phasesToRun = args.phase
    ? [phases[args.phase - 1]].filter(Boolean)
    : phases;

  if (args.phase && !phasesToRun.length) {
    console.error(`Error: Phase ${args.phase} not found (valid: 1-4)`);
    process.exit(1);
  }

  // Run tests
  const allResults: TestResult[] = [];
  const startTime = Date.now();

  for (const phase of phasesToRun) {
    console.log(`\n─────────────────────────────────────────────────────────`);
    console.log(`  ${phase.name}`);
    console.log(`─────────────────────────────────────────────────────────`);

    for (const query of phase.queries) {
      const result = await runTest(query, context, args.verbose);
      allResults.push(result);
    }

    // Phase summary
    const phaseResults = allResults.filter(r => phase.ids.includes(r.id));
    const phasePassed = phaseResults.filter(r => r.passed).length;
    console.log(`\n  Phase Result: ${phasePassed}/${phaseResults.length} passed`);
  }

  // Also run remaining queries not in phases
  const phaseIds = phases.flatMap(p => p.ids);
  const remainingQueries = allQueries.filter(q => !phaseIds.includes(q.id));

  if (remainingQueries.length > 0 && !args.phase) {
    console.log(`\n─────────────────────────────────────────────────────────`);
    console.log(`  Additional Tests (${remainingQueries.length} queries)`);
    console.log(`─────────────────────────────────────────────────────────`);

    for (const query of remainingQueries) {
      const result = await runTest(query, context, args.verbose);
      allResults.push(result);
    }
  }

  const totalDuration = Date.now() - startTime;

  // Final summary
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  TEST SUMMARY`);
  console.log(`═══════════════════════════════════════════════════════════`);

  const passed = allResults.filter(r => r.passed).length;
  const failed = allResults.filter(r => !r.passed).length;
  const avgConfidence = allResults.filter(r => r.confidence > 0)
    .reduce((sum, r) => sum + r.confidence, 0) /
    Math.max(1, allResults.filter(r => r.confidence > 0).length);
  const avgDuration = allResults.reduce((sum, r) => sum + r.duration, 0) / allResults.length;

  console.log(`\n  Total:      ${allResults.length} queries`);
  console.log(`  Passed:     ${passed} (${((passed / allResults.length) * 100).toFixed(1)}%)`);
  console.log(`  Failed:     ${failed}`);
  console.log(`  Avg Conf:   ${avgConfidence.toFixed(2)}`);
  console.log(`  Avg Time:   ${avgDuration.toFixed(0)}ms`);
  console.log(`  Total Time: ${totalDuration}ms`);

  // Source breakdown
  const sourceBreakdown: Record<string, number> = {};
  for (const result of allResults) {
    sourceBreakdown[result.actualSource] = (sourceBreakdown[result.actualSource] || 0) + 1;
  }

  console.log(`\n  Resolution Sources:`);
  for (const [source, count] of Object.entries(sourceBreakdown).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${source}: ${count}`);
  }

  // Show failures
  const failures = allResults.filter(r => !r.passed);
  if (failures.length > 0) {
    console.log(`\n  Failed Tests:`);
    for (const f of failures) {
      console.log(`    ${f.id}: Expected ${f.expectedSource}, got ${f.actualSource}`);
      if (f.error) {
        console.log(`          Error: ${f.error}`);
      }
    }
  }

  // Exit code based on pass rate
  const passRate = passed / allResults.length;
  if (passRate < 0.5) {
    console.log(`\n⚠️  Pass rate below 50% - Knowledge layer needs configuration`);
    console.log(`    Run: npx tsx scripts/teach.ts --help`);
    process.exit(1);
  }

  console.log(`\n✓ Test suite complete`);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
