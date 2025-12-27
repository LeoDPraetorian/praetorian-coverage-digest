/**
 * Phase 2: Add allowed-tools field
 * Intelligently detects skill type and adds appropriate tools
 */

import type { SkillFile, Issue, PhaseResult, FixOptions } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';
import { TOOL_SETS } from '../types.js';

export class Phase2AllowedTools {
  /**
   * Validate and suggest allowed-tools for a single skill
   */
  static validate(skill: SkillFile): Issue[] {
    const issues: Issue[] = [];
    const hasField = skill.frontmatter['allowed-tools'] !== undefined;

    if (!hasField) {
      const suggested = this.detectToolSet(skill);

      issues.push({
        severity: 'INFO',
        message: 'Missing allowed-tools field (recommended)',
        recommendation: `Suggested tools based on skill type: ${suggested.join(', ')}`,
        autoFixable: true,
        fix: async () => {
          await SkillParser.updateFrontmatter(skill.path, {
            'allowed-tools': suggested.join(', '),
          });
        },
      });
    }

    return issues;
  }

  /**
   * Detect appropriate tool set based on skill type
   */
  private static detectToolSet(skill: SkillFile): string[] {
    const { name, content } = skill;
    const combined = `${name} ${content}`.toLowerCase();

    // Pattern-based detection (order matters - most specific first)
    if (/claude-agent|claude-plugin|claude-command|claude-hook|claude-skill/.test(name)) {
      return TOOL_SETS['claude-agent'];
    }

    if (/test|testing|tdd|e2e|playwright|vitest|jest/.test(name)) {
      return TOOL_SETS['testing'];
    }

    if (/frontend|react|typescript|ui|component|design/.test(name)) {
      return TOOL_SETS['frontend'];
    }

    if (/backend|go|golang|api|server|database/.test(name)) {
      return TOOL_SETS['backend'];
    }

    if (/mcp|integration|webhook|api-client/.test(name)) {
      return TOOL_SETS['mcp-integration'];
    }

    if (/debug|error|troubleshoot|diagnostic/.test(name)) {
      return TOOL_SETS['debug'];
    }

    if (/git|workflow|branch|commit|merge/.test(name)) {
      return TOOL_SETS['git'];
    }

    if (/security|auth|crypto|vulnerability|threat/.test(name)) {
      return TOOL_SETS['security'];
    }

    // Content-based detection if name-based fails
    if (/\bwrite\b.*\bfile|\bcreate\b.*\bfile|\bgenerate\b.*\bcode/.test(combined)) {
      return TOOL_SETS['frontend']; // Likely needs write access
    }

    if (/\bread\b.*\bfile|\banalyze\b.*\bcode|\binspect\b/.test(combined)) {
      return TOOL_SETS['debug']; // Likely read-only
    }

    // Default fallback
    return TOOL_SETS['default'];
  }

  /**
   * Run Phase 2 audit on all skills (or a single skill if skillName provided)
   */
  static async run(skillsDir: string, options?: FixOptions): Promise<PhaseResult> {
    let skillPaths = await SkillParser.findAllSkills(skillsDir);

    // Filter to single skill if specified
    if (options?.skillName) {
      skillPaths = skillPaths.filter(p => p.includes(`/${options.skillName}/SKILL.md`));
      if (skillPaths.length === 0) {
        return {
          phaseName: 'Phase 2: Allowed-Tools Field',
          skillsAffected: 0,
          issuesFound: 0,
          issuesFixed: 0,
          details: [`Skill not found: ${options.skillName}`],
        };
      }
    }

    let skillsAffected = 0;
    let issuesFound = 0;
    let issuesFixed = 0;
    const details: string[] = [];

    for (const skillPath of skillPaths) {
      const skill = await SkillParser.parseSkillFile(skillPath);
      const issues = this.validate(skill);

      if (issues.length > 0) {
        skillsAffected++;
        issuesFound += issues.length;

        details.push(`${skill.name}:`);

        for (const issue of issues) {
          details.push(`  - [${issue.severity}] ${issue.message}`);

          // Auto-fix if enabled and fixable
          if (options?.autoFix && issue.autoFixable && issue.fix) {
            if (!options.dryRun) {
              await issue.fix();
              issuesFixed++;
              details.push(`    ✓ Fixed`);
            } else {
              details.push(`    (would fix in non-dry-run mode)`);
            }
          }
        }
      }
    }

    return {
      phaseName: 'Phase 2: Allowed-Tools Field',
      skillsAffected,
      issuesFound,
      issuesFixed,
      details,
    };
  }

  /**
   * Get compliance rate
   */
  static async getCompliance(skillsDir: string): Promise<{
    hasField: number;
    total: number;
    percentage: number;
  }> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    let hasField = 0;

    for (const skillPath of skillPaths) {
      const skill = await SkillParser.parseSkillFile(skillPath);

      if (skill.frontmatter['allowed-tools'] !== undefined) {
        hasField++;
      }
    }

    const total = skillPaths.length;
    const percentage = total > 0 ? (hasField / total) * 100 : 0;

    return { hasField, total, percentage };
  }
}
