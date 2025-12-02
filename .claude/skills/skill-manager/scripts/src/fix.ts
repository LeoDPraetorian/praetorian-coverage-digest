#!/usr/bin/env node
/**
 * Skill Manager - Fix CLI
 * Auto-fix skill compliance issues with three modes:
 * 1. Default: Apply deterministic fixes, report semantic issues
 * 2. --suggest: Apply deterministic, output semantic as JSON for Claude
 * 3. --apply: Apply specific semantic fix with provided value
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { SkillAuditor } from './lib/audit-engine.js';
import { findSkill } from './lib/skill-finder.js';
import { runSuggestMode } from './lib/fix-suggest.js';
import { applySemanticFix } from './lib/fix-applier.js';

/**
 * Create backup in .local directory with timestamp
 * Format: /{skill}/.local/YYYY-MM-DD-HH-MM-{name}.bak
 */
function createBackup(skillPath: string, skillName: string): string {
  const skillDir = dirname(skillPath);
  const localDir = join(skillDir, '.local');

  if (!existsSync(localDir)) {
    mkdirSync(localDir, { recursive: true });
  }

  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;

  const backupPath = join(localDir, `${timestamp}-${skillName}.bak`);
  const content = readFileSync(skillPath, 'utf-8');
  writeFileSync(backupPath, content, 'utf-8');

  return backupPath;
}

const program = new Command();

program
  .name('skill-manager-fix')
  .description('Fix skill compliance issues')
  .argument('<name>', 'Skill name')
  .option('--dry-run', 'Preview fixes without applying')
  .option('--phase <number>', 'Fix specific phase (auto-fix: 2, 4, 5, 6, 7, 10, 12; guidance: 8, 11; or all)')
  .option('--suggest', 'Output suggestions as JSON for Claude-mediated fixes')
  .option('--apply <fix-id>', 'Apply specific semantic fix (e.g., phase1-description)')
  .option('--value <value>', 'Value to use when applying semantic fix')
  .action(async (name: string, options?: { dryRun?: boolean; phase?: string; suggest?: boolean; apply?: string; value?: string }) => {
    try {
      console.log(chalk.blue('\n🔧 Skill Manager - Fix\n'));

      // Find skill
      const skill = findSkill(name);
      if (!skill) {
        console.error(chalk.red(`\n⚠️  Tool Error - Skill '${name}' not found`));
        console.log(chalk.gray('  Use `npm run search -- "<query>"` to find skills'));
        process.exit(2);
      }

      // Mode 1: Apply specific semantic fix (--apply)
      if (options?.apply) {
        const result = await applySemanticFix(skill.path, options.apply, options.value);
        if (result.success) {
          console.log(chalk.green(`✅ ${result.message}`));
        } else {
          console.error(chalk.red(`\n⚠️  Tool Error - ${result.message}`));
          process.exit(2);
        }
        return;
      }

      // Mode 2: Suggest mode for Claude (--suggest)
      if (options?.suggest) {
        const output = await runSuggestMode(skill.path, name, !!options.dryRun);
        // Output JSON for Claude to parse
        console.log(JSON.stringify(output, null, 2));
        return;
      }

      // Mode 3: Default mode - apply deterministic fixes
      console.log(chalk.gray(`Fixing skill: ${name}`));
      console.log(chalk.gray(`Path: ${skill.path}`));

      if (options?.dryRun) {
        console.log(chalk.yellow('\n🔍 Dry run mode - no changes will be made\n'));
      } else {
        // Create backup before applying any fixes
        const backupPath = createBackup(skill.path, name);
        console.log(chalk.gray(`\n📦 Backup created: ${backupPath}`));
        console.log(chalk.blue('\n🔧 Applying fixes...\n'));
      }

      // Get the directory containing this skill
      const skillDir = skill.path.replace(`/${name}/SKILL.md`, '');
      const auditor = new SkillAuditor(skillDir);

      const fixOptions = {
        dryRun: !!options?.dryRun,
        autoFix: true,
        interactive: false,
        skillName: name,
      };

      const phase = options?.phase || 'all';
      const results: string[] = [];

      if (phase === '2' || phase === 'all') {
        const result = await auditor.fixPhase2(fixOptions);
        results.push(result.summary);
      }

      if (phase === '4' || phase === 'all') {
        const result = await auditor.fixPhase4(fixOptions);
        results.push(result.summary);
      }

      if (phase === '5' || phase === 'all') {
        const result = await auditor.fixPhase5(fixOptions);
        results.push(result.summary);
      }

      if (phase === '6' || phase === 'all') {
        const result = await auditor.fixPhase6(fixOptions);
        results.push(result.summary);
      }

      if (phase === '7' || phase === 'all') {
        const result = await auditor.fixPhase7(fixOptions);
        results.push(result.summary);
      }

      // Phase 8: TypeScript Structure (specialized - automatic validation, manual fixes)
      if (phase === '8') {
        console.log(chalk.blue('📦 Phase 8: TypeScript Structure\n'));
        console.log(chalk.yellow('Audit automatically validates:'));
        console.log(chalk.gray('  • TypeScript compilation (tsc --noEmit)'));
        console.log(chalk.gray('  • Vitest types in tsconfig.json'));
        console.log(chalk.gray('  • Unit test execution (100% pass required)\n'));
        console.log(chalk.white('To fix issues:'));
        console.log(chalk.gray('  1. Navigate to skill scripts directory:'));
        console.log(chalk.cyan(`     cd ${dirname(skill.path)}/scripts`));
        console.log(chalk.gray('  2. Run TypeScript compiler to see errors:'));
        console.log(chalk.cyan('     npx tsc --noEmit'));
        console.log(chalk.gray('  3. Fix any reported type errors in source files'));
        console.log(chalk.gray('  4. Run tests to verify:'));
        console.log(chalk.cyan('     npm run test:unit'));
        console.log(chalk.gray('  5. Re-run audit to confirm:\n'));
        console.log(chalk.cyan(`     npm run audit -- ${name} --phase 8\n`));
        results.push('Phase 8: See guidance above (automatic validation, manual fixes required)');
      }

      if (phase === '10' || phase === 'all') {
        const result = await auditor.fixPhase10(fixOptions);
        results.push(result.summary);
      }

      // Phase 11: Command Portability (specialized - guidance only)
      if (phase === '11') {
        console.log(chalk.blue('📦 Phase 11: Command Portability\n'));
        console.log(chalk.gray('This phase checks for hardcoded paths that break cross-platform compatibility.\n'));
        console.log(chalk.white('  Steps:'));
        console.log(chalk.gray('  1. Search for hardcoded paths in SKILL.md:'));
        console.log(chalk.cyan(`     grep -E "/Users|/home|/var|C:\\\\\\\\|D:\\\\\\\\" "${skill.path}"`));
        console.log(chalk.gray('  2. Replace absolute paths with:'));
        console.log(chalk.gray('     • $REPO_ROOT for repository-relative paths'));
        console.log(chalk.gray('     • Relative paths (./references/, ../lib/)'));
        console.log(chalk.gray('     • Environment variables ($HOME, $PWD)'));
        console.log(chalk.gray('  3. Check for platform-specific commands:'));
        console.log(chalk.cyan(`     grep -E "open |pbcopy|pbpaste|xdg-open" "${skill.path}"`));
        console.log(chalk.gray('  4. Add cross-platform alternatives or conditionals'));
        console.log(chalk.gray('  5. Re-run audit to verify:\n'));
        console.log(chalk.cyan(`     npm run audit -- ${name} --phase 11\n`));
        results.push('Phase 11: See guidance above (manual path portability checks required)');
      }

      if (phase === '12' || phase === 'all') {
        const result = await auditor.fixPhase12(fixOptions);
        results.push(result.summary);
      }

      // Display results
      for (const result of results) {
        console.log(result);
      }

      // Show next steps
      if (!options?.dryRun) {
        console.log(chalk.blue('\n📋 Next steps:\n'));
        console.log(chalk.gray(`  1. Review changes in ${skill.path}`));
        console.log(chalk.gray(`  2. Run: npm run audit -- ${name}`));
        console.log(chalk.gray(`  3. For semantic fixes (Phases 1, 3, 9, 13), manually edit the skill`));
        console.log('');
      }

    } catch (error) {
      console.error(chalk.red('\n⚠️  Tool Error - This is a tool failure, not a fix failure.'));
      console.error(chalk.gray(`  ${error}`));
      process.exit(2);
    }
  });

program.parse();
