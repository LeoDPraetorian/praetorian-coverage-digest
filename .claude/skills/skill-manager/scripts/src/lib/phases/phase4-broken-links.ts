/**
 * Phase 5A: Broken Link Detection
 * Finds broken markdown reference links using regex parsing
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { SkillFile, Issue, PhaseResult } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';

export class Phase4BrokenLinks {
  /**
   * Validate reference links for a single skill
   */
  static async validate(skill: SkillFile): Promise<Issue[]> {
    const issues: Issue[] = [];
    const links = SkillParser.extractMarkdownLinks(skill.content);
    const brokenLinks: Array<{ text: string; path: string }> = [];

    for (const link of links) {
      const exists = await SkillParser.checkLinkExists(skill.directory, link.path);
      if (!exists) {
        brokenLinks.push(link);
      }
    }

    if (brokenLinks.length > 0) {
      issues.push({
        severity: 'WARNING',
        message: `${brokenLinks.length} broken reference link(s)`,
        autoFixable: true,
      });

      for (const link of brokenLinks) {
        issues.push({
          severity: 'INFO',
          message: `Broken: [${link.text}](${link.path})`,
          autoFixable: true,
        });
      }
    }

    return issues;
  }

  /**
   * Fix broken links by correcting paths (simple path correction only)
   */
  static async fix(skill: SkillFile, dryRun: boolean = false): Promise<number> {
    const links = SkillParser.extractMarkdownLinks(skill.content);
    const brokenLinks: Array<{ text: string; path: string; line?: number }> = [];

    // Find broken links
    for (const link of links) {
      const exists = await SkillParser.checkLinkExists(skill.directory, link.path);
      if (!exists) {
        brokenLinks.push(link);
      }
    }

    if (brokenLinks.length === 0) {
      return 0;
    }

    let content = skill.content;
    let fixedCount = 0;

    // Try to fix each broken link
    for (const link of brokenLinks) {
      const filename = path.basename(link.path);
      const correctPath = await this.findFileInSkill(skill.directory, filename);

      if (correctPath && correctPath !== link.path) {
        // Update link path in content
        const oldLink = `[${link.text}](${link.path})`;
        const newLink = `[${link.text}](${correctPath})`;
        content = content.replace(oldLink, newLink);
        fixedCount++;
      }
    }

    // Write fixed content if changes were made and not dry-run
    if (fixedCount > 0 && !dryRun) {
      await fs.writeFile(path.join(skill.directory, 'SKILL.md'), content, 'utf-8');
    }

    return fixedCount;
  }

  /**
   * Search for file in standard skill subdirectories
   */
  private static async findFileInSkill(skillDir: string, filename: string): Promise<string | null> {
    const searchDirs = ['references', 'examples', 'templates', 'scripts', '.local'];

    for (const dir of searchDirs) {
      const searchPath = path.join(skillDir, dir, filename);
      try {
        await fs.access(searchPath);
        return `${dir}/${filename}`;
      } catch {
        // File doesn't exist here, continue searching
      }
    }

    return null;
  }

  /**
   * Run Phase 4 audit on all skills (with optional auto-fix)
   */
  static async run(skillsDir: string, options?: any): Promise<PhaseResult> {
    let skillPaths = await SkillParser.findAllSkills(skillsDir);

    // Filter to single skill if specified
    if (options?.skillName) {
      skillPaths = skillPaths.filter(p => p.includes(`/${options.skillName}/SKILL.md`));
    }

    let skillsAffected = 0;
    let issuesFound = 0;
    let issuesFixed = 0;
    const details: string[] = [];

    for (const skillPath of skillPaths) {
      const skill = await SkillParser.parseSkillFile(skillPath);
      const issues = await this.validate(skill);

      if (issues.length > 0) {
        skillsAffected++;
        issuesFound += issues.length;

        details.push(`${skill.name}:`);

        // Auto-fix if enabled
        if (options?.autoFix && !options.dryRun) {
          const fixed = await this.fix(skill, options.dryRun);
          if (fixed > 0) {
            issuesFixed += fixed;
            details.push(`  ✓ Fixed ${fixed} broken link(s)`);
          }
        } else {
          for (const issue of issues) {
            details.push(`  - [${issue.severity}] ${issue.message}`);
            if (options?.dryRun && issue.autoFixable) {
              details.push(`    (would fix in non-dry-run mode)`);
            }
          }
        }
      }
    }

    return {
      phaseName: 'Phase 4: Broken Links',
      skillsAffected,
      issuesFound,
      issuesFixed,
      details,
    };
  }

  /**
   * Get link health statistics
   */
  static async getStatistics(skillsDir: string): Promise<{
    cleanLinks: number;
    brokenLinks: number;
    skillsWithBroken: number;
    total: number;
    percentage: number;
  }> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    let totalBrokenLinks = 0;
    let skillsWithBroken = 0;

    for (const skillPath of skillPaths) {
      const skill = await SkillParser.parseSkillFile(skillPath);
      const issues = await this.validate(skill);

      const hasBroken = issues.some(issue => issue.message.includes('broken reference link'));

      if (hasBroken) {
        skillsWithBroken++;
        // Count how many broken links
        const brokenCount = issues.filter(issue => issue.message.startsWith('Broken:')).length;
        totalBrokenLinks += brokenCount;
      }
    }

    const total = skillPaths.length;
    const cleanLinks = total - skillsWithBroken;
    const percentage = total > 0 ? (cleanLinks / total) * 100 : 0;

    return {
      cleanLinks,
      brokenLinks: totalBrokenLinks,
      skillsWithBroken,
      total,
      percentage,
    };
  }
}
