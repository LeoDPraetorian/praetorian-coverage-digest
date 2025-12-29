/**
 * Phase 14a: Markdown Table Formatting (Prettier)
 * Validates markdown tables are formatted using Prettier.
 * Auto-fixable via `prettier --write`.
 */

import type { SkillFile, Issue, PhaseResult } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';

export class Phase14aTableFormatting {
  /**
   * Validate table formatting using Prettier
   * Runs prettier --check to detect formatting issues
   */
  static validate(skill: SkillFile): Issue[] {
    const issues: Issue[] = [];

    try {
      // Run prettier --check on the skill file
      execSync(`npx prettier --check "${skill.path}"`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      // If we get here, file is already formatted
      return issues;
    } catch (error: any) {
      // prettier --check exits with 1 if file needs formatting
      if (error.status === 1) {
        issues.push({
          severity: 'WARNING',
          message: 'Tables not formatted with Prettier',
          recommendation: 'Run prettier --write to auto-format tables',
          autoFixable: true,
        });
      } else {
        // Other errors (file not found, prettier error, etc.)
        issues.push({
          severity: 'CRITICAL',
          message: `Prettier check failed: ${error.message}`,
          autoFixable: false,
        });
      }
    }

    return issues;
  }

  /**
   * Fix table formatting by running prettier --write
   * Returns number of files modified (0 or 1)
   */
  static async fix(skill: SkillFile, dryRun: boolean = false): Promise<number> {
    if (dryRun) {
      // In dry run mode, just check if formatting would change
      try {
        execSync(`npx prettier --check "${skill.path}"`, {
          encoding: 'utf-8',
          stdio: 'pipe',
        });
        return 0; // Already formatted
      } catch (error: any) {
        return error.status === 1 ? 1 : 0; // Would be modified
      }
    }

    // Read original content for comparison
    const originalContent = readFileSync(skill.path, 'utf-8');

    try {
      // Run prettier --write to format the file
      execSync(`npx prettier --write "${skill.path}"`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      // Check if content changed
      const newContent = readFileSync(skill.path, 'utf-8');
      return originalContent !== newContent ? 1 : 0;
    } catch (error: any) {
      console.error(`Prettier format failed: ${error.message}`);
      return 0;
    }
  }

  /**
   * Run Phase 14a audit on all skills (backward compatible - parses files)
   */
  static async run(skillsDir: string): Promise<PhaseResult> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    const skills = await Promise.all(skillPaths.map(p => SkillParser.parseSkillFile(p)));
    return this.runOnParsedSkills(skills);
  }

  /**
   * Run Phase 14a audit on pre-parsed skills (performance optimized)
   */
  static async runOnParsedSkills(skills: SkillFile[]): Promise<PhaseResult> {
    let skillsAffected = 0;
    let issuesFound = 0;
    const details: string[] = [];

    for (const skill of skills) {
      const issues = this.validate(skill);

      // Only count as affected if there are warnings or criticals
      const significantIssues = issues.filter((i) => i.severity !== 'INFO');

      if (significantIssues.length > 0) {
        skillsAffected++;
        issuesFound += significantIssues.length;

        details.push(`${skill.name}:`);
        for (const issue of issues) {
          details.push(`  - [${issue.severity}] ${issue.message}`);
        }
      }
    }

    return {
      phaseName: 'Phase 14a: Table Formatting (Prettier)',
      skillsAffected,
      issuesFound,
      issuesFixed: 0,
      details,
    };
  }
}
