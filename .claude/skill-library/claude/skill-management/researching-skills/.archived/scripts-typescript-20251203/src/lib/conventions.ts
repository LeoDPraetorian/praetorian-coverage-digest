// src/lib/conventions.ts
/**
 * Project Conventions Extraction - Extract coding standards from documentation
 *
 * Scans CLAUDE.md, DESIGN-PATTERNS.md, and module documentation to extract
 * project conventions including naming patterns, file organization, coding
 * standards, testing patterns, and security patterns.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { findProjectRoot } from '../../../../../lib/find-project-root.js';
import type { ProjectConventions } from './types.js';

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

// Section patterns to look for conventions
const SECTION_PATTERNS = {
  naming: [
    'naming conventions', 'naming patterns', 'naming',
    'file naming', 'code naming', 'naming standards'
  ],
  fileOrg: [
    'file organization', 'code organization', 'module structure',
    'directory structure', 'project structure', 'architecture',
    'folder structure', 'organization'
  ],
  coding: [
    'code style', 'coding standards', 'coding conventions',
    'code conventions', 'style guidelines', 'code guidelines',
    'development standards', 'code patterns'
  ],
  testing: [
    'testing', 'test patterns', 'testing standards',
    'test conventions', 'testing guidelines', 'testing strategy'
  ],
  security: [
    'security', 'security patterns', 'security guidelines',
    'security standards', 'authentication', 'authorization',
    'input validation', 'secure coding'
  ],
};

/**
 * Extract a section from markdown content by heading
 *
 * @param content - Full markdown content
 * @param heading - Section heading to extract
 * @returns Section content (excluding the heading itself)
 */
export function extractSection(content: string, heading: string): string {
  const lines = content.split('\n');
  const headingLower = heading.toLowerCase();

  let capturing = false;
  let headingLevel = 0;
  const sectionLines: string[] = [];

  for (const line of lines) {
    // Check for heading match
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2].toLowerCase().trim();

      if (capturing) {
        // Stop if we hit a heading at the same or higher level
        if (level <= headingLevel) {
          break;
        }
        // Include nested headings
        sectionLines.push(line);
      } else if (title.includes(headingLower) || headingLower.includes(title)) {
        // Start capturing
        capturing = true;
        headingLevel = level;
      }
    } else if (capturing) {
      sectionLines.push(line);
    }
  }

  return sectionLines.join('\n').trim();
}

/**
 * Find all convention documents in the project
 *
 * @returns Array of file paths to convention documents
 */
export function findConventionDocuments(): string[] {
  const projectRoot = getProjectRoot();
  const docs: string[] = [];

  // Check root-level CLAUDE.md
  const rootClaude = join(projectRoot, 'CLAUDE.md');
  if (existsSync(rootClaude)) {
    docs.push(rootClaude);
  }

  // Check docs/ directory
  const docsDir = join(projectRoot, 'docs');
  if (existsSync(docsDir) && statSync(docsDir).isDirectory()) {
    const docFiles = ['DESIGN-PATTERNS.md', 'TECH-STACK.md', 'CLEAN_CODE.md'];
    for (const file of docFiles) {
      const path = join(docsDir, file);
      if (existsSync(path)) {
        docs.push(path);
      }
    }
  }

  // Check modules/ for CLAUDE.md files
  const modulesDir = join(projectRoot, 'modules');
  if (existsSync(modulesDir) && statSync(modulesDir).isDirectory()) {
    try {
      const modules = readdirSync(modulesDir, { withFileTypes: true });
      for (const module of modules) {
        if (!module.isDirectory()) continue;
        if (module.name.startsWith('.')) continue;

        const moduleClaude = join(modulesDir, module.name, 'CLAUDE.md');
        if (existsSync(moduleClaude)) {
          docs.push(moduleClaude);
        }
      }
    } catch {
      // Ignore errors
    }
  }

  return docs;
}

/**
 * Extract list items from markdown content
 */
function extractListItems(content: string): string[] {
  const items: string[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    // Match list items (- or * or numbered)
    const listMatch = line.match(/^\s*[-*]\s+(.+)$/);
    const numberedMatch = line.match(/^\s*\d+\.\s+(.+)$/);

    if (listMatch) {
      items.push(listMatch[1].trim());
    } else if (numberedMatch) {
      items.push(numberedMatch[1].trim());
    }
  }

  return items;
}

/**
 * Extract patterns matching any of the given section names
 */
function extractPatternsForSections(
  content: string,
  sectionNames: string[]
): string[] {
  const patterns: string[] = [];

  for (const sectionName of sectionNames) {
    const section = extractSection(content, sectionName);
    if (section) {
      const items = extractListItems(section);
      patterns.push(...items);
    }
  }

  return patterns;
}

/**
 * Deduplicate patterns by similarity
 */
function deduplicatePatterns(patterns: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const pattern of patterns) {
    // Normalize for comparison
    const normalized = pattern.toLowerCase().trim();

    // Skip if we've seen something very similar
    let isDuplicate = false;
    for (const existing of seen) {
      if (
        normalized === existing ||
        normalized.includes(existing) ||
        existing.includes(normalized)
      ) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      seen.add(normalized);
      result.push(pattern);
    }
  }

  return result;
}

/**
 * Extract project conventions from documentation
 *
 * @returns Project conventions extracted from all documentation
 *
 * @example
 * ```typescript
 * const conventions = extractConventions();
 * console.log(conventions.namingPatterns);
 * console.log(conventions.testingPatterns);
 * ```
 */
export function extractConventions(): ProjectConventions {
  const docs = findConventionDocuments();

  if (docs.length === 0) {
    return {
      namingPatterns: [],
      fileOrganization: [],
      codingStandards: [],
      testingPatterns: [],
      securityPatterns: [],
      source: 'none',
    };
  }

  const allNaming: string[] = [];
  const allFileOrg: string[] = [];
  const allCoding: string[] = [];
  const allTesting: string[] = [];
  const allSecurity: string[] = [];

  for (const docPath of docs) {
    try {
      const content = readFileSync(docPath, 'utf-8');

      // Extract patterns for each category
      allNaming.push(...extractPatternsForSections(content, SECTION_PATTERNS.naming));
      allFileOrg.push(...extractPatternsForSections(content, SECTION_PATTERNS.fileOrg));
      allCoding.push(...extractPatternsForSections(content, SECTION_PATTERNS.coding));
      allTesting.push(...extractPatternsForSections(content, SECTION_PATTERNS.testing));
      allSecurity.push(...extractPatternsForSections(content, SECTION_PATTERNS.security));
    } catch {
      // Skip unreadable files
    }
  }

  return {
    namingPatterns: deduplicatePatterns(allNaming),
    fileOrganization: deduplicatePatterns(allFileOrg),
    codingStandards: deduplicatePatterns(allCoding),
    testingPatterns: deduplicatePatterns(allTesting),
    securityPatterns: deduplicatePatterns(allSecurity),
    source: docs.join(', '),
  };
}
