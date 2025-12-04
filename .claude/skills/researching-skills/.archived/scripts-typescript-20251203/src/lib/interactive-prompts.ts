// src/lib/interactive-prompts.ts
/**
 * Interactive prompts for research workflow using @clack/prompts
 *
 * Provides user-friendly interactive prompts for:
 * - Context7 search query input
 * - Package selection from search results
 * - Web research opt-in
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import type { Context7Package } from './types.js';

// ============================================================================
// Context7 Interactive Prompts
// ============================================================================

/**
 * Prompt user for Context7 search query
 *
 * @param defaultQuery - Default query to suggest
 * @returns User's search query or null if cancelled
 */
export async function promptContext7Query(defaultQuery: string): Promise<string | null> {
  const query = await p.text({
    message: 'What would you like to search for in Context7?',
    placeholder: defaultQuery,
    initialValue: defaultQuery,
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Please enter a search query';
      }
    },
  });

  if (p.isCancel(query)) {
    return null;
  }

  return query as string;
}

/**
 * Prompt user to select packages from Context7 search results
 *
 * @param packages - Array of Context7 packages from search
 * @returns Selected package IDs or 'skip' or 'retry'
 */
export async function promptContext7PackageSelection(
  packages: Context7Package[]
): Promise<{ action: 'selected' | 'skip' | 'retry'; packageIds: string[] }> {
  if (packages.length === 0) {
    p.log.warn('No packages found in Context7');

    const retry = await p.confirm({
      message: 'Try a different search query?',
      initialValue: true,
    });

    if (p.isCancel(retry)) {
      return { action: 'skip', packageIds: [] };
    }

    return retry ? { action: 'retry', packageIds: [] } : { action: 'skip', packageIds: [] };
  }

  // Display packages
  p.log.info(chalk.yellow(`\nFound ${packages.length} packages:\n`));

  packages.forEach((pkg, idx) => {
    const status = pkg.status === 'recommended' ? chalk.green('✅') : '  ';
    const version = pkg.version || 'latest';
    console.log(`${status} [${idx + 1}] ${chalk.bold(pkg.name)} (${version})`);

    if (pkg.description) {
      console.log(`    ${chalk.gray(pkg.description.substring(0, 80))}${pkg.description.length > 80 ? '...' : ''}`);
    }
  });

  console.log('');

  // Build options for multiselect
  const options = packages.map((pkg, idx) => ({
    value: pkg.id,
    label: `${pkg.name} (${pkg.version || 'latest'})`,
    hint: pkg.status === 'recommended' ? 'recommended' : undefined,
  }));

  // Add special options
  options.push(
    { value: '__skip__', label: 'Skip Context7 (no packages)', hint: undefined },
    { value: '__retry__', label: 'Try a different search', hint: undefined }
  );

  const selection = await p.multiselect({
    message: 'Select packages to include:',
    options,
    required: false,
  });

  if (p.isCancel(selection)) {
    return { action: 'skip', packageIds: [] };
  }

  const selected = selection as string[];

  // Check for special actions
  if (selected.includes('__skip__')) {
    return { action: 'skip', packageIds: [] };
  }

  if (selected.includes('__retry__')) {
    return { action: 'retry', packageIds: [] };
  }

  // Filter out special values
  const packageIds = selected.filter((id) => !id.startsWith('__'));

  if (packageIds.length === 0) {
    p.log.warn('No packages selected');
    return { action: 'skip', packageIds: [] };
  }

  return { action: 'selected', packageIds };
}

// ============================================================================
// Web Research Interactive Prompts
// ============================================================================

/**
 * Prompt user whether to include web research
 *
 * @returns true if user wants web research, false otherwise
 */
export async function promptIncludeWebResearch(): Promise<boolean> {
  const include = await p.confirm({
    message: 'Include web research? (GitHub, official docs, articles)',
    initialValue: false,
  });

  if (p.isCancel(include)) {
    return false;
  }

  return include as boolean;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Check if terminal supports interactive prompts
 *
 * @returns true if TTY and not in CI environment
 */
export function isInteractiveSupported(): boolean {
  // Check if stdout is a TTY
  if (!process.stdout.isTTY) {
    return false;
  }

  // Check for CI environments
  const ciEnvVars = ['CI', 'CONTINUOUS_INTEGRATION', 'BUILD_ID', 'GITHUB_ACTIONS'];
  const isCI = ciEnvVars.some((envVar) => process.env[envVar]);

  if (isCI) {
    return false;
  }

  return true;
}

/**
 * Display a cancellation message
 */
export function displayCancellation(): void {
  p.cancel('Research cancelled');
  process.exit(0);
}
