/**
 * Utility functions for formatting-skill-output.
 *
 * Note: This skill is a pure formatter and doesn't typically need path resolution.
 * This utility is provided for compliance with skill standards.
 */

import { execSync } from 'child_process';

/**
 * Find the repository root using git.
 *
 * First tries to find super-project root (for submodules),
 * then falls back to regular git root.
 */
export function findRepoRoot(): string {
  try {
    // Try super-project first (for submodules)
    const superProject = execSync('git rev-parse --show-superproject-working-tree 2>/dev/null', {
      encoding: 'utf-8',
    }).trim();

    if (superProject) {
      return superProject;
    }
  } catch {
    // Not in a super-project, continue
  }

  // Fall back to regular git root
  return execSync('git rev-parse --show-toplevel', {
    encoding: 'utf-8',
  }).trim();
}

/**
 * Get the .claude directory path.
 */
export function getClaudeDir(): string {
  return `${findRepoRoot()}/.claude`;
}
