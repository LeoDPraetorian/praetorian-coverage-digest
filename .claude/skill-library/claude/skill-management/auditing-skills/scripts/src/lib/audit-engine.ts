/**
 * Main audit orchestrator
 * Runs all audit phases including script organization, bash→TypeScript migration, reference audit, command audit, CLI error handling, and state externalization
 */

import { PHASE_REGISTRY, PHASE_COUNT, getPhaseKey, findPhasesByNumber } from './phase-registry.js';
import { SkillParser } from './utils/skill-parser.js';
import type { FixOptions, ValidatorResult, PhaseResult, SkillFile } from './types.js';
import chalk from 'chalk';
import Table from 'cli-table3';

// Import phase classes needed for fixPhase methods
import { Phase1DescriptionFormat } from './phases/phase1-description-format.js';
import { Phase2AllowedTools } from './phases/phase2-allowed-tools.js';
import { Phase3LineCount } from './phases/phase3-line-count.js';
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
import { Phase14aTableFormatting } from './phases/phase14a-table-formatting.js';
import { Phase14bCodeBlockQuality } from './phases/phase14b-code-block-quality.js';
import { Phase14cHeaderHierarchy } from './phases/phase14c-header-hierarchy.js';
import { Phase16WindowsPaths } from './phases/phase16-windows-paths.js';
import { Phase18RoutingTableFormat } from './phases/phase18-routing-table-format.js';

// Re-export PHASE_COUNT for CLI usage
export { PHASE_COUNT };

export class SkillAuditor {
  constructor(
    private skillsDir: string,
    private quiet: boolean = false
  ) {}

  /**
   * Parse all skills once (performance optimization)
   * Used by runFull() to avoid O(N×M) complexity
   */
  private async parseAllSkills(): Promise<SkillFile[]> {
    const skillPaths = await SkillParser.findAllSkills(this.skillsDir);
    return Promise.all(skillPaths.map(p => SkillParser.parseSkillFile(p)));
  }

  /**
   * Run full audit (all phases registered in PHASE_REGISTRY)
   * Performance: O(N) - parses each skill once, then validates across all phases
   */
  async runFull() {
    console.log(chalk.gray('Parsing all skills...'));
    const skills = await this.parseAllSkills();
    console.log(chalk.gray(`Parsed ${skills.length} skills. Running ${PHASE_REGISTRY.length} phases...`));

    const phases: PhaseResult[] = [];

    for (const phaseDef of PHASE_REGISTRY) {
      const phaseKey = getPhaseKey(phaseDef);
      console.log(chalk.gray(`Running Phase ${phaseKey}: ${phaseDef.name}...`));

      const result = phaseDef.requiresSkillsDir
        ? await phaseDef.phase.runOnParsedSkills(skills, this.skillsDir)
        : await phaseDef.phase.runOnParsedSkills(skills);

      phases.push(result);
    }

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
   * Run full audit for a single skill (all phases registered in PHASE_REGISTRY)
   */
  async runFullForSingleSkill(skillName: string) {
    const skillPath = `${this.skillsDir}/${skillName}/SKILL.md`;

    if (!this.quiet) console.log(chalk.gray(`Parsing skill: ${skillName}...`));
    const skill = await SkillParser.parseSkillFile(skillPath);

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
        // Include raw issues for table formatting (preserves recommendation/context)
        rawIssues: issueCount > 0 ? issues : undefined,
      };
    };

    const phases = [];

    for (const phaseDef of PHASE_REGISTRY) {
      const phaseKey = getPhaseKey(phaseDef);
      if (!this.quiet) console.log(chalk.gray(`Running Phase ${phaseKey}: ${phaseDef.name}...`));

      const issues = phaseDef.requiresSkillsDir
        ? await phaseDef.phase.validate(skill, this.skillsDir)
        : await phaseDef.phase.validate(skill);

      const phaseResult = formatPhaseResult(`Phase ${phaseKey}: ${phaseDef.name}`, issues);
      phases.push(phaseResult);
    }

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

    const matchingPhases = findPhasesByNumber(phaseNumber);

    if (matchingPhases.length === 0) {
      throw new Error(`Invalid phase number: ${phaseNumber}. Must be 1-${PHASE_COUNT}.`);
    }

    // Collect all issues from phases with this number (handles sub-phases like 14a, 14b, 14c)
    const allIssues: any[] = [];
    let phaseName = '';

    for (const phaseDef of matchingPhases) {
      const phaseKey = getPhaseKey(phaseDef);
      if (!phaseName) {
        phaseName = matchingPhases.length > 1
          ? `Phase ${phaseNumber}: ${matchingPhases.map(p => p.name).join(', ')}`
          : `Phase ${phaseKey}: ${phaseDef.name}`;
      }

      console.log(chalk.gray(`Running Phase ${phaseKey}: ${phaseDef.name}...`));

      const issues = phaseDef.requiresSkillsDir
        ? await phaseDef.phase.validate(skill, this.skillsDir)
        : await phaseDef.phase.validate(skill);

      allIssues.push(...issues);
    }

    const issues = allIssues;

    const phase = {
      phaseName,
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
   * Auto-fix Phase 14a issues (table formatting with Prettier)
   */
  async fixPhase14a(options: FixOptions) {
    const targetInfo = options.skillName ? ` for ${options.skillName}` : '';
    console.log(chalk.gray(`Analyzing Phase 14a issues${targetInfo}...`));

    let skillsAffected = 0;
    let issuesFound = 0;
    let issuesFixed = 0;

    const skillPaths = await SkillParser.findAllSkills(this.skillsDir);
    const targetSkills = options.skillName
      ? skillPaths.filter((p) => p.includes(`/${options.skillName}/`))
      : skillPaths;

    for (const skillPath of targetSkills) {
      const skill = await SkillParser.parseSkillFile(skillPath);
      const issues = Phase14aTableFormatting.validate(skill);

      if (issues.some((i) => i.autoFixable)) {
        skillsAffected++;
        issuesFound += issues.filter((i) => i.autoFixable).length;

        if (!options.dryRun) {
          const fixed = await Phase14aTableFormatting.fix(skill, false);
          issuesFixed += fixed;
        }
      }
    }

    const summary = `
${chalk.bold('Phase 14a: Table Formatting (Prettier)')}${targetInfo}
${'='.repeat(50)}

Skills affected: ${skillsAffected}
Issues found: ${issuesFound}
Issues fixed: ${options.dryRun ? 0 : issuesFixed}

${options.dryRun ? chalk.yellow('(Dry run - no changes made)') : chalk.green('Changes applied')}
`;

    return {
      summary,
      phase14a: { skillsAffected, issuesFound, issuesFixed },
    };
  }

  /**
   * Auto-fix Phase 16 issues (Windows path detection)
   */
  async fixPhase16(options: FixOptions) {
    const targetInfo = options.skillName ? ` for ${options.skillName}` : '';
    console.log(chalk.gray(`Analyzing Phase 16 issues${targetInfo}...`));

    let skillsAffected = 0;
    let issuesFound = 0;
    let issuesFixed = 0;

    const skillPaths = await SkillParser.findAllSkills(this.skillsDir);
    const targetSkills = options.skillName
      ? skillPaths.filter((p) => p.includes(`/${options.skillName}/`))
      : skillPaths;

    for (const skillPath of targetSkills) {
      const skill = await SkillParser.parseSkillFile(skillPath);
      const issues = Phase16WindowsPaths.validate(skill);

      if (issues.some((i) => i.autoFixable)) {
        skillsAffected++;
        issuesFound += issues.filter((i) => i.autoFixable).length;

        if (!options.dryRun) {
          const fixed = await Phase16WindowsPaths.fix(skill, false);
          issuesFixed += fixed;
        }
      }
    }

    const summary = `
${chalk.bold('Phase 16: Windows Path Detection')}${targetInfo}
${'='.repeat(50)}

Skills affected: ${skillsAffected}
Issues found: ${issuesFound}
Issues fixed: ${options.dryRun ? 0 : issuesFixed}

${options.dryRun ? chalk.yellow('(Dry run - no changes made)') : chalk.green('Changes applied')}
`;

    return {
      summary,
      phase16: { skillsAffected, issuesFound, issuesFixed },
    };
  }

  /**
   * Auto-fix Phase 18 issues (routing table format)
   */
  async fixPhase18(options: FixOptions) {
    const targetInfo = options.skillName ? ` for ${options.skillName}` : '';
    console.log(chalk.gray(`Analyzing Phase 18 issues${targetInfo}...`));

    let skillsAffected = 0;
    let issuesFound = 0;
    let issuesFixed = 0;

    const skillPaths = await SkillParser.findAllSkills(this.skillsDir);
    const targetSkills = options.skillName
      ? skillPaths.filter((p) => p.includes(`/${options.skillName}/`))
      : skillPaths;

    for (const skillPath of targetSkills) {
      const skill = await SkillParser.parseSkillFile(skillPath);

      // Only process gateway skills
      if (!skill.name.startsWith('gateway-')) {
        continue;
      }

      const issues = Phase18RoutingTableFormat.validate(skill);

      if (issues.some((i) => i.autoFixable)) {
        skillsAffected++;
        issuesFound += issues.filter((i) => i.autoFixable).length;

        if (!options.dryRun) {
          const fixed = await Phase18RoutingTableFormat.fix(skill, false);
          issuesFixed += fixed;
        }
      }
    }

    const summary = `
${chalk.bold('Phase 18: Routing Table Format')}${targetInfo}
${'='.repeat(50)}

Skills affected: ${skillsAffected}
Issues found: ${issuesFound}
Issues fixed: ${options.dryRun ? 0 : issuesFixed}

${options.dryRun ? chalk.yellow('(Dry run - no changes made)') : chalk.green('Changes applied')}
`;

    return {
      summary,
      phase18: { skillsAffected, issuesFound, issuesFixed },
    };
  }

  /**
   * Validate a single skill file
   */
  async validateSingleSkill(skillPath: string): Promise<ValidatorResult> {
    const skill = await SkillParser.parseSkillFile(skillPath);

    const phase1Issues = Phase1DescriptionFormat.validate(skill);
    const phase2Issues = Phase2AllowedTools.validate(skill);
    const phase3Issues = await Phase3LineCount.validate(skill);
    const phase4Issues = await Phase4BrokenLinks.validate(skill);
    const phase5Issues = await Phase5OrganizeFiles.validate(skill);
    const phase6Issues = await Phase6ScriptOrganization.validate(skill);
    const phase7Issues = await Phase7OutputDirectory.validate(skill);
    const phase8Issues = Phase8TypeScriptStructure.validate(skill, false); // All-skills mode (workspace-wide tests)
    const phase9Issues = await Phase9BashTypeScriptMigration.validate(skill);
    const phase10Issues = await Phase10ReferenceAudit.validate(skill, this.skillsDir);
    const phase11Issues = await Phase11CommandAudit.validate(skill);
    const phase12Issues = await Phase12CliErrorHandling.validate(skill);
    const phase14aIssues = Phase14aTableFormatting.validate(skill);
    const phase14bIssues = Phase14bCodeBlockQuality.validate(skill);
    const phase14cIssues = Phase14cHeaderHierarchy.validate(skill);

    const allIssues = [...phase1Issues, ...phase2Issues, ...phase3Issues, ...phase4Issues, ...phase5Issues, ...phase6Issues, ...phase7Issues, ...phase8Issues, ...phase9Issues, ...phase10Issues, ...phase11Issues, ...phase12Issues, ...phase14aIssues, ...phase14bIssues, ...phase14cIssues];

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
    // Quiet mode: Only show issue breakdown, skip per-phase details
    if (this.quiet) {
      let output = `\n${chalk.bold('Issue Breakdown')}\n`;
      output += `  ${chalk.red(`CRITICAL: ${data.criticalCount}`)}\n`;
      output += `  ${chalk.yellow(`WARNING: ${data.warningCount}`)}\n`;
      output += `  ${chalk.blue(`INFO: ${data.infoCount}`)}\n\n`;

      output += data.criticalCount === 0
        ? chalk.green('✅ No critical issues!')
        : chalk.red('⚠️  Critical issues found');

      return output;
    }

    // Verbose mode: Show full per-phase summary
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

  /**
   * Format audit issues as a beautiful table
   * Uses rawIssues when available (preserves recommendation/context from phases)
   * Falls back to parsing details strings for backward compatibility
   */
  formatDetailedTable(phases: PhaseResult[]): string {
    // Step 1: Extract and structure all issues
    const issues: import('./types.js').StructuredIssue[] = [];

    for (const phase of phases) {
      const phaseNumber = this.extractPhaseNumber(phase.phaseName);

      // Prefer rawIssues if available (new format with recommendation/context)
      if (phase.rawIssues && phase.rawIssues.length > 0) {
        for (const rawIssue of phase.rawIssues) {
          issues.push({
            phase: phase.phaseName,
            phaseNumber,
            severity: rawIssue.severity,
            issue: rawIssue.message,
            recommendation: rawIssue.recommendation || this.getDefaultRecommendation(phaseNumber, rawIssue.severity),
            details: rawIssue.context?.join('; '),
          });
        }
        continue; // Skip fallback parsing
      }

      // Fallback: Parse from details strings (backward compatibility)
      for (const detail of phase.details) {
        // Skip skill names (first line of each phase)
        if (detail.endsWith(':')) continue;

        // Parse severity and message
        const match = detail.match(/\[(\w+)\]\s+(.+)/);
        if (!match) continue;

        const [, severity, message] = match;

        // Split into issue and recommendation (if present)
        const { issue, recommendation } = this.parseIssueMessage(message);

        issues.push({
          phase: phase.phaseName,
          phaseNumber,
          severity: severity as import('./types.js').IssueSeverity,
          issue,
          recommendation: recommendation || this.getDefaultRecommendation(phaseNumber, severity),
        });
      }
    }

    // Step 2: Sort deterministically (severity first, then phase number)
    const SEVERITY_ORDER = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    issues.sort((a, b) => {
      if (a.severity !== b.severity) {
        return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      }
      return a.phaseNumber - b.phaseNumber;
    });

    // Step 3: Render table with explicit column order
    const table = new (Table as any)({
      head: [
        chalk.bold('Severity'),
        chalk.bold('Phase'),
        chalk.bold('Issue'),
        chalk.bold('Recommendation')
      ],
      colWidths: [14, 28, 60, 60], // Fixed widths for consistency
      wordWrap: true,
      style: {
        head: ['cyan'],
        border: ['gray'],
        compact: false,
      },
      chars: {
        // Unicode box drawing (beautiful!)
        'top': '═',
        'top-mid': '╤',
        'top-left': '╔',
        'top-right': '╗',
        'bottom': '═',
        'bottom-mid': '╧',
        'bottom-left': '╚',
        'bottom-right': '╝',
        'left': '║',
        'left-mid': '╟',
        'mid': '─',
        'mid-mid': '┼',
        'right': '║',
        'right-mid': '╢',
        'middle': '│'
      }
    });

    // Step 4: Add rows with color-coded severity
    for (const issue of issues) {
      table.push([
        this.formatSeverity(issue.severity),
        chalk.gray(this.formatPhaseShort(issue.phase)),
        issue.issue,
        chalk.italic(issue.recommendation)
      ]);
    }

    return '\n' + table.toString() + '\n';
  }

  /**
   * Format severity with symbol and color (deterministic)
   * Uses simple geometric Unicode symbols for consistent terminal width
   * (Emojis like 🔴 ⚠️ ℹ️ cause alignment issues due to variable rendering)
   */
  private formatSeverity(severity: import('./types.js').IssueSeverity): string {
    switch (severity) {
      case 'CRITICAL':
        return chalk.red.bold('● CRITICAL');
      case 'WARNING':
        return chalk.yellow.bold('▲ WARNING');
      case 'INFO':
        return chalk.blue('○ INFO');
    }
  }

  /**
   * Shorten phase names for table display
   */
  private formatPhaseShort(phaseName: string): string {
    // "Phase 1: Description Format" → "P1: Description"
    return phaseName
      .replace(/Phase (\d+):\s+/, 'P$1: ')
      .substring(0, 26); // Truncate if needed
  }

  /**
   * Extract phase number from name (for sorting)
   */
  private extractPhaseNumber(phaseName: string): number {
    const match = phaseName.match(/Phase (\d+)/);
    return match ? parseInt(match[1]) : 999;
  }

  /**
   * Parse issue message into issue/recommendation
   * Handles various formats from different phases
   */
  private parseIssueMessage(message: string): { issue: string; recommendation: string | null } {
    // Try to detect recommendation patterns
    if (message.includes('→')) {
      const parts = message.split('→');
      return {
        issue: parts[0].trim(),
        recommendation: parts.slice(1).join('→').trim()
      };
    }

    if (message.includes(' - ')) {
      const [issue, ...recParts] = message.split(' - ');
      return {
        issue: issue.trim(),
        recommendation: recParts.join(' - ').trim() || null
      };
    }

    // No clear recommendation, return full message as issue
    return { issue: message, recommendation: null };
  }

  /**
   * Default recommendations by phase (fallback)
   */
  private getDefaultRecommendation(phaseNumber: number, severity: string): string {
    const recommendations: Record<number, string> = {
      1: "Update skill description following naming conventions",
      2: "Add allowed-tools field to frontmatter",
      3: "Add examples or extract content to references/",
      4: "Fix broken links or create missing files",
      5: "Move files to proper directories",
      6: "Create scripts/ directory with proper structure",
      7: "Create .local/ and .output/ directories",
      8: "Fix TypeScript compilation errors",
      9: "Migrate bash code to TypeScript",
      10: "Fix phantom skill references",
      11: "Replace cd commands with REPO_ROOT pattern",
      12: "Improve CLI error handling",
      13: "Add TodoWrite mandate for multi-step workflows",
      14: "Fix table/code block/header formatting",
      15: "Ensure skill is referenced by a gateway",
      16: "Replace Windows backslash paths with forward slashes",
      17: "Add gateway structure documentation",
      18: "Fix routing table format",
      19: "Use absolute paths in references",
      20: "Add skill to appropriate gateway routing",
    };

    return recommendations[phaseNumber] || "Review and fix issue";
  }
}
