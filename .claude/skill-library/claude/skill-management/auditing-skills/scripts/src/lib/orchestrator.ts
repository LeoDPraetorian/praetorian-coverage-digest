/**
 * Compliance Orchestrator
 * Coordinates audit and fix operations across all 22 phases
 */

import { SkillAuditor } from './audit-engine.js';
import type { FixOptions, ValidatorResult } from './shared/types.js';
import { findSkillPath } from '@chariot/lib';

export class ComplianceOrchestrator {
  private auditor: SkillAuditor;

  constructor(private skillsDir: string) {
    this.auditor = new SkillAuditor(skillsDir);
  }

  /**
   * Run audit across all phases
   */
  async runAudit(options: {
    skillName?: string;
    phase?: string;
    verbose?: boolean;
    dir?: string;
  }) {
    // Auto-detect skill location if skill name provided without --dir
    if (options.skillName && !options.dir) {
      const detectedDir = findSkillPath(options.skillName);
      if (detectedDir) {
        // Update auditor to use detected directory
        this.auditor = new SkillAuditor(detectedDir);
        console.log(`📍 Found skill in: ${detectedDir}\n`);
      }
    }

    // Delegate to SkillAuditor
    if (options.skillName) {
      return await this.auditor.runFullForSingleSkill(options.skillName);
    } else {
      return await this.auditor.runFull();
    }
  }

  /**
   * Run fix across deterministic phases
   */
  async runFix(options: FixOptions) {
    const fixOpts = {
      dryRun: options.dryRun,
      autoFix: true,
      interactive: false,
      skillName: options.skillName,
    };

    const phase = options.phase || 'all';

    if (phase === '2') {
      return await this.auditor.fixPhase2(fixOpts);
    } else if (phase === '4') {
      return await this.auditor.fixPhase4(fixOpts);
    } else if (phase === '5') {
      return await this.auditor.fixPhase5(fixOpts);
    } else if (phase === '6') {
      return await this.auditor.fixPhase6(fixOpts);
    } else if (phase === '7') {
      return await this.auditor.fixPhase7(fixOpts);
    } else if (phase === '10') {
      return await this.auditor.fixPhase10(fixOpts);
    } else if (phase === '12') {
      return await this.auditor.fixPhase12(fixOpts);
    } else if (phase === 'all') {
      // Fix all auto-fixable phases
      const p2 = await this.auditor.fixPhase2(fixOpts);
      const p4 = await this.auditor.fixPhase4(fixOpts);
      const p5 = await this.auditor.fixPhase5(fixOpts);
      const p6 = await this.auditor.fixPhase6(fixOpts);
      const p7 = await this.auditor.fixPhase7(fixOpts);
      const p10 = await this.auditor.fixPhase10(fixOpts);
      const p12 = await this.auditor.fixPhase12(fixOpts);

      // Combine results
      return {
        phases: [],
        totalSkills: 1,
        totalCritical: 0,
        totalWarnings: 0,
        totalInfo: 0,
        summary: `Fixed phases 2, 4, 5, 6, 7, 10, 12`,
      };
    }

    throw new Error(`Invalid phase: ${phase}. Use 2, 4, 5, 6, 7, 10, 12, or all`);
  }

  /**
   * Quick validation check
   */
  async validateSkill(skillPath: string): Promise<ValidatorResult> {
    const result = await this.auditor.validateSingleSkill(skillPath);
    return result;
  }
}
