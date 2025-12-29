/**
 * Phase 16: Windows Path Detection
 * Detects Windows-style backslash paths which should use forward slashes for cross-platform compatibility
 */

import type { SkillFile, Issue, PhaseResult } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';

export class Phase16WindowsPaths {
  /**
   * Validate that all paths use forward slashes (not backslashes)
   * Returns consolidated issue with context listing all replacements
   */
  static validate(skill: SkillFile): Issue[] {
    const issues: Issue[] = [];
    const replacements: string[] = [];

    // Check description for backslashes
    const { description } = skill.frontmatter;
    if (description && /\\/.test(description)) {
      replacements.push('Description contains backslashes');
    }

    // Check content for backslashes in file paths
    // Match common patterns like: path\to\file, .\folder\file, C:\folder\file
    const backslashPathPattern = /(?:[a-zA-Z]:\\|\.\\|\\)[\w\\/.-]+/g;
    const matches = skill.content.match(backslashPathPattern);

    if (matches && matches.length > 0) {
      const uniquePaths = [...new Set(matches)];

      // Add replacement suggestions (limit to 10 for context)
      for (const backslashPath of uniquePaths.slice(0, 10)) {
        const forwardSlashPath = backslashPath.replace(/\\/g, '/');
        replacements.push(`"${backslashPath}" → "${forwardSlashPath}"`);
      }

      if (uniquePaths.length > 10) {
        replacements.push(`... and ${uniquePaths.length - 10} more Windows path(s)`);
      }
    }

    // Create single consolidated issue if any replacements needed
    if (replacements.length > 0) {
      issues.push({
        severity: 'WARNING',
        message: `Found ${replacements.length} Windows-style path(s) with backslashes`,
        recommendation: 'Replace backslashes with forward slashes for cross-platform compatibility',
        context: replacements,
        autoFixable: true,
      });
    }

    return issues;
  }

  /**
   * Fix Windows paths by converting backslashes to forward slashes
   */
  static async fix(skill: SkillFile, dryRun: boolean = false): Promise<number> {
    let content = skill.content;
    let fixedCount = 0;

    // Find all backslash paths
    const backslashPathPattern = /(?:[a-zA-Z]:\\|\.\\|\\)[\w\\/.-]+/g;
    const matches = content.match(backslashPathPattern);

    if (!matches || matches.length === 0) {
      return 0;
    }

    // Replace each backslash path with forward slashes
    for (const backslashPath of matches) {
      const forwardSlashPath = backslashPath.replace(/\\/g, '/');
      content = content.replace(backslashPath, forwardSlashPath);
      fixedCount++;
    }

    // Write changes if not dry run
    if (!dryRun && fixedCount > 0) {
      const fs = await import('fs/promises');
      await fs.writeFile(skill.path, content, 'utf-8');
    }

    return fixedCount;
  }

  /**
   * Run Phase 16 audit on all skills (backward compatible - parses files)
   */
  static async run(skillsDir: string): Promise<PhaseResult> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    const skills = await Promise.all(skillPaths.map(p => SkillParser.parseSkillFile(p)));
    return this.runOnParsedSkills(skills);
  }

  /**
   * Run Phase 16 audit on pre-parsed skills (performance optimized)
   */
  static async runOnParsedSkills(skills: SkillFile[]): Promise<PhaseResult> {
    let skillsAffected = 0;
    let issuesFound = 0;
    const details: string[] = [];

    for (const skill of skills) {
      const issues = this.validate(skill);

      if (issues.length > 0) {
        skillsAffected++;
        issuesFound += issues.length;
        details.push(`${skill.name}:`);
        issues.forEach((issue) => {
          details.push(`  - [${issue.severity}] ${issue.message}`);
        });
      }
    }

    return {
      phaseName: 'Phase 16: Windows Path Detection',
      skillsAffected,
      issuesFound,
      issuesFixed: 0,
      details,
    };
  }
}
