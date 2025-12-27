/**
 * Phase 19: Path Resolution Validation
 * Validates all paths in gateway routing tables exist on filesystem
 */

import type { SkillFile, Issue, PhaseResult } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { findProjectRoot } from '../../../../../../../lib/find-project-root.js';

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
   * Run Phase 19 audit on all skills
   */
  static async run(skillsDir: string): Promise<PhaseResult> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    let skillsAffected = 0;
    let issuesFound = 0;
    const details: string[] = [];

    for (const skillPath of skillPaths) {
      const skill = await SkillParser.parseSkillFile(skillPath);

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
}
