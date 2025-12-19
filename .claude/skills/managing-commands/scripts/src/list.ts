/**
 * Command List Module
 * Lists all commands with compliance status
 */

import * as path from 'path';
import { auditCommand, findCommands, parseCommandFile } from './audit.js';
import type { CommandStatus, ListResult } from './types.js';

export function listCommands(commandsDir: string): ListResult {
  const commandPaths = findCommands(commandsDir);
  const commands: CommandStatus[] = [];

  let pass = 0;
  let warn = 0;
  let fail = 0;

  for (const cmdPath of commandPaths) {
    const info = parseCommandFile(cmdPath);
    const audit = auditCommand(cmdPath);

    const critical = audit.issues.filter(i => i.severity === 'CRITICAL').length;
    const warnings = audit.issues.filter(i => i.severity === 'WARNING').length;

    let status: 'PASS' | 'WARN' | 'FAIL';
    if (critical > 0) {
      status = 'FAIL';
      fail++;
    } else if (warnings > 0) {
      status = 'WARN';
      warn++;
    } else {
      status = 'PASS';
      pass++;
    }

    commands.push({
      name: info?.name || path.basename(cmdPath, '.md'),
      description: info?.description || '(no description)',
      status,
      issues: audit.issues.length,
    });
  }

  // Sort: FAIL first, then WARN, then PASS
  commands.sort((a, b) => {
    const order = { FAIL: 0, WARN: 1, PASS: 2 };
    return order[a.status] - order[b.status];
  });

  return {
    commands,
    summary: {
      total: commandPaths.length,
      pass,
      warn,
      fail,
    },
  };
}

export function formatListReport(result: ListResult): string {
  const lines: string[] = [];

  lines.push('# Command Compliance Summary');
  lines.push('');

  // Summary stats
  const { summary } = result;
  lines.push('## Overview');
  lines.push('');
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Commands | ${summary.total} |`);
  lines.push(`| ✅ Pass | ${summary.pass} |`);
  lines.push(`| ⚠️ Warning | ${summary.warn} |`);
  lines.push(`| ❌ Fail | ${summary.fail} |`);
  lines.push('');

  // Command table
  lines.push('## Commands');
  lines.push('');
  lines.push('| Command | Description | Status | Issues |');
  lines.push('|---------|-------------|--------|--------|');

  for (const cmd of result.commands) {
    const icon = cmd.status === 'PASS' ? '✅' : cmd.status === 'WARN' ? '⚠️' : '❌';
    const desc = cmd.description.length > 40
      ? cmd.description.substring(0, 37) + '...'
      : cmd.description;
    lines.push(`| ${cmd.name} | ${desc} | ${icon} ${cmd.status} | ${cmd.issues} |`);
  }

  lines.push('');

  // Recommendations
  if (summary.fail > 0 || summary.warn > 0) {
    lines.push('## Recommendations');
    lines.push('');

    if (summary.fail > 0) {
      lines.push(`**Critical:** ${summary.fail} command(s) have CRITICAL issues that must be fixed.`);
      lines.push('');
      lines.push('Run:');
      lines.push('```bash');
      for (const cmd of result.commands.filter(c => c.status === 'FAIL')) {
        lines.push(`npm run audit -- ${cmd.name}`);
      }
      lines.push('```');
      lines.push('');
    }

    if (summary.warn > 0) {
      lines.push(`**Warnings:** ${summary.warn} command(s) have warnings that should be addressed.`);
      lines.push('');
      lines.push('To auto-fix issues:');
      lines.push('```bash');
      lines.push('npm run fix -- <command-name>');
      lines.push('```');
    }
  } else {
    lines.push('✅ All commands are compliant!');
  }

  return lines.join('\n');
}
