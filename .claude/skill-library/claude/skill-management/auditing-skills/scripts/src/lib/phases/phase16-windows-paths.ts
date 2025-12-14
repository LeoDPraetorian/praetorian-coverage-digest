/**
 * Phase 16: Windows Path Detection
 * Detects Windows-style backslash paths which should use forward slashes for cross-platform compatibility
 */

import type { SkillFile, Issue, PhaseResult } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';

export class Phase16WindowsPaths {
  /**
   * Validate that all paths use forward slashes (not backslashes)
   */
  static validate(skill: SkillFile): Issue[] {
    const issues: Issue[] = [];

    // Check description for backslashes
    const { description } = skill.frontmatter;
    if (description && /\\/.test(description)) {
      issues.push({
        severity: 'WARNING',
        message: 'Description contains backslashes (use forward slashes for paths)',
        autoFixable: true,
      });
    }

    // Check content for backslashes in file paths
    // Match common patterns like: path\to\file, .\folder\file, C:\folder\file
    const backslashPathPattern = /(?:[a-zA-Z]:\\|\.\\|\\)[\w\\/.-]+/g;
    const matches = skill.content.match(backslashPathPattern);

    if (matches && matches.length > 0) {
      const uniquePaths = [...new Set(matches)];

      issues.push({
        severity: 'WARNING',
        message: `Found ${uniquePaths.length} Windows-style path(s) with backslashes`,
        autoFixable: true,
      });

      // List first 5 examples
      for (const backslashPath of uniquePaths.slice(0, 5)) {
        const forwardSlashPath = backslashPath.replace(/\\/g, '/');
        issues.push({
          severity: 'INFO',
          message: `Replace "${backslashPath}" with "${forwardSlashPath}"`,
          autoFixable: true,
        });
      }

      if (uniquePaths.length > 5) {
        issues.push({
          severity: 'INFO',
          message: `... and ${uniquePaths.length - 5} more Windows path(s)`,
          autoFixable: true,
        });
      }
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
   * Run Phase 16 audit on all skills
   */
  static async run(skillsDir: string): Promise<PhaseResult> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    let skillsAffected = 0;
    let issuesFound = 0;
    const details: string[] = [];

    for (const skillPath of skillPaths) {
      const skill = await SkillParser.parseSkillFile(skillPath);
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
