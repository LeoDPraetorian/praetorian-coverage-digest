#!/usr/bin/env npx tsx
/**
 * prune-patterns.ts - Clean up Salesforce knowledge pattern cache
 *
 * Remove low-confidence patterns, old patterns, or patterns with low usage.
 *
 * Usage:
 *   npx tsx scripts/prune-patterns.ts --min-confidence 0.7
 *   npx tsx scripts/prune-patterns.ts --min-usage 3
 *   npx tsx scripts/prune-patterns.ts --max-age 30
 *   npx tsx scripts/prune-patterns.ts --dry-run
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import type { PatternKnowledge, QueryPattern } from '../knowledge/types.js';
import { loadPatternCache, savePatternCache, getKnowledgeDir } from '../knowledge/knowledge-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// CLI Argument Parsing
// ============================================

interface Args {
  minConfidence?: number;
  minUsage?: number;
  maxAgeDays?: number;
  dryRun: boolean;
  verbose: boolean;
  help: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const result: Args = {
    dryRun: false,
    verbose: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--min-confidence':
      case '-c':
        result.minConfidence = parseFloat(args[++i]);
        break;
      case '--min-usage':
      case '-u':
        result.minUsage = parseInt(args[++i], 10);
        break;
      case '--max-age':
      case '-a':
        result.maxAgeDays = parseInt(args[++i], 10);
        break;
      case '--dry-run':
      case '-n':
        result.dryRun = true;
        break;
      case '--verbose':
      case '-v':
        result.verbose = true;
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
prune-patterns.ts - Clean up Salesforce knowledge pattern cache

Usage:
  npx tsx scripts/prune-patterns.ts [options]

Options:
  --min-confidence, -c  Remove patterns below this confidence (0.0-1.0)
  --min-usage, -u       Remove patterns used fewer than N times
  --max-age, -a         Remove patterns not used in N days
  --dry-run, -n         Show what would be removed without making changes
  --verbose, -v         Show detailed output
  --help, -h            Show this help message

Examples:
  # Remove low-confidence patterns
  npx tsx scripts/prune-patterns.ts --min-confidence 0.7

  # Remove rarely used patterns
  npx tsx scripts/prune-patterns.ts --min-usage 3

  # Remove patterns older than 30 days
  npx tsx scripts/prune-patterns.ts --max-age 30

  # Combine criteria (all must be met to keep)
  npx tsx scripts/prune-patterns.ts --min-confidence 0.6 --min-usage 2 --max-age 60

  # Preview what would be removed
  npx tsx scripts/prune-patterns.ts --min-confidence 0.8 --dry-run --verbose

Note: If no criteria are specified, nothing will be removed.
Multiple criteria use AND logic - a pattern must meet ALL criteria to be kept.
`);
}

// ============================================
// Pattern Evaluation
// ============================================

interface PruneReason {
  pattern: QueryPattern;
  reasons: string[];
}

function evaluatePatterns(
  patterns: QueryPattern[],
  args: Args,
): { keep: QueryPattern[]; prune: PruneReason[] } {
  const keep: QueryPattern[] = [];
  const prune: PruneReason[] = [];

  const now = Date.now();
  const maxAgeMs = args.maxAgeDays ? args.maxAgeDays * 24 * 60 * 60 * 1000 : undefined;

  for (const pattern of patterns) {
    const reasons: string[] = [];

    // Check confidence
    if (args.minConfidence !== undefined && pattern.confidence < args.minConfidence) {
      reasons.push(`confidence ${pattern.confidence.toFixed(2)} < ${args.minConfidence}`);
    }

    // Check usage count
    if (args.minUsage !== undefined && pattern.useCount < args.minUsage) {
      reasons.push(`usage ${pattern.useCount} < ${args.minUsage}`);
    }

    // Check age
    if (maxAgeMs !== undefined) {
      const lastUsedTime = new Date(pattern.lastUsed).getTime();
      const ageMs = now - lastUsedTime;
      if (ageMs > maxAgeMs) {
        const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
        reasons.push(`last used ${ageDays} days ago > ${args.maxAgeDays}`);
      }
    }

    if (reasons.length > 0) {
      prune.push({ pattern, reasons });
    } else {
      keep.push(pattern);
    }
  }

  return { keep, prune };
}

/**
 * Rebuild the query index based on remaining patterns
 */
function rebuildQueryIndex(patterns: QueryPattern[]): Record<string, string[]> {
  const index: Record<string, string[]> = {};

  for (const pattern of patterns) {
    // Index by glossary terms used
    for (const term of pattern.glossaryTermsUsed) {
      const key = term.toLowerCase();
      if (!index[key]) index[key] = [];
      if (!index[key].includes(pattern.id)) {
        index[key].push(pattern.id);
      }
    }

    // Index by normalized query words
    const words = pattern.normalizedQuery.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 2) {
        // Skip short words
        if (!index[word]) index[word] = [];
        if (!index[word].includes(pattern.id)) {
          index[word].push(pattern.id);
        }
      }
    }
  }

  return index;
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

  // Check if any criteria specified
  if (
    args.minConfidence === undefined &&
    args.minUsage === undefined &&
    args.maxAgeDays === undefined
  ) {
    console.log('No pruning criteria specified. Use --help to see options.');
    process.exit(0);
  }

  const knowledgeDir = getKnowledgeDir();
  const result = await loadPatternCache(knowledgeDir);

  if (!result.success || !result.data) {
    console.error('Error loading patterns:', result.error?.message);
    process.exit(1);
  }

  const patternData = result.data;
  const originalCount = patternData.patterns.length;

  console.log(`\nPattern Cache Analysis`);
  console.log('─'.repeat(50));
  console.log(`Total patterns: ${originalCount}`);
  console.log(`Criteria:`);
  if (args.minConfidence !== undefined) {
    console.log(`  Min confidence: ${args.minConfidence}`);
  }
  if (args.minUsage !== undefined) {
    console.log(`  Min usage: ${args.minUsage}`);
  }
  if (args.maxAgeDays !== undefined) {
    console.log(`  Max age: ${args.maxAgeDays} days`);
  }

  // Evaluate patterns
  const { keep, prune } = evaluatePatterns(patternData.patterns, args);

  console.log(`\nResults:`);
  console.log(`  Keep: ${keep.length} patterns`);
  console.log(`  Remove: ${prune.length} patterns`);

  if (prune.length === 0) {
    console.log('\nNo patterns to prune.');
    process.exit(0);
  }

  if (args.verbose) {
    console.log(`\nPatterns to be removed:`);
    console.log('─'.repeat(50));
    for (const { pattern, reasons } of prune) {
      console.log(`\n  ${pattern.id}: "${pattern.naturalLanguage}"`);
      console.log(`    SOQL: ${pattern.soql.substring(0, 60)}${pattern.soql.length > 60 ? '...' : ''}`);
      console.log(`    Reasons: ${reasons.join(', ')}`);
    }
  }

  if (args.dryRun) {
    console.log(`\n[DRY RUN] No changes made. Remove --dry-run to apply.`);
    process.exit(0);
  }

  // Apply changes
  const newPatternData: PatternKnowledge = {
    version: patternData.version,
    lastUpdated: new Date().toISOString(),
    patterns: keep,
    queryIndex: rebuildQueryIndex(keep),
  };

  await savePatternCache(knowledgeDir, newPatternData);

  console.log(`\nPruning complete!`);
  console.log(`  Removed: ${prune.length} patterns`);
  console.log(`  Remaining: ${keep.length} patterns`);
  console.log(`  Saved to: ${path.join(knowledgeDir, 'patterns.yaml')}`);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
