/**
 * Phase 19: Path Resolution Validation (Hybrid)
 * Validates all paths in gateway routing tables exist on filesystem.
 *
 * Hybrid behavior:
 * - No deterministic auto-fix (removal could break gateway functionality)
 * - AMBIGUOUS: Fuzzy match broken paths against existing skill paths
 *   - Options: fix to similar path, remove entry, mark for creation
 */

import type {
  SkillFile,
  Issue,
  PhaseResult,
  Phase19AmbiguousCase,
  HybridFixOption,
  FuzzyMatch
} from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, basename, dirname } from 'path';
import { findProjectRoot } from '@chariot/lib';

const PROJECT_ROOT = findProjectRoot();

export class Phase19PathResolution {
  /**
   * Check if skill is a gateway skill
   */
  private static isGatewaySkill(skill: SkillFile): boolean {
    return skill.name.startsWith('gateway-');
  }

  /**
   * Extract all .claude/skill-library paths from content
   */
  private static extractPaths(content: string): string[] {
    // Match patterns like .claude/skill-library/.../SKILL.md
    const pathPattern = /\.claude\/skill-library\/[^\s`"')\]]+SKILL\.md/g;
    const matches = content.match(pathPattern) || [];

    // Deduplicate paths
    return [...new Set(matches)];
  }

  /**
   * Check if a path exists on filesystem
   */
  private static pathExists(relativePath: string): boolean {
    const absolutePath = resolve(PROJECT_ROOT, relativePath);
    return existsSync(absolutePath);
  }

  /**
   * Validate path resolution for a single skill
   */
  static validate(skill: SkillFile): Issue[] {
    const issues: Issue[] = [];

    // Only validate gateway skills
    if (!this.isGatewaySkill(skill)) {
      return issues;
    }

    const { content } = skill;
    const paths = this.extractPaths(content);

    if (paths.length === 0) {
      issues.push({
        severity: 'WARNING',
        message: 'Gateway has no skill library paths (expected routing table with paths)',
        autoFixable: false,
      });
      return issues;
    }

    // Check each path
    const brokenPaths: string[] = [];
    for (const path of paths) {
      if (!this.pathExists(path)) {
        brokenPaths.push(path);
      }
    }

    if (brokenPaths.length > 0) {
      issues.push({
        severity: 'CRITICAL',
        message: `Found ${brokenPaths.length} broken path(s) - skills don't exist or were renamed`,
        recommendation: 'Fix paths to point to existing skills or remove broken entries from routing table',
        context: brokenPaths,
        autoFixable: true, // Can auto-remove broken entries
      });
    }

    return issues;
  }

  /**
   * Run Phase 19 audit on all skills (backward compatible - parses files)
   */
  static async run(skillsDir: string): Promise<PhaseResult> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    const skills = await Promise.all(skillPaths.map(p => SkillParser.parseSkillFile(p)));
    return this.runOnParsedSkills(skills);
  }

  /**
   * Run Phase 19 audit on pre-parsed skills (performance optimized)
   */
  static async runOnParsedSkills(skills: SkillFile[]): Promise<PhaseResult> {
    let skillsAffected = 0;
    let issuesFound = 0;
    const details: string[] = [];

    for (const skill of skills) {
      // Only audit gateway skills
      if (!this.isGatewaySkill(skill)) {
        continue;
      }

      const issues = this.validate(skill);

      if (issues.length > 0) {
        skillsAffected++;
        issuesFound += issues.length;

        details.push(`${skill.name}:`);
        for (const issue of issues) {
          details.push(`  - [${issue.severity}] ${issue.message}`);
        }
      }
    }

    return {
      phaseName: 'Phase 19: Path Resolution',
      skillsAffected,
      issuesFound,
      issuesFixed: 0,
      details,
    };
  }

  /**
   * HYBRID: Generate fix suggestions for broken gateway paths
   * All cases are ambiguous - no deterministic auto-fix for gateway paths
   */
  static async suggestFixes(skill: SkillFile): Promise<Phase19AmbiguousCase[]> {
    const suggestions: Phase19AmbiguousCase[] = [];

    // Only process gateway skills
    if (!this.isGatewaySkill(skill)) {
      return suggestions;
    }

    const paths = this.extractPaths(skill.content);
    const brokenPaths: string[] = [];

    for (const path of paths) {
      if (!this.pathExists(path)) {
        brokenPaths.push(path);
      }
    }

    if (brokenPaths.length === 0) {
      return suggestions;
    }

    // Get all existing skill paths for fuzzy matching
    const existingPaths = await this.getAllSkillPaths();

    for (const brokenPath of brokenPaths) {
      const skillName = this.extractSkillNameFromPath(brokenPath);
      const fuzzyMatches = this.fuzzyMatchPath(brokenPath, existingPaths);

      // Build options
      const options: HybridFixOption[] = [];

      // Add fuzzy match options
      for (const match of fuzzyMatches.slice(0, 3)) {
        if (match.path) {
          options.push({
            key: 'fix',
            label: `Fix to: ${basename(dirname(match.path))}`,
            description: `${Math.round(match.score * 100)}% match - ${match.path}`,
            value: `${brokenPath}:${match.path}`
          });
        }
      }

      options.push({
        key: 'remove',
        label: 'Remove from gateway',
        description: 'Delete this entry from the routing table',
        value: brokenPath
      });

      options.push({
        key: 'create',
        label: 'Mark for creation',
        description: 'Add TODO comment - skill needs to be created',
        value: brokenPath
      });

      suggestions.push({
        phase: 19,
        type: 'broken-gateway-path',
        context: `Gateway path "${brokenPath}" doesn't exist`,
        options,
        brokenPath,
        skillName,
        fuzzyMatches
      });
    }

    return suggestions;
  }

  /**
   * Extract skill name from a path like .claude/skill-library/.../skill-name/SKILL.md
   */
  private static extractSkillNameFromPath(path: string): string {
    // Path format: .claude/skill-library/category/.../skill-name/SKILL.md
    const parts = path.split('/');
    // The skill name is the second-to-last part (before SKILL.md)
    return parts.length >= 2 ? parts[parts.length - 2] : path;
  }

  /**
   * Get all existing skill paths in the skill-library
   */
  private static async getAllSkillPaths(): Promise<string[]> {
    const skillLibraryPath = resolve(PROJECT_ROOT, '.claude', 'skill-library');
    const paths: string[] = [];

    const findSkillsRecursive = (dir: string) => {
      try {
        const entries = readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            const subDir = resolve(dir, entry.name);
            const skillPath = resolve(subDir, 'SKILL.md');

            if (existsSync(skillPath)) {
              // Convert absolute path to relative .claude/skill-library/... format
              const relativePath = skillPath.replace(PROJECT_ROOT + '/', '');
              paths.push(relativePath);
            } else {
              // Not a skill directory, search deeper
              findSkillsRecursive(subDir);
            }
          }
        }
      } catch {
        // Directory not readable
      }
    };

    findSkillsRecursive(skillLibraryPath);
    return paths;
  }

  /**
   * Fuzzy match a broken path against existing skill paths
   */
  private static fuzzyMatchPath(brokenPath: string, existingPaths: string[]): FuzzyMatch[] {
    const brokenSkillName = this.extractSkillNameFromPath(brokenPath);
    const matches: FuzzyMatch[] = [];

    for (const existingPath of existingPaths) {
      const existingSkillName = this.extractSkillNameFromPath(existingPath);

      // Calculate similarity based on skill name
      const nameScore = this.calculateSimilarity(
        brokenSkillName.toLowerCase(),
        existingSkillName.toLowerCase()
      );

      // Also consider path similarity (for category matches)
      const pathScore = this.calculateSimilarity(
        brokenPath.toLowerCase(),
        existingPath.toLowerCase()
      );

      // Weighted average: name is more important
      const score = nameScore * 0.7 + pathScore * 0.3;

      if (score > 0.5) {
        matches.push({
          name: existingSkillName,
          score,
          path: existingPath
        });
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   */
  private static calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    const matrix: number[][] = [];

    for (let i = 0; i <= a.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const distance = matrix[a.length][b.length];
    const maxLength = Math.max(a.length, b.length);
    return 1 - distance / maxLength;
  }

  /**
   * Apply a hybrid fix decision
   */
  static applyHybridFix(
    skillPath: string,
    action: 'fix' | 'remove' | 'create',
    value: string
  ): { success: boolean; message: string } {
    try {
      let content = readFileSync(skillPath, 'utf-8');

      switch (action) {
        case 'fix': {
          // value format: "oldPath:newPath"
          const [oldPath, newPath] = value.split(':');
          if (!oldPath || !newPath) {
            return { success: false, message: 'Invalid fix format. Expected "oldPath:newPath"' };
          }
          content = content.replace(
            new RegExp(oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            newPath
          );
          writeFileSync(skillPath, content, 'utf-8');
          return { success: true, message: `Fixed path: ${oldPath} → ${newPath}` };
        }

        case 'remove': {
          // Remove the line containing this path from the routing table
          const lines = content.split('\n');
          const newLines = lines.filter(line => !line.includes(value));
          writeFileSync(skillPath, newLines.join('\n'), 'utf-8');
          return { success: true, message: `Removed entry for: ${value}` };
        }

        case 'create': {
          // Add a TODO comment near the broken path
          const skillName = this.extractSkillNameFromPath(value);
          content = content.replace(
            value,
            `${value} <!-- TODO: Create missing skill "${skillName}" -->`
          );
          writeFileSync(skillPath, content, 'utf-8');
          return { success: true, message: `Marked for creation: ${skillName}` };
        }

        default:
          return { success: false, message: `Unknown action: ${action}` };
      }
    } catch (error) {
      return { success: false, message: `Failed to apply fix: ${error}` };
    }
  }
}
