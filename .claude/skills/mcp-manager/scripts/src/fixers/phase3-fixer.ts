/**
 * Phase 3 Fixer: Type Unions
 * Provides guidance for adding z.union() - not auto-fixable
 */

import * as fs from 'fs';

export interface FixResult {
  fixed: boolean;
  changes: string[];
}

export function fixPhase3(wrapperPath: string, dryRun: boolean): FixResult {
  // Type unions require manual review - can't auto-fix
  // Provide guidance instead

  const changes: string[] = [];

  if (!fs.existsSync(wrapperPath)) {
    return { fixed: false, changes: [] };
  }

  const content = fs.readFileSync(wrapperPath, 'utf-8');

  // Check if file has complex schemas without unions
  const fieldCount = (content.match(/z\.(string|number|boolean|object|array)\(\)/g) || []).length;
  const unionCount = (content.match(/z\.union/g) || []).length;

  if (fieldCount >= 5 && unionCount === 0) {
    changes.push('MANUAL FIX REQUIRED: Complex schema detected without type unions');
    changes.push('');
    changes.push('Steps to fix:');
    changes.push('1. Run schema discovery with diverse test cases');
    changes.push('2. Identify fields that return different types');
    changes.push('3. Add z.union([type1, type2]) for variant fields');
    changes.push('');
    changes.push('Example:');
    changes.push('  // Before:');
    changes.push('  result: z.string()');
    changes.push('');
    changes.push('  // After (if result can be string or object):');
    changes.push('  result: z.union([z.string(), z.object({ ... })])');
  }

  return {
    fixed: false, // Never auto-fixed
    changes
  };
}
