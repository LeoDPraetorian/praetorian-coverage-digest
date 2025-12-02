// src/lib/similar-skills.ts
/**
 * Similar Skills Discovery - Find and analyze existing skills for patterns
 *
 * Scans core skills (.claude/skills/) and library skills (.claude/skill-library/)
 * to find skills similar to a search query. Used to identify structural patterns
 * and existing implementations during skill creation.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { findProjectRoot } from '../../../../../lib/find-project-root.js';
import type { SimilarSkill, SkillFrontmatter, SkillStructure } from './types.js';
import { extractKeywords } from './submodule-discovery.js';

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
 * Parse YAML frontmatter from SKILL.md content
 *
 * @param content - Full file content including frontmatter
 * @returns Parsed frontmatter object
 *
 * @example
 * ```typescript
 * const fm = parseSkillFrontmatter(fileContent);
 * console.log(fm.name, fm.description);
 * ```
 */
export function parseSkillFrontmatter(content: string): SkillFrontmatter {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    return { name: '', description: '' };
  }

  const yaml = frontmatterMatch[1];
  const result: SkillFrontmatter = { name: '', description: '' };

  // Parse name
  const nameMatch = yaml.match(/^name:\s*(.+)$/m);
  if (nameMatch) {
    result.name = nameMatch[1].trim();
  }

  // Parse description
  const descMatch = yaml.match(/^description:\s*(.+)$/m);
  if (descMatch) {
    result.description = descMatch[1].trim();
  }

  // Parse allowed-tools (can be comma-separated or array)
  const toolsMatch = yaml.match(/^allowed-tools:\s*(.+)$/m);
  if (toolsMatch) {
    const toolsValue = toolsMatch[1].trim();
    if (!toolsValue.startsWith('-')) {
      // Comma-separated
      result.allowedTools = toolsValue.split(',').map(t => t.trim());
    }
  }

  // Check for array format allowed-tools
  const toolsArrayMatch = yaml.match(/^allowed-tools:\s*\n((?:\s+-\s*.+\n?)+)/m);
  if (toolsArrayMatch) {
    const toolLines = toolsArrayMatch[1].match(/-\s*(.+)/g) || [];
    result.allowedTools = toolLines.map(line => line.replace(/^-\s*/, '').trim());
  }

  // Parse skills (can be comma-separated or array)
  const skillsMatch = yaml.match(/^skills:\s*(.+)$/m);
  if (skillsMatch) {
    const skillsValue = skillsMatch[1].trim();
    if (!skillsValue.startsWith('-')) {
      // Comma-separated or single value
      result.skills = skillsValue.split(',').map(s => s.trim());
    }
  }

  // Check for array format skills
  const skillsArrayMatch = yaml.match(/^skills:\s*\n((?:\s+-\s*.+\n?)+)/m);
  if (skillsArrayMatch) {
    const skillLines = skillsArrayMatch[1].match(/-\s*(.+)/g) || [];
    result.skills = skillLines.map(line => line.replace(/^-\s*/, '').trim());
  }

  return result;
}

/**
 * Analyze the structure of a skill directory
 *
 * @param skillDir - Path to skill directory
 * @returns Structure analysis with directories and line count
 */
export function analyzeSkillStructure(skillDir: string): SkillStructure {
  const structure: SkillStructure = {
    hasReferences: false,
    hasTemplates: false,
    hasExamples: false,
    hasScripts: false,
    referenceFiles: [],
    templateFiles: [],
    exampleFiles: [],
    lineCount: 0,
  };

  // Check for references/
  const referencesDir = join(skillDir, 'references');
  if (existsSync(referencesDir) && statSync(referencesDir).isDirectory()) {
    structure.hasReferences = true;
    try {
      structure.referenceFiles = readdirSync(referencesDir)
        .filter(f => !f.startsWith('.'));
    } catch {
      // Ignore errors
    }
  }

  // Check for templates/
  const templatesDir = join(skillDir, 'templates');
  if (existsSync(templatesDir) && statSync(templatesDir).isDirectory()) {
    structure.hasTemplates = true;
    try {
      structure.templateFiles = readdirSync(templatesDir)
        .filter(f => !f.startsWith('.'));
    } catch {
      // Ignore errors
    }
  }

  // Check for examples/
  const examplesDir = join(skillDir, 'examples');
  if (existsSync(examplesDir) && statSync(examplesDir).isDirectory()) {
    structure.hasExamples = true;
    try {
      structure.exampleFiles = readdirSync(examplesDir)
        .filter(f => !f.startsWith('.'));
    } catch {
      // Ignore errors
    }
  }

  // Check for scripts/
  const scriptsDir = join(skillDir, 'scripts');
  if (existsSync(scriptsDir) && statSync(scriptsDir).isDirectory()) {
    structure.hasScripts = true;
  }

  // Count lines in SKILL.md
  const skillMdPath = join(skillDir, 'SKILL.md');
  if (existsSync(skillMdPath)) {
    try {
      const content = readFileSync(skillMdPath, 'utf-8');
      structure.lineCount = content.split('\n').length;
    } catch {
      structure.lineCount = 0;
    }
  }

  return structure;
}

/**
 * Get all skills from core and library locations
 *
 * @returns Array of all discovered skills with metadata
 */
export function getAllSkills(): SimilarSkill[] {
  const projectRoot = getProjectRoot();
  const skills: SimilarSkill[] = [];

  // Scan core skills (.claude/skills/)
  const coreSkillsDir = join(projectRoot, '.claude', 'skills');
  if (existsSync(coreSkillsDir)) {
    const coreSkills = scanSkillDirectory(coreSkillsDir, 'core');
    skills.push(...coreSkills);
  }

  // Scan library skills (.claude/skill-library/) - recursive
  const libraryDir = join(projectRoot, '.claude', 'skill-library');
  if (existsSync(libraryDir)) {
    const librarySkills = scanSkillLibrary(libraryDir);
    skills.push(...librarySkills);
  }

  return skills;
}

/**
 * Scan a directory for skill folders (non-recursive)
 */
function scanSkillDirectory(
  dir: string,
  location: 'core' | 'library'
): SimilarSkill[] {
  const skills: SimilarSkill[] = [];

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue;

      const skillPath = join(dir, entry.name);
      const skillMdPath = join(skillPath, 'SKILL.md');

      if (!existsSync(skillMdPath)) continue;

      const skill = loadSkill(skillPath, location);
      if (skill) {
        skills.push(skill);
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return skills;
}

/**
 * Recursively scan skill library for skills
 */
function scanSkillLibrary(dir: string): SimilarSkill[] {
  const skills: SimilarSkill[] = [];

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue;

      const subPath = join(dir, entry.name);
      const skillMdPath = join(subPath, 'SKILL.md');

      // If this directory has SKILL.md, it's a skill
      if (existsSync(skillMdPath)) {
        const skill = loadSkill(subPath, 'library');
        if (skill) {
          skills.push(skill);
        }
      } else {
        // Otherwise, recurse into subdirectories
        const subSkills = scanSkillLibrary(subPath);
        skills.push(...subSkills);
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return skills;
}

/**
 * Load a single skill from its directory
 */
function loadSkill(
  skillPath: string,
  location: 'core' | 'library'
): SimilarSkill | null {
  const skillMdPath = join(skillPath, 'SKILL.md');

  try {
    const content = readFileSync(skillMdPath, 'utf-8');
    const frontmatter = parseSkillFrontmatter(content);
    const structure = analyzeSkillStructure(skillPath);

    // Use directory name as fallback for name
    const name = frontmatter.name || basename(skillPath);

    return {
      name,
      path: skillPath,
      location,
      similarity: 0, // Will be calculated by findSimilarSkills
      structure,
      frontmatter,
    };
  } catch {
    return null;
  }
}

/**
 * Calculate similarity score between query keywords and a skill
 *
 * @param queryKeywords - Keywords extracted from search query
 * @param skill - Skill to score
 * @returns Similarity score (0-100)
 */
export function calculateSimilarity(
  queryKeywords: string[],
  skill: SimilarSkill
): number {
  if (queryKeywords.length === 0) return 0;

  let score = 0;
  const nameLower = skill.name.toLowerCase();
  const descLower = skill.frontmatter.description.toLowerCase();

  // Extract keywords from skill name and description
  const skillKeywords = new Set([
    ...extractKeywords(skill.name.replace(/-/g, ' ')),
    ...extractKeywords(skill.frontmatter.description),
  ]);

  for (const qk of queryKeywords) {
    const qkLower = qk.toLowerCase();

    // Exact match in name (highest weight)
    if (nameLower.includes(qkLower)) {
      score += 30;
    }

    // Exact match in description
    if (descLower.includes(qkLower)) {
      score += 20;
    }

    // Keyword overlap
    if (skillKeywords.has(qkLower)) {
      score += 15;
    } else {
      // Partial keyword match
      for (const sk of skillKeywords) {
        if (sk.includes(qkLower) || qkLower.includes(sk)) {
          score += 5;
          break;
        }
      }
    }
  }

  // Normalize by number of query keywords
  const normalizedScore = Math.min(100, Math.round(score / queryKeywords.length));

  return normalizedScore;
}

/**
 * Find skills similar to a search query
 *
 * @param query - Search query (e.g., "react frontend hooks")
 * @param limit - Maximum number of results (default: 10)
 * @returns Skills sorted by similarity score, filtered to non-zero matches
 *
 * @example
 * ```typescript
 * const similar = findSimilarSkills('react state management');
 * console.log(similar[0].name); // 'frontend-zustand'
 * ```
 */
export function findSimilarSkills(
  query: string,
  limit: number = 10
): SimilarSkill[] {
  const allSkills = getAllSkills();
  const queryKeywords = extractKeywords(query);

  if (queryKeywords.length === 0) {
    return [];
  }

  // Calculate similarity for all skills
  const scoredSkills = allSkills.map(skill => ({
    ...skill,
    similarity: calculateSimilarity(queryKeywords, skill),
  }));

  // Filter to non-zero and sort by similarity descending
  return scoredSkills
    .filter(s => s.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
