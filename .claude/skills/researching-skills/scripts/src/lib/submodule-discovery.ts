// src/lib/submodule-discovery.ts
/**
 * Submodule Discovery - Dynamically discover and analyze modules/ directory
 *
 * Scans the modules/ directory to find all submodules, extracts their purpose
 * from CLAUDE.md or README files, detects programming languages, and extracts
 * keywords for relevance matching during skill research.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { findProjectRoot } from '../../../../../lib/find-project-root.js';
import type { Submodule } from './types.js';
import { MODULE_KEYWORD_MAP } from './types.js';

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

/**
 * Discover all submodules in the modules/ directory
 *
 * @returns Array of discovered submodules with metadata
 *
 * @example
 * ```typescript
 * const submodules = discoverSubmodules();
 * // Returns 12+ submodules including chariot, nebula, janus, etc.
 * ```
 */
export function discoverSubmodules(): Submodule[] {
  const projectRoot = getProjectRoot();
  const modulesDir = join(projectRoot, 'modules');

  if (!existsSync(modulesDir)) {
    return [];
  }

  const submodules: Submodule[] = [];
  const entries = readdirSync(modulesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;

    const modulePath = join(modulesDir, entry.name);
    const submodule = analyzeSubmodule(entry.name, modulePath);
    if (submodule) {
      submodules.push(submodule);
    }
  }

  return submodules.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Analyze a single submodule directory
 */
function analyzeSubmodule(name: string, path: string): Submodule | null {
  const claudeMdPath = join(path, 'CLAUDE.md');
  const readmePath = join(path, 'README.md');

  const hasClaudeMd = existsSync(claudeMdPath);
  let purpose = '';

  // Extract purpose from CLAUDE.md first, fallback to README
  if (hasClaudeMd) {
    purpose = extractPurposeFromClaudeMd(claudeMdPath);
  }
  if (!purpose && existsSync(readmePath)) {
    purpose = extractPurposeFromReadme(readmePath);
  }
  if (!purpose) {
    purpose = `Submodule: ${name}`;
  }

  // Detect languages
  const languages = detectLanguages(path);

  // Extract keywords from purpose + use base keywords
  const extractedKeywords = extractKeywords(purpose);
  const baseKeywords = MODULE_KEYWORD_MAP[name] || [];
  const keywords = [...new Set([...baseKeywords, ...extractedKeywords])];

  return {
    name,
    path,
    purpose,
    keywords,
    languages,
    hasClaudeMd,
  };
}

/**
 * Extract purpose/description from CLAUDE.md
 *
 * Looks for:
 * - ## Project Overview section
 * - First paragraph after # heading
 * - Description in frontmatter (if yaml)
 */
export function extractPurposeFromClaudeMd(filePath: string): string {
  if (!existsSync(filePath)) {
    return '';
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Look for ## Project Overview or ## Overview section
    let inOverview = false;
    let purposeLines: string[] = [];

    for (const line of lines) {
      // Start of overview section
      if (/^##\s*(Project\s+)?Overview/i.test(line)) {
        inOverview = true;
        continue;
      }

      // End of overview (next heading)
      if (inOverview && /^##/.test(line)) {
        break;
      }

      // Collect content from overview
      if (inOverview && line.trim()) {
        purposeLines.push(line.trim());
        // Get first meaningful paragraph
        if (purposeLines.length >= 3 || (purposeLines.length > 0 && line.trim() === '')) {
          break;
        }
      }
    }

    if (purposeLines.length > 0) {
      return purposeLines.join(' ').slice(0, 500);
    }

    // Fallback: Get first paragraph after main heading
    let afterFirstHeading = false;
    for (const line of lines) {
      if (/^#\s+/.test(line) && !afterFirstHeading) {
        afterFirstHeading = true;
        continue;
      }
      if (afterFirstHeading && line.trim() && !line.startsWith('#')) {
        return line.trim().slice(0, 500);
      }
    }

    return '';
  } catch {
    return '';
  }
}

/**
 * Extract purpose/description from README.md
 *
 * Looks for:
 * - First paragraph after main heading
 * - Badge-free description
 */
export function extractPurposeFromReadme(filePath: string): string {
  if (!existsSync(filePath)) {
    return '';
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    let afterFirstHeading = false;
    for (const line of lines) {
      // Skip badge lines
      if (line.includes('[![') || line.includes('![')) {
        continue;
      }

      // Found main heading
      if (/^#\s+/.test(line) && !afterFirstHeading) {
        afterFirstHeading = true;
        continue;
      }

      // First paragraph after heading (skip empty lines and badges)
      if (afterFirstHeading && line.trim() && !line.startsWith('#')) {
        // Skip common badge/link patterns
        if (line.startsWith('[') || line.startsWith('<')) {
          continue;
        }
        return line.trim().slice(0, 500);
      }
    }

    return '';
  } catch {
    return '';
  }
}

/**
 * Detect programming languages used in a directory
 */
export function detectLanguages(dirPath: string): Submodule['languages'] {
  const languages: Set<Submodule['languages'][number]> = new Set();

  // Check for language indicators
  const indicators: Array<{ file: string; lang: Submodule['languages'][number] }> = [
    { file: 'go.mod', lang: 'go' },
    { file: 'go.sum', lang: 'go' },
    { file: 'package.json', lang: 'typescript' },
    { file: 'tsconfig.json', lang: 'typescript' },
    { file: 'requirements.txt', lang: 'python' },
    { file: 'pyproject.toml', lang: 'python' },
    { file: 'setup.py', lang: 'python' },
  ];

  for (const { file, lang } of indicators) {
    if (existsSync(join(dirPath, file))) {
      languages.add(lang);
    }
  }

  // Check for VQL files (search subdirectories)
  if (hasVqlFiles(dirPath)) {
    languages.add('vql');
  }

  // Default to 'other' if no languages detected
  if (languages.size === 0) {
    languages.add('other');
  }

  return Array.from(languages);
}

/**
 * Check if directory contains VQL files
 */
function hasVqlFiles(dirPath: string, depth: number = 0): boolean {
  if (depth > 3) return false; // Limit recursion

  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.vql')) {
        return true;
      }
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        if (hasVqlFiles(join(dirPath, entry.name), depth + 1)) {
          return true;
        }
      }
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Extract keywords from text content
 *
 * Uses a simple approach:
 * - Lowercase and split on non-alpha characters
 * - Filter short words and common stop words
 * - Return unique meaningful words
 */
export function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'it', 'its',
    'with', 'for', 'from', 'to', 'of', 'in', 'on', 'at', 'by', 'as', 'if', 'then',
    'than', 'so', 'such', 'only', 'very', 'just', 'also', 'more', 'most', 'other',
    'some', 'any', 'all', 'both', 'each', 'few', 'many', 'several', 'own', 'same',
    'which', 'who', 'whom', 'what', 'when', 'where', 'why', 'how', 'not', 'no',
    'over', 'into', 'under', 'above', 'below', 'between', 'through', 'during',
  ]);

  // Extract words
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(word =>
      word.length >= 3 &&
      !stopWords.has(word) &&
      !/^\d+$/.test(word)
    );

  return [...new Set(words)];
}

/**
 * Find submodules relevant to a search query
 *
 * @param query - Search query (e.g., "react frontend")
 * @param submodules - Submodules to search (defaults to discoverSubmodules())
 * @returns Submodules sorted by relevance score
 */
export function findRelevantSubmodules(
  query: string,
  submodules?: Submodule[]
): Array<Submodule & { relevance: number }> {
  const modules = submodules || discoverSubmodules();
  const queryKeywords = extractKeywords(query);

  if (queryKeywords.length === 0) {
    return modules.map(m => ({ ...m, relevance: 0 }));
  }

  return modules
    .map(module => {
      // Calculate relevance based on keyword overlap
      const moduleKeywords = new Set(module.keywords.map(k => k.toLowerCase()));
      let matches = 0;

      for (const qk of queryKeywords) {
        // Exact match
        if (moduleKeywords.has(qk)) {
          matches += 2;
        } else {
          // Partial match
          for (const mk of moduleKeywords) {
            if (mk.includes(qk) || qk.includes(mk)) {
              matches += 1;
              break;
            }
          }
        }
      }

      // Bonus for purpose containing query terms
      const purposeLower = module.purpose.toLowerCase();
      for (const qk of queryKeywords) {
        if (purposeLower.includes(qk)) {
          matches += 0.5;
        }
      }

      const relevance = Math.min(100, Math.round((matches / queryKeywords.length) * 50));
      return { ...module, relevance };
    })
    .filter(m => m.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance);
}
