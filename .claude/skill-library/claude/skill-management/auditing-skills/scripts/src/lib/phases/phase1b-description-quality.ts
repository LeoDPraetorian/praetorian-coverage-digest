/**
 * Phase 1B: Description Quality (CSO - Claude Search Optimization)
 *
 * SEMANTIC VALIDATION - FOR CLAUDE TO EXECUTE
 *
 * When you (Claude) run this audit, perform this reasoning analysis:
 *
 * For each skill, review the description quality by:
 *
 * 1. Read the description from frontmatter
 * 2. Read the first 200 lines of SKILL.md content
 * 3. Assess the description against these criteria:
 *    a. Does it include key trigger terms users would mention?
 *    b. Is the complexity level (simple/moderate/complex) appropriate?
 *    c. Are there important keywords missing that would improve discovery?
 *    d. Is it specific enough to differentiate from similar skills?
 *    e. Does it explain both WHAT and WHEN clearly?
 *
 * 4. If you find issues, add them to the return array with specific recommendations
 *
 * Examples of issues to report:
 * - "Description missing key term 'pandas' (skill extensively uses pandas)"
 * - "Description too generic - add specific use cases like 'data cleaning' or 'pivot tables'"
 * - "Complexity marked 'simple' but skill has 8 sections and multiple APIs"
 *
 * 5. Return concrete, actionable issues (not abstract assessments)
 */

import type { SkillFile, Issue, PhaseResult } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';

export class Phase1BDescriptionQuality {
  /**
   * REASONING PHASE: Claude performs semantic analysis
   *
   * When Claude reads this code during audit, Claude should:
   * 1. Extract description and content preview
   * 2. Perform the analysis described in the class documentation above
   * 3. Return specific, actionable issues
   *
   * This is NOT automated TypeScript validation - it's a reasoning task for Claude.
   */
  static validate(skill: SkillFile): Issue[] {
    const issues: Issue[] = [];
    const { description } = skill.frontmatter;

    if (!description || description === 'YAML_PARSE_ERROR') {
      return [];
    }

    // Provide data for Claude to analyze
    const contentPreview = skill.content.split('\n').slice(0, 200).join('\n');

    // ═══════════════════════════════════════════════════════════
    // CLAUDE: Perform your analysis here based on class docs above
    //
    // You have access to:
    // - description: ${description}
    // - contentPreview: ${contentPreview}
    //
    // Analyze and add issues to the array below
    // ═══════════════════════════════════════════════════════════

    // Claude adds issues based on reasoning...
    // (Claude will populate this during execution)

    return issues;
  }

  /**
   * Format semantic analysis prompt for CLI output
   */
  private static formatAnalysisPrompt(prompt: any): string {
    return `
══════════════════════════════════════════════════════════
${prompt.phaseName}

Skill: ${prompt.skillName}
Description: "${prompt.description}"

Assessment Questions:
${prompt.questions.map((q: string, i: number) => `  ${i + 1}. ${q}`).join('\n')}

Context:
${prompt.context.slice(0, 500)}...

[Review the questions above and assess description quality]
══════════════════════════════════════════════════════════
    `.trim();
  }

  /**
   * Run Phase 1B audit on all skills
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
      phaseName: 'Phase 1B: Description Quality (Semantic)',
      skillsAffected,
      issuesFound,
      issuesFixed: 0,
      details,
    };
  }
}
