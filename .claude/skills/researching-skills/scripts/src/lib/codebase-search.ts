// src/lib/codebase-search.ts
/**
 * Codebase Search - Search for code patterns and tests in the repository
 *
 * Searches relevant modules for code patterns, usage examples, and related tests.
 * Used during skill creation to understand existing implementations.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';
import { findProjectRoot } from '../../../../../lib/find-project-root.js';
import type { CodeMatch, TestMatch } from './types.js';

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

// Code file extensions to search
const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', // JavaScript/TypeScript
  '.go', // Go
  '.py', // Python
  '.vql', // VQL
]);

// Test file patterns
const TEST_PATTERNS = {
  unit: /\.(unit\.)?test\.(ts|tsx|js|jsx)$/,
  integration: /\.integration\.test\.(ts|tsx|js|jsx)$/,
  e2e: /\.(spec|e2e)\.(ts|tsx|js|jsx)$/,
};

// Directories to skip
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage',
  '.claude', '__pycache__', '.venv', 'vendor',
]);

/**
 * Categorize a code match based on its content
 *
 * @param content - Line content
 * @returns Match type
 */
export function categorizeMatch(
  content: string
): CodeMatch['matchType'] {
  const trimmed = content.trim();

  // Import statements
  if (
    trimmed.startsWith('import ') ||
    trimmed.includes('require(') ||
    trimmed.startsWith('from ')
  ) {
    return 'import';
  }

  // Destructuring usage patterns (const { x } = ..., const [ x ] = ...)
  // These are NOT definitions - they're usage of existing values
  if (
    trimmed.match(/^(const|let|var)\s*\{[^}]+\}\s*=/) ||
    trimmed.match(/^(const|let|var)\s*\[[^\]]+\]\s*=/)
  ) {
    return 'usage';
  }

  // Function/class/const definitions (but not destructuring)
  if (
    trimmed.startsWith('function ') ||
    trimmed.startsWith('class ') ||
    trimmed.startsWith('export function ') ||
    trimmed.startsWith('export class ') ||
    trimmed.match(/^(export\s+)?(async\s+)?function\s+/) ||
    trimmed.match(/^(export\s+)?const\s+\w+\s*=\s*(async\s+)?\(/) ||
    trimmed.match(/^(export\s+)?(const|let)\s+\w+\s*=\s*[^{[]/)
  ) {
    return 'definition';
  }

  // Pattern match (interface, type)
  if (
    trimmed.startsWith('interface ') ||
    trimmed.startsWith('type ') ||
    trimmed.startsWith('export interface ') ||
    trimmed.startsWith('export type ')
  ) {
    return 'pattern';
  }

  // Default to usage
  return 'usage';
}

/**
 * Search for code patterns in specified directories
 *
 * @param pattern - Search pattern (string or regex)
 * @param directories - Directories to search (defaults to modules/)
 * @param limit - Maximum number of results (default: 50)
 * @returns Array of code matches
 *
 * @example
 * ```typescript
 * const matches = searchCodePatterns('useQuery', ['/path/to/modules/chariot']);
 * ```
 */
export function searchCodePatterns(
  pattern: string,
  directories?: string[],
  limit: number = 50
): CodeMatch[] {
  const projectRoot = getProjectRoot();
  const searchDirs = directories?.length
    ? directories
    : [join(projectRoot, 'modules')];

  const matches: CodeMatch[] = [];
  const regex = new RegExp(escapeRegex(pattern), 'i');

  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue;
    searchDirectory(dir, regex, matches, limit, projectRoot);
    if (matches.length >= limit) break;
  }

  return matches.slice(0, limit);
}

/**
 * Recursively search a directory for code patterns
 */
function searchDirectory(
  dir: string,
  pattern: RegExp,
  matches: CodeMatch[],
  limit: number,
  projectRoot: string
): void {
  if (matches.length >= limit) return;

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (matches.length >= limit) return;

      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        if (entry.name.startsWith('.')) continue;
        searchDirectory(fullPath, pattern, matches, limit, projectRoot);
      } else if (entry.isFile()) {
        const ext = extname(entry.name);
        if (!CODE_EXTENSIONS.has(ext)) continue;

        searchFile(fullPath, pattern, matches, limit, projectRoot);
      }
    }
  } catch {
    // Skip inaccessible directories
  }
}

/**
 * Search a single file for patterns
 */
function searchFile(
  filePath: string,
  pattern: RegExp,
  matches: CodeMatch[],
  limit: number,
  projectRoot: string
): void {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length && matches.length < limit; i++) {
      const line = lines[i];
      if (pattern.test(line)) {
        // Get context (surrounding lines)
        const contextStart = Math.max(0, i - 2);
        const contextEnd = Math.min(lines.length, i + 3);
        const context = lines.slice(contextStart, contextEnd).join('\n');

        matches.push({
          file: relative(projectRoot, filePath),
          line: i + 1,
          content: line.trim(),
          context,
          matchType: categorizeMatch(line),
        });
      }
    }
  } catch {
    // Skip unreadable files
  }
}

/**
 * Find tests related to a topic
 *
 * @param topic - Topic to search for (e.g., "useQuery", "asset")
 * @param directories - Directories to search
 * @param limit - Maximum number of results (default: 20)
 * @returns Array of test matches sorted by relevance
 *
 * @example
 * ```typescript
 * const tests = findRelatedTests('useQuery', ['/path/to/modules/chariot']);
 * ```
 */
export function findRelatedTests(
  topic: string,
  directories?: string[],
  limit: number = 20
): TestMatch[] {
  const projectRoot = getProjectRoot();
  const searchDirs = directories?.length
    ? directories
    : [join(projectRoot, 'modules')];

  const matches: TestMatch[] = [];
  const topicRegex = new RegExp(escapeRegex(topic), 'i');

  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue;
    findTestsInDirectory(dir, topicRegex, topic, matches, projectRoot);
  }

  // Sort by relevance descending
  matches.sort((a, b) => b.relevance - a.relevance);

  return matches.slice(0, limit);
}

/**
 * Recursively find test files in a directory
 */
function findTestsInDirectory(
  dir: string,
  topicRegex: RegExp,
  topic: string,
  matches: TestMatch[],
  projectRoot: string
): void {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        if (entry.name.startsWith('.')) continue;
        findTestsInDirectory(fullPath, topicRegex, topic, matches, projectRoot);
      } else if (entry.isFile()) {
        // Check if it's a test file
        const testType = getTestType(entry.name);
        if (!testType) continue;

        // Check if file name or content matches topic
        const fileMatches = topicRegex.test(entry.name);
        analyzeTestFile(fullPath, topicRegex, topic, testType, fileMatches, matches, projectRoot);
      }
    }
  } catch {
    // Skip inaccessible directories
  }
}

/**
 * Determine the type of test file
 */
function getTestType(filename: string): TestMatch['testType'] | null {
  if (TEST_PATTERNS.e2e.test(filename)) return 'e2e';
  if (TEST_PATTERNS.integration.test(filename)) return 'integration';
  if (TEST_PATTERNS.unit.test(filename)) return 'unit';
  return null;
}

/**
 * Analyze a test file for relevant tests
 */
function analyzeTestFile(
  filePath: string,
  topicRegex: RegExp,
  topic: string,
  testType: TestMatch['testType'],
  fileNameMatches: boolean,
  matches: TestMatch[],
  projectRoot: string
): void {
  try {
    const content = readFileSync(filePath, 'utf-8');

    // Look for describe blocks and it/test blocks
    const describeMatches = content.matchAll(
      /(?:describe|test\.describe)\s*\(\s*['"`]([^'"`]+)['"`]/g
    );
    const itMatches = content.matchAll(
      /(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/g
    );

    const relativePath = relative(projectRoot, filePath);
    const topicLower = topic.toLowerCase();

    // Check describe blocks
    for (const match of describeMatches) {
      const testName = match[1];
      if (topicRegex.test(testName) || fileNameMatches) {
        const relevance = calculateTestRelevance(testName, topicLower, fileNameMatches, testType);
        matches.push({
          file: relativePath,
          testName,
          testType,
          relevance,
        });
      }
    }

    // Check it/test blocks
    for (const match of itMatches) {
      const testName = match[1];
      if (topicRegex.test(testName) || fileNameMatches || topicRegex.test(content)) {
        const relevance = calculateTestRelevance(testName, topicLower, fileNameMatches, testType);
        matches.push({
          file: relativePath,
          testName,
          testType,
          relevance,
        });
      }
    }
  } catch {
    // Skip unreadable files
  }
}

/**
 * Calculate relevance score for a test
 */
function calculateTestRelevance(
  testName: string,
  topic: string,
  fileNameMatches: boolean,
  testType: TestMatch['testType']
): number {
  let score = 50; // Base score

  const testNameLower = testName.toLowerCase();

  // Exact match in test name
  if (testNameLower.includes(topic)) {
    score += 30;
  }

  // File name matches
  if (fileNameMatches) {
    score += 15;
  }

  // Test type bonus (unit tests are most relevant for implementation)
  switch (testType) {
    case 'unit':
      score += 5;
      break;
    case 'integration':
      score += 3;
      break;
    case 'e2e':
      score += 1;
      break;
  }

  return Math.min(100, score);
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
