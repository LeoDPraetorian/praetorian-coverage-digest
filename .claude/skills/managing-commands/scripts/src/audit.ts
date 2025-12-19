/**
 * Command Audit Module
 * Implements 8-check protocol for command compliance
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AuditResult, CheckResult, CommandInfo, Issue, Severity } from './types.js';

const ROUTER_PATTERN_TOOLS = ['Skill', 'AskUserQuestion'];

export function parseCommandFile(filePath: string): CommandInfo | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const lineCount = lines.length;

  // Parse frontmatter
  if (!content.startsWith('---')) {
    return {
      name: path.basename(filePath, '.md'),
      path: filePath,
      lineCount,
    };
  }

  const endIndex = content.indexOf('---', 3);
  if (endIndex === -1) {
    return {
      name: path.basename(filePath, '.md'),
      path: filePath,
      lineCount,
    };
  }

  const frontmatter = content.substring(3, endIndex).trim();
  const info: CommandInfo = {
    name: path.basename(filePath, '.md'),
    path: filePath,
    lineCount,
  };

  // Parse YAML fields
  for (const line of frontmatter.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();

    switch (key) {
      case 'description':
        info.description = value.replace(/^["']|["']$/g, '');
        break;
      case 'allowed-tools':
        info.allowedTools = value.split(',').map(t => t.trim());
        break;
      case 'skills':
        info.skills = value.split(',').map(s => s.trim());
        break;
      case 'argument-hint':
        info.argumentHint = value.replace(/^["']|["']$/g, '');
        break;
      case 'model':
        info.model = value;
        break;
    }
  }

  return info;
}

export function auditCommand(filePath: string): AuditResult {
  const info = parseCommandFile(filePath);
  const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';

  if (!info) {
    return {
      command: path.basename(filePath, '.md'),
      path: filePath,
      passed: false,
      issues: [{
        check: 0,
        name: 'File Existence',
        severity: 'CRITICAL',
        message: 'Command file not found',
      }],
      checks: [],
    };
  }

  const checks: CheckResult[] = [];
  const issues: Issue[] = [];

  // Check 1: Frontmatter Presence
  const hasFrontmatter = content.startsWith('---');
  checks.push({
    check: 1,
    name: 'Frontmatter Presence',
    passed: hasFrontmatter,
    severity: hasFrontmatter ? undefined : 'CRITICAL',
    message: hasFrontmatter ? 'Frontmatter block present' : 'Missing frontmatter block',
  });
  if (!hasFrontmatter) {
    issues.push({
      check: 1,
      name: 'Frontmatter Presence',
      severity: 'CRITICAL',
      message: 'Missing frontmatter block',
      fix: 'Add YAML frontmatter delimited by ---',
    });
  }

  // Check 2: Required Fields
  const hasDescription = !!info.description;
  checks.push({
    check: 2,
    name: 'Required Fields',
    passed: hasDescription,
    severity: hasDescription ? undefined : 'CRITICAL',
    message: hasDescription ? 'Description field present' : 'Missing description field',
  });
  if (!hasDescription) {
    issues.push({
      check: 2,
      name: 'Required Fields',
      severity: 'CRITICAL',
      message: 'Missing description field',
      fix: 'Add description: "Brief description" to frontmatter',
    });
  }

  // Check 3: Optional Recommended Fields
  const usesPositionalArgs = /\$[0-9]+/.test(content);
  const hasArgumentHint = !!info.argumentHint;
  const usesBash = content.includes('!`') || content.includes('Bash');
  const hasAllowedTools = !!info.allowedTools;

  let check3Passed = true;
  let check3Message = 'Optional fields appropriate';

  if (usesPositionalArgs && !hasArgumentHint) {
    check3Passed = false;
    check3Message = 'Uses positional args without argument-hint';
    issues.push({
      check: 3,
      name: 'Optional Recommended Fields',
      severity: 'WARNING',
      message: 'Uses positional parameters without argument-hint',
      fix: 'Add argument-hint: "[arg1] [arg2]" to frontmatter',
    });
  }

  if (usesBash && !hasAllowedTools) {
    check3Passed = false;
    check3Message = 'Uses Bash without allowed-tools';
    issues.push({
      check: 3,
      name: 'Optional Recommended Fields',
      severity: 'CRITICAL',
      message: 'Uses Bash without allowed-tools declaration',
      fix: 'Add allowed-tools: Bash(command:*) to frontmatter',
    });
  }

  checks.push({
    check: 3,
    name: 'Optional Recommended Fields',
    passed: check3Passed,
    severity: check3Passed ? undefined : 'WARNING',
    message: check3Message,
  });

  // Check 4: Argument Handling
  const usesArguments = content.includes('$ARGUMENTS');
  const mixedArgs = usesArguments && usesPositionalArgs;

  checks.push({
    check: 4,
    name: 'Argument Handling',
    passed: !mixedArgs,
    severity: mixedArgs ? 'WARNING' : undefined,
    message: mixedArgs ? 'Mixes $ARGUMENTS with positional params' : 'Argument handling consistent',
  });
  if (mixedArgs) {
    issues.push({
      check: 4,
      name: 'Argument Handling',
      severity: 'WARNING',
      message: 'Mixes $ARGUMENTS with positional parameters',
      fix: 'Choose one pattern: $ARGUMENTS or $1, $2, etc.',
    });
  }

  // Check 5: Tool Permissions
  const declaredTools = info.allowedTools || [];
  const hasBroadBash = declaredTools.some(t => t === 'Bash(*)' || t === 'Bash');

  checks.push({
    check: 5,
    name: 'Tool Permissions',
    passed: !hasBroadBash,
    severity: hasBroadBash ? 'WARNING' : undefined,
    message: hasBroadBash ? 'Overly broad Bash permissions' : 'Tool permissions appropriate',
  });
  if (hasBroadBash) {
    issues.push({
      check: 5,
      name: 'Tool Permissions',
      severity: 'WARNING',
      message: 'Overly broad Bash permissions (security risk)',
      fix: 'Use specific patterns: Bash(git:*), Bash(npm:*)',
    });
  }

  // Check 6: Documentation Quality
  const bodyContent = content.substring(content.indexOf('---', 3) + 3).trim();
  const hasExplanation = bodyContent.length > 50;

  checks.push({
    check: 6,
    name: 'Documentation Quality',
    passed: hasExplanation,
    severity: hasExplanation ? undefined : 'WARNING',
    message: hasExplanation ? 'Command has documentation' : 'Minimal documentation',
  });
  if (!hasExplanation) {
    issues.push({
      check: 6,
      name: 'Documentation Quality',
      severity: 'WARNING',
      message: 'Command body has minimal documentation',
      fix: 'Add explanation of what command does and usage examples',
    });
  }

  // Check 7: Structure Best Practices
  const tooLong = info.lineCount > 50;

  checks.push({
    check: 7,
    name: 'Structure Best Practices',
    passed: !tooLong,
    severity: tooLong ? 'WARNING' : undefined,
    message: tooLong ? `Command is ${info.lineCount} lines (>50, consider skill)` : 'Command size appropriate',
  });
  if (tooLong) {
    issues.push({
      check: 7,
      name: 'Structure Best Practices',
      severity: 'WARNING',
      message: `Command is ${info.lineCount} lines (>50 suggests logic leakage)`,
      fix: 'Move business logic to a skill, keep command as router',
    });
  }

  // Check 8: Router Pattern Compliance (CRITICAL)
  const hasSkills = info.skills && info.skills.length > 0;
  const extraTools = hasSkills
    ? declaredTools.filter(t => !ROUTER_PATTERN_TOOLS.includes(t))
    : [];
  const hasToolLeakage = hasSkills && extraTools.length > 0;

  const hasVerbatimDirective = /verbatim|exactly as returned|pass through/i.test(content);
  const hasVagueInstructions = /help the user|assist with|you should/i.test(content);
  const hasImperativeInstructions = /invoke|execute|call|display|run/i.test(content);

  let check8Passed = true;
  const check8Issues: string[] = [];

  if (hasToolLeakage) {
    check8Passed = false;
    check8Issues.push(`Tool Leakage: has skills but includes ${extraTools.join(', ')}`);
    issues.push({
      check: 8,
      name: 'Router Pattern Compliance',
      severity: 'CRITICAL',
      message: `Tool Leakage: command has skills: but includes extra tools: ${extraTools.join(', ')}`,
      fix: 'Remove extra tools, keep only Skill, AskUserQuestion',
    });
  }

  if (hasVagueInstructions && !hasImperativeInstructions) {
    check8Passed = false;
    check8Issues.push('Vague instructions instead of imperative');
    issues.push({
      check: 8,
      name: 'Router Pattern Compliance',
      severity: 'CRITICAL',
      message: 'Vague instructions ("help the user") instead of imperative ("Invoke...")',
      fix: 'Use imperative language: "Invoke the skill", "Display the output"',
    });
  }

  if (hasSkills && !hasVerbatimDirective) {
    check8Issues.push('Missing verbatim output directive');
    issues.push({
      check: 8,
      name: 'Router Pattern Compliance',
      severity: 'WARNING',
      message: 'Missing verbatim output directive for skill delegation',
      fix: 'Add "Display the tool output verbatim" or equivalent',
    });
  }

  checks.push({
    check: 8,
    name: 'Router Pattern Compliance',
    passed: check8Passed,
    severity: check8Passed ? undefined : 'CRITICAL',
    message: check8Passed
      ? (hasSkills ? 'Router Pattern followed' : 'No skill delegation (N/A)')
      : check8Issues.join('; '),
  });

  const hasCritical = issues.some(i => i.severity === 'CRITICAL');

  return {
    command: info.name,
    path: filePath,
    passed: !hasCritical,
    issues,
    checks,
  };
}

export function formatAuditReport(result: AuditResult): string {
  const lines: string[] = [];

  lines.push(`# Command Compliance Audit: ${result.command}`);
  lines.push('');

  // Summary
  const critical = result.issues.filter(i => i.severity === 'CRITICAL').length;
  const warnings = result.issues.filter(i => i.severity === 'WARNING').length;
  const info = result.issues.filter(i => i.severity === 'INFO').length;

  const status = critical > 0 ? 'FAIL' : warnings > 0 ? 'NEEDS IMPROVEMENT' : 'PASS';
  const statusIcon = critical > 0 ? '❌' : warnings > 0 ? '⚠️' : '✅';

  lines.push('## Summary');
  lines.push(`- **Overall Status**: ${statusIcon} ${status}`);
  lines.push(`- **Critical Issues**: ${critical}`);
  lines.push(`- **Warnings**: ${warnings}`);
  lines.push(`- **Info**: ${info}`);
  lines.push('');

  // Check Results
  lines.push('## Check Results');
  lines.push('');

  for (const check of result.checks) {
    const icon = check.passed ? '✅' : check.severity === 'CRITICAL' ? '❌' : '⚠️';
    lines.push(`### Check ${check.check}: ${check.name}`);
    lines.push(`**Status**: ${icon} ${check.passed ? 'PASS' : check.severity}`);
    lines.push(`**Findings**: ${check.message}`);
    lines.push('');
  }

  // Remediation
  if (result.issues.length > 0) {
    lines.push('## Remediation');
    lines.push('');

    const criticalIssues = result.issues.filter(i => i.severity === 'CRITICAL');
    if (criticalIssues.length > 0) {
      lines.push('### Critical (Must Fix)');
      for (const issue of criticalIssues) {
        lines.push(`- **${issue.name}**: ${issue.message}`);
        if (issue.fix) lines.push(`  - Fix: ${issue.fix}`);
      }
      lines.push('');
    }

    const warningIssues = result.issues.filter(i => i.severity === 'WARNING');
    if (warningIssues.length > 0) {
      lines.push('### Warning (Should Fix)');
      for (const issue of warningIssues) {
        lines.push(`- **${issue.name}**: ${issue.message}`);
        if (issue.fix) lines.push(`  - Fix: ${issue.fix}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function findCommands(commandsDir: string): string[] {
  if (!fs.existsSync(commandsDir)) {
    return [];
  }

  const files: string[] = [];
  const entries = fs.readdirSync(commandsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(path.join(commandsDir, entry.name));
    } else if (entry.isDirectory()) {
      // Recurse into subdirectories
      const subFiles = findCommands(path.join(commandsDir, entry.name));
      files.push(...subFiles);
    }
  }

  return files;
}
