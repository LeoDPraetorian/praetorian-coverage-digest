// src/phases/codebase.ts
/**
 * Codebase Research Phase - Orchestrate codebase analysis for skill creation
 *
 * This phase analyzes the existing codebase to find:
 * - Similar existing skills (patterns to follow)
 * - Relevant modules (where to search for code)
 * - Code patterns and usage examples
 * - Project conventions and standards
 * - Related tests for reference
 *
 * The output helps Claude generate skills that match existing patterns
 * and integrate well with the codebase.
 */

import { findProjectRoot } from '../../../../../lib/find-project-root.js';
import type { CodebasePatterns } from '../lib/types.js';
import {
  discoverSubmodules,
  findRelevantSubmodules,
  extractKeywords,
  _setProjectRoot as setSubmoduleRoot,
  _resetProjectRoot as resetSubmoduleRoot,
} from '../lib/submodule-discovery.js';
import {
  findSimilarSkills,
  _setProjectRoot as setSkillsRoot,
  _resetProjectRoot as resetSkillsRoot,
} from '../lib/similar-skills.js';
import {
  searchCodePatterns,
  findRelatedTests,
  _setProjectRoot as setSearchRoot,
  _resetProjectRoot as resetSearchRoot,
} from '../lib/codebase-search.js';
import {
  extractConventions,
  _setProjectRoot as setConventionsRoot,
  _resetProjectRoot as resetConventionsRoot,
} from '../lib/conventions.js';

// Allow overriding project root for testing
let projectRootOverride: string | null = null;

/**
 * Set a custom project root for testing
 */
export function _setProjectRoot(root: string): void {
  projectRootOverride = root;
  // Also set in all sub-modules
  setSubmoduleRoot(root);
  setSkillsRoot(root);
  setSearchRoot(root);
  setConventionsRoot(root);
}

/**
 * Reset to default project root detection
 */
export function _resetProjectRoot(): void {
  projectRootOverride = null;
  resetSubmoduleRoot();
  resetSkillsRoot();
  resetSearchRoot();
  resetConventionsRoot();
}

/**
 * Get the current project root (with override support)
 */
function getProjectRoot(): string {
  return projectRootOverride || findProjectRoot();
}

// Result limits to prevent context overflow
const LIMITS = {
  similarSkills: 10,
  codeMatches: 50,
  testMatches: 20,
  submodules: 20,
};

/**
 * Run codebase research phase
 *
 * Analyzes the codebase to gather context for skill creation.
 * This includes finding similar skills, relevant code patterns,
 * project conventions, and related tests.
 *
 * @param topic - Research topic (e.g., "react hooks", "tanstack query")
 * @returns Codebase patterns and analysis
 *
 * @example
 * ```typescript
 * const patterns = await runCodebaseResearch('tanstack query');
 * console.log(patterns.similarSkills[0].name); // 'frontend-tanstack'
 * console.log(patterns.conventions.testingPatterns);
 * ```
 */
export async function runCodebaseResearch(
  topic: string
): Promise<CodebasePatterns> {
  const projectRoot = getProjectRoot();

  // 1. Extract keywords for searching
  const keywords = extractKeywords(topic);

  // 2. Find similar existing skills
  const similarSkills = findSimilarSkills(topic, LIMITS.similarSkills);

  // 3. Discover and filter relevant submodules
  const allSubmodules = discoverSubmodules();
  const relevantSubmodules = topic
    ? findRelevantSubmodules(topic, allSubmodules).slice(0, LIMITS.submodules)
    : allSubmodules.slice(0, LIMITS.submodules);

  // 4. Build list of directories to search
  const searchDirectories = relevantSubmodules.map(m => m.path);

  // 5. Search for related code patterns
  let relatedCode: CodebasePatterns['relatedCode'] = [];
  if (keywords.length > 0) {
    // Search for each keyword, collecting unique matches
    const allMatches = new Map<string, CodebasePatterns['relatedCode'][number]>();

    for (const keyword of keywords.slice(0, 3)) { // Limit keywords to prevent explosion
      const matches = searchCodePatterns(keyword, searchDirectories, 20);
      for (const match of matches) {
        const key = `${match.file}:${match.line}`;
        if (!allMatches.has(key)) {
          allMatches.set(key, match);
        }
      }
    }

    relatedCode = Array.from(allMatches.values()).slice(0, LIMITS.codeMatches);
  }

  // 6. Find related tests
  let relatedTests: CodebasePatterns['relatedTests'] = [];
  if (keywords.length > 0) {
    const allTests = new Map<string, CodebasePatterns['relatedTests'][number]>();

    for (const keyword of keywords.slice(0, 3)) {
      const tests = findRelatedTests(keyword, searchDirectories, 10);
      for (const test of tests) {
        const key = `${test.file}:${test.testName}`;
        if (!allTests.has(key)) {
          allTests.set(key, test);
        }
      }
    }

    relatedTests = Array.from(allTests.values())
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, LIMITS.testMatches);
  }

  // 7. Extract project conventions
  const conventions = extractConventions();

  return {
    similarSkills,
    relatedCode,
    conventions,
    relatedTests,
    submodules: relevantSubmodules.map(s => ({
      name: s.name,
      path: s.path,
      purpose: s.purpose,
      keywords: s.keywords,
      languages: s.languages,
      hasClaudeMd: s.hasClaudeMd,
    })),
  };
}

/**
 * Generate a summary of codebase research for display
 *
 * @param patterns - Codebase patterns from research
 * @returns Formatted summary string
 */
export function summarizeCodebaseResearch(patterns: CodebasePatterns): string {
  const lines: string[] = [];

  lines.push('## Codebase Research Summary');
  lines.push('');

  // Similar skills
  if (patterns.similarSkills.length > 0) {
    lines.push(`### Similar Skills (${patterns.similarSkills.length})`);
    for (const skill of patterns.similarSkills.slice(0, 5)) {
      lines.push(`- ${skill.name} (${skill.similarity}% match)`);
      if (skill.structure.hasReferences) {
        lines.push(`  - Has references/: ${skill.structure.referenceFiles.length} files`);
      }
      if (skill.structure.hasTemplates) {
        lines.push(`  - Has templates/: ${skill.structure.templateFiles.length} files`);
      }
    }
    lines.push('');
  }

  // Relevant submodules
  if (patterns.submodules.length > 0) {
    lines.push(`### Relevant Modules (${patterns.submodules.length})`);
    for (const module of patterns.submodules.slice(0, 5)) {
      lines.push(`- ${module.name}: ${module.purpose.slice(0, 60)}...`);
      lines.push(`  - Languages: ${module.languages.join(', ')}`);
    }
    lines.push('');
  }

  // Code patterns
  if (patterns.relatedCode.length > 0) {
    lines.push(`### Code Patterns Found (${patterns.relatedCode.length})`);
    const byType = {
      import: 0,
      definition: 0,
      usage: 0,
      pattern: 0,
    };
    for (const match of patterns.relatedCode) {
      byType[match.matchType]++;
    }
    lines.push(`- Imports: ${byType.import}`);
    lines.push(`- Definitions: ${byType.definition}`);
    lines.push(`- Usage patterns: ${byType.usage}`);
    lines.push(`- Type patterns: ${byType.pattern}`);
    lines.push('');
  }

  // Related tests
  if (patterns.relatedTests.length > 0) {
    lines.push(`### Related Tests (${patterns.relatedTests.length})`);
    const byType = {
      unit: 0,
      integration: 0,
      e2e: 0,
    };
    for (const test of patterns.relatedTests) {
      byType[test.testType]++;
    }
    lines.push(`- Unit tests: ${byType.unit}`);
    lines.push(`- Integration tests: ${byType.integration}`);
    lines.push(`- E2E tests: ${byType.e2e}`);
    lines.push('');
  }

  // Conventions
  const conventionCount =
    patterns.conventions.namingPatterns.length +
    patterns.conventions.fileOrganization.length +
    patterns.conventions.codingStandards.length +
    patterns.conventions.testingPatterns.length +
    patterns.conventions.securityPatterns.length;

  if (conventionCount > 0) {
    lines.push(`### Project Conventions (${conventionCount})`);
    lines.push(`- Source: ${patterns.conventions.source}`);
    if (patterns.conventions.namingPatterns.length > 0) {
      lines.push(`- Naming: ${patterns.conventions.namingPatterns.length} patterns`);
    }
    if (patterns.conventions.testingPatterns.length > 0) {
      lines.push(`- Testing: ${patterns.conventions.testingPatterns.length} patterns`);
    }
    if (patterns.conventions.securityPatterns.length > 0) {
      lines.push(`- Security: ${patterns.conventions.securityPatterns.length} patterns`);
    }
  }

  return lines.join('\n');
}
