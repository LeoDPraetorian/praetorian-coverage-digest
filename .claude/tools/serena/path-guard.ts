import { z } from 'zod';

/**
 * Super-Repo Path Guard for Serena Wrappers
 *
 * Detects paths that exist in the super-repo root (not in submodules)
 * and provides actionable error guidance.
 *
 * @module path-guard
 */

/**
 * Super-repo directory prefixes that should trigger the guard
 */
export const SUPER_REPO_PREFIXES = [
  'docs/',
  'scripts/',
  '.serena/',
  '.github/',
  '.githooks/',
] as const;

/**
 * Root-level configuration and documentation files
 */
export const ROOT_LEVEL_FILES = [
  'CLAUDE.md',
  'Makefile',
  'go.work',
  'go.work.sum',
  '.gitignore',
  '.gitmodules',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
] as const;

/**
 * Check if a path is in the super-repo (not in a submodule)
 *
 * @param path - The path to check (can be relative or absolute)
 * @returns true if path is in super-repo, false if in submodule or project root
 *
 * @example
 * isSuperRepoPath('.claude/tools/test.ts') // true
 * isSuperRepoPath('modules/chariot/ui/App.tsx') // false
 * isSuperRepoPath('') // false (project root)
 */
export function isSuperRepoPath(path: string): boolean {
  // Normalize path (remove leading ./ if present)
  const normalizedPath = path.replace(/^\.\//, '');

  // Empty string or '.' means project root (allowed)
  if (!normalizedPath || normalizedPath === '.') {
    return false;
  }

  // Check for explicit super-repo prefixes
  if (SUPER_REPO_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))) {
    return true;
  }

  // Check for root-level files
  if (ROOT_LEVEL_FILES.includes(normalizedPath as any)) {
    return true;
  }

  // If path doesn't start with modules/, it's a super-repo path
  if (!normalizedPath.startsWith('modules/')) {
    return true;
  }

  return false;
}

/**
 * Create a descriptive error for super-repo paths
 *
 * @param path - The super-repo path that was detected
 * @param operation - The Serena operation that was attempted
 * @returns Error with actionable guidance
 *
 * @example
 * throw createSuperRepoPathError('.claude/skills/test.md', 'get_symbols_overview')
 */
export function createSuperRepoPathError(path: string, operation: string): Error {
  return new Error(
    `[Serena Guard] Path "${path}" is in the super-repo, not a submodule.\n\n` +
      `Serena is scoped to submodules under modules/. For super-repo files, use:\n\n` +
      `  - Read tool: Read("${path}") for viewing file contents\n` +
      `  - Edit tool: Edit(file_path, old_string, new_string) for modifications\n` +
      `  - Grep tool: Grep with path="${path}" for searching\n\n` +
      `Operation attempted: ${operation}\n` +
      `Tip: Serena excels at semantic code operations within submodules like modules/chariot/.`,
  );
}

/**
 * Custom Zod refinement with detailed error message
 *
 * Use with .superRefine() in Zod schemas to validate paths.
 *
 * @param operation - The name of the operation (e.g., 'find_symbol')
 * @returns Zod refinement function
 *
 * @example
 * const schema = z.object({
 *   relative_path: z.string().superRefine(createPathGuardRefinement('find_symbol'))
 * });
 */
export function createPathGuardRefinement(operation: string) {
  return (path: string, ctx: z.RefinementCtx) => {
    if (path && isSuperRepoPath(path)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: createSuperRepoPathError(path, operation).message,
      });
    }
  };
}

/**
 * Normalize relative_path by stripping modules/<module>/ prefix
 *
 * When Serena is scoped to a module (e.g., modules/chariot), the relative_path
 * should be relative to that module root. But callers often pass the full path
 * (e.g., "modules/chariot/backend") which causes path doubling.
 *
 * This function strips the modules/<module>/ prefix to prevent that issue.
 *
 * @param relativePath - The path to normalize (may or may not have prefix)
 * @returns Normalized path without modules/<module>/ prefix
 *
 * @example
 * normalizeRelativePath('modules/chariot/backend') // 'backend'
 * normalizeRelativePath('backend') // 'backend' (unchanged)
 * normalizeRelativePath('modules/chariot') // '.' (project root)
 * normalizeRelativePath(undefined) // undefined
 */
export function normalizeRelativePath(relativePath: string | undefined): string | undefined {
  if (!relativePath) {
    return relativePath;
  }

  // Strip modules/<module>/ prefix if present
  // e.g., "modules/chariot/backend" -> "backend"
  const stripped = relativePath.replace(/^modules\/[^/]+\//, '');

  // If we stripped everything (e.g., "modules/chariot" -> ""), use "." for project root
  if (!stripped && relativePath.match(/^modules\/[^/]+\/?$/)) {
    return '.';
  }

  return stripped || relativePath;
}
