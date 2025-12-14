/**
 * Main audit orchestrator
 * Runs all audit phases including script organization, bash→TypeScript migration, reference audit, command audit, CLI error handling, and state externalization
 */

import { Phase1DescriptionFormat } from './phases/phase1-description-format.js';
import { Phase2AllowedTools } from './phases/phase2-allowed-tools.js';
import { Phase3WordCount } from './phases/phase3-word-count.js';
import { Phase4BrokenLinks } from './phases/phase4-broken-links.js';
import { Phase5OrganizeFiles } from './phases/phase5-organize-files.js';
import { Phase6ScriptOrganization } from './phases/phase6-script-organization.js';
import { Phase7OutputDirectory } from './phases/phase7-output-directory.js';
import { Phase8TypeScriptStructure } from './phases/phase8-typescript-structure.js';
import { Phase9BashTypeScriptMigration } from './phases/phase9-bash-typescript-migration.js';
import { Phase10ReferenceAudit } from './phases/phase10-reference-audit.js';
import { Phase11CommandAudit } from './phases/phase11-command-audit.js';
import { Phase12CliErrorHandling } from './phases/phase12-cli-error-handling.js';
import { Phase13StateExternalization } from './phases/phase13-state-externalization.js';
import { Phase16WindowsPaths } from './phases/phase16-windows-paths.js';
import { SkillParser } from './utils/skill-parser.js';
import type { FixOptions, ValidatorResult } from './types.js';
import chalk from 'chalk';

/**
 * Total number of audit phases - used for CLI validation and documentation
 * When adding a new phase, update this constant and the phaseRunners in runSinglePhaseForSkill()
 * Note: Phases 14-15 are reserved for future reference validation features
 */
export const PHASE_COUNT = 16;

export class SkillAuditor {
  constructor(private skillsDir: string) {}

  /**
   * Run full audit (all 13 phases)
   */
  async runFull() {
    console.log(chalk.gray('Running Phase 1: Description Format...'));
    const phase1 = await Phase1DescriptionFormat.run(this.skillsDir);

    console.log(chalk.gray('Running Phase 2: Allowed-Tools Field...'));
    const phase2 = await Phase2AllowedTools.run(this.skillsDir);

    console.log(chalk.gray('Running Phase 3: Word Count...'));
    const phase3 = await Phase3WordCount.run(this.skillsDir);

    console.log(chalk.gray('Running Phase 4: Broken Links...'));
    const phase4 = await Phase4BrokenLinks.run(this.skillsDir);

    console.log(chalk.gray('Running Phase 5: File Organization...'));
    const phase5 = await Phase5OrganizeFiles.run(this.skillsDir);

    console.log(chalk.gray('Running Phase 6: Script Organization...'));
    const phase6 = await Phase6ScriptOrganization.run(this.skillsDir);

    console.log(chalk.gray('Running Phase 7: Output Directory Pattern...'));
    const phase7 = await Phase7OutputDirectory.run(this.skillsDir);

    console.log(chalk.gray('Running Phase 8: TypeScript Project Structure...'));
    const phase8 = await Phase8TypeScriptStructure.run(this.skillsDir);

    console.log(chalk.gray('Running Phase 9: Bash→TypeScript Migration...'));
    const phase9 = await Phase9BashTypeScriptMigration.run(this.skillsDir);

    console.log(chalk.gray('Running Phase 10: Reference Audit...'));
    const phase10 = await Phase10ReferenceAudit.run(this.skillsDir);

    console.log(chalk.gray('Running Phase 11: Command Example Audit...'));
    const phase11 = await Phase11CommandAudit.run(this.skillsDir);

    console.log(chalk.gray('Running Phase 12: CLI Error Handling...'));
    const phase12 = await Phase12CliErrorHandling.run(this.skillsDir);

    console.log(chalk.gray('Running Phase 13: State Externalization...'));
    const phase13 = await Phase13StateExternalization.run(this.skillsDir);

    console.log(chalk.gray('Running Phase 16: Windows Path Detection...'));
    const phase16 = await Phase16WindowsPaths.run(this.skillsDir);

    const phases = [phase1, phase2, phase3, phase4, phase5, phase6, phase7, phase8, phase9, phase10, phase11, phase12, phase13, phase16];

    const criticalCount = phases.reduce(
      (sum, p) => sum + p.details.filter(d => d.includes('[CRITICAL]')).length,
      0
    );

    const warningCount = phases.reduce(
      (sum, p) => sum + p.details.filter(d => d.includes('[WARNING]')).length,
      0
    );

    const infoCount = phases.reduce(
      (sum, p) => sum + p.details.filter(d => d.includes('[INFO]')).length,
      0
    );

    const summary = this.formatFullSummary({
      phases,
      criticalCount,
      warningCount,
      infoCount,
    });

    const details = this.formatDetails(phases);

    return {
      summary,
      details,
      totalSkills: 1,
      totalCritical: criticalCount,
      totalWarnings: warningCount,
      totalInfo: infoCount,
      phases,
    };
  }

  /**
   * Run full audit for a single skill (all 13 phases)
   */
  async runFullForSingleSkill(skillName: string) {
    const skillPath = `${this.skillsDir}/${skillName}/SKILL.md`;

    console.log(chalk.gray(`Parsing skill: ${skillName}...`));
    const skill = await SkillParser.parseSkillFile(skillPath);

    console.log(chalk.gray('Running Phase 1: Description Format...'));
    const phase1Issues = Phase1DescriptionFormat.validate(skill);

    console.log(chalk.gray('Running Phase 2: Allowed-Tools Field...'));
    const phase2Issues = Phase2AllowedTools.validate(skill);

    console.log(chalk.gray('Running Phase 3: Word Count...'));
    const phase3Issues = await Phase3WordCount.validate(skill);

    console.log(chalk.gray('Running Phase 4: Broken Links...'));
    const phase4Issues = await Phase4BrokenLinks.validate(skill);

    console.log(chalk.gray('Running Phase 5: File Organization...'));
    const phase5Issues = await Phase5OrganizeFiles.validate(skill);

    console.log(chalk.gray('Running Phase 6: Script Organization...'));
    const phase6Issues = await Phase6ScriptOrganization.validate(skill);

    console.log(chalk.gray('Running Phase 7: Output Directory Pattern...'));
    const phase7Issues = await Phase7OutputDirectory.validate(skill);

    console.log(chalk.gray('Running Phase 8: TypeScript Project Structure...'));
    const phase8Issues = Phase8TypeScriptStructure.validate(skill, true); // Single-skill mode

    console.log(chalk.gray('Running Phase 9: Bash→TypeScript Migration...'));
    const phase9Issues = await Phase9BashTypeScriptMigration.validate(skill);

    console.log(chalk.gray('Running Phase 10: Reference Audit...'));
    const phase10Issues = await Phase10ReferenceAudit.validate(skill, this.skillsDir);

    console.log(chalk.gray('Running Phase 11: Command Example Audit...'));
    const phase11Issues = await Phase11CommandAudit.validate(skill);

    console.log(chalk.gray('Running Phase 12: CLI Error Handling...'));
    const phase12Issues = await Phase12CliErrorHandling.validate(skill);

    console.log(chalk.gray('Running Phase 13: State Externalization...'));
    const phase13Issues = Phase13StateExternalization.validate(skill);

    console.log(chalk.gray('Running Phase 16: Windows Path Detection...'));
    const phase16Issues = Phase16WindowsPaths.validate(skill);

    // Format results as phase results for consistency
    const formatPhaseResult = (phaseName: string, issues: any[]) => {
      const issueCount = issues?.length || 0;
      return {
        phaseName,
        skillsAffected: issueCount > 0 ? 1 : 0,
        issuesFound: issueCount,
        issuesFixed: 0,
        details: issueCount > 0
          ? [`${skill.name}:`, ...issues.map(i => `  - [${i.severity}] ${i.message}`)]
          : [],
      };
    };

    const phases = [
      formatPhaseResult('Phase 1: Description Format', phase1Issues),
      formatPhaseResult('Phase 2: Allowed-Tools Field', phase2Issues),
      formatPhaseResult('Phase 3: Word Count', phase3Issues),
      formatPhaseResult('Phase 4: Broken Links', phase4Issues),
      formatPhaseResult('Phase 5: File Organization', phase5Issues),
      formatPhaseResult('Phase 6: Script Organization', phase6Issues),
      formatPhaseResult('Phase 7: Output Directory Pattern', phase7Issues),
      formatPhaseResult('Phase 8: TypeScript Project Structure', phase8Issues),
      formatPhaseResult('Phase 9: Bash→TypeScript Migration', phase9Issues),
      formatPhaseResult('Phase 10: Reference Audit', phase10Issues),
      formatPhaseResult('Phase 11: Command Example Audit', phase11Issues),
      formatPhaseResult('Phase 12: CLI Error Handling', phase12Issues),
      formatPhaseResult('Phase 13: State Externalization', phase13Issues),
      formatPhaseResult('Phase 16: Windows Path Detection', phase16Issues),
    ];

    const criticalCount = phases.reduce(
      (sum, p) => sum + p.details.filter(d => d.includes('[CRITICAL]')).length,
      0
    );

    const warningCount = phases.reduce(
      (sum, p) => sum + p.details.filter(d => d.includes('[WARNING]')).length,
      0
    );

    const infoCount = phases.reduce(
      (sum, p) => sum + p.details.filter(d => d.includes('[INFO]')).length,
      0
    );

    const summary = this.formatFullSummary({
      phases,
      criticalCount,
      warningCount,
      infoCount,
    });

    const details = this.formatDetails(phases);

    return {
      summary,
      details,
      totalSkills: 1,
      totalCritical: criticalCount,
      totalWarnings: warningCount,
      totalInfo: infoCount,
      phases,
    };
  }

  /**
   * Run a single phase for a specific skill
   */
  async runSinglePhaseForSkill(skillName: string, phaseNumber: number) {
    const skillPath = `${this.skillsDir}/${skillName}/SKILL.md`;

    console.log(chalk.gray(`Parsing skill: ${skillName}...`));
    const skill = await SkillParser.parseSkillFile(skillPath);

    const phaseRunners: Record<number, { name: string; run: () => Promise<any[]> | any[] }> = {
      1: { name: 'Phase 1: Description Format', run: () => Phase1DescriptionFormat.validate(skill) },
      2: { name: 'Phase 2: Allowed-Tools Field', run: () => Phase2AllowedTools.validate(skill) },
      3: { name: 'Phase 3: Word Count', run: () => Phase3WordCount.validate(skill) },
      4: { name: 'Phase 4: Broken Links', run: () => Phase4BrokenLinks.validate(skill) },
      5: { name: 'Phase 5: File Organization', run: () => Phase5OrganizeFiles.validate(skill) },
      6: { name: 'Phase 6: Script Organization', run: () => Phase6ScriptOrganization.validate(skill) },
      7: { name: 'Phase 7: Output Directory Pattern', run: () => Phase7OutputDirectory.validate(skill) },
      8: { name: 'Phase 8: TypeScript Project Structure', run: () => Phase8TypeScriptStructure.validate(skill, true) }, // Single-skill mode
      9: { name: 'Phase 9: Bash→TypeScript Migration', run: () => Phase9BashTypeScriptMigration.validate(skill) },
      10: { name: 'Phase 10: Reference Audit', run: () => Phase10ReferenceAudit.validate(skill, this.skillsDir) },
      11: { name: 'Phase 11: Command Example Audit', run: () => Phase11CommandAudit.validate(skill) },
      12: { name: 'Phase 12: CLI Error Handling', run: () => Phase12CliErrorHandling.validate(skill) },
      13: { name: 'Phase 13: State Externalization', run: () => Phase13StateExternalization.validate(skill) },
    };

    const runner = phaseRunners[phaseNumber];
    if (!runner) {
      throw new Error(`Invalid phase number: ${phaseNumber}. Must be 1-${PHASE_COUNT}.`);
    }

    console.log(chalk.gray(`Running ${runner.name}...`));
    const issues = await runner.run();

    const phase = {
      phaseName: runner.name,
      skillsAffected: issues.length > 0 ? 1 : 0,
      issuesFound: issues.length,
      issuesFixed: 0,
      details: issues.length > 0
        ? [`${skill.name}:`, ...issues.map((i: any) => `  - [${i.severity}] ${i.message}`)]
        : [],
    };

    const criticalCount = phase.details.filter(d => d.includes('[CRITICAL]')).length;
    const warningCount = phase.details.filter(d => d.includes('[WARNING]')).length;
    const infoCount = phase.details.filter(d => d.includes('[INFO]')).length;

    const summary = this.formatSinglePhaseSummary({
      phase,
      criticalCount,
      warningCount,
      infoCount,
    });

    return {
      summary,
      details: this.formatDetails([phase]),
      totalSkills: 1,
      totalCritical: criticalCount,
      totalWarnings: warningCount,
      totalInfo: infoCount,
      phases: [phase],
    };
  }

  /**
   * Format single phase summary
   */
  private formatSinglePhaseSummary(data: {
    phase: any;
    criticalCount: number;
    warningCount: number;
    infoCount: number;
  }): string {
    let output = `\n${chalk.bold(data.phase.phaseName)}\n${'='.repeat(50)}\n\n`;
    output += `Skills affected: ${data.phase.skillsAffected}\n`;
    output += `Issues found: ${data.phase.issuesFound}\n\n`;

    if (data.phase.details.length > 0) {
      for (const detail of data.phase.details) {
        if (detail.includes('[CRITICAL]')) {
          output += chalk.red(detail) + '\n';
        } else if (detail.includes('[WARNING]')) {
          output += chalk.yellow(detail) + '\n';
        } else if (detail.includes('[INFO]')) {
          output += chalk.blue(detail) + '\n';
        } else {
          output += detail + '\n';
        }
      }
      output += '\n';
    }

    output += `${chalk.bold('Issue Breakdown')}\n`;
    output += `  ${chalk.red(`CRITICAL: ${data.criticalCount}`)}\n`;
    output += `  ${chalk.yellow(`WARNING: ${data.warningCount}`)}\n`;
    output += `  ${chalk.blue(`INFO: ${data.infoCount}`)}\n\n`;

    output += data.criticalCount === 0
      ? chalk.green('✅ No critical issues!')
      : chalk.red('⚠️  Critical issues found');

    return output;
  }

  /**
   * Run MVP audit (Phase 1 & 2)
   */
  async runMVP() {
    console.log(chalk.gray('Running Phase 1: Description Format...'));
    const phase1 = await Phase1DescriptionFormat.run(this.skillsDir);

    console.log(chalk.gray('Running Phase 2: Allowed-Tools Field...'));
    const phase2 = await Phase2AllowedTools.run(this.skillsDir);

    const criticalCount =
      phase1.details.filter(d => d.includes('[CRITICAL]')).length +
      phase2.details.filter(d => d.includes('[CRITICAL]')).length;

    const warningCount =
      phase1.details.filter(d => d.includes('[WARNING]')).length +
      phase2.details.filter(d => d.includes('[WARNING]')).length;

    const infoCount =
      phase1.details.filter(d => d.includes('[INFO]')).length +
      phase2.details.filter(d => d.includes('[INFO]')).length;

    const summary = this.formatSummary({
      phase1,
      phase2,
      criticalCount,
      warningCount,
      infoCount,
    });

    const details = this.formatDetails([phase1, phase2]);

    return {
      summary,
      details,
      criticalCount,
      warningCount,
      infoCount,
      phase1,
      phase2,
    };
  }

  /**
   * Auto-fix Phase 2 issues
   */
  async fixPhase2(options: FixOptions) {
    const targetInfo = options.skillName ? ` for ${options.skillName}` : '';
    console.log(chalk.gray(`Analyzing Phase 2 issues${targetInfo}...`));
    const phase2 = await Phase2AllowedTools.run(this.skillsDir, options);

    const summary = `
${chalk.bold('Phase 2: Allowed-Tools Field')}${targetInfo}
${'='.repeat(50)}

Skills affected: ${phase2.skillsAffected}
Issues found: ${phase2.issuesFound}
Issues fixed: ${phase2.issuesFixed}

${options.dryRun ? chalk.yellow('(Dry run - no changes made)') : chalk.green('Changes applied')}
`;

    return {
      summary,
      phase2,
    };
  }

  /**
   * Auto-fix Phase 4 issues (broken links - path correction)
   */
  async fixPhase4(options: FixOptions) {
    const targetInfo = options.skillName ? ` for ${options.skillName}` : '';
    console.log(chalk.gray(`Analyzing Phase 4 issues${targetInfo}...`));
    const phase4 = await Phase4BrokenLinks.run(this.skillsDir, options);

    const summary = `
${chalk.bold('Phase 4: Broken Links')}${targetInfo}
${'='.repeat(50)}

Skills affected: ${phase4.skillsAffected}
Issues found: ${phase4.issuesFound}
Issues fixed: ${phase4.issuesFixed}

${options.dryRun ? chalk.yellow('(Dry run - no changes made)') : chalk.green('Changes applied')}
`;

    return {
      summary,
      phase4,
    };
  }

  /**
   * Auto-fix Phase 5 issues (organize orphaned files)
   */
  async fixPhase5(options: FixOptions) {
    const targetInfo = options.skillName ? ` for ${options.skillName}` : '';
    console.log(chalk.gray(`Analyzing Phase 5 issues${targetInfo}...`));
    const phase5 = await Phase5OrganizeFiles.run(this.skillsDir, options);

    const summary = `
${chalk.bold('Phase 5: Organize Files')}${targetInfo}
${'='.repeat(50)}

Skills affected: ${phase5.skillsAffected}
Issues found: ${phase5.issuesFound}
Issues fixed: ${phase5.issuesFixed}

${options.dryRun ? chalk.yellow('(Dry run - no changes made)') : chalk.green('Changes applied')}
`;

    return {
      summary,
      phase5,
    };
  }

  /**
   * Auto-fix Phase 6 issues (organize scripts to scripts/ subdirectory)
   */
  async fixPhase6(options: FixOptions) {
    const targetInfo = options.skillName ? ` for ${options.skillName}` : '';
    console.log(chalk.gray(`Analyzing Phase 6 issues${targetInfo}...`));
    const phase6 = await Phase6ScriptOrganization.run(this.skillsDir, options);

    const summary = `
${chalk.bold('Phase 6: Script Organization')}${targetInfo}
${'='.repeat(50)}

Skills affected: ${phase6.skillsAffected}
Issues found: ${phase6.issuesFound}
Issues fixed: ${phase6.issuesFixed}

${options.dryRun ? chalk.yellow('(Dry run - no changes made)') : chalk.green('Changes applied')}
`;

    return {
      summary,
      phase6,
    };
  }

  /**
   * Auto-fix Phase 7 issues (output directory pattern)
   */
  async fixPhase7(options: FixOptions) {
    const targetInfo = options.skillName ? ` for ${options.skillName}` : '';
    console.log(chalk.gray(`Analyzing Phase 7 issues${targetInfo}...`));
    const phase7 = await Phase7OutputDirectory.run(this.skillsDir, options);

    const summary = `
${chalk.bold('Phase 7: Output Directory Pattern')}${targetInfo}
${'='.repeat(50)}

Skills affected: ${phase7.skillsAffected}
Issues found: ${phase7.issuesFound}
Issues fixed: ${phase7.issuesFixed}

${options.dryRun ? chalk.yellow('(Dry run - no changes made)') : chalk.green('Changes applied')}
`;

    return {
      summary,
      phase7,
    };
  }

  /**
   * Auto-fix Phase 10 issues (deprecated references)
   */
  async fixPhase10(options: FixOptions) {
    const targetInfo = options.skillName ? ` for ${options.skillName}` : '';
    console.log(chalk.gray(`Analyzing Phase 10 issues${targetInfo}...`));
    const phase10 = await Phase10ReferenceAudit.run(this.skillsDir, options);

    const summary = `
${chalk.bold('Phase 10: Reference Audit')}${targetInfo}
${'='.repeat(50)}

Skills affected: ${phase10.skillsAffected}
Issues found: ${phase10.issuesFound}
Issues fixed: ${phase10.issuesFixed}

${options.dryRun ? chalk.yellow('(Dry run - no changes made)') : chalk.green('Changes applied')}
`;

    return {
      summary,
      phase10,
    };
  }

  /**
   * Auto-fix Phase 12 issues (CLI error codes)
   */
  async fixPhase12(options: FixOptions) {
    const targetInfo = options.skillName ? ` for ${options.skillName}` : '';
    console.log(chalk.gray(`Analyzing Phase 12 issues${targetInfo}...`));
    const phase12 = await Phase12CliErrorHandling.run(this.skillsDir, options);

    const summary = `
${chalk.bold('Phase 12: CLI Error Handling')}${targetInfo}
${'='.repeat(50)}

Skills affected: ${phase12.skillsAffected}
Issues found: ${phase12.issuesFound}
Issues fixed: ${phase12.issuesFixed}

${options.dryRun ? chalk.yellow('(Dry run - no changes made)') : chalk.green('Changes applied')}
`;

    return {
      summary,
      phase12,
    };
  }

  /**
   * Validate a single skill file
   */
  async validateSingleSkill(skillPath: string): Promise<ValidatorResult> {
    const skill = await SkillParser.parseSkillFile(skillPath);

    const phase1Issues = Phase1DescriptionFormat.validate(skill);
    const phase2Issues = Phase2AllowedTools.validate(skill);
    const phase3Issues = await Phase3WordCount.validate(skill);
    const phase4Issues = await Phase4BrokenLinks.validate(skill);
    const phase5Issues = await Phase5OrganizeFiles.validate(skill);
    const phase6Issues = await Phase6ScriptOrganization.validate(skill);
    const phase7Issues = await Phase7OutputDirectory.validate(skill);
    const phase8Issues = Phase8TypeScriptStructure.validate(skill, false); // All-skills mode (workspace-wide tests)
    const phase9Issues = await Phase9BashTypeScriptMigration.validate(skill);
    const phase10Issues = await Phase10ReferenceAudit.validate(skill, this.skillsDir);
    const phase11Issues = await Phase11CommandAudit.validate(skill);
    const phase12Issues = await Phase12CliErrorHandling.validate(skill);

    const allIssues = [...phase1Issues, ...phase2Issues, ...phase3Issues, ...phase4Issues, ...phase5Issues, ...phase6Issues, ...phase7Issues, ...phase8Issues, ...phase9Issues, ...phase10Issues, ...phase11Issues, ...phase12Issues];

    const errors = allIssues
      .filter(i => i.severity === 'CRITICAL')
      .map(i => i.message);

    const warnings = allIssues
      .filter(i => i.severity === 'WARNING' || i.severity === 'INFO')
      .map(i => i.message);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Format full summary with all phases
   */
  private formatFullSummary(data: {
    phases: any[];
    criticalCount: number;
    warningCount: number;
    infoCount: number;
  }): string {
    let output = `\n${chalk.bold('Audit Summary')}\n${'='.repeat(50)}\n\n`;

    for (const phase of data.phases) {
      output += `${chalk.bold(phase.phaseName)}\n`;
      output += `  Skills affected: ${phase.skillsAffected}\n`;
      output += `  Issues found: ${phase.issuesFound}\n`;
      if (phase.issuesFixed > 0) {
        output += `  Issues fixed: ${phase.issuesFixed}\n`;
      }
      output += '\n';
    }

    output += `${chalk.bold('Issue Breakdown')}\n`;
    output += `  ${chalk.red(`CRITICAL: ${data.criticalCount}`)}\n`;
    output += `  ${chalk.yellow(`WARNING: ${data.warningCount}`)}\n`;
    output += `  ${chalk.blue(`INFO: ${data.infoCount}`)}\n\n`;

    output += data.criticalCount === 0
      ? chalk.green('✅ No critical issues!')
      : chalk.red('⚠️  Critical issues found');

    return output;
  }

  /**
   * Format summary output
   */
  private formatSummary(data: {
    phase1: any;
    phase2: any;
    criticalCount: number;
    warningCount: number;
    infoCount: number;
  }): string {
    return `
${chalk.bold('Audit Summary')}
${'='.repeat(50)}

${chalk.bold('Phase 1: Description Format')}
  Skills affected: ${data.phase1.skillsAffected}
  Issues found: ${data.phase1.issuesFound}

${chalk.bold('Phase 2: Allowed-Tools Field')}
  Skills affected: ${data.phase2.skillsAffected}
  Issues found: ${data.phase2.issuesFound}
  ${data.phase2.issuesFixed > 0 ? `Issues fixed: ${data.phase2.issuesFixed}` : ''}

${chalk.bold('Issue Breakdown')}
  ${chalk.red(`CRITICAL: ${data.criticalCount}`)}
  ${chalk.yellow(`WARNING: ${data.warningCount}`)}
  ${chalk.blue(`INFO: ${data.infoCount}`)}

${data.criticalCount === 0 ? chalk.green('✅ No critical issues!') : chalk.red('⚠️  Critical issues found')}
`;
  }

  /**
   * Format detailed results
   */
  private formatDetails(phases: any[]): string {
    let output = '\n';

    for (const phase of phases) {
      output += chalk.bold(`\n${phase.phaseName}\n`);
      output += '='.repeat(50) + '\n\n';

      if (phase.details.length === 0) {
        output += chalk.green('✅ No issues found\n');
      } else {
        for (const detail of phase.details) {
          if (detail.includes('[CRITICAL]')) {
            output += chalk.red(detail) + '\n';
          } else if (detail.includes('[WARNING]')) {
            output += chalk.yellow(detail) + '\n';
          } else if (detail.includes('[INFO]')) {
            output += chalk.blue(detail) + '\n';
          } else {
            output += detail + '\n';
          }
        }
      }
    }

    return output;
  }
}
