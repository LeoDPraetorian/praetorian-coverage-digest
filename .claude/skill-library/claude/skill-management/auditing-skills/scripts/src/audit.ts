#!/usr/bin/env node
/**
 * Skill Manager - Audit CLI
 * Run compliance audit on skills (phase count defined in audit-engine.ts)
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { SkillAuditor, PHASE_COUNT } from './lib/audit-engine.js';
import { findSkill, listAllSkills } from './lib/skill-finder.js';
import { findProjectRoot, getAllSkillDirectories } from '../../../../../../lib/find-project-root.js';

const PROJECT_ROOT = findProjectRoot();

const program = new Command();

program
  .name('skill-manager-audit')
  .description(`Run ${PHASE_COUNT}-phase compliance audit on skills`)
  .argument('[name]', 'Skill name (optional, omit to audit all)')
  .option('--phase <number>', `Audit specific phase (1-${PHASE_COUNT})`)
  .option('--verbose', 'Verbose output')
  .action(async (name?: string, options?: { phase?: string; verbose?: boolean }) => {
    try {
      console.log(chalk.blue('\n📋 Skill Manager - Audit\n'));

      if (name) {
        // Audit single skill
        const skill = findSkill(name);
        if (!skill) {
          console.error(chalk.red(`\n⚠️  Tool Error - Skill '${name}' not found`));
          console.log(chalk.gray('  Use `npm run search -- "<query>"` to find skills'));
          process.exit(2);
        }

        console.log(chalk.gray(`Auditing skill: ${name}`));
        console.log(chalk.gray(`Path: ${skill.path}\n`));

        // Get the directory containing this skill
        const skillDir = skill.path.replace(`/${name}/SKILL.md`, '');
        const auditor = new SkillAuditor(skillDir);

        let result;
        if (options?.phase) {
          // Run single phase audit
          const phaseNum = parseInt(options.phase);
          if (isNaN(phaseNum) || phaseNum < 1 || phaseNum > PHASE_COUNT) {
            console.error(chalk.red(`\n⚠️  Tool Error - Phase must be a number between 1 and ${PHASE_COUNT}`));
            process.exit(2);
          }
          console.log(chalk.gray(`Running Phase ${phaseNum} only...\n`));
          result = await auditor.runSinglePhaseForSkill(name, phaseNum);
        } else {
          // Run full audit
          result = await auditor.runFullForSingleSkill(name);
        }

        // Display results
        console.log(result.summary);
        if (options?.verbose) {
          console.log(result.details);
        }

        // Clear visual summary for audit result (not a tool error)
        console.log('');
        if (result.totalCritical > 0) {
          console.log(chalk.red.bold('═══════════════════════════════════════════════════════════════'));
          console.log(chalk.red.bold('  AUDIT RESULT: FAILED'));
          console.log(chalk.red(`  Skill "${name}" has ${result.totalCritical} critical issue(s)`));
          console.log(chalk.gray(`  Run: npm run --silent fix -- ${name}`));
          console.log(chalk.red.bold('═══════════════════════════════════════════════════════════════'));
        } else if (result.totalWarnings > 0) {
          console.log(chalk.yellow.bold('═══════════════════════════════════════════════════════════════'));
          console.log(chalk.yellow.bold('  AUDIT RESULT: PASSED WITH WARNINGS'));
          console.log(chalk.yellow(`  Skill "${name}" has ${result.totalWarnings} warning(s)`));
          console.log(chalk.yellow.bold('═══════════════════════════════════════════════════════════════'));
        } else {
          console.log(chalk.green.bold('═══════════════════════════════════════════════════════════════'));
          console.log(chalk.green.bold('  AUDIT RESULT: PASSED'));
          console.log(chalk.green(`  Skill "${name}" passed all compliance checks`));
          console.log(chalk.green.bold('═══════════════════════════════════════════════════════════════'));
        }

        // Exit 0 for successful audit run (even with violations)
        // Violations are not tool errors - the audit worked correctly
        // Exit 2 is reserved for actual tool errors (file not found, parse errors, etc.)
      } else {
        // Audit all skills
        console.log(chalk.gray('Auditing all skills (both core and library)...\n'));

        const skillDirs = getAllSkillDirectories();
        let totalCritical = 0;
        let totalWarnings = 0;
        let totalSkills = 0;

        for (const dir of skillDirs) {
          console.log(chalk.blue(`\n📁 Auditing directory: ${dir.replace(PROJECT_ROOT, '$REPO_ROOT')}\n`));
          const auditor = new SkillAuditor(dir);
          const result = await auditor.runFull();

          totalCritical += result.totalCritical;
          totalWarnings += result.totalWarnings;
          totalSkills += result.totalSkills;

          console.log(result.summary);
        }

        // Final summary with clear visual banner
        console.log('');
        if (totalCritical > 0) {
          console.log(chalk.red.bold('═══════════════════════════════════════════════════════════════'));
          console.log(chalk.red.bold('  AUDIT RESULT: FAILED'));
          console.log(chalk.red(`  ${totalSkills} skills audited, ${totalCritical} critical issue(s), ${totalWarnings} warning(s)`));
          console.log(chalk.gray('  Run: npm run --silent audit -- <skill-name> --verbose'));
          console.log(chalk.red.bold('═══════════════════════════════════════════════════════════════'));
        } else if (totalWarnings > 0) {
          console.log(chalk.yellow.bold('═══════════════════════════════════════════════════════════════'));
          console.log(chalk.yellow.bold('  AUDIT RESULT: PASSED WITH WARNINGS'));
          console.log(chalk.yellow(`  ${totalSkills} skills audited, ${totalWarnings} warning(s)`));
          console.log(chalk.yellow.bold('═══════════════════════════════════════════════════════════════'));
        } else {
          console.log(chalk.green.bold('═══════════════════════════════════════════════════════════════'));
          console.log(chalk.green.bold('  AUDIT RESULT: PASSED'));
          console.log(chalk.green(`  ${totalSkills} skills passed all compliance checks`));
          console.log(chalk.green.bold('═══════════════════════════════════════════════════════════════'));
        }

        // Exit 0 for successful audit run (even with violations)
        // Violations are not tool errors - the audit worked correctly
        // Exit 2 is reserved for actual tool errors (file not found, parse errors, etc.)
      }

    } catch (error) {
      console.error(chalk.red('\n⚠️  Tool Error - This is a tool failure, not an audit failure.'));
      console.error(chalk.gray(`  ${error}`));
      process.exit(2);
    }
  });

program.parse();
