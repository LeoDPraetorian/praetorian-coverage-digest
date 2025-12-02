/**
 * Skill Checker
 *
 * Detects phantom skills (referenced but non-existent) in agent bodies.
 * Scans .claude/skills/ and .claude/skill-library/ for valid skills.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Patterns to detect skill references in agent body text
 */
const SKILL_REFERENCE_PATTERNS = [
  /`([a-z0-9-]+)`\s+skill/gi, // `skill-name` skill
  /Use\s+([a-z0-9-]+)\s+skill/gi, // Use skill-name skill
  /skill:\s*["']([a-z0-9-]+)["']/gi, // skill: "skill-name"
  /REQUIRED\s+SKILL:\s*([a-z0-9-]+)/gi, // REQUIRED SKILL: skill-name
  /gateway-([a-z0-9-]+)/gi, // gateway-frontend -> gateway-frontend
];

/**
 * Cache for skill existence checks
 */
let skillCache: Set<string> | null = null;

/**
 * Find the repo root by looking for .claude directory
 */
function findRepoRoot(startPath: string): string | null {
  let currentPath = startPath;
  // Safety limit for deeply nested directories (typical paths are 5-15 levels deep)
  // The loop will also terminate early when reaching filesystem root
  const maxIterations = 25;

  for (let i = 0; i < maxIterations; i++) {
    const claudeDir = path.join(currentPath, '.claude');
    if (fs.existsSync(claudeDir)) {
      return currentPath;
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      // Reached filesystem root
      break;
    }
    currentPath = parentPath;
  }

  return null;
}

/**
 * Find all core skills in .claude/skills/ (flat structure)
 *
 * These are auto-discovered skills that consume the 15K token budget.
 * Valid in frontmatter: gateway-* skills + these core skills
 *
 * @param basePath - Base path to search from (defaults to cwd, walks up to find .claude)
 * @returns Array of core skill names
 */
export function findCoreSkills(basePath?: string): string[] {
  const skills: string[] = [];

  // Use provided base or find repo root
  let base = basePath || process.cwd();
  const repoRoot = findRepoRoot(base);
  if (repoRoot) {
    base = repoRoot;
  }

  // Search .claude/skills/ (core skills - flat structure)
  const coreSkillsPath = path.join(base, '.claude', 'skills');
  if (fs.existsSync(coreSkillsPath)) {
    const entries = fs.readdirSync(coreSkillsPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        // Check if it has a SKILL.md
        const skillFile = path.join(coreSkillsPath, entry.name, 'SKILL.md');
        if (fs.existsSync(skillFile)) {
          skills.push(entry.name);
        }
      }
      // Also check for direct .md files that might be skills
      if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'SKILL.md') {
        skills.push(entry.name.replace('.md', ''));
      }
    }
  }

  return [...new Set(skills)];
}

/**
 * Find all library skills in .claude/skill-library/ (nested structure)
 *
 * These are NOT auto-discovered and should NOT be in frontmatter.
 * Library skills should be referenced in the body "Skill References" section.
 *
 * @param basePath - Base path to search from (defaults to cwd, walks up to find .claude)
 * @returns Array of library skill names
 */
export function findLibrarySkills(basePath?: string): string[] {
  const skills: string[] = [];

  // Use provided base or find repo root
  let base = basePath || process.cwd();
  const repoRoot = findRepoRoot(base);
  if (repoRoot) {
    base = repoRoot;
  }

  // Search .claude/skill-library/ (library skills - nested structure)
  const libraryPath = path.join(base, '.claude', 'skill-library');
  if (fs.existsSync(libraryPath)) {
    const librarySkills = findSkillsRecursive(libraryPath);
    skills.push(...librarySkills);
  }

  return [...new Set(skills)];
}

/**
 * Find all skills in .claude/skills/ and .claude/skill-library/
 *
 * @param basePath - Base path to search from (defaults to cwd, walks up to find .claude)
 * @returns Array of skill names
 */
export function findAllSkills(basePath?: string): string[] {
  const coreSkills = findCoreSkills(basePath);
  const librarySkills = findLibrarySkills(basePath);
  return [...new Set([...coreSkills, ...librarySkills])];
}

/**
 * Recursively find skills in a directory
 */
function findSkillsRecursive(dir: string): string[] {
  const skills: string[] = [];

  if (!fs.existsSync(dir)) {
    return skills;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Check for SKILL.md in this directory
      const skillFile = path.join(fullPath, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        skills.push(entry.name);
      }
      // Recurse into subdirectories
      skills.push(...findSkillsRecursive(fullPath));
    }
  }

  return skills;
}

/**
 * Check if a skill exists
 *
 * @param skillName - Name of the skill to check
 * @param basePath - Base path to search from
 * @returns true if skill exists
 */
export function skillExists(skillName: string, basePath?: string): boolean {
  // Initialize cache if needed
  if (skillCache === null) {
    skillCache = new Set(findAllSkills(basePath));
  }

  return skillCache.has(skillName);
}

/**
 * Clear the skill cache (for testing)
 */
export function clearSkillCache(): void {
  skillCache = null;
}

/**
 * Find all skill references in agent body text
 *
 * @param body - Agent body content
 * @returns Array of referenced skill names
 */
export function findSkillReferencesInBody(body: string): string[] {
  const references: Set<string> = new Set();

  for (const pattern of SKILL_REFERENCE_PATTERNS) {
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(body)) !== null) {
      const skillName = match[1].toLowerCase();
      // Filter out common false positives
      if (
        skillName.length > 2 &&
        !skillName.includes('example') &&
        !skillName.includes('name') &&
        !skillName.includes('your')
      ) {
        // Handle gateway-X patterns (the full gateway-X is the skill)
        if (pattern.source.includes('gateway-')) {
          references.add(`gateway-${skillName}`);
        } else {
          references.add(skillName);
        }
      }
    }
  }

  return [...references];
}

/**
 * Find phantom skills (referenced but don't exist)
 *
 * @param body - Agent body content
 * @param basePath - Base path to search from
 * @returns Array of phantom skill names
 */
export function findPhantomSkills(body: string, basePath?: string): string[] {
  const references = findSkillReferencesInBody(body);
  const phantoms: string[] = [];

  for (const ref of references) {
    if (!skillExists(ref, basePath)) {
      phantoms.push(ref);
    }
  }

  return phantoms;
}

/**
 * Deprecated skills that should no longer be used
 */
export const DEPRECATED_SKILLS: Record<string, string> = {
  // 'old-skill-name': 'new-skill-name or removal reason',
};

/**
 * Check if a skill is deprecated
 *
 * @param skillName - Name of the skill
 * @returns Deprecation message if deprecated, null otherwise
 */
export function isDeprecatedSkill(skillName: string): string | null {
  return DEPRECATED_SKILLS[skillName] || null;
}

/**
 * Find deprecated skill references in agent body
 *
 * @param body - Agent body content
 * @returns Array of { skill, replacement } objects
 */
export function findDeprecatedSkillReferences(
  body: string
): Array<{ skill: string; replacement: string }> {
  const references = findSkillReferencesInBody(body);
  const deprecated: Array<{ skill: string; replacement: string }> = [];

  for (const ref of references) {
    const replacement = isDeprecatedSkill(ref);
    if (replacement) {
      deprecated.push({ skill: ref, replacement });
    }
  }

  return deprecated;
}
