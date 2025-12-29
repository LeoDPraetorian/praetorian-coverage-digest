// src/lib/skill-finder.ts
import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import { findProjectRoot } from '@chariot/lib';

const PROJECT_ROOT = findProjectRoot();
const CORE_SKILLS_DIR = join(PROJECT_ROOT, '.claude/skills');
const LIBRARY_SKILLS_DIR = join(PROJECT_ROOT, '.claude/skill-library');

export type SkillLocation = 'core' | 'library';

export interface SkillInfo {
  name: string;
  path: string;
  location: SkillLocation;
  frontmatter: any;
}

/**
 * Find a skill by name in either core or library locations
 */
export function findSkill(name: string): SkillInfo | null {
  // Try core first
  const corePath = join(CORE_SKILLS_DIR, name, 'SKILL.md');
  if (existsSync(corePath)) {
    const content = readFileSync(corePath, 'utf-8');
    const { data: frontmatter } = matter(content);
    return {
      name,
      path: corePath,
      location: 'core',
      frontmatter,
    };
  }

  // Try library (nested structure - need to search recursively)
  const librarySkill = findInLibrary(name);
  if (librarySkill) {
    return librarySkill;
  }

  return null;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Find skills similar to the given name (for "did you mean?" suggestions)
 */
export function findSimilarSkills(name: string, maxSuggestions: number = 3): SkillInfo[] {
  const allSkills = listAllSkills();
  const scored = allSkills.map(skill => ({
    skill,
    distance: levenshteinDistance(name.toLowerCase(), skill.name.toLowerCase()),
  }));

  // Sort by distance and filter to reasonable matches (distance < 5)
  return scored
    .filter(s => s.distance < 5 && s.distance > 0)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxSuggestions)
    .map(s => s.skill);
}

/**
 * Recursively search library for skill by name
 */
function findInLibrary(name: string, searchDir: string = LIBRARY_SKILLS_DIR): SkillInfo | null {
  if (!existsSync(searchDir)) {
    return null;
  }

  const entries = readdirSync(searchDir);

  for (const entry of entries) {
    const fullPath = join(searchDir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Check if this directory is the skill directory
      const skillFilePath = join(fullPath, 'SKILL.md');
      if (existsSync(skillFilePath) && entry === name) {
        const content = readFileSync(skillFilePath, 'utf-8');
        const { data: frontmatter } = matter(content);
        return {
          name,
          path: skillFilePath,
          location: 'library',
          frontmatter,
        };
      }

      // Recurse into subdirectory
      const found = findInLibrary(name, fullPath);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

/**
 * List all skills from both core and library locations
 */
export function listAllSkills(locationFilter?: SkillLocation): SkillInfo[] {
  const skills: SkillInfo[] = [];

  // Add core skills
  if (!locationFilter || locationFilter === 'core') {
    if (existsSync(CORE_SKILLS_DIR)) {
      const coreSkills = listSkillsInDirectory(CORE_SKILLS_DIR, 'core');
      skills.push(...coreSkills);
    }
  }

  // Add library skills
  if (!locationFilter || locationFilter === 'library') {
    if (existsSync(LIBRARY_SKILLS_DIR)) {
      const librarySkills = listLibrarySkillsRecursive(LIBRARY_SKILLS_DIR);
      skills.push(...librarySkills);
    }
  }

  return skills;
}

/**
 * List skills in a flat directory structure (core skills)
 */
function listSkillsInDirectory(dir: string, location: SkillLocation): SkillInfo[] {
  const skills: SkillInfo[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const skillDir = join(dir, entry);
    const skillFile = join(skillDir, 'SKILL.md');

    if (statSync(skillDir).isDirectory() && existsSync(skillFile)) {
      try {
        const content = readFileSync(skillFile, 'utf-8');
        const { data: frontmatter } = matter(content);
        skills.push({
          name: entry,
          path: skillFile,
          location,
          frontmatter,
        });
      } catch (error) {
        // Skip skills with parsing errors
      }
    }
  }

  return skills;
}

/**
 * Recursively list skills in library (nested structure)
 */
function listLibrarySkillsRecursive(dir: string): SkillInfo[] {
  const skills: SkillInfo[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip .archived directory
      if (entry === '.archived') {
        continue;
      }

      // Check if this directory contains SKILL.md
      const skillFilePath = join(fullPath, 'SKILL.md');
      if (existsSync(skillFilePath)) {
        try {
          const content = readFileSync(skillFilePath, 'utf-8');
          const { data: frontmatter } = matter(content);
          skills.push({
            name: entry,
            path: skillFilePath,
            location: 'library',
            frontmatter,
          });
        } catch (error) {
          // Skip skills with parsing errors
        }
      }

      // Recurse into subdirectory
      const nestedSkills = listLibrarySkillsRecursive(fullPath);
      skills.push(...nestedSkills);
    }
  }

  return skills;
}
