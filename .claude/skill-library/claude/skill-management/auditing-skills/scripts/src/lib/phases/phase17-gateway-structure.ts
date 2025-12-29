/**
 * Phase 17: Gateway Structure Validation
 * Validates gateway skills have proper two-tier explanation and structure
 */

import type { SkillFile, Issue, PhaseResult } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';

export class Phase17GatewayStructure {
  /**
   * Check if skill is a gateway skill (name starts with "gateway-")
   */
  private static isGatewaySkill(skill: SkillFile): boolean {
    return skill.name.startsWith('gateway-');
  }

  /**
   * Validate gateway structure for a single skill
   */
  static validate(skill: SkillFile): Issue[] {
    const issues: Issue[] = [];

    // Only validate gateway skills
    if (!this.isGatewaySkill(skill)) {
      return issues;
    }

    const { content } = skill;

    // Check 1: Has "Understanding This Gateway" section
    const hasUnderstandingSection = /##\s+Understanding This Gateway/i.test(content);
    if (!hasUnderstandingSection) {
      issues.push({
        severity: 'CRITICAL',
        message: 'Gateway missing "Understanding This Gateway" section explaining two-tier system',
        autoFixable: false,
      });
    }

    // Check 2: Has IMPORTANT warning block about Skill tool vs Read tool
    const hasImportantBlock = /<IMPORTANT>/i.test(content) && /<\/IMPORTANT>/i.test(content);
    if (!hasImportantBlock) {
      issues.push({
        severity: 'CRITICAL',
        message: 'Gateway missing <IMPORTANT> warning block about library skill invocation',
        autoFixable: false,
      });
    }

    // Check 3: Shows correct invocation example with skill: "gateway-X"
    const hasSkillInvocation = /skill:\s*["']gateway-[\w-]+["']/i.test(content);
    if (!hasSkillInvocation) {
      issues.push({
        severity: 'WARNING',
        message: 'Gateway should show invocation example: skill: "gateway-name"',
        autoFixable: false,
      });
    }

    // Check 4: Explains Read tool usage for library skills
    const hasReadExplanation = /Read\s*\(\s*["']\.claude\/skill-library/i.test(content);
    if (!hasReadExplanation) {
      issues.push({
        severity: 'WARNING',
        message: 'Gateway should explain Read tool usage: Read(".claude/skill-library/...")',
        autoFixable: false,
      });
    }

    // Check 5: Has "Two-Tier" or "two-tier" explanation
    const hasTwoTierExplanation = /two-tier/i.test(content);
    if (!hasTwoTierExplanation) {
      issues.push({
        severity: 'WARNING',
        message: 'Gateway should explain the two-tier skill system',
        autoFixable: false,
      });
    }

    // Check 6: Has anti-pattern warning (❌ WRONG / ✅ RIGHT)
    const hasAntiPattern = /❌.*WRONG/i.test(content) && /✅.*RIGHT/i.test(content);
    if (!hasAntiPattern) {
      issues.push({
        severity: 'INFO',
        message: 'Consider adding anti-pattern examples (❌ WRONG / ✅ RIGHT)',
        autoFixable: false,
      });
    }

    return issues;
  }

  /**
   * Run Phase 17 audit on all skills (backward compatible - parses files)
   */
  static async run(skillsDir: string): Promise<PhaseResult> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    const skills = await Promise.all(skillPaths.map(p => SkillParser.parseSkillFile(p)));
    return this.runOnParsedSkills(skills);
  }

  /**
   * Run Phase 17 audit on pre-parsed skills (performance optimized)
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
      phaseName: 'Phase 17: Gateway Structure',
      skillsAffected,
      issuesFound,
      issuesFixed: 0,
      details,
    };
  }
}
