/**
 * Phase 3: Word Count Validation
 * Ensures SKILL.md files are in optimal range based on skill type:
 * - Reasoning skills: 1,000-2,000 words
 * - Tool-wrapper skills: 200-600 words
 * - Hybrid skills: 600-1,200 words
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { SkillFile, Issue, PhaseResult, SkillType } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';

export class Phase3WordCount {
  // Reasoning Skills (process-heavy, Claude is the engine)
  static readonly REASONING_OPTIMAL_MIN = 1000;
  static readonly REASONING_OPTIMAL_MAX = 2000;
  static readonly REASONING_CRITICAL_MAX = 2500;
  static readonly REASONING_WARNING_MIN = 800;

  // Tool Wrapper Skills (CLI-driven, Claude just executes)
  static readonly TOOL_WRAPPER_OPTIMAL_MIN = 200;
  static readonly TOOL_WRAPPER_OPTIMAL_MAX = 600;
  static readonly TOOL_WRAPPER_CRITICAL_MAX = 800;
  static readonly TOOL_WRAPPER_WARNING_MIN = 150;

  // Hybrid Skills (mix of both)
  static readonly HYBRID_OPTIMAL_MIN = 600;
  static readonly HYBRID_OPTIMAL_MAX = 1200;
  static readonly HYBRID_CRITICAL_MAX = 1500;
  static readonly HYBRID_WARNING_MIN = 400;

  /**
   * Get thresholds based on skill type
   */
  private static getThresholds(skillType: SkillType): {
    optimalMin: number;
    optimalMax: number;
    criticalMax: number;
    warningMin: number;
  } {
    switch (skillType) {
      case 'tool-wrapper':
        return {
          optimalMin: this.TOOL_WRAPPER_OPTIMAL_MIN,
          optimalMax: this.TOOL_WRAPPER_OPTIMAL_MAX,
          criticalMax: this.TOOL_WRAPPER_CRITICAL_MAX,
          warningMin: this.TOOL_WRAPPER_WARNING_MIN,
        };
      case 'hybrid':
        return {
          optimalMin: this.HYBRID_OPTIMAL_MIN,
          optimalMax: this.HYBRID_OPTIMAL_MAX,
          criticalMax: this.HYBRID_CRITICAL_MAX,
          warningMin: this.HYBRID_WARNING_MIN,
        };
      case 'reasoning':
      default:
        return {
          optimalMin: this.REASONING_OPTIMAL_MIN,
          optimalMax: this.REASONING_OPTIMAL_MAX,
          criticalMax: this.REASONING_CRITICAL_MAX,
          warningMin: this.REASONING_WARNING_MIN,
        };
    }
  }

  /**
   * Validate word count for a single skill
   */
  static async validate(skill: SkillFile): Promise<Issue[]> {
    const issues: Issue[] = [];
    const { wordCount, skillType } = skill;
    const thresholds = this.getThresholds(skillType);

    // Add INFO message about detected type
    issues.push({
      severity: 'INFO',
      message: `Skill type: ${skillType} (${thresholds.optimalMin}-${thresholds.optimalMax} words optimal)`,
      autoFixable: false,
    });

    // Critical: Way too long (needs progressive disclosure)
    if (wordCount > thresholds.criticalMax) {
      issues.push({
        severity: 'CRITICAL',
        message: `SKILL.md is ${wordCount} words (>${thresholds.criticalMax} limit for ${skillType} skills)`,
        autoFixable: false,
      });

      // Check if references/ directory exists
      const hasReferences = await this.directoryExists(
        path.join(skill.directory, 'references')
      );

      if (!hasReferences) {
        issues.push({
          severity: 'WARNING',
          message: 'Oversized skill without references/ directory - needs progressive disclosure',
          autoFixable: false,
        });
      }

      issues.push({
        severity: 'INFO',
        message: 'Extract detailed sections to references/ directory',
        autoFixable: false,
      });

      return issues;
    }

    // Warning: Too long
    if (wordCount > thresholds.optimalMax) {
      issues.push({
        severity: 'WARNING',
        message: `SKILL.md is ${wordCount} words (target: ${thresholds.optimalMin}-${thresholds.optimalMax} for ${skillType} skills)`,
        autoFixable: false,
      });

      issues.push({
        severity: 'INFO',
        message: skillType === 'tool-wrapper'
          ? 'Tool wrappers should be concise - logic belongs in scripts'
          : 'Consider extracting detailed content to references/',
        autoFixable: false,
      });

      return issues;
    }

    // Warning: Too short
    if (wordCount < thresholds.warningMin) {
      issues.push({
        severity: 'WARNING',
        message: `SKILL.md is ${wordCount} words (target: ${thresholds.optimalMin}-${thresholds.optimalMax} for ${skillType} skills)`,
        autoFixable: false,
      });

      issues.push({
        severity: 'INFO',
        message: skillType === 'tool-wrapper'
          ? 'Add troubleshooting section for common CLI errors'
          : 'Add examples, troubleshooting, or reference documentation',
        autoFixable: false,
      });

      return issues;
    }

    // Info: Slightly outside optimal range
    if (wordCount < thresholds.optimalMin || wordCount > thresholds.optimalMax) {
      issues.push({
        severity: 'INFO',
        message: `Word count ${wordCount} (optimal for ${skillType}: ${thresholds.optimalMin}-${thresholds.optimalMax})`,
        autoFixable: false,
      });
    }

    return issues;
  }

  /**
   * Run Phase 3 audit on all skills
   */
  static async run(skillsDir: string): Promise<PhaseResult> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    let skillsAffected = 0;
    let issuesFound = 0;
    const details: string[] = [];

    for (const skillPath of skillPaths) {
      const skill = await SkillParser.parseSkillFile(skillPath);
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
      phaseName: 'Phase 3: Word Count',
      skillsAffected,
      issuesFound,
      issuesFixed: 0, // Not auto-fixable
      details,
    };
  }

  /**
   * Get word count statistics
   */
  static async getStatistics(skillsDir: string): Promise<{
    optimal: number;
    tooShort: number;
    tooLong: number;
    critical: number;
    total: number;
    percentage: number;
  }> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    let optimal = 0;
    let tooShort = 0;
    let tooLong = 0;
    let critical = 0;

    for (const skillPath of skillPaths) {
      const skill = await SkillParser.parseSkillFile(skillPath);
      const { wordCount, skillType } = skill;
      const thresholds = this.getThresholds(skillType);

      if (wordCount >= thresholds.optimalMin && wordCount <= thresholds.optimalMax) {
        optimal++;
      } else if (wordCount < thresholds.warningMin) {
        tooShort++;
      } else if (wordCount > thresholds.criticalMax) {
        critical++;
        tooLong++;
      } else if (wordCount > thresholds.optimalMax) {
        tooLong++;
      }
    }

    const total = skillPaths.length;
    const percentage = total > 0 ? (optimal / total) * 100 : 0;

    return {
      optimal,
      tooShort,
      tooLong: tooLong - critical,
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
