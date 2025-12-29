/**
 * Phase 15: Orphan Detection
 * Checks if library skills have a discovery path (gateway or agent reference)
 */

import type { SkillFile, Issue, PhaseResult } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';
import {
  getAllAgentMetadata,
  isOrphanedSkill,
  getAgentRecommendations,
  extractDomain,
} from '../agent-analyzer.js';

export class Phase15OrphanDetection {
  /**
   * Check if skill is a library skill (not core)
   */
  private static isLibrarySkill(skill: SkillFile): boolean {
    return skill.path.includes('/skill-library/');
  }

  /**
   * Check if skill is a gateway skill
   */
  private static isGatewaySkill(skill: SkillFile): boolean {
    return skill.name.startsWith('gateway-');
  }

  /**
   * Validate orphan status for a single skill
   * Returns consolidated issue with context
   */
  static async validate(skill: SkillFile): Promise<Issue[]> {
    // Only check library skills (not core, not gateways)
    if (!this.isLibrarySkill(skill) || this.isGatewaySkill(skill)) {
      return [];
    }

    // Build skill metadata for analysis
    const skillMetadata = {
      name: skill.name,
      path: skill.path,
      description: skill.frontmatter.description || '',
      allowedTools: skill.frontmatter['allowed-tools']?.split(',').map((t: string) => t.trim()) || [],
      domain: extractDomain(skill.path),
    };

    // Check orphan status
    const orphaned = isOrphanedSkill(skillMetadata);

    if (!orphaned) {
      return [];
    }

    // Get agent recommendations for context
    const recommendations = await getAgentRecommendations(skillMetadata);
    const context: string[] = [`Domain: ${skillMetadata.domain}`];

    // Add agent recommendations to context
    if (recommendations.high.length > 0) {
      context.push(`Suggested agents (high match): ${recommendations.high.map(r => r.agent).join(', ')}`);
    } else if (recommendations.medium.length > 0) {
      context.push(`Consider agents (medium match): ${recommendations.medium.slice(0, 3).map(r => r.agent).join(', ')}`);
    }

    return [{
      severity: 'WARNING',
      message: `Library skill has no discovery path (orphaned)`,
      recommendation: 'Add to gateway-{domain} routing table or reference in relevant agent',
      context,
      autoFixable: false,
    }];
  }

  /**
   * Run Phase 15 audit on all skills
   */
  static async run(skillsDir: string, options?: any): Promise<PhaseResult> {
    let skillPaths = await SkillParser.findAllSkills(skillsDir);

    // Filter to single skill if specified
    if (options?.skillName) {
      skillPaths = skillPaths.filter(p => p.includes(`/${options.skillName}/SKILL.md`));
    }

    const skills = await Promise.all(skillPaths.map(p => SkillParser.parseSkillFile(p)));
    return this.runOnParsedSkills(skills, options);
  }

  /**
   * Run Phase 15 audit on pre-parsed skills (performance optimized)
   */
  static async runOnParsedSkills(skills: SkillFile[], options?: any): Promise<PhaseResult> {
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
      phaseName: 'Phase 15: Orphan Detection',
      skillsAffected,
      issuesFound,
      issuesFixed: 0,
      details,
    };
  }

  /**
   * Get orphan statistics
   */
  static async getStatistics(skillsDir: string): Promise<{
    librarySkills: number;
    orphanedSkills: number;
    percentage: number;
    orphanList: string[];
  }> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    let librarySkills = 0;
    let orphanedSkills = 0;
    const orphanList: string[] = [];

    for (const skillPath of skillPaths) {
      const skill = await SkillParser.parseSkillFile(skillPath);

      if (!this.isLibrarySkill(skill) || this.isGatewaySkill(skill)) {
        continue;
      }

      librarySkills++;

      const skillMetadata = {
        name: skill.name,
        path: skill.path,
        description: skill.frontmatter.description || '',
        allowedTools: [],
        domain: extractDomain(skill.path),
      };

      if (isOrphanedSkill(skillMetadata)) {
        orphanedSkills++;
        orphanList.push(skill.name);
      }
    }

    const percentage = librarySkills > 0 ? ((librarySkills - orphanedSkills) / librarySkills) * 100 : 100;

    return {
      librarySkills,
      orphanedSkills,
      percentage,
      orphanList,
    };
  }
}
