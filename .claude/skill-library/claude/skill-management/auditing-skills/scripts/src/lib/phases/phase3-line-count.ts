/**
 * Phase 3: Line Count Validation
 * Ensures SKILL.md files are under 500 lines for optimal performance.
 *
 * Thresholds (from Anthropic best practices):
 * - < 350 lines: Safe zone (no action needed)
 * - 350-450 lines: Caution (consider extraction for next change)
 * - 450-500 lines: Warning (plan extraction before adding content)
 * - > 500 lines: CRITICAL (must extract to references/)
 *
 * Source: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
 * "Keep SKILL.md body under 500 lines for optimal performance"
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { SkillFile, Issue, PhaseResult } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';

export class Phase3LineCount {
  // Unified thresholds (Anthropic guidance - no skill-type-specific limits)
  static readonly SAFE_MAX = 350;      // < 350: Safe zone
  static readonly CAUTION_MAX = 450;   // 350-450: Caution
  static readonly WARNING_MAX = 500;   // 450-500: Warning
  static readonly CRITICAL_MAX = 500;  // > 500: CRITICAL (hard limit)

  /**
   * Validate line count for a single skill
   * Returns consolidated issues with recommendation and context embedded
   */
  static async validate(skill: SkillFile): Promise<Issue[]> {
    const issues: Issue[] = [];
    const { lineCount } = skill;

    // Critical: Over 500 lines (hard limit from Anthropic)
    if (lineCount > this.CRITICAL_MAX) {
      // Check if references/ directory exists
      const hasReferences = await this.directoryExists(
        path.join(skill.directory, 'references')
      );

      const context = [`Current: ${lineCount} lines (limit: ${this.CRITICAL_MAX})`];
      if (!hasReferences) {
        context.push('No references/ directory exists - needs progressive disclosure');
      }

      issues.push({
        severity: 'CRITICAL',
        message: `SKILL.md is ${lineCount} lines (>${this.CRITICAL_MAX} limit)`,
        recommendation: 'Extract detailed sections to references/ directory',
        context,
        autoFixable: false,
      });

      return issues;
    }

    // Warning: Approaching limit (450-500 lines)
    if (lineCount > this.CAUTION_MAX) {
      issues.push({
        severity: 'WARNING',
        message: `SKILL.md is ${lineCount} lines (approaching ${this.WARNING_MAX} limit)`,
        recommendation: 'Plan extraction before adding more content',
        context: [`Current: ${lineCount}/${this.WARNING_MAX} lines`],
        autoFixable: false,
      });

      return issues;
    }

    // Info: In caution zone (350-450 lines)
    if (lineCount > this.SAFE_MAX) {
      issues.push({
        severity: 'INFO',
        message: `SKILL.md is ${lineCount} lines (caution zone)`,
        recommendation: 'Consider extraction for next update',
        context: [`Current: ${lineCount}/${this.WARNING_MAX} lines`],
        autoFixable: false,
      });

      return issues;
    }

    // No issues - skill is in safe zone
    return issues;
  }

  /**
   * Run Phase 3 audit on all skills (backward compatible - parses files)
   */
  static async run(skillsDir: string): Promise<PhaseResult> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    const skills = await Promise.all(skillPaths.map(p => SkillParser.parseSkillFile(p)));
    return this.runOnParsedSkills(skills);
  }

  /**
   * Run Phase 3 audit on pre-parsed skills (performance optimized)
   */
  static async runOnParsedSkills(skills: SkillFile[]): Promise<PhaseResult> {
    let skillsAffected = 0;
    let issuesFound = 0;
    const details: string[] = [];

    for (const skill of skills) {
      const issues = await this.validate(skill);

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
      phaseName: 'Phase 3: Line Count',
      skillsAffected,
      issuesFound,
      issuesFixed: 0, // Not auto-fixable
      details,
    };
  }

  /**
   * Get line count statistics
   */
  static async getStatistics(skillsDir: string): Promise<{
    safe: number;
    caution: number;
    warning: number;
    critical: number;
    total: number;
    percentage: number;
  }> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    let safe = 0;
    let caution = 0;
    let warning = 0;
    let critical = 0;

    for (const skillPath of skillPaths) {
      const skill = await SkillParser.parseSkillFile(skillPath);
      const { lineCount } = skill;

      if (lineCount <= this.SAFE_MAX) {
        safe++;
      } else if (lineCount <= this.CAUTION_MAX) {
        caution++;
      } else if (lineCount <= this.WARNING_MAX) {
        warning++;
      } else {
        critical++;
      }
    }

    const total = skillPaths.length;
    const percentage = total > 0 ? (safe / total) * 100 : 0;

    return {
      safe,
      caution,
      warning,
      critical,
      total,
      percentage,
    };
  }

  /**
   * Check if directory exists
   */
  private static async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
}
