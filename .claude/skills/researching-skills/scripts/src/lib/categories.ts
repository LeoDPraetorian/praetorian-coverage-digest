// src/lib/categories.ts
/**
 * Library Category Discovery - Discover skill categories from filesystem
 *
 * Scans .claude/skill-library/ to find existing categories and build
 * dynamic options for skill location during brainstorming.
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { findProjectRoot } from '../../../../../lib/find-project-root.js';
import type { LibraryCategory } from './types.js';

// Allow overriding project root for testing
let projectRootOverride: string | null = null;

/**
 * Set a custom project root for testing
 */
export function _setProjectRoot(root: string): void {
  projectRootOverride = root;
}

/**
 * Reset to default project root detection
 */
export function _resetProjectRoot(): void {
  projectRootOverride = null;
}

/**
 * Get the current project root (with override support)
 */
function getProjectRoot(): string {
  return projectRootOverride || findProjectRoot();
}

// Directories to skip when scanning
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '__pycache__',
  '.venv',
  'scripts', // Skip scripts inside skills
  '.output',
  '.local',
]);

/**
 * Check if a directory contains a SKILL.md file (making it a skill, not a category)
 *
 * @param dirPath - Directory path to check
 * @returns True if directory contains SKILL.md
 */
export function isSkillDirectory(dirPath: string): boolean {
  return existsSync(join(dirPath, 'SKILL.md'));
}

/**
 * Count skills within a category directory (recursively)
 *
 * @param categoryPath - Category directory path
 * @returns Number of skills in this category
 */
export function countSkillsInCategory(categoryPath: string): number {
  if (!existsSync(categoryPath)) return 0;

  let count = 0;

  try {
    const entries = readdirSync(categoryPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (SKIP_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith('.')) continue;

      const fullPath = join(categoryPath, entry.name);

      if (isSkillDirectory(fullPath)) {
        count++;
      } else {
        // Recurse into subdirectories
        count += countSkillsInCategory(fullPath);
      }
    }
  } catch {
    // Ignore errors
  }

  return count;
}

/**
 * Recursively discover categories in a directory
 *
 * @param basePath - Base path being scanned
 * @param currentPath - Current directory being scanned
 * @param categories - Array to collect categories
 * @param maxDepth - Maximum recursion depth
 * @param currentDepth - Current recursion depth
 */
function discoverCategoriesRecursive(
  basePath: string,
  currentPath: string,
  categories: LibraryCategory[],
  maxDepth: number,
  currentDepth: number
): void {
  if (currentDepth > maxDepth) return;

  try {
    const entries = readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (SKIP_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith('.')) continue;

      const fullPath = join(currentPath, entry.name);

      // Skip if this is a skill directory (has SKILL.md)
      if (isSkillDirectory(fullPath)) continue;

      // This is a category directory
      const relativePath = relative(basePath, fullPath);
      const skillCount = countSkillsInCategory(fullPath);

      categories.push({
        path: relativePath,
        name: entry.name,
        depth: currentDepth,
        skillCount,
      });

      // Recurse into subcategories
      discoverCategoriesRecursive(
        basePath,
        fullPath,
        categories,
        maxDepth,
        currentDepth + 1
      );
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Discover all library categories from .claude/skill-library/
 *
 * Returns categories organized by depth, suitable for building
 * hierarchical selection options.
 *
 * @param maxDepth - Maximum depth to scan (default: 3)
 * @returns Array of discovered categories
 *
 * @example
 * ```typescript
 * const categories = discoverLibraryCategories();
 * // [
 * //   { path: 'development', name: 'development', depth: 1, skillCount: 45 },
 * //   { path: 'development/frontend', name: 'frontend', depth: 2, skillCount: 16 },
 * //   { path: 'development/frontend/state', name: 'state', depth: 3, skillCount: 3 },
 * //   ...
 * // ]
 * ```
 */
export function discoverLibraryCategories(maxDepth: number = 3): LibraryCategory[] {
  const projectRoot = getProjectRoot();
  const skillLibraryPath = join(projectRoot, '.claude', 'skill-library');

  if (!existsSync(skillLibraryPath)) {
    return [];
  }

  const categories: LibraryCategory[] = [];
  discoverCategoriesRecursive(skillLibraryPath, skillLibraryPath, categories, maxDepth, 1);

  // Sort by path for consistent ordering
  categories.sort((a, b) => a.path.localeCompare(b.path));

  return categories;
}

/**
 * Get categories as flat options for select questions
 *
 * Returns categories formatted as select options with indentation
 * to show hierarchy.
 *
 * @returns Array of { value, label, description } options
 *
 * @example
 * ```typescript
 * const options = getCategoryOptions();
 * // [
 * //   { value: 'development', label: 'development', description: '45 skills' },
 * //   { value: 'development/frontend', label: '  frontend', description: '16 skills' },
 * //   ...
 * // ]
 * ```
 */
export function getCategoryOptions(): Array<{
  value: string;
  label: string;
  description: string;
}> {
  const categories = discoverLibraryCategories();

  return categories.map(cat => ({
    value: cat.path,
    label: '  '.repeat(cat.depth - 1) + cat.name,
    description: `${cat.skillCount} skill${cat.skillCount !== 1 ? 's' : ''}`,
  }));
}

/**
 * Suggest a category based on skill name and type
 *
 * @param name - Skill name (e.g., 'frontend-tanstack-query')
 * @param skillType - Type of skill
 * @returns Suggested category path or null
 *
 * @example
 * ```typescript
 * suggestCategory('frontend-zustand', 'library');
 * // 'development/frontend/state'
 * ```
 */
export function suggestCategory(
  name: string,
  skillType: 'process' | 'library' | 'integration' | 'tool-wrapper'
): string | null {
  const nameLower = name.toLowerCase();
  const categories = discoverLibraryCategories();

  // Map skill type to base category
  const typeToCategory: Record<string, string[]> = {
    'process': ['development', 'testing', 'operations'],
    'library': ['development'],
    'integration': ['development/integrations', 'operations/integrations'],
    'tool-wrapper': ['claude/mcp-tools'],
  };

  const baseCandidates = typeToCategory[skillType] || [];

  // Keyword mapping for subcategories
  const keywords: Record<string, string[]> = {
    'frontend': ['frontend', 'react', 'ui', 'component', 'state', 'form', 'routing'],
    'backend': ['backend', 'api', 'server', 'lambda', 'handler', 'database'],
    'state': ['state', 'zustand', 'jotai', 'redux', 'tanstack-query'],
    'testing': ['test', 'vitest', 'playwright', 'e2e', 'unit', 'integration'],
    'security': ['security', 'auth', 'crypto', 'vulnerability', 'scan'],
  };

  // Find matching keywords in name
  const matchedKeywords: string[] = [];
  for (const [category, kws] of Object.entries(keywords)) {
    for (const kw of kws) {
      if (nameLower.includes(kw)) {
        matchedKeywords.push(category);
        break;
      }
    }
  }

  // Find best matching category
  for (const category of categories) {
    const catPath = category.path.toLowerCase();

    // Check if category matches base and keywords
    const matchesBase = baseCandidates.some(base =>
      catPath.startsWith(base.toLowerCase())
    );

    const matchesKeywords = matchedKeywords.some(kw =>
      catPath.includes(kw)
    );

    if (matchesBase && matchesKeywords) {
      return category.path;
    }
  }

  // Fallback: return first matching base category
  for (const category of categories) {
    const catPath = category.path.toLowerCase();
    if (baseCandidates.some(base => catPath === base.toLowerCase())) {
      return category.path;
    }
  }

  return null;
}
