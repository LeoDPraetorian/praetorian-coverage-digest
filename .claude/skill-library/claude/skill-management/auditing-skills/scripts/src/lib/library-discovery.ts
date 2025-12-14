/**
 * Library category discovery for skill-manager create workflow.
 * Scans .claude/skill-library/ to dynamically offer folder options.
 */

import { readdirSync, statSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { findProjectRoot } from '../../../../../../../lib/find-project-root.js';

const PROJECT_ROOT = findProjectRoot();
const SKILL_LIBRARY_PATH = join(PROJECT_ROOT, '.claude/skill-library');

/**
 * Category option for user selection
 */
export interface LibraryCategoryOption {
  value: string;           // Full path segment (e.g., "development/integrations")
  label: string;           // Display name (e.g., "Development → Integrations")
  description: string;     // Skill count and example
  depth: number;           // Nesting level
  skillCount: number;      // Number of skills in this category
}

/**
 * Internal skill directories that should NOT be shown as categories
 */
const INTERNAL_SKILL_DIRS = new Set([
  'references',
  'examples',
  'templates',
  'scripts',
  'assets',
  'patterns',
  'workflows',
  '.local',
  '.output',
]);

/**
 * Check if a directory is a skill directory (has SKILL.md directly inside)
 */
function isSkillDirectory(dirPath: string): boolean {
  return existsSync(join(dirPath, 'SKILL.md'));
}

/**
 * Count skills directly in a category (not recursively)
 */
function countDirectSkills(dirPath: string): number {
  if (!existsSync(dirPath)) return 0;

  let count = 0;
  const entries = readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('.') && !INTERNAL_SKILL_DIRS.has(entry.name)) {
      const subPath = join(dirPath, entry.name);
      if (isSkillDirectory(subPath)) {
        count++;
      }
    }
  }

  return count;
}

/**
 * Count all skills in a category including subcategories
 */
function countAllSkills(dirPath: string): number {
  if (!existsSync(dirPath)) return 0;

  let count = 0;
  const entries = readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || INTERNAL_SKILL_DIRS.has(entry.name)) {
      continue;
    }

    const subPath = join(dirPath, entry.name);

    if (isSkillDirectory(subPath)) {
      // This is a skill folder - count it
      count++;
    } else {
      // This is a subcategory - recurse
      count += countAllSkills(subPath);
    }
  }

  return count;
}

/**
 * Get example skill names from a category
 */
function getExampleSkills(dirPath: string, max: number = 2): string[] {
  if (!existsSync(dirPath)) return [];

  const examples: string[] = [];
  const entries = readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (examples.length >= max) break;
    if (!entry.isDirectory() || entry.name.startsWith('.') || INTERNAL_SKILL_DIRS.has(entry.name)) {
      continue;
    }

    const subPath = join(dirPath, entry.name);
    if (isSkillDirectory(subPath)) {
      examples.push(entry.name);
    }
  }

  return examples;
}

/**
 * Check if a directory is a valid category (contains skills or subcategories, not a skill itself)
 */
function isCategory(dirPath: string): boolean {
  // If it has SKILL.md, it's a skill, not a category
  if (isSkillDirectory(dirPath)) return false;

  // Check if it has any subdirectories (skills or subcategories)
  const entries = readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('.') && !INTERNAL_SKILL_DIRS.has(entry.name)) {
      return true;
    }
  }

  return false;
}

/**
 * Recursively discover all category paths in the skill library
 */
function discoverCategoriesRecursive(
  basePath: string,
  relativePath: string = '',
  depth: number = 0
): LibraryCategoryOption[] {
  const options: LibraryCategoryOption[] = [];

  if (!existsSync(basePath)) return options;

  const entries = readdirSync(basePath, { withFileTypes: true });

  for (const entry of entries) {
    // Skip hidden and internal directories
    if (!entry.isDirectory() || entry.name.startsWith('.') || INTERNAL_SKILL_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = join(basePath, entry.name);
    const categoryPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    // Skip if this is a skill directory (has SKILL.md)
    if (isSkillDirectory(fullPath)) {
      continue;
    }

    // Check if this directory is a valid category
    if (!isCategory(fullPath)) {
      continue;
    }

    // Count skills in this category (including all subcategories)
    const skillCount = countAllSkills(fullPath);
    const examples = getExampleSkills(fullPath);

    // Build display label with arrows for depth
    const pathParts = categoryPath.split('/');
    const label = pathParts
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '))
      .join(' → ');

    // Build description
    let description = `${skillCount} skill${skillCount !== 1 ? 's' : ''}`;
    if (examples.length > 0) {
      description += ` (e.g., ${examples.join(', ')})`;
    }

    options.push({
      value: categoryPath,
      label,
      description,
      depth,
      skillCount,
    });

    // Recurse into subdirectories
    const subOptions = discoverCategoriesRecursive(fullPath, categoryPath, depth + 1);
    options.push(...subOptions);
  }

  return options;
}

/**
 * Discover all library categories for user selection.
 * Returns a flat list of category options, sorted by path.
 */
export function discoverLibraryCategories(): LibraryCategoryOption[] {
  const options = discoverCategoriesRecursive(SKILL_LIBRARY_PATH);

  // Sort by path for consistent ordering
  options.sort((a, b) => a.value.localeCompare(b.value));

  return options;
}

/**
 * Get top-level categories only (for initial selection)
 */
export function getTopLevelCategories(): LibraryCategoryOption[] {
  const all = discoverLibraryCategories();
  return all.filter(opt => opt.depth === 0);
}

/**
 * Get subcategories of a specific category
 */
export function getSubcategories(parentPath: string): LibraryCategoryOption[] {
  const all = discoverLibraryCategories();
  return all.filter(opt => {
    // Must start with parent path
    if (!opt.value.startsWith(parentPath + '/')) return false;
    // Must be exactly one level deeper
    const remaining = opt.value.slice(parentPath.length + 1);
    return !remaining.includes('/');
  });
}

/**
 * Check if a category path is valid
 */
export function isValidCategoryPath(categoryPath: string): boolean {
  const fullPath = join(SKILL_LIBRARY_PATH, categoryPath);
  return existsSync(fullPath) && statSync(fullPath).isDirectory();
}

/**
 * Get the full filesystem path for a category
 */
export function getCategoryFullPath(categoryPath: string): string {
  return join(SKILL_LIBRARY_PATH, categoryPath);
}
