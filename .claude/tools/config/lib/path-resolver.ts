/**
 * Path Resolution for Super-Repository Architecture
 *
 * Resolves paths correctly whether running from:
 * - Super-repo root (/chariot-development-platform)
 * - Submodule (/chariot-development-platform/modules/chariot)
 * - Any subdirectory
 *
 * Solution uses git to detect super-repo location.
 */

import { execSync } from 'child_process';
import { join } from 'path';

/**
 * Cached super-repo root to avoid repeated git calls
 */
let cachedSuperRepoRoot: string | null = null;

/**
 * Get the super-repository root directory
 *
 * Uses git to detect whether we're in a submodule and find the super-repo root.
 *
 * @returns Absolute path to super-repo root
 *
 * @example
 * ```typescript
 * // From super-repo root
 * getSuperRepoRoot() // '/Users/user/chariot-development-platform'
 *
 * // From submodule
 * getSuperRepoRoot() // '/Users/user/chariot-development-platform'
 * ```
 */
export function getSuperRepoRoot(): string {
  // Return cached value if available
  if (cachedSuperRepoRoot) {
    return cachedSuperRepoRoot;
  }

  try {
    // Try to get super-project working tree (returns empty if not in submodule)
    const superRepoRoot = execSync('git rev-parse --show-superproject-working-tree', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'] // Suppress stderr
    }).trim();

    if (superRepoRoot) {
      // We're in a submodule, return super-repo root
      cachedSuperRepoRoot = superRepoRoot;
      return superRepoRoot;
    }

    // Not in a submodule, get current repo root
    const currentRepoRoot = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();

    cachedSuperRepoRoot = currentRepoRoot;
    return currentRepoRoot;

  } catch (error) {
    // Fallback: if git fails, use process.cwd() and walk up to find .git
    let currentDir = process.cwd();
    const fs = require('fs');
    const path = require('path');

    while (currentDir !== path.dirname(currentDir)) {
      // Check if .git exists (either file for submodule or directory for repo)
      if (fs.existsSync(path.join(currentDir, '.git'))) {
        // If .git is a file, we're in a submodule - read super-repo path
        const gitPath = path.join(currentDir, '.git');
        const stats = fs.statSync(gitPath);

        if (stats.isFile()) {
          // Submodule - read .git file to find gitdir
          const gitFile = fs.readFileSync(gitPath, 'utf-8');
          const match = gitFile.match(/gitdir: (.+)/);
          if (match) {
            // gitdir points to super-repo .git/modules/submodule-name
            // Navigate up to find super-repo root
            const gitdir = path.resolve(currentDir, match[1]);
            // gitdir = super-repo/.git/modules/submodule-name
            // super-repo = gitdir/../../../
            const superRepoRoot = path.resolve(gitdir, '../../..');
            cachedSuperRepoRoot = superRepoRoot;
            return superRepoRoot;
          }
        }

        // Regular repo (not submodule)
        cachedSuperRepoRoot = currentDir;
        return currentDir;
      }

      // Move up one directory
      currentDir = path.dirname(currentDir);
    }

    // Ultimate fallback: use process.cwd()
    console.warn('Warning: Could not detect git repository root, using current directory');
    cachedSuperRepoRoot = process.cwd();
    return process.cwd();
  }
}

/**
 * Resolve a path relative to super-repo root
 *
 * @param relativePath - Path relative to super-repo root (e.g., '.claude/tools/linear')
 * @returns Absolute path
 *
 * @example
 * ```typescript
 * // From anywhere in the repo
 * resolveSuperRepoPath('.claude/tools/linear/get-issue.ts')
 * // Returns: '/Users/user/chariot-development-platform/.claude/tools/linear/get-issue.ts'
 *
 * resolveSuperRepoPath('modules/chariot/backend')
 * // Returns: '/Users/user/chariot-development-platform/modules/chariot/backend'
 * ```
 */
export function resolveSuperRepoPath(...pathSegments: string[]): string {
  const superRepoRoot = getSuperRepoRoot();
  return join(superRepoRoot, ...pathSegments);
}

/**
 * Check if currently running from within a submodule
 *
 * @returns True if in submodule, false if in super-repo root
 */
export function isInSubmodule(): boolean {
  try {
    const superRepoRoot = execSync('git rev-parse --show-superproject-working-tree', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();

    return superRepoRoot.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get the current submodule name (if in a submodule)
 *
 * @returns Submodule name (e.g., 'chariot', 'janus') or null if not in submodule
 */
export function getCurrentSubmoduleName(): string | null {
  if (!isInSubmodule()) {
    return null;
  }

  try {
    const currentRepoRoot = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();

    const superRepoRoot = getSuperRepoRoot();

    // Extract submodule name from path difference
    // e.g., /super/modules/chariot -> 'chariot'
    const relativePath = currentRepoRoot.replace(superRepoRoot + '/', '');
    const parts = relativePath.split('/');

    // Assuming structure is modules/{submodule-name}
    if (parts[0] === 'modules' && parts.length > 1) {
      return parts[1];
    }

    // Fallback: return last part of path
    return parts[parts.length - 1];
  } catch {
    return null;
  }
}

/**
 * Clear cached super-repo root (useful for testing)
 */
export function clearCache(): void {
  cachedSuperRepoRoot = null;
}
