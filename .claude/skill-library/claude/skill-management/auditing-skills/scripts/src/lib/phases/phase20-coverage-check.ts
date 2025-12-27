/**
 * Phase 20: Coverage Check Validation
 * Validates all library skills appear in exactly one gateway (no orphans, no duplicates)
 */

import type { SkillFile, Issue, PhaseResult } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';
import { resolve } from 'path';
import { readdirSync, statSync } from 'fs';
import { findProjectRoot } from '../../../../../../../lib/find-project-root.js';

const PROJECT_ROOT = findProjectRoot();

export class Phase20CoverageCheck {
  /**
   * Check if skill is a gateway skill
   */
  private static isGatewaySkill(skill: SkillFile): boolean {
    return skill.name.startsWith('gateway-');
  }

  /**
   * Get all library skill names
   */
  private static getAllLibrarySkills(): string[] {
    const libraryPath = resolve(PROJECT_ROOT, '.claude/skill-library');
    const skills: string[] = [];

    const walkDirectory = (dir: string) => {
      try {
        const items = readdirSync(dir);

        for (const item of items) {
          const fullPath = resolve(dir, item);
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            // Check if this directory has SKILL.md (is a skill)
            const skillPath = resolve(fullPath, 'SKILL.md');
            try {
              statSync(skillPath);
              // This is a skill directory
              skills.push(item);
            } catch {
              // Not a skill, recurse into subdirectories
              walkDirectory(fullPath);
            }
          }
        }
      } catch (error) {
        // Directory doesn't exist or can't be read
      }
    };

    walkDirectory(libraryPath);
    return skills;
  }

  /**
   * Extract skill names mentioned in gateway content
   */
  private static extractMentionedSkills(content: string): string[] {
    const skills = new Set<string>();

    // Pattern 1: Paths in routing tables (.claude/skill-library/.../skill-name/SKILL.md)
    const pathPattern = /\.claude\/skill-library\/[^/]+\/([^/]+)\/SKILL\.md/g;
    let match;
    while ((match = pathPattern.exec(content)) !== null) {
      skills.add(match[1]);
    }

    // Pattern 2: skill: "skill-name" in examples
    const skillPattern = /skill:\s*["']([^"']+)["']/g;
    while ((match = skillPattern.exec(content)) !== null) {
      const skillName = match[1];
      // Exclude gateway references
      if (!skillName.startsWith('gateway-')) {
        skills.add(skillName);
      }
    }

    return Array.from(skills);
  }

  /**
   * Validate coverage for all gateways
   */
  static async validateAllGateways(skillsDir: string): Promise<Issue[]> {
    const issues: Issue[] = [];

    // Get all library skills
    const allLibrarySkills = this.getAllLibrarySkills();
    if (allLibrarySkills.length === 0) {
      return issues; // No library skills to check
    }

    // Get all gateway skills
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    const gateways: Array<{ name: string; skills: string[] }> = [];

    for (const skillPath of skillPaths) {
      const skill = await SkillParser.parseSkillFile(skillPath);

      if (this.isGatewaySkill(skill)) {
        const mentionedSkills = this.extractMentionedSkills(skill.content);
        gateways.push({
          name: skill.name,
          skills: mentionedSkills,
        });
      }
    }

    // Build coverage map: skill -> [gateways]
    const coverageMap = new Map<string, string[]>();
    for (const librarySkill of allLibrarySkills) {
      coverageMap.set(librarySkill, []);
    }

    for (const gateway of gateways) {
      for (const skillName of gateway.skills) {
        if (coverageMap.has(skillName)) {
          coverageMap.get(skillName)!.push(gateway.name);
        }
      }
    }

    // Find orphans (skills in no gateway)
    const orphans: string[] = [];
    for (const [skillName, gatewayList] of coverageMap.entries()) {
      if (gatewayList.length === 0) {
        orphans.push(skillName);
      }
    }

    if (orphans.length > 0) {
      issues.push({
        severity: 'WARNING',
        message: `Found ${orphans.length} orphaned skill(s) not in any gateway`,
        recommendation: 'Add skills to appropriate gateway routing tables for discoverability',
        context: orphans,
        autoFixable: false,
      });
    }

    // Find duplicates (skills in multiple gateways)
    const duplicates: Array<{ skill: string; gateways: string[] }> = [];
    for (const [skillName, gatewayList] of coverageMap.entries()) {
      if (gatewayList.length > 1) {
        duplicates.push({ skill: skillName, gateways: gatewayList });
      }
    }

    if (duplicates.length > 0) {
      // Build context with skill → gateways mapping
      const context = duplicates.map(dup => `${dup.skill} in [${dup.gateways.join(', ')}]`);

      issues.push({
        severity: 'WARNING',
        message: `Found ${duplicates.length} skill(s) in multiple gateways`,
        recommendation: 'Each skill should be in exactly one gateway to avoid confusion',
        context,
        autoFixable: false,
      });
    }

    return issues;
  }

  /**
   * Validate coverage check (runs once for all gateways, not per-skill)
   */
  static validate(skill: SkillFile): Issue[] {
    // This phase doesn't validate individual skills
    // It validates the entire gateway ecosystem
    return [];
  }

  /**
   * Run Phase 20 audit
   */
  static async run(skillsDir: string): Promise<PhaseResult> {
    // Run coverage check across all gateways
    const issues = await this.validateAllGateways(skillsDir);

    const details: string[] = [];
    if (issues.length > 0) {
      details.push('Gateway Coverage Check:');
      for (const issue of issues) {
        details.push(`  - [${issue.severity}] ${issue.message}`);
      }
    }

    return {
      phaseName: 'Phase 20: Coverage Check',
      skillsAffected: issues.length > 0 ? 1 : 0,
      issuesFound: issues.length,
      issuesFixed: 0,
      details,
    };
  }
}
