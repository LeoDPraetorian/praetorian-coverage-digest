/**
 * Phase 13: State Externalization Audit
 * Ensures complex skills mandate TodoWrite for cognitive offloading
 */

import type { SkillFile, Issue, PhaseResult } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';

enum MandateStrength {
  STRONG = 'STRONG',
  WEAK = 'WEAK',
  MISSING = 'MISSING',
}

interface ComplexityScore {
  sectionCount: number;
  hasKeywords: boolean;
  wordCount: number;
  isComplex: boolean;
  reasons: string[];
  frontmatterOverride: boolean;
}

interface MandateResult {
  strength: MandateStrength;
  examples: string[];
}

export class Phase13StateExternalization {
  /**
   * Detect skill complexity based on heuristics
   */
  private static detectComplexity(skill: SkillFile): ComplexityScore {
    // 1. Frontmatter override
    const frontmatterOverride =
      skill.frontmatter.complexity === 'high' ||
      skill.frontmatter['requires-state-tracking'] === true;

    if (frontmatterOverride) {
      return {
        sectionCount: 0,
        hasKeywords: false,
        wordCount: 0,
        isComplex: true,
        reasons: ['Frontmatter declares complexity: high'],
        frontmatterOverride: true,
      };
    }

    // Check for opt-out
    if (
      skill.frontmatter.complexity === 'low' ||
      skill.frontmatter['requires-state-tracking'] === false
    ) {
      return {
        sectionCount: 0,
        hasKeywords: false,
        wordCount: 0,
        isComplex: false,
        reasons: ['Frontmatter declares complexity: low'],
        frontmatterOverride: true,
      };
    }

    // 2. Heuristic detection
    const sectionCount = (skill.content.match(/^## /gm) || []).length;
    const keywordPattern = /\b(systematic|protocol|workflow|phase|checklist|step-by-step)\b/i;
    const hasKeywords = keywordPattern.test(skill.content);
    const wordCount = skill.content.split(/\s+/).length;

    const reasons: string[] = [];
    let criteriaCount = 0;

    if (sectionCount >= 5) {
      criteriaCount++;
      reasons.push(`${sectionCount} sections (≥5 threshold)`);
    }
    if (hasKeywords) {
      criteriaCount++;
      reasons.push('Contains workflow keywords (systematic/protocol/phase)');
    }
    if (wordCount > 1500) {
      criteriaCount++;
      reasons.push(`${wordCount} words (>1500 threshold)`);
    }

    const isComplex = criteriaCount >= 2;

    return {
      sectionCount,
      hasKeywords,
      wordCount,
      isComplex,
      reasons: isComplex ? reasons : [],
      frontmatterOverride: false,
    };
  }

  /**
   * Detect TodoWrite mandate strength in skill content
   */
  private static detectTodoWriteMandate(content: string): MandateResult {
    const strongPatterns = [
      /\bMUST\s+.*TodoWrite\b/i,
      /\bREQUIRED\s+.*TodoWrite\b/i,
      /\bCRITICAL.*TodoWrite\b/i,
      /TodoWrite\s+BEFORE\s+/i,
      /TodoWrite\s+is\s+MANDATORY/i,
    ];

    const weakPatterns = [
      /\bshould\s+.*TodoWrite\b/i,
      /\brecommend\s+.*TodoWrite\b/i,
      /\bconsider\s+.*TodoWrite\b/i,
      /\bsuggest\s+.*TodoWrite\b/i,
    ];

    const examples: string[] = [];

    // Check strong patterns
    for (const pattern of strongPatterns) {
      const match = content.match(pattern);
      if (match) {
        examples.push(match[0]);
        return { strength: MandateStrength.STRONG, examples };
      }
    }

    // Check weak patterns
    for (const pattern of weakPatterns) {
      const match = content.match(pattern);
      if (match) {
        examples.push(match[0]);
        return { strength: MandateStrength.WEAK, examples };
      }
    }

    return { strength: MandateStrength.MISSING, examples: [] };
  }

  /**
   * Validate a single skill for state externalization compliance
   * Returns consolidated issues with recommendation and context embedded
   */
  static validate(skill: SkillFile): Issue[] {
    const issues: Issue[] = [];

    const complexity = this.detectComplexity(skill);
    const mandate = this.detectTodoWriteMandate(skill.content);

    // Case 1: Complex skill without TodoWrite mandate
    if (complexity.isComplex && mandate.strength === MandateStrength.MISSING) {
      issues.push({
        severity: 'CRITICAL',
        message: `Complex skill missing TodoWrite mandate`,
        recommendation: 'Add mandate: "You MUST use TodoWrite before starting to track all steps"',
        context: complexity.reasons,
        autoFixable: false,
      });
      return issues;
    }

    // Case 2: Complex skill with weak mandate
    if (complexity.isComplex && mandate.strength === MandateStrength.WEAK) {
      issues.push({
        severity: 'WARNING',
        message: `Complex skill has weak TodoWrite mandate (found: "${mandate.examples[0]}")`,
        recommendation: 'Upgrade to strong mandate: Replace "should" with "MUST"',
        context: complexity.reasons,
        autoFixable: false,
      });
      return issues;
    }

    // Case 3: Complex skill with strong mandate - PASS (no issue)

    // Case 4: Simple skill with strong mandate (unnecessary overhead)
    if (!complexity.isComplex && mandate.strength === MandateStrength.STRONG) {
      issues.push({
        severity: 'INFO',
        message: `Simple skill has TodoWrite mandate (may be unnecessary overhead)`,
        recommendation: 'Consider if TodoWrite is needed for this simple skill',
        context: [`${complexity.sectionCount} sections, ${complexity.wordCount} words`],
        autoFixable: false,
      });
      return issues;
    }

    return issues;
  }

  /**
   * Run Phase 13 audit on all skills
   */
  static async run(skillsDir: string): Promise<PhaseResult> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    const skills = await Promise.all(skillPaths.map(p => SkillParser.parseSkillFile(p)));
    return this.runOnParsedSkills(skills);
  }

  /**
   * Run Phase 13 audit on pre-parsed skills (performance optimized)
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
        for (const issue of issues) {
          details.push(`  - [${issue.severity}] ${issue.message}`);
        }
      }
    }

    return {
      phaseName: 'Phase 13: State Externalization',
      skillsAffected,
      issuesFound,
      issuesFixed: 0, // Not auto-fixable
      details,
    };
  }
}
