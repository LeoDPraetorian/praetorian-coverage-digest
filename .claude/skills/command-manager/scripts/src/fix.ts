/**
 * Command Fix Module
 * Auto-fixes command compliance issues
 */

import * as fs from 'fs';
import { auditCommand, parseCommandFile } from './audit.js';
import type { FixChange, FixResult } from './types.js';

const ROUTER_PATTERN_TOOLS = ['Skill', 'AskUserQuestion'];

export function fixCommand(filePath: string, dryRun: boolean = false): FixResult {
  const result: FixResult = {
    command: '',
    path: filePath,
    applied: false,
    changes: [],
    dryRun,
  };

  if (!fs.existsSync(filePath)) {
    return result;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  const info = parseCommandFile(filePath);

  if (!info) {
    return result;
  }

  result.command = info.name;
  const auditResult = auditCommand(filePath);

  // Fix 1: Remove unnecessary tools if has skills
  if (info.skills && info.skills.length > 0 && info.allowedTools) {
    const extraTools = info.allowedTools.filter(t => !ROUTER_PATTERN_TOOLS.includes(t));
    if (extraTools.length > 0) {
      const oldTools = info.allowedTools.join(', ');
      const newTools = ROUTER_PATTERN_TOOLS.filter(t => info.allowedTools!.includes(t) || t === 'Skill');
      const newToolsStr = newTools.join(', ');

      result.changes.push({
        type: 'remove-tool',
        before: `allowed-tools: ${oldTools}`,
        after: `allowed-tools: ${newToolsStr}`,
      });

      content = content.replace(
        new RegExp(`allowed-tools:\\s*${escapeRegex(oldTools)}`),
        `allowed-tools: ${newToolsStr}`
      );
    }
  }

  // Fix 2: Add verbatim output directive if has skills and missing
  if (info.skills && info.skills.length > 0) {
    const hasVerbatim = /verbatim|exactly as returned|pass through/i.test(content);
    if (!hasVerbatim) {
      // Find a good place to add it (after ## ACTION or similar)
      const actionMatch = content.match(/## ACTION\s*\n/i);
      if (actionMatch) {
        const insertPoint = content.indexOf(actionMatch[0]) + actionMatch[0].length;
        const directive = '\n**Output:** Display the tool output verbatim.\n';

        // Check if there's already content after ACTION
        const afterAction = content.substring(insertPoint, insertPoint + 100);
        if (!afterAction.includes('Output:')) {
          result.changes.push({
            type: 'add-verbatim',
            before: '(no verbatim directive)',
            after: directive.trim(),
          });

          // Find end of action section to add directive
          const nextSection = content.indexOf('\n## ', insertPoint);
          if (nextSection !== -1) {
            content = content.substring(0, nextSection) + directive + content.substring(nextSection);
          }
        }
      }
    }
  }

  // Fix 3: Trim description if > 120 chars
  if (info.description && info.description.length > 120) {
    const oldDesc = info.description;
    // Truncate intelligently at word boundary
    let newDesc = oldDesc.substring(0, 117);
    const lastSpace = newDesc.lastIndexOf(' ');
    if (lastSpace > 80) {
      newDesc = newDesc.substring(0, lastSpace);
    }
    newDesc += '...';

    result.changes.push({
      type: 'trim-description',
      before: `description: ${oldDesc}`,
      after: `description: ${newDesc}`,
    });

    content = content.replace(
      new RegExp(`description:\\s*["']?${escapeRegex(oldDesc)}["']?`),
      `description: ${newDesc}`
    );
  }

  // Fix 4: Add argument-hint if uses positional args without one
  if (!info.argumentHint && /\$[0-9]+/.test(content)) {
    // Extract used positional args
    const matches = content.match(/\$([0-9]+)/g) || [];
    const maxArg = Math.max(...matches.map(m => parseInt(m.replace('$', ''), 10)));
    const args = Array.from({ length: maxArg }, (_, i) => `[arg${i + 1}]`).join(' ');

    result.changes.push({
      type: 'add-argument-hint',
      before: '(no argument-hint)',
      after: `argument-hint: ${args}`,
    });

    // Add after description line
    const descMatch = content.match(/description:.*\n/);
    if (descMatch) {
      const insertPoint = content.indexOf(descMatch[0]) + descMatch[0].length;
      content = content.substring(0, insertPoint) + `argument-hint: ${args}\n` + content.substring(insertPoint);
    }
  }

  // Apply changes if not dry run
  if (result.changes.length > 0 && !dryRun) {
    fs.writeFileSync(filePath, content, 'utf-8');
    result.applied = true;
  }

  return result;
}

export function formatFixReport(result: FixResult): string {
  const lines: string[] = [];

  lines.push(`# Fix Report: ${result.command}`);
  lines.push('');

  if (result.dryRun) {
    lines.push('**Mode:** Dry Run (no changes applied)');
  } else {
    lines.push(`**Mode:** ${result.applied ? 'Changes Applied' : 'No Changes Needed'}`);
  }
  lines.push('');

  if (result.changes.length === 0) {
    lines.push('No fixes needed. Command is compliant.');
    return lines.join('\n');
  }

  lines.push(`## Changes (${result.changes.length})`);
  lines.push('');

  for (const change of result.changes) {
    lines.push(`### ${formatChangeType(change.type)}`);
    lines.push('');
    lines.push('**Before:**');
    lines.push('```');
    lines.push(change.before);
    lines.push('```');
    lines.push('');
    lines.push('**After:**');
    lines.push('```');
    lines.push(change.after);
    lines.push('```');
    lines.push('');
  }

  if (!result.dryRun && result.applied) {
    lines.push('---');
    lines.push('Run `npm run audit -- ' + result.command + '` to verify fixes.');
  }

  return lines.join('\n');
}

function formatChangeType(type: string): string {
  switch (type) {
    case 'remove-tool':
      return 'Remove Unnecessary Tools';
    case 'add-verbatim':
      return 'Add Verbatim Output Directive';
    case 'trim-description':
      return 'Trim Description';
    case 'add-argument-hint':
      return 'Add Argument Hint';
    default:
      return type;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
