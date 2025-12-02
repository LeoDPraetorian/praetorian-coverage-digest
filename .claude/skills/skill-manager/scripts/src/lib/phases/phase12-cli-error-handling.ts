/**
 * Phase 12: CLI Error Handling Audit
 * Validates exit code discrimination in TypeScript CLI tools
 *
 * Exit Code Standard:
 * - 0: Success (audit completed, no critical issues)
 * - 1: Violations found (audit completed, found issues)
 * - 2: Tool error (could not run - invalid args, file not found)
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import type { PhaseResult, Issue } from '../types';

interface CatchBlockMatch {
  startLine: number;
  exitLine: number;
  hasExit1: boolean;
  hasToolErrorMessage: boolean;
  hasClarification: boolean;
  blockContent: string;
}

export class Phase12CliErrorHandling {
  /**
   * Find catch blocks with exit code issues
   */
  private static findCatchBlocksWithIssues(content: string, filePath: string): CatchBlockMatch[] {
    const matches: CatchBlockMatch[] = [];
    const lines = content.split('\n');

    let inCatchBlock = false;
    let catchBlockStart = -1;
    let braceDepth = 0;
    let catchBlockContent = '';
    let catchBlockLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect catch block start
      if (!inCatchBlock && /}?\s*catch\s*\([^)]*\)\s*\{/.test(line)) {
        inCatchBlock = true;
        catchBlockStart = i + 1; // Line numbers are 1-indexed
        braceDepth = 1;
        catchBlockContent = line;
        catchBlockLines = [line];
        continue;
      }

      if (inCatchBlock) {
        catchBlockContent += '\n' + line;
        catchBlockLines.push(line);

        // Count braces
        for (const char of line) {
          if (char === '{') braceDepth++;
          if (char === '}') braceDepth--;
        }

        // End of catch block
        if (braceDepth === 0) {
          // Check for issues in this catch block
          const hasExit1 = /process\.exit\(1\)/.test(catchBlockContent);
          const hasToolErrorMessage = /⚠️\s*Tool Error|Tool Error -/.test(catchBlockContent);
          const hasClarification = /This is a tool failure/.test(catchBlockContent);

          // Find the line number where exit(1) occurs
          let exitLine = catchBlockStart;
          for (let j = 0; j < catchBlockLines.length; j++) {
            if (catchBlockLines[j].includes('process.exit(1)')) {
              exitLine = catchBlockStart + j;
              break;
            }
          }

          // Only flag if there's an exit() call (avoid false positives)
          if (hasExit1 || (catchBlockContent.includes('process.exit') && !hasToolErrorMessage)) {
            matches.push({
              startLine: catchBlockStart,
              exitLine,
              hasExit1,
              hasToolErrorMessage,
              hasClarification,
              blockContent: catchBlockContent,
            });
          }

          inCatchBlock = false;
          catchBlockContent = '';
          catchBlockLines = [];
        }
      }
    }

    return matches;
  }

  /**
   * Generate issues from catch block matches
   */
  private static generateIssues(matches: CatchBlockMatch[]): Issue[] {
    const issues: Issue[] = [];

    for (const match of matches) {
      if (match.hasExit1) {
        issues.push({
          line: match.exitLine,
          severity: 'CRITICAL',
          message: 'Catch block uses exit(1) instead of exit(2) for tool errors',
          autoFixable: true,
        });
      }

      if (!match.hasToolErrorMessage && match.blockContent.includes('process.exit')) {
        issues.push({
          line: match.startLine,
          severity: 'WARNING',
          message: 'Missing "Tool Error" message prefix in error output',
          autoFixable: true,
        });
      }

      if (!match.hasClarification && match.blockContent.includes('process.exit')) {
        issues.push({
          line: match.startLine,
          severity: 'WARNING',
          message: 'Missing clarification distinguishing tool errors from violations',
          autoFixable: true,
        });
      }
    }

    return issues;
  }

  /**
   * Validate a single skill's CLI error handling
   */
  static async validate(skill: { name: string; directory: string }): Promise<Issue[]> {
    const cliPath = join(skill.directory, 'scripts', 'src', 'cli.ts');

    if (!existsSync(cliPath)) {
      return []; // No CLI file, no issues
    }

    const content = readFileSync(cliPath, 'utf-8');
    const matches = this.findCatchBlocksWithIssues(content, cliPath);

    return this.generateIssues(matches);
  }

  /**
   * Fix CLI error handling issues
   */
  static async fix(cliPath: string, dryRun: boolean = false): Promise<number> {
    if (!existsSync(cliPath)) {
      return 0;
    }

    let content = readFileSync(cliPath, 'utf-8');
    let fixedCount = 0;

    // Fix 1: Replace exit(1) with exit(2) in catch blocks
    const exitPattern = /catch\s*\([^)]*\)\s*\{[\s\S]*?process\.exit\(1\)/g;
    const matches = content.match(exitPattern);

    if (matches) {
      for (const match of matches) {
        const fixed = match.replace('process.exit(1)', 'process.exit(2)');
        content = content.replace(match, fixed);
        fixedCount++;
      }
    }

    // Write if changes made and not dry-run
    if (fixedCount > 0 && !dryRun) {
      writeFileSync(cliPath, content, 'utf-8');
    }

    return fixedCount;
  }

  /**
   * Run Phase 12 audit across all skills (with optional auto-fix)
   */
  static async run(skillsDir: string, options?: any): Promise<PhaseResult> {
    const result: PhaseResult = {
      phaseName: 'Phase 12: CLI Error Handling',
      skillsAffected: 0,
      issuesFound: 0,
      issuesFixed: 0,
      details: [],
    };

    const skillNames = readdirSync(skillsDir).filter((name) => {
      const fullPath = join(skillsDir, name);
      return (
        statSync(fullPath).isDirectory() &&
        !name.startsWith('.') &&
        name !== 'lib' &&
        name !== 'node_modules'
      );
    });

    for (const skillName of skillNames) {
      const skillDir = join(skillsDir, skillName);
      const issues = await this.validate({ name: skillName, directory: skillDir });

      if (issues.length > 0) {
        result.skillsAffected++;
        result.issuesFound += issues.length;
        result.details.push(`${skillName}:`);

        // Auto-fix if enabled
        const cliPath = join(skillDir, 'scripts', 'src', 'cli.ts');
        if (options?.autoFix && !options.dryRun) {
          const fixed = await this.fix(cliPath, options.dryRun);
          if (fixed > 0) {
            result.issuesFixed += fixed;
            result.details.push(`  ✓ Fixed ${fixed} exit code issue(s)`);
          }
        } else {
          for (const issue of issues) {
            result.details.push(`  - [${issue.severity}] Line ${issue.line}: ${issue.message}`);
            if (options?.dryRun && issue.autoFixable) {
              result.details.push(`    (would fix in non-dry-run mode)`);
            }
          }
        }
      }
    }

    if (result.skillsAffected === 0) {
      result.details.push('[INFO] No CLI error handling issues found');
    }

    return result;
  }
}
