/**
 * Console Reporter
 * Formats audit results with chalk colors and aligned tables for terminal output
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import type { AuditResult } from '../shared/types.js';

export class ConsoleReporter {
  /**
   * Format audit result for single skill
   * Returns formatted string for display
   */
  static formatAuditResult(
    skillName: string,
    location: string,
    result: AuditResult,
    projectRoot: string
  ): string {
    const displayLocation = location.replace(projectRoot, '$ROOT');

    // Header
    console.log(chalk.blue.bold(`\n📊 Audit Results: ${skillName}\n`));
    console.log(chalk.gray(`Location: ${displayLocation}`));

    // Status
    const statusIcon = result.totalCritical > 0 ? '🔴' : result.totalWarnings > 0 ? '⚠️' : '✅';
    const statusColor = result.totalCritical > 0 ? chalk.red : result.totalWarnings > 0 ? chalk.yellow : chalk.green;
    console.log(statusColor(`Status: ${statusIcon} ${result.totalCritical > 0 ? 'CRITICAL issues' : result.totalWarnings > 0 ? 'Warnings found' : 'No critical issues'}\n`));

    // Summary
    console.log(chalk.bold('Issue Summary:'));
    console.log(`  ${chalk.red('🔴 CRITICAL')}: ${result.totalCritical || 0}`);
    console.log(`  ${chalk.yellow('⚠️ WARNING')}: ${result.totalWarnings || 0}`);
    console.log(`  ${chalk.blue('ℹ️ INFO')}: ${result.totalInfo || 0}`);
    console.log('');

    // Phase results table
    console.log(chalk.blue.bold('All 22 Phases:\n'));

    const phaseNames: Record<number, string> = {
      1: 'Description Format',
      2: 'Allowed-Tools',
      3: 'Line Count',
      4: 'Broken Links',
      5: 'File Organization',
      6: 'Script Organization',
      7: 'Output Directories',
      8: 'TypeScript Structure',
      9: 'Bash Migration',
      10: 'Reference Audit',
      11: 'Command Examples',
      12: 'CLI Error Handling',
      13: 'State Externalization',
      14: 'Visual/Style',
      15: 'Orphan Detection',
      16: 'Windows Paths',
      17: 'Gateway Structure',
      18: 'Routing Table Format',
      19: 'Path Resolution',
      20: 'Coverage Check',
      21: 'Line Number References',
    };

    // Build table with cli-table3
    const table = new Table({
      head: [chalk.bold('Severity'), chalk.bold('Issue')],
      style: {
        head: [],
        border: ['gray'],
      },
      colWidths: [15, 100],  // Fixed widths for clean alignment
      wordWrap: true,
    });

    for (let phaseNum = 1; phaseNum <= 21; phaseNum++) {
      const phase = result.phases.find(p => p.phaseName.includes(`Phase ${phaseNum}:`));
      const phaseName = phaseNames[phaseNum] || 'Unknown';
      const phaseLabel = `Phase ${phaseNum}: ${phaseName}`;

      if (!phase || phase.details.length === 0 || phase.issuesFound === 0) {
        // No issues
        table.push([
          chalk.green('✅ PASS'),
          chalk.gray(`${phaseLabel} - No issues found`)
        ]);
        continue;
      }

      // Has issues
      for (const detail of phase.details) {
        if (detail.endsWith(':') && !detail.includes('[')) continue;

        const severityMatch = detail.match(/\[(CRITICAL|WARNING|INFO)\]/);
        if (!severityMatch) continue;

        const severity = severityMatch[1];
        const message = detail.replace(/^\s*-\s*\[(CRITICAL|WARNING|INFO)\]\s*/, '').trim();

        // Color by severity
        const icon = severity === 'CRITICAL' ? '🔴' : severity === 'WARNING' ? '⚠️' : 'ℹ️';
        const severityColor = severity === 'CRITICAL' ? chalk.red : severity === 'WARNING' ? chalk.yellow : chalk.blue;
        const messageColor = severity === 'CRITICAL' ? chalk.red : severity === 'WARNING' ? chalk.yellow : chalk.gray;

        table.push([
          severityColor(`${icon} ${severity}`),
          messageColor(`${phaseLabel} - ${message}`)
        ]);
      }
    }

    const tableOutput = table.toString();

    // Build complete output
    let output = '';
    output += chalk.blue.bold(`\n📊 Audit Results: ${skillName}\n\n`);
    output += chalk.gray(`Location: ${displayLocation}\n`);
    output += statusColor(`Status: ${statusIcon} ${result.totalCritical > 0 ? 'CRITICAL issues' : result.totalWarnings > 0 ? 'Warnings found' : 'No critical issues'}\n\n`);
    output += chalk.bold('Issue Summary:\n');
    output += `  ${chalk.red('🔴 CRITICAL')}: ${result.totalCritical || 0}\n`;
    output += `  ${chalk.yellow('⚠️ WARNING')}: ${result.totalWarnings || 0}\n`;
    output += `  ${chalk.blue('ℹ️ INFO')}: ${result.totalInfo || 0}\n\n`;
    output += chalk.blue.bold('All 22 Phases:\n\n');
    output += tableOutput + '\n\n';

    // Quick actions
    const autoFixablePhases = result.phases
      .filter(p => p.issuesFound > 0 && [2, 4, 5, 6, 7, 10, 12].includes(
        parseInt(p.phaseName.match(/Phase (\d+)/)?.[1] || '0')
      ))
      .map(p => parseInt(p.phaseName.match(/Phase (\d+)/)?.[1] || '0'));

    const semanticPhases = result.phases
      .filter(p => p.issuesFound > 0 && [1, 3, 9, 13].includes(
        parseInt(p.phaseName.match(/Phase (\d+)/)?.[1] || '0')
      ))
      .map(p => parseInt(p.phaseName.match(/Phase (\d+)/)?.[1] || '0'));

    if (autoFixablePhases.length > 0 || semanticPhases.length > 0) {
      output += chalk.blue.bold('Quick Actions:\n\n');

      if (autoFixablePhases.length > 0) {
        output += chalk.cyan(`Auto-fix (Phases ${autoFixablePhases.join(', ')}):\n`);
        output += chalk.gray(`  cd .claude\n`);
        output += chalk.gray(`  npm run fix -- --skill ${skillName} --dry-run  # Preview\n`);
        output += chalk.gray(`  npm run fix -- --skill ${skillName}            # Apply\n\n`);
      }

      if (semanticPhases.length > 0) {
        output += chalk.cyan(`Semantic fixes (Phases ${semanticPhases.join(', ')}):\n`);
        output += chalk.gray(`  Use claude-skill-write for manual fixes\n\n`);
      }
    }

    return output;
  }
}
