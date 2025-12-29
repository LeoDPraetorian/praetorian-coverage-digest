#!/usr/bin/env node
/**
 * Skill Manager - Audit CLI
 * Run compliance audit on skills (phase count defined in audit-engine.ts)
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { SkillAuditor, PHASE_COUNT } from './lib/audit-engine.js';
import { findSkill, listAllSkills, findSimilarSkills } from './lib/skill-finder.js';
import { findProjectRoot, getAllSkillDirectories } from '@chariot/lib';
import { formatAgentDataForAnalysis, renderAgentTableWithScores, extractDomain } from './lib/agent-analyzer.js';
import {
  formatFindingsTable,
  countFindings,
  formatCompletionMessage,
  type Finding,
} from '@chariot/formatting-skill-output/lib/table-formatter';
import {
  validateSemanticFindings,
  semanticFindingsToFindings,
  type SemanticFindingsJson,
} from '@chariot/formatting-skill-output/lib/schemas';
import * as fs from 'fs';

const PROJECT_ROOT = findProjectRoot();

const program = new Command();

program
  .name('skill-manager-audit')
  .description(`Run ${PHASE_COUNT}-phase compliance audit on skills`)
  .argument('[name]', 'Skill name (optional, omit to audit all)')
  .option('--phase <number>', `Audit specific phase (1-${PHASE_COUNT})`)
  .option('--verbose', 'Verbose output', true)
  .option('--quiet', 'Suppress progress messages (show only results)', true)
  .option('--agents-data', 'Output skill + agent data as JSON for Claude to analyze (Phase 1 of two-phase)')
  .option('--agents-render', 'Render agent recommendation table with scores (Phase 2 of two-phase)')
  .option('--scores <string>', 'Comma-separated agent scores for --agents-render (e.g., "agent1:40,agent2:30")')
  .option('--merge-semantic <path>', 'Merge semantic findings JSON file with structural findings and format combined table')
  .action(async (name?: string, options?: { phase?: string; verbose?: boolean; quiet?: boolean; agentsData?: boolean; agentsRender?: boolean; scores?: string; mergeSemantic?: string }) => {
    try {
      console.log(chalk.blue('\n📋 Skill Manager - Audit\n'));

      if (name) {
        // Audit single skill
        const skill = findSkill(name);
        if (!skill) {
          console.error(chalk.red(`\n⚠️  Tool Error - Skill '${name}' not found`));

          // Suggest similar skills
          const similar = findSimilarSkills(name);
          if (similar.length > 0) {
            console.log(chalk.yellow('\n  Did you mean?'));
            similar.forEach(s => {
              console.log(chalk.cyan(`    → ${s.name}`));
            });
          }

          console.log(chalk.gray('\n  Use `npm run search -- "<query>"` to find skills'));
          process.exit(2);
        }

        // Build skill metadata (used by agent flags, built early to allow early exit)
        const skillMetadata = {
          name: name,
          path: skill.path,
          description: skill.frontmatter?.description || '',
          allowedTools: skill.frontmatter?.['allowed-tools']?.split(',').map((t: string) => t.trim()) || [],
          domain: extractDomain(skill.path),
        };

        // Phase 1: Output JSON data for Claude to analyze (SKIP AUDIT)
        if (options?.agentsData) {
          console.log(chalk.blue.bold('📊 Agent Analysis Data (JSON)\n'));
          console.log(formatAgentDataForAnalysis(skillMetadata));
          return; // Exit - Claude will analyze and call --agents-render
        }

        // Phase 2: Render table with Claude-provided scores (SKIP AUDIT)
        if (options?.agentsRender) {
          if (!options?.scores) {
            console.error(chalk.red('⚠️  Tool Error - --agents-render requires --scores argument'));
            console.error(chalk.gray('  Example: --agents-render --scores="frontend-developer:40,backend-developer:0"'));
            process.exit(2);
          }
          console.log(chalk.blue.bold('📊 Agent Recommendations\n'));
          console.log(renderAgentTableWithScores(skillMetadata, options.scores));
          return; // Exit after rendering table
        }

        // Merge semantic findings: Requires audit to run first
        if (options?.mergeSemantic) {
          if (!fs.existsSync(options.mergeSemantic)) {
            console.error(chalk.red(`⚠️  Tool Error - Semantic findings file not found: ${options.mergeSemantic}`));
            process.exit(2);
          }

          // Read and validate semantic findings JSON
          const semanticJson = fs.readFileSync(options.mergeSemantic, 'utf-8');
          let semanticData;
          try {
            semanticData = JSON.parse(semanticJson);
          } catch (error) {
            console.error(chalk.red('⚠️  Tool Error - Invalid JSON in semantic findings file'));
            console.error(chalk.gray(`  ${error}`));
            process.exit(2);
          }

          // Validate schema
          let validatedData: SemanticFindingsJson;
          try {
            validatedData = validateSemanticFindings(semanticData);
          } catch (error) {
            console.error(chalk.red('⚠️  Tool Error - Semantic findings schema validation failed'));
            console.error(chalk.gray(`  ${error}`));
            process.exit(2);
          }

          // Run audit first to get structural findings
          if (!options?.quiet) {
            console.log(chalk.gray(`Auditing skill: ${name}`));
            console.log(chalk.gray(`Path: ${skill.path}\n`));
          }

          const skillDir = skill.path.replace(`/${name}/SKILL.md`, '');
          const auditor = new SkillAuditor(skillDir, options?.quiet ?? true);
          const result = await auditor.runFullForSingleSkill(name);

          // Convert structural findings to Finding[] format
          const structuralFindings: Finding[] = [];
          for (const phase of result.phases) {
            // Use rawIssues if available, otherwise skip this phase
            if (phase.rawIssues && Array.isArray(phase.rawIssues)) {
              for (const issue of phase.rawIssues) {
                structuralFindings.push({
                  severity: issue.severity,
                  phase: phase.phaseName,
                  issue: issue.message,
                  recommendation: issue.recommendation || 'See audit output for remediation steps'
                });
              }
            }
          }

          // Convert semantic findings
          const semanticFindings = semanticFindingsToFindings(validatedData);

          // Merge findings
          const allFindings = [...structuralFindings, ...semanticFindings];

          // Format and display combined table
          console.log(formatFindingsTable(allFindings));

          // Display completion message
          const counts = countFindings(allFindings);
          console.log(formatCompletionMessage(counts));

          return; // Exit after displaying combined findings
        }

        if (!options?.quiet) {
          console.log(chalk.gray(`Auditing skill: ${name}`));
          console.log(chalk.gray(`Path: ${skill.path}\n`));
        }

        // Get the directory containing this skill
        const skillDir = skill.path.replace(`/${name}/SKILL.md`, '');
        const auditor = new SkillAuditor(skillDir, options?.quiet ?? true);

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

        // Always show detailed table (verbose is default, but table shows regardless)
        console.log(auditor.formatDetailedTable(result.phases));

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
