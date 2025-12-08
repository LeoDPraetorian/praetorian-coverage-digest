/**
 * Semantic Validator
 *
 * Infrastructure for Claude-powered reasoning validation of skills.
 * Used by semantic audit phases (1B, 2B, 3B, 9B, 13B).
 */

import type { SkillFile, Issue } from './types.js';

export interface SemanticAnalysisPrompt {
  phaseName: string;
  skillName: string;
  description: string;
  context: string;
  questions: string[];
}

export interface SemanticAnalysisResult {
  assessment: string;
  recommendations: string[];
  issues: Issue[];
}

export class SemanticValidator {
  /**
   * Invoke Claude for semantic analysis
   *
   * This is a placeholder that returns instructions for Claude to follow.
   * When the audit runs, these instructions appear in the report, and Claude
   * (the instance running the audit) performs the analysis.
   */
  static async analyze(prompt: SemanticAnalysisPrompt): Promise<SemanticAnalysisResult> {
    // For now, return structured prompt for Claude to execute
    // Future: Could integrate with Anthropic API for automated analysis

    const instructions = this.formatPromptForClaude(prompt);

    return {
      assessment: `[REQUIRES REASONING] ${instructions}`,
      recommendations: [],
      issues: [{
        severity: 'INFO',
        message: `Semantic validation needed - review manually or run with --reasoning mode`,
        autoFixable: false,
      }],
    };
  }

  /**
   * Format semantic analysis prompt for Claude
   */
  private static formatPromptForClaude(prompt: SemanticAnalysisPrompt): string {
    return `
${prompt.phaseName} - Semantic Analysis Required

Skill: ${prompt.skillName}
Description: "${prompt.description}"

Context:
${prompt.context}

Assessment Questions:
${prompt.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Please analyze and provide:
1. Assessment: [Your evaluation]
2. Issues: [List any problems found]
3. Recommendations: [Specific improvements]
`.trim();
  }

  /**
   * Create description quality analysis prompt
   */
  static createDescriptionQualityPrompt(skill: SkillFile, preview: string): SemanticAnalysisPrompt {
    return {
      phaseName: 'Phase 1B: Description Quality (CSO)',
      skillName: skill.name,
      description: skill.frontmatter.description || '',
      context: `Skill content preview (first 200 lines):\n${preview}`,
      questions: [
        'Is the complexity level (simple/moderate/complex) appropriate for this skill?',
        'Does the description include key trigger terms users would mention?',
        'Are there important keywords missing that would improve discovery?',
        'Is the description specific enough to differentiate from similar skills?',
        'Does it explain both WHAT the skill does AND WHEN to use it?',
      ],
    };
  }

  /**
   * Create tool appropriateness analysis prompt
   */
  static createToolAppropriatenessPrompt(skill: SkillFile, preview: string): SemanticAnalysisPrompt {
    const tools = skill.frontmatter['allowed-tools'] || 'all tools';

    return {
      phaseName: 'Phase 2B: Tool Appropriateness',
      skillName: skill.name,
      description: skill.frontmatter.description || '',
      context: `Current tools: ${tools}\nSkill content preview:\n${preview}`,
      questions: [
        'Given the skill\'s purpose, are the current tools appropriate?',
        'Should any tools be removed? (e.g., Write for read-only analysis)',
        'Should any tools be added? (e.g., missing Grep for search operations)',
        'Should Bash be scoped more narrowly? (e.g., Bash(git:*) instead of Bash)',
        'Are there tools that enable operations the skill shouldn\'t perform?',
      ],
    };
  }

  /**
   * Create content density analysis prompt
   */
  static createContentDensityPrompt(skill: SkillFile, lineCount: number): SemanticAnalysisPrompt {
    const preview = skill.content.slice(0, 3000); // ~500 lines preview

    return {
      phaseName: 'Phase 3B: Content Density Assessment',
      skillName: skill.name,
      description: skill.frontmatter.description || '',
      context: `Line count: ${lineCount} (target: <500)\n\nContent preview:\n${preview}`,
      questions: [
        'Is the length justified by essential content density?',
        'What sections could be extracted to references/ directory?',
        'Are there redundant examples or repetitive explanations?',
        'Is progressive disclosure needed or is this already minimal?',
        'Which specific sections should move to which reference files?',
      ],
    };
  }

  /**
   * Create bash justification analysis prompt
   */
  static createBashJustificationPrompt(
    skill: SkillFile,
    heredocContent: string,
    lineCount: number
  ): SemanticAnalysisPrompt {
    return {
      phaseName: 'Phase 9B: Bash Justification Assessment',
      skillName: skill.name,
      description: skill.frontmatter.description || '',
      context: `Detected ${lineCount}-line bash heredoc:\n\n${heredocContent.slice(0, 1000)}...`,
      questions: [
        'Is bash appropriate for this logic?',
        'Would TypeScript be more maintainable for this complexity?',
        'Could this call existing CLI tools instead of implementing logic?',
        'Does this bash script have proper error handling?',
        'Are there portability concerns (works on macOS/Linux/Windows)?',
      ],
    };
  }

  /**
   * Create complexity assessment prompt for TodoWrite mandate
   */
  static createComplexityAssessmentPrompt(skill: SkillFile, workflowSection: string): SemanticAnalysisPrompt {
    return {
      phaseName: 'Phase 13B: Workflow Complexity Assessment',
      skillName: skill.name,
      description: skill.frontmatter.description || '',
      context: `Workflow section:\n${workflowSection}`,
      questions: [
        'Is this workflow complex enough to require TodoWrite?',
        'Are the steps interdependent or independent?',
        'Does the workflow have conditional branches or validation loops?',
        'Could users reasonably track this mentally or does it need external state?',
        'Is the current TodoWrite mandate strength appropriate (strong/weak/missing)?',
      ],
    };
  }
}
